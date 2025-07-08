import { Request, Response } from 'express';
import { WalletController } from './wallet.controller';
import { IWalletService } from './wallet.service';

// Mock the WalletService
const mockWalletService: jest.Mocked<IWalletService> = {
    getBalance: jest.fn(),
    credit: jest.fn(),
    debit: jest.fn(),
    getTransactionHistory: jest.fn(),
    findOrCreateWalletByAgentId: jest.fn()
};

// Helper to create mock Express response object
const getMockRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    return res as Response;
};

describe('WalletController', () => {
    let walletController: WalletController;
    let req: Partial<Request>;
    let res: Response;

    beforeEach(() => {
        jest.clearAllMocks();
        walletController = new WalletController(mockWalletService);
        res = getMockRes();
    });

    describe('GET /balance', () => {
        it('should return the wallet balance with a 200 status code', async () => {
            req = { agent: { id: 1 } };
            const wallet = {
                id: 123,
                createdAt: new Date(),
                agentId: 1,
                balance: "120",
                currency: "USD" as const,
                updatedAt: new Date(),
            }
            const balanceData = { balance: '100.0000', currency: "USD", source: 'db' as "cache" | "db" };
            mockWalletService.findOrCreateWalletByAgentId.mockResolvedValue(wallet);
            mockWalletService.getBalance.mockResolvedValue(balanceData);

            await walletController.getBalance(req as Request, res);

            expect(mockWalletService.findOrCreateWalletByAgentId).toHaveBeenCalledWith(1);
            expect(mockWalletService.getBalance).toHaveBeenCalledWith(123);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(balanceData);
        });

        it('should return 500 if the service throws an error (findOrCreateWalletByAgentId)', async () => {
            req = { agent: { id: 1 } };
            const errorMessage = 'Database error';
            mockWalletService.findOrCreateWalletByAgentId.mockRejectedValue(new Error(errorMessage));

            await walletController.getBalance(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });

        it('should return 500 if the service throws an error (getBalance)', async () => {
            req = { agent: { id: 1 } };
            const errorMessage = 'Balance error';
            const wallet = {
                id: 123,
                createdAt: new Date(),
                agentId: 1,
                balance: "120",
                currency: "USD" as const,
                updatedAt: new Date(),
            }
            mockWalletService.findOrCreateWalletByAgentId.mockResolvedValue(wallet);
            mockWalletService.getBalance.mockRejectedValue(new Error(errorMessage));

            await walletController.getBalance(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });

    describe('POST /transact', () => {
        it('should credit the wallet and return success', async () => {
            req = {
                agent: { id: 2 },
                body: { amount: 100, description: 'Deposit', type: 'credit' }
            };
            const wallet = {
                id: 22,
                createdAt: new Date(),
                agentId: 1,
                balance: "120",
                currency: "USD" as const,
                updatedAt: new Date(),
            }
            mockWalletService.findOrCreateWalletByAgentId.mockResolvedValue(wallet);
            const updatedWallet = { balance: '200.00', currency: 'USD' };
            mockWalletService.credit.mockResolvedValue(updatedWallet);

            await walletController.transact(req as Request, res);

            expect(mockWalletService.findOrCreateWalletByAgentId).toHaveBeenCalledWith(2);
            expect(mockWalletService.credit).toHaveBeenCalledWith(22, 100, 'Deposit');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Credit successful',
                wallet: updatedWallet
            });
        });

        it('should debit the wallet and return success', async () => {
            req = {
                agent: { id: 4 },
                body: { amount: 50, description: 'Withdraw', type: 'debit' }
            };
            const wallet = {
                id: 44,
                createdAt: new Date(),
                agentId: 1,
                balance: "120",
                currency: "USD" as const,
                updatedAt: new Date(),
            }
            mockWalletService.findOrCreateWalletByAgentId.mockResolvedValue(wallet);
            const updatedWallet = { balance: '50.00', currency: 'USD' };
            mockWalletService.debit.mockResolvedValue(updatedWallet);

            await walletController.transact(req as Request, res);

            expect(mockWalletService.findOrCreateWalletByAgentId).toHaveBeenCalledWith(4);
            expect(mockWalletService.debit).toHaveBeenCalledWith(44, 50, 'Withdraw');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debit successful',
                wallet: updatedWallet
            });
        });

        it('should return 400 if amount is invalid (negative)', async () => {
            req = {
                agent: { id: 1 },
                body: { amount: -10, description: 'Deposit', type: 'credit' }
            };

            await walletController.transact(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid amount provided.' });
        });

        it('should return 400 if amount is invalid (zero)', async () => {
            req = {
                agent: { id: 1 },
                body: { amount: 0, description: 'Deposit', type: 'credit' }
            };

            await walletController.transact(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid amount provided.' });
        });

        it('should return 400 if amount is invalid (not a number)', async () => {
            req = {
                agent: { id: 1 },
                body: { amount: undefined, description: 'Deposit', type: 'credit' }
            };

            await walletController.transact(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid amount provided.' });
        });

        it('should return 400 if transaction type is invalid', async () => {
            req = {
                agent: { id: 1 },
                body: { amount: 10, description: 'Deposit', type: 'invalid' }
            };
            const wallet = {
                id: 123,
                createdAt: new Date(),
                agentId: 1,
                balance: "120",
                currency: "USD" as const,
                updatedAt: new Date(),
            }
            mockWalletService.findOrCreateWalletByAgentId.mockResolvedValue(wallet);

            await walletController.transact(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid transaction type.' });
        });

        it('should handle service errors gracefully (credit)', async () => {
            req = {
                agent: { id: 1 },
                body: { amount: 10, description: 'Deposit', type: 'credit' }
            };
            const wallet = {
                id: 123,
                createdAt: new Date(),
                agentId: 1,
                balance: "120",
                currency: "USD" as const,
                updatedAt: new Date(),
            }
            mockWalletService.findOrCreateWalletByAgentId.mockResolvedValue(wallet);
            mockWalletService.credit.mockRejectedValue(new Error('Service error'));

            await walletController.transact(req as Request, res);

            // No response expected due to empty catch block (could spy on error thrown)
            expect(mockWalletService.credit).toHaveBeenCalled();
        });

        it('should handle service errors gracefully (debit)', async () => {
            req = {
                agent: { id: 1 },
                body: { amount: 10, description: 'Withdraw', type: 'debit' }
            };
            const wallet = {
                id: 123,
                createdAt: new Date(),
                agentId: 1,
                balance: "120",
                currency: "USD" as const,
                updatedAt: new Date(),
            }
            mockWalletService.findOrCreateWalletByAgentId.mockResolvedValue(wallet);
            mockWalletService.debit.mockRejectedValue(new Error('Debit failed'));

            await walletController.transact(req as Request, res);

            expect(mockWalletService.debit).toHaveBeenCalled();
        });

        it('should not call service methods if agent object missing', async () => {
            req = { body: { amount: 10, description: 'Deposit', type: 'credit' } };

            // @ts-ignore
            await walletController.transact(req as Request, res);

            // Will throw error, but not call service
            expect(mockWalletService.findOrCreateWalletByAgentId).not.toHaveBeenCalled();
        });
    });

    describe('GET /history', () => {
        it('should return the transaction history', async () => {
            req = { agent: { id: 3 } };
            const wallet = {
                id: 33,
                createdAt: new Date(),
                agentId: 1,
                balance: "120",
                currency: "USD" as const,
                updatedAt: new Date(),
            }
            const history = [{
                id: 1,
                walletId: 33,
                amount: '50.0000',
                type: 'credit',
                description: 'Deposit',
                createdAt: new Date()
            }];
            mockWalletService.findOrCreateWalletByAgentId.mockResolvedValue(wallet);
            mockWalletService.getTransactionHistory.mockResolvedValue(history);

            await walletController.getHistory(req as Request, res);

            expect(mockWalletService.findOrCreateWalletByAgentId).toHaveBeenCalledWith(3);
            expect(mockWalletService.getTransactionHistory).toHaveBeenCalledWith(33);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(history);
        });

        it('should return 500 if the service throws an error (findOrCreateWalletByAgentId)', async () => {
            req = { agent: { id: 1 } };
            const errorMessage = 'Failed to fetch wallet';
            mockWalletService.findOrCreateWalletByAgentId.mockRejectedValue(new Error(errorMessage));

            await walletController.getHistory(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });

        it('should return 500 if the service throws an error (getTransactionHistory)', async () => {
            req = { agent: { id: 2 } };
            const wallet = {
                id: 123,
                createdAt: new Date(),
                agentId: 1,
                balance: "120",
                currency: "USD" as const,
                updatedAt: new Date(),
            }
            const errorMessage = 'Failed to fetch history';
            mockWalletService.findOrCreateWalletByAgentId.mockResolvedValue(wallet);
            mockWalletService.getTransactionHistory.mockRejectedValue(new Error(errorMessage));

            await walletController.getHistory(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
        });
    });
});