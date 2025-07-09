// src/domain/auth/token.service.test.ts

import { TokenService } from './token.service';
import { InMemoryClient } from '../platform/in-memory/in-memory.client';
import * as jwt from 'jsonwebtoken';

// Mock the dependencies at the top level
jest.mock('jsonwebtoken');
jest.mock('../platform/in-memory/in-memory.client');

// Type-safe mocks
let mockJwt = jwt as jest.Mocked<typeof jwt>;
class MockedInMemoryClient implements InMemoryClient {
    get = jest.fn();
    set = jest.fn();
    del = jest.fn();
}

describe('TokenService', () => {
    let service: TokenService;
    let mockCache: jest.Mocked<InMemoryClient>;

    // Backup original process.env to restore it after tests
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset modules to allow setting process.env for each test
        jest.resetModules();

        // Mock process.env before importing the service
        process.env = {
            ...originalEnv,
            JWT_SECRET: 'test-secret',
            TOKEN_EXPIRY_SECONDS: '900',
        };

        // Re-import mocks after resetModules
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const jwtImport = require('jsonwebtoken');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { TokenService } = require('./token.service');
        mockCache = new MockedInMemoryClient() as jest.Mocked<InMemoryClient>;
        service = new TokenService(mockCache);

        // Re-assign mockJwt to new import
        mockJwt = jwtImport as jest.Mocked<typeof jwtImport>;

        // Dynamically import or create the service instance *after* setting env vars
        const { TokenService: FreshTokenService } = require('./token.service');
        service = new FreshTokenService(mockCache);
    });

    afterEach(() => {
        // Restore original process.env
        process.env = originalEnv;
        // Clear all mocks to ensure test isolation
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should throw an error if JWT_SECRET is not set', () => {
            delete process.env.JWT_SECRET;
            const { TokenService: FreshTokenService } = require('./token.service');

            expect(() => new FreshTokenService(mockCache))
                .toThrow('Token environment variables not set');
        });

        it('should throw an error if TOKEN_EXPIRY_SECONDS is not set', () => {
            delete process.env.TOKEN_EXPIRY_SECONDS;
            const { TokenService: FreshTokenService } = require('./token.service');

            expect(() => new FreshTokenService(mockCache))
                .toThrow('Token environment variables not set');
        });

        it('should initialize correctly when environment variables are set', () => {
            // The instance is created in beforeEach, if it doesn't throw, the test passes.
            expect(service.constructor.name).toBe('TokenService');
        });
    });

    describe('generateToken', () => {
        it('should call jwt.sign with the correct arguments', () => {
            const jti = 'test-jti-123';
            const payload = { id: 1, role: 'agent' };
            const expectedSignedToken = 'signed.jwt.token';

            (mockJwt.sign as jest.Mock).mockReturnValue(expectedSignedToken);
            
            const token = service.generateToken(jti, payload);

            expect(token).toBe(expectedSignedToken);
            expect(mockJwt.sign).toHaveBeenCalledTimes(1);
            expect(mockJwt.sign).toHaveBeenCalledWith(
                payload,
                'test-secret', // From mocked process.env
                {
                    jwtid: jti,
                    expiresIn: 900, // From mocked process.env, parsed to number
                    algorithm: 'HS256',
                }
            );
        });
    });

    describe('storeJti', () => {
        it('should call the cache client set method with the correct parameters', async () => {
            const jti = 'jti-to-store';
            const agentId = 123;
            const expiry = 3600;

            await service.storeJti(jti, agentId, expiry);

            expect(mockCache.set).toHaveBeenCalledTimes(1);
            expect(mockCache.set).toHaveBeenCalledWith(
                jti,
                agentId.toString(),
                { EX: expiry }
            );
        });
    });

    describe('isJtiStored', () => {
        it('should return true if the cache client returns a value for the JTI', async () => {
            const jti = 'existing-jti';
            mockCache.get.mockResolvedValue('some-agent-id'); // Any non-null value

            const result = await service.isJtiStored(jti);

            expect(result).toBe(true);
            expect(mockCache.get).toHaveBeenCalledWith(jti);
        });

        it('should return false if the cache client returns null for the JTI', async () => {
            const jti = 'non-existing-jti';
            mockCache.get.mockResolvedValue(null);

            const result = await service.isJtiStored(jti);

            expect(result).toBe(false);
            expect(mockCache.get).toHaveBeenCalledWith(jti);
        });
    });

    describe('clearJti', () => {
        it('should call the cache client del method with the correct JTI', async () => {
            const jti = 'jti-to-clear';

            await service.clearJti(jti);

            expect(mockCache.del).toHaveBeenCalledTimes(1);
            expect(mockCache.del).toHaveBeenCalledWith(jti);
        });
    });
});