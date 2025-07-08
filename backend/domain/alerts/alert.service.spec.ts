// src/domain/alerts/alert.service.test.ts

import {AlertService} from './alert.service';
import {AlertRepository} from './alert.repository';
import {UserRepository} from '../users/users.repository';
import {InMemoryClient} from '../../platform/in-memory/in-memory.client';
import {formatCurrency} from '../../common/currency-formatter';

// Mock dependencies
jest.mock('./alert.repository');
jest.mock('../../domain/users/users.repository');
jest.mock('../../common/currency-formatter');

const MockedAlertRepository = AlertRepository as jest.MockedClass<typeof AlertRepository>;
const MockedUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockedFormatCurrency = formatCurrency as jest.Mock;

class MockedInMemoryClient extends InMemoryClient {
    get = jest.fn();
    set = jest.fn();
    del = jest.fn();
}

describe('AlertService', () => {
    let service: AlertService;
    let mockAlertRepo: jest.Mocked<AlertRepository>;
    let mockUserRepo: jest.Mocked<UserRepository>;
    let mockCache: jest.Mocked<InMemoryClient>;

    const userId = 1;
    const currency = 'USD';

    beforeEach(() => {
        // Create new mock instances for each test
        mockAlertRepo = new MockedAlertRepository() as jest.Mocked<AlertRepository>;
        mockUserRepo = new MockedUserRepository() as jest.Mocked<UserRepository>;
        mockCache = new MockedInMemoryClient() as jest.Mocked<InMemoryClient>;

        service = new AlertService(mockAlertRepo, mockUserRepo, mockCache);

        // Mock formatCurrency to return a predictable string
        mockedFormatCurrency.mockImplementation((value, curr) => `$${Number(value).toFixed(2)} [${curr}]`);
    });

    it('getCacheKey should return the correct key format', () => {
        expect(service.getCacheKey(userId)).toBe(`alerts:user:${userId}`);
    });

    describe('checkForLowBalance', () => {
        it('should do nothing if user is not found', async () => {
            mockUserRepo.findById.mockResolvedValue(undefined);
            await service.checkForLowBalance(userId, 50, currency);
            expect(mockAlertRepo.create).not.toHaveBeenCalled();
            expect(mockCache.del).not.toHaveBeenCalled();
        });

        it('should do nothing if user has no alert threshold', async () => {
            mockUserRepo.findById.mockResolvedValue({id: userId, alertThreshold: null} as any);
            await service.checkForLowBalance(userId, 50, currency);
            expect(mockAlertRepo.create).not.toHaveBeenCalled();
        });

        it('should do nothing if balance is above the threshold', async () => {
            mockUserRepo.findById.mockResolvedValue({id: userId, alertThreshold: '100.00'} as any);
            await service.checkForLowBalance(userId, 150, currency);
            expect(mockAlertRepo.create).not.toHaveBeenCalled();
        });

        it('should do nothing if balance is equal to the threshold', async () => {
            mockUserRepo.findById.mockResolvedValue({id: userId, alertThreshold: '100.00'} as any);
            await service.checkForLowBalance(userId, 100, currency);
            expect(mockAlertRepo.create).not.toHaveBeenCalled();
        });

        it('should create an alert and invalidate cache if balance is below threshold', async () => {
            const threshold = 100.00;
            const currentBalance = 49.99;
            mockUserRepo.findById.mockResolvedValue({id: userId, alertThreshold: String(threshold)} as any);

            await service.checkForLowBalance(userId, currentBalance, currency);

            const expectedMessage = `Account balance is low: $49.99 [USD]. Threshold is $100.00 [USD].`;
            expect(mockAlertRepo.create).toHaveBeenCalledWith({
                userId,
                message: expectedMessage,
                level: 'warning',
            });

            expect(mockCache.del).toHaveBeenCalledWith(service.getCacheKey(userId));
        });
    });

    describe('getActiveAlerts', () => {
        const cacheKey = `alerts:user:${userId}`;
        const mockAlerts = [{
            id: 1,
            message: 'Test',
            createdAt: new Date(),
            userId,
            level: "info" as "info" | "warning" | "critical",
            isRead: false
        }];

        it('should return alerts from cache if available', async () => {
            mockCache.get.mockResolvedValue(JSON.stringify(mockAlerts));

            const result = await service.getActiveAlerts(userId);

            expect(result).toEqual({alerts: mockAlerts, source: 'cache'});
            expect(mockCache.get).toHaveBeenCalledWith(cacheKey);
            expect(mockAlertRepo.findActiveByUser).not.toHaveBeenCalled();
        });

        it('should fetch from DB and set cache if cache is empty', async () => {
            mockCache.get.mockResolvedValue(null);
            mockAlertRepo.findActiveByUser.mockResolvedValue(mockAlerts);

            const result = await service.getActiveAlerts(userId);

            expect(result).toEqual({alerts: mockAlerts, source: 'db'});
            expect(mockCache.get).toHaveBeenCalledWith(cacheKey);
            expect(mockAlertRepo.findActiveByUser).toHaveBeenCalledWith(userId);
            expect(mockCache.set).toHaveBeenCalledWith(cacheKey, JSON.stringify(mockAlerts), {EX: 300});
        });
    });

    describe('markAlertsAsRead', () => {
        it('should call repository and invalidate cache', async () => {
            const alertIds = [101, 102];
            const cacheKey = service.getCacheKey(userId);

            await service.markAlertsAsRead(userId, alertIds);

            expect(mockAlertRepo.markAsRead).toHaveBeenCalledWith(userId, alertIds);
            expect(mockCache.del).toHaveBeenCalledWith(cacheKey);
        });
    });
});