// src/auth/auth.integration.spec.ts

import { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { IAuthRepository } from './auth.repository';
import { TokenService } from '../../common/token.service'; // Assuming path
import { Agent } from '../../db/schema';

// --- Mocks Setup ---

// Mocking external modules and dependencies
jest.mock('bcrypt');
jest.mock('uuid', () => ({
    v4: () => 'mock-jti-12345',
}));

// We will provide mock implementations for the service's dependencies
const mockAuthRepository: jest.Mocked<IAuthRepository> = {
    findOrCreate: jest.fn(),
    findByEmail: jest.fn(),
};

const mockTokenService: jest.Mocked<TokenService> = {
    generateToken: jest.fn(),
    storeJti: jest.fn(),
    clearJti: jest.fn(),
} as any; // Cast as any since the original class definition isn't provided

// Cast the mocked bcrypt to the correct type for type-safety
const mockedBcrypt = jest.requireMock('bcrypt') as jest.Mocked<typeof import('bcrypt')>;

// Helper to create mock Express response object
const getMockRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    return res as Response;
};

// Set necessary environment variables for AuthService
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRATION = '3600';


// --- Test Suite for Controller-Service Integration ---

describe('Auth Integration (Controller + Service)', () => {
    let authController: AuthController;
    let authService: AuthService;
    let req: Partial<Request>;
    let res: Response;

    // This setup creates REAL instances of the controller and service,
    // but the service is injected with MOCKED dependencies.
    beforeEach(() => {
        jest.clearAllMocks();

        authService = new AuthService(mockAuthRepository, mockTokenService);
        authController = new AuthController(authService);
        res = getMockRes();
    });

    // === Test the 'register' flow ===
    describe('POST /register', () => {
        it('should create a new agent, hash the password, and return the agent object without the password', async () => {
            // Arrange
            req = {
                body: { email: 'new@example.com', password: 'password123' },
            };
            const newAgent: Agent = { id: 1, email: 'new@example.com', password: 'hashed_password', alertThreshold: "10", createdAt: new Date() };

            // Configure the mock repository's behavior for this test
            mockAuthRepository.findOrCreate.mockResolvedValue(newAgent);

            // Act
            await authController.register(req as Request, res);

            // Assert
            // 1. Check if the repository was called correctly by the service
            expect(mockAuthRepository.findOrCreate).toHaveBeenCalledWith(req.body.email, req.body.password);

            // 2. Check the final HTTP response from the controller
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Registration successful',
                agent: { id: 1, email: 'new@example.com', alertThreshold: "10", createdAt: newAgent.createdAt }, // Note: password is not here
            });
        });

        it('should return 400 if the service throws an error (e.g., agent exists)', async () => {
            // Arrange
            req = {
                body: { email: 'exists@example.com', password: 'password123' },
            };
            const errorMessage = 'Agent with this email already exists';
            mockAuthRepository.findOrCreate.mockRejectedValue(new Error(errorMessage));

            // Act
            await authController.register(req as Request, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });

        it('should return 400 if validation fails in the controller (e.g., missing password)', async () => {
            // Arrange
            req = { body: { email: 'test@example.com' } };

            // Act
            await authController.register(req as Request, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required' });
            expect(mockAuthRepository.findOrCreate).not.toHaveBeenCalled(); // Service method was never called
        });
    });

    // === Test the 'login' flow ===
    describe('POST /login', () => {
        const mockAgent: Agent = { id: 2, email: 'agent@example.com', password: 'hashed_password_abc', alertThreshold: "10", createdAt: new Date() };

        it('should log in successfully if credentials are valid', async () => {
            // Arrange
            req = { body: { email: 'agent@example.com', password: 'correct_password' } };

            // Mock the dependency chain
            mockAuthRepository.findByEmail.mockResolvedValue(mockAgent);
            (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
            mockTokenService.generateToken.mockReturnValue('fake-jwt-token');

            // Act
            await authController.login(req as Request, res);

            // Assert
            // 1. Verify service logic
            expect(mockAuthRepository.findByEmail).toHaveBeenCalledWith('agent@example.com');
            // expect(mockedBcrypt.compare).toHaveBeenCalledWith('correct_password', 'hashed_password_abc');
            expect(mockTokenService.generateToken).toHaveBeenCalledWith('mock-jti-12345', { id: 2, email: 'agent@example.com' });
            expect(mockTokenService.storeJti).toHaveBeenCalledWith('mock-jti-12345', 2, 3600);

            // 2. Verify controller response
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                accessToken: 'fake-jwt-token',
            });
        });

        it('should return 401 if agent is not found', async () => {
            // Arrange
            req = { body: { email: 'notfound@example.com', password: 'any_password' } };
            mockAuthRepository.findByEmail.mockResolvedValue(null);

            // Act
            await authController.login(req as Request, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
            expect(mockedBcrypt.compare).not.toHaveBeenCalled();
        });

        it('should return 401 if password does not match', async () => {
            // Arrange
            req = { body: { email: 'agent@example.com', password: 'wrong_password' } };
            mockAuthRepository.findByEmail.mockResolvedValue(mockAgent);
            (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

            // Act
            await authController.login(req as Request, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
            expect(mockTokenService.generateToken).not.toHaveBeenCalled();
        });

        it('should return 400 if email is missing', async () => {
            req = { body: { password: 'some_password' } };

            await authController.login(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required' });
            expect(mockAuthRepository.findByEmail).not.toHaveBeenCalled();
        });

        it('should return 400 if password is missing', async () => {
            req = { body: { email: 'agent@example.com' } };

            await authController.login(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required' });
            expect(mockAuthRepository.findByEmail).not.toHaveBeenCalled();
        });
    });

    // === Test the 'logout' flow ===
    describe('POST /logout', () => {
        it('should successfully log out by clearing the JTI', async () => {
            // Arrange
            req = { jti: 'mock-jti-to-clear' }; // JTI attached by auth middleware
            mockTokenService.clearJti.mockResolvedValue(undefined);

            // Act
            await authController.logout(req as Request, res);

            // Assert
            // 1. Verify service logic
            expect(mockTokenService.clearJti).toHaveBeenCalledWith('mock-jti-to-clear');

            // 2. Verify controller response
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Logout successful' });
        });

        it('should return 500 if clearing the JTI fails', async () => {
            // Arrange
            req = { jti: 'mock-jti-to-clear' };
            mockTokenService.clearJti.mockRejectedValue(new Error('Redis connection failed'));

            // Act
            await authController.logout(req as Request, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'An error occurred during logout' });
        });

        it('should return 400 if JTI is missing from the request', async () => {
            // Arrange
            req = {}; // No jti property

            // Act
            await authController.logout(req as Request, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Token not provided or invalid' });
            expect(mockTokenService.clearJti).not.toHaveBeenCalled();
        });
    });
});