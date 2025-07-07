import {IWalletService, WalletService} from './wallet.service';
import {IWalletRepository} from './wallet.repository';
import {InMemoryClient} from '../../platform/in-memory/in-memory.client';

// Mock the dependencies
const mockWalletRepository: jest.Mocked<IWalletRepository> = {
    findOrCreateWalletByUserId: jest.fn(),
    findWalletById: jest.fn(),
    createTransaction: jest.fn(),
    getTransactionHistory: jest.fn(),
};

const mockInMemoryClient: jest.Mocked<InMemoryClient> = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
};

describe('WalletService', () => {
    let walletService: IWalletService;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        walletService = new WalletService(mockWalletRepository, mockInMemoryClient);
    });

    describe('getBalance', () => {
        it('should return balance from cache if available', async () => {
            const walletId = 1;
            const cachedBalance = '100.0000';
            mockInMemoryClient.get.mockResolvedValue(JSON.stringify({balance: cachedBalance, currency: "USD"}));

            const result = await walletService.getBalance(walletId);

            expect(result).toEqual({balance: cachedBalance, currency: "USD", source: 'cache'});
            expect(mockInMemoryClient.get).toHaveBeenCalledWith(`wallet:${walletId}:balance`);
            expect(mockWalletRepository.findWalletById).not.toHaveBeenCalled();
        });

        it('should return balance from db and set cache if not available in cache', async () => {
            const userId = 1;
            const wallet = {
                id: 1,
                userId,
                balance: '150.0000',
                createdAt: new Date(),
                updatedAt: new Date(),
                currency: 'USD' as "USD"
            };
            mockInMemoryClient.get.mockResolvedValue(null);
            mockWalletRepository.findWalletById.mockResolvedValue(wallet);

            const result = await walletService.getBalance(userId);

            expect(result).toEqual({balance: wallet.balance, currency: 'USD', source: 'db'});
            expect(mockInMemoryClient.get).toHaveBeenCalledWith(`wallet:${wallet.id}:balance`);
            expect(mockWalletRepository.findWalletById).toHaveBeenCalledWith(userId);
            expect(mockInMemoryClient.set).toHaveBeenCalledWith(`wallet:${wallet.id}:balance`, JSON.stringify({balance: wallet.balance, currency: wallet.currency}), {EX: 300});
        });
    });

    describe('credit', () => {
        it('should throw an error for non-positive credit amount', async () => {
            await expect(walletService.credit(1, 0, 'invalid')).rejects.toThrow('Credit amount must be positive.');
            await expect(walletService.credit(1, -10, 'invalid')).rejects.toThrow('Credit amount must be positive.');
        });

        it('should credit the wallet and update the cache', async () => {
            const userId = 1;
            const amount = 50;
            const description = 'Top-up';
            const wallet = {
                id: 1,
                userId,
                balance: '100.0000',
                createdAt: new Date(),
                updatedAt: new Date(),
                currency: "USD" as "USD"
            };
            const updatedWallet = {...wallet, balance: '150.0000'};

            mockWalletRepository.findOrCreateWalletByUserId.mockResolvedValue(wallet);
            mockWalletRepository.createTransaction.mockResolvedValue(updatedWallet);

            const result = await walletService.credit(userId, amount, description);

            expect(result).toEqual(updatedWallet);
            expect(mockWalletRepository.findOrCreateWalletByUserId).toHaveBeenCalledWith(userId);
            expect(mockWalletRepository.createTransaction).toHaveBeenCalledWith({
                walletId: updatedWallet.id,
                currency: updatedWallet.currency,
                amount: amount.toFixed(4),
                type: 'credit',
                description,
            });
            expect(mockInMemoryClient.set).toHaveBeenCalledWith(`wallet:${wallet.id}:balance`, JSON.stringify({
                balance: updatedWallet.balance,
                currency: updatedWallet.currency
            }), {EX: 300});
        });
    });

    describe('debit', () => {
        it('should throw an error for non-positive debit amount', async () => {
            await expect(walletService.debit(1, 0, 'invalid')).rejects.toThrow('Debit amount must be positive.');
            await expect(walletService.debit(1, -20, 'invalid')).rejects.toThrow('Debit amount must be positive.');
        });

        it('should debit the wallet and update the cache', async () => {
            const walletId = 1;
            const amount = 30;
            const description = 'Purchase';
            const wallet = {
                id: 1,
                userId: walletId,
                balance: '150.0000',
                createdAt: new Date(),
                updatedAt: new Date(),
                currency: "USD" as "USD"
            };
            const updatedWallet = {...wallet, balance: '120.0000'};

            mockWalletRepository.findOrCreateWalletByUserId.mockResolvedValue(wallet);
            mockWalletRepository.createTransaction.mockResolvedValue(updatedWallet);

            const result = await walletService.debit(walletId, amount, description);

            expect(result).toEqual(updatedWallet);
            expect(mockWalletRepository.findOrCreateWalletByUserId).toHaveBeenCalledWith(walletId);
            expect(mockWalletRepository.createTransaction).toHaveBeenCalledWith({
                walletId: wallet.id,
                currency: "USD",
                amount: amount.toFixed(4),
                type: 'debit',
                description,
            });
            expect(mockInMemoryClient.set).toHaveBeenCalledWith(`wallet:${walletId}:balance`, JSON.stringify({
                balance: updatedWallet.balance,
                currency: updatedWallet.currency
            }), {EX: 300});
        });
    });

    describe('getTransactionHistory', () => {
        it('should return the transaction history for a user', async () => {
            const userId = 1;
            const wallet = {
                id: 1,
                userId,
                balance: '120.0000',
                createdAt: new Date(),
                updatedAt: new Date(),
                currency: "USD" as "USD"
            };
            const history = [{
                id: 1,
                walletId: 1,
                amount: '50.0000',
                currency: 'USD' as "USD",
                type: 'credit' as "credit" | "debit",
                description: 'Top-up',
                referenceId: "",
                status: "" as "pending" | "completed" | "failed",
                externalProviderId: "",
                createdAt: new Date(),
                updatedAt: new Date()
            }];

            mockWalletRepository.findOrCreateWalletByUserId.mockResolvedValue(wallet);
            mockWalletRepository.getTransactionHistory.mockResolvedValue(history);

            const result = await walletService.getTransactionHistory(userId);

            expect(result).toEqual(history);
            expect(mockWalletRepository.findOrCreateWalletByUserId).toHaveBeenCalledWith(userId);
            expect(mockWalletRepository.getTransactionHistory).toHaveBeenCalledWith(wallet.id);
        });
    });
});
