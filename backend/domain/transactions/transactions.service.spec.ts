// src/domain/transactions/transaction.service.test.ts

import { TransactionService } from './transactions.service';
import { ITransactionRepository } from './transactions.repository';
import { IWalletRepository } from '../wallet/wallet.repository';
import { IPaymentProvider } from '../../platform/payments/mock.provider';
import { InMemoryClient } from '../../platform/in-memory/in-memory.client';
import { IAlertService } from '../alerts/alert.service';

// Mock all dependencies
jest.mock('./transactions.repository');
jest.mock('../wallet/wallet.repository');
jest.mock('../../platform/payments/mock.provider');
jest.mock('../../platform/in-memory/in-memory.client');
jest.mock('../alerts/alert.service');
jest.mock('uuid', () => ({v4: () => 'mock-reference-id'}));


class MockTransactionRepo extends ITransactionRepository {
    getReceipt = jest.fn();
    findByReferenceId = jest.fn();
    createAndUpdateBalance = jest.fn();
    updateStatus = jest.fn();
}

class MockWalletRepo extends IWalletRepository {
    findWalletById = jest.fn();
    findOrCreateWalletByAgentId = jest.fn();
    getTransactionHistory = jest.fn();
    createTransaction = jest.fn();
}

class MockPaymentProvider extends IPaymentProvider {
    initiateDeposit = jest.fn();
    initiateWithdrawal = jest.fn();
}

class MockCache extends InMemoryClient {
    get = jest.fn();
    set = jest.fn();
    del = jest.fn();
}

class MockAlertService extends IAlertService {
    getActiveAlerts = jest.fn();
    markAlertsAsRead= jest.fn();
    getCacheKey = jest.fn();
    checkForLowBalance = jest.fn();
}

describe('TransactionService', () => {
    let service: TransactionService;
    let mockTransactionRepo: jest.Mocked<ITransactionRepository>;
    let mockWalletRepo: jest.Mocked<IWalletRepository>;
    let mockPaymentProvider: jest.Mocked<IPaymentProvider>;
    let mockCache: jest.Mocked<InMemoryClient>;
    let mockAlertService: jest.Mocked<IAlertService>;

    const agentId = 1;
    const walletId = 1;
    const amount = 100;
    const mockWallet = { id: walletId, currency: 'USD', balance: '1000.00' };
    const providerSuccessResponse = { providerTransactionId: 'provider-tx-123', status: 'SUCCESS' as const };

    beforeEach(() => {
        mockTransactionRepo = new MockTransactionRepo() as jest.Mocked<ITransactionRepository>;
        mockWalletRepo = new MockWalletRepo() as jest.Mocked<IWalletRepository>;
        mockPaymentProvider = new MockPaymentProvider() as jest.Mocked<IPaymentProvider>;
        mockCache = new MockCache() as jest.Mocked<InMemoryClient>;
        mockAlertService = new MockAlertService() as jest.Mocked<IAlertService>;

        service = new TransactionService(
            mockTransactionRepo,
            mockWalletRepo,
            mockPaymentProvider,
            mockCache,
            mockAlertService,
        );

        mockWalletRepo.findWalletById.mockResolvedValue(mockWallet as any);
    });

    describe('getReceipt', () => {
        it('should return a transaction if found', async () => {
            const mockTx = { referenceId: 'ref1' };
            mockTransactionRepo.findByReferenceId.mockResolvedValue(mockTx as any);
            const result = await service.getReceipt('ref1');
            expect(result).toEqual(mockTx);
        });

        it('should throw an error if transaction is not found', async () => {
            mockTransactionRepo.findByReferenceId.mockResolvedValue(null);
            await expect(service.getReceipt('ref-not-found')).rejects.toThrow('Transaction not found.');
        });
    });

    describe('cashIn', () => {
        it('should complete successfully, create a transaction, and invalidate cache', async () => {
            mockPaymentProvider.initiateDeposit.mockResolvedValue(providerSuccessResponse);
            const mockCreatedTx = { id: 1, amount: '100.00' };
            mockTransactionRepo.createAndUpdateBalance.mockResolvedValue({ newTransaction: mockCreatedTx } as any);

            const {newTransaction} = await service.cashIn(walletId, amount);

            expect(mockPaymentProvider.initiateDeposit).toHaveBeenCalledWith(amount, mockWallet.currency);
            expect(mockTransactionRepo.createAndUpdateBalance).toHaveBeenCalledWith(expect.objectContaining({
                type: 'cash_in',
                status: 'completed',
                externalProviderId: providerSuccessResponse.providerTransactionId,
            }));
            expect(mockCache.del).toHaveBeenCalledWith(`wallet:${walletId}:balance`);
            expect(newTransaction).toEqual(mockCreatedTx);
        });

        it('should throw an error and not touch the DB if payment provider fails', async () => {
            const providerError = new Error('Provider Timeout');
            mockPaymentProvider.initiateDeposit.mockRejectedValue(providerError);

            await expect(service.cashIn(walletId, amount)).rejects.toThrow(`Payment provider failed: ${providerError.message}`);

            expect(mockTransactionRepo.createAndUpdateBalance).not.toHaveBeenCalled();
            expect(mockCache.del).not.toHaveBeenCalled();
        });
    });

    describe('cashOut', () => {
        const pendingTxResult = {
            newTransaction: { id: 1, status: 'pending', referenceId: 'mock-reference-id' },
            updatedWallet: { id: walletId, balance: '900.00', currency: 'USD' }
        };
        const completedTx = { id: 1, status: 'completed' };

        beforeEach(() => {
            // Setup the initial debit call
            mockTransactionRepo.createAndUpdateBalance.mockResolvedValue(pendingTxResult as any);
        });

        it('should complete successfully, check alerts, and update transaction to completed', async () => {
            mockPaymentProvider.initiateWithdrawal.mockResolvedValue(providerSuccessResponse);
            mockTransactionRepo.updateStatus.mockResolvedValue(completedTx as any);

            const result = await service.cashOut(agentId, amount);

            // 1. Debit and create pending tx
            expect(mockTransactionRepo.createAndUpdateBalance).toHaveBeenCalledTimes(1);
            expect(mockTransactionRepo.createAndUpdateBalance).toHaveBeenCalledWith(expect.objectContaining({
                status: 'pending',
                type: 'cash_out'
            }));

            // 2. Invalidate cache
            expect(mockCache.del).toHaveBeenCalledWith(`wallet:${agentId}:balance`);

            // 3. Trigger alert check with NEW balance
            expect(mockAlertService.checkForLowBalance).toHaveBeenCalledWith(agentId, 900.00, 'USD');

            // 4. Call provider
            expect(mockPaymentProvider.initiateWithdrawal).toHaveBeenCalledWith(amount, mockWallet.currency);

            // 5. Update transaction to completed
            expect(mockTransactionRepo.updateStatus).toHaveBeenCalledWith('mock-reference-id', 'completed', providerSuccessResponse.providerTransactionId);

            expect(result).toEqual(completedTx);
        });

        it('should refund agent and mark tx as failed if provider fails', async () => {
            const providerError = new Error('Withdrawal rejected');
            mockPaymentProvider.initiateWithdrawal.mockRejectedValue(providerError);

            // The second createAndUpdateBalance is the refund
            mockTransactionRepo.createAndUpdateBalance.mockResolvedValueOnce(pendingTxResult as any) // Initial debit
                .mockResolvedValueOnce({} as any); // Refund credit

            await expect(service.cashOut(agentId, amount)).rejects.toThrow(`Withdrawal failed and funds have been returned to your wallet. Reason: ${providerError.message}`);

            // 1. Initial debit
            expect(mockTransactionRepo.createAndUpdateBalance).toHaveBeenCalledWith(expect.objectContaining({ type: 'cash_out' }));

            // 2. Call provider (which fails)
            expect(mockPaymentProvider.initiateWithdrawal).toHaveBeenCalled();

            // 3. Refund (compensating transaction)
            expect(mockTransactionRepo.createAndUpdateBalance).toHaveBeenCalledWith(expect.objectContaining({
                type: 'credit',
                description: 'Refund for failed cash-out ref: mock-reference-id'
            }));

            // 4. Mark original tx as FAILED
            expect(mockTransactionRepo.updateStatus).toHaveBeenCalledWith('mock-reference-id', 'failed');

            // 5. Cache invalidated twice (after debit, after refund)
            expect(mockCache.del).toHaveBeenCalledTimes(2);
            expect(mockCache.del).toHaveBeenCalledWith(`wallet:${agentId}:balance`);
        });
    });
});