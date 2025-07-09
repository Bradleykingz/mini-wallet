// src/domain/alerts/alert.service.test.ts

import {AlertService} from './alert.service';
import {AlertRepository} from './alert.repository';
import {AgentRepository} from '../agents/agents.repository';
import {InMemoryClient} from '../../platform/in-memory/in-memory.client';
import {formatCurrency} from '../../common/currency-formatter';

// Mock dependencies
jest.mock('./alert.repository');
jest.mock('../agents/agents.repository');
jest.mock('../../common/currency-formatter');

const MockedAlertRepository = AlertRepository as jest.MockedClass<typeof AlertRepository>;
const MockedAgentRepository = AgentRepository as jest.MockedClass<typeof AgentRepository>;
const mockedFormatCurrency = formatCurrency as jest.Mock;

class MockedInMemoryClient extends InMemoryClient {
    get = jest.fn();
    set = jest.fn();
    del = jest.fn();
}

describe('AlertService', () => {
    let service: AlertService;
    let mockAlertRepo: jest.Mocked<AlertRepository>;
    let mockAgentRepo: jest.Mocked<AgentRepository>;
    let mockCache: jest.Mocked<InMemoryClient>;

    const agentId = 1;
    const currency = 'USD';

    beforeEach(() => {
        // Create new mock instances for each test
        mockAlertRepo = new MockedAlertRepository() as jest.Mocked<AlertRepository>;
        mockAgentRepo = new MockedAgentRepository() as jest.Mocked<AgentRepository>;
        mockCache = new MockedInMemoryClient() as jest.Mocked<InMemoryClient>;

        service = new AlertService(mockAlertRepo, mockAgentRepo, mockCache);

        // Mock formatCurrency to return a predictable string
        mockedFormatCurrency.mockImplementation((value, curr) => `$${Number(value).toFixed(2)} [${curr}]`);
    });

    it('getCacheKey should return the correct key format', () => {
        expect(service.getCacheKey(agentId)).toBe(`alerts:agent:${agentId}`);
    });

    describe('checkForLowBalance', () => {
        it('should do nothing if agent is not found', async () => {
            mockAgentRepo.findById.mockResolvedValue(undefined);
            await service.checkForLowBalance(agentId, 50, currency);
            expect(mockAlertRepo.create).not.toHaveBeenCalled();
            expect(mockCache.del).not.toHaveBeenCalled();
        });

        it('should do nothing if agent has no alert threshold', async () => {
            mockAgentRepo.findById.mockResolvedValue({id: agentId, alertThreshold: null} as any);
            await service.checkForLowBalance(agentId, 50, currency);
            expect(mockAlertRepo.create).not.toHaveBeenCalled();
        });

        it('should do nothing if balance is above the threshold', async () => {
            mockAgentRepo.findById.mockResolvedValue({id: agentId, alertThreshold: '100.00'} as any);
            await service.checkForLowBalance(agentId, 150, currency);
            expect(mockAlertRepo.create).not.toHaveBeenCalled();
        });

        it('should do nothing if balance is equal to the threshold', async () => {
            mockAgentRepo.findById.mockResolvedValue({id: agentId, alertThreshold: '100.00'} as any);
            await service.checkForLowBalance(agentId, 100, currency);
            expect(mockAlertRepo.create).not.toHaveBeenCalled();
        });

        it('should create an alert and invalidate cache if balance is below threshold', async () => {
            const threshold = 100.00;
            const currentBalance = 49.99;
            mockAgentRepo.findById.mockResolvedValue({id: agentId, alertThreshold: String(threshold)} as any);

            await service.checkForLowBalance(agentId, currentBalance, currency);

            const expectedMessage = `Account balance is low: $49.99 [USD]. Threshold is $100.00 [USD].`;
            expect(mockAlertRepo.create).toHaveBeenCalledWith({
                agentId,
                title: "low balance",
                message: expectedMessage,
                level: 'warning',
            });

            expect(mockCache.del).toHaveBeenCalledWith(service.getCacheKey(agentId));
        });
    });

    describe('getActiveAlerts', () => {
        const cacheKey = `alerts:agent:${agentId}`;
        const mockAlerts = [{
            id: 1,
            title: 'Test Alert',
            message: 'Test',
            createdAt: new Date(),
            agentId,
            level: "info" as "info" | "warning" | "critical",
            isRead: false
        }];

        it('should return alerts from cache if available', async () => {
            mockCache.get.mockResolvedValue(JSON.stringify(mockAlerts));

            const result = await service.getActiveAlerts(agentId);

            expect(result).toEqual({alerts: mockAlerts, source: 'cache'});
            expect(mockCache.get).toHaveBeenCalledWith(cacheKey);
            expect(mockAlertRepo.findActiveByAgent).not.toHaveBeenCalled();
        });

        it('should fetch from DB and set cache if cache is empty', async () => {
            mockCache.get.mockResolvedValue(null);
            mockAlertRepo.findActiveByAgent.mockResolvedValue(mockAlerts);

            const result = await service.getActiveAlerts(agentId);

            expect(result).toEqual({alerts: mockAlerts, source: 'db'});
            expect(mockCache.get).toHaveBeenCalledWith(cacheKey);
            expect(mockAlertRepo.findActiveByAgent).toHaveBeenCalledWith(agentId);
            expect(mockCache.set).toHaveBeenCalledWith(cacheKey, JSON.stringify(mockAlerts), {EX: 300});
        });
    });

    describe('markAlertsAsRead', () => {
        it('should call repository and invalidate cache', async () => {
            const alertIds = [101, 102];
            const cacheKey = service.getCacheKey(agentId);

            await service.markAlertsAsRead(agentId, alertIds);

            expect(mockAlertRepo.markAsRead).toHaveBeenCalledWith(agentId, alertIds);
            expect(mockCache.del).toHaveBeenCalledWith(cacheKey);
        });
    });
});