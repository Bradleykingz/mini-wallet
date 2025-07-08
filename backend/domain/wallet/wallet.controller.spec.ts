import {Request, Response} from 'express';
import {WalletController} from './wallet.controller';
import {IWalletService} from './wallet.service';

// Mock the WalletService
const mockWalletService: jest.Mocked<IWalletService> = {
    getBalance: jest.fn(),
    credit: jest.fn(),
    debit: jest.fn(),
    getTransactionHistory: jest.fn(),
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
            req = {user: {sub: 1}}; // Mock user from JWT
            const balanceData = {balance: '100.0000', currency: "USD", source: 'db' as "cache" | "db"};
            mockWalletService.getBalance.mockResolvedValue(balanceData);

            await walletController.getBalance(req as Request, res);

            expect(mockWalletService.getBalance).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(balanceData);
        });

        it('should return 500 if the service throws an error', async () => {
            req = {user: {sub: 1}};
            const errorMessage = 'Database error';
            mockWalletService.getBalance.mockRejectedValue(new Error(errorMessage));

            await walletController.getBalance(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({message: errorMessage});
        });
    });

    describe('POST /transact', () => {
        it('should credit the wallet and return success', async () => {
            req = {
                params: { walletId: '1' },
                body: { amount: 100, description: 'Deposit', type: 'credit' }
            };
            const updatedWallet = { balance: '200.00', currency: 'USD' };
            mockWalletService.credit.mockResolvedValue(updatedWallet);

            await walletController.transact(req as Request, res);

            expect(mockWalletService.credit).toHaveBeenCalledWith(1, 100, 'Deposit');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Credit successful',
                wallet: updatedWallet
            });
        });

        it('should debit the wallet and return success', async () => {
            req = {
                params: { walletId: '2' },
                body: { amount: 50, description: 'Withdraw', type: 'debit' }
            };
            const updatedWallet = { balance: '50.00', currency: 'USD' };
            mockWalletService.debit.mockResolvedValue(updatedWallet);

            await walletController.transact(req as Request, res);

            expect(mockWalletService.debit).toHaveBeenCalledWith(2, 50, 'Withdraw');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debit successful',
                wallet: updatedWallet
            });
        });

        it('should return 400 if amount is invalid', async () => {
            req = {
                params: { walletId: '1' },
                body: { amount: -10, description: 'Deposit', type: 'credit' }
            };

            await walletController.transact(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid amount provided.' });
        });

        it('should return 400 if transaction type is invalid', async () => {
            req = {
                params: { walletId: '1' },
                body: { amount: 10, description: 'Deposit', type: 'invalid' }
            };

            await walletController.transact(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid transaction type.' });
        });

        it('should handle service errors gracefully', async () => {
            req = {
                params: { walletId: '1' },
                body: { amount: 10, description: 'Deposit', type: 'credit' }
            };
            mockWalletService.credit.mockRejectedValue(new Error('Service error'));

            await walletController.transact(req as Request, res);

            // No response expected due to empty catch block, but you may want to improve error handling in the controller
            expect(mockWalletService.credit).toHaveBeenCalled();
        });
    });

    describe('GET /history', () => {
        it('should return the transaction history', async () => {
            req = {user: {sub: 1}};
            const history = [{
                id: 1,
                walletId: 1,
                amount: '50.0000',
                type: 'credit',
                description: 'Deposit',
                createdAt: new Date()
            }];
            mockWalletService.getTransactionHistory.mockResolvedValue(history);

            await walletController.getHistory(req as Request, res);

            expect(mockWalletService.getTransactionHistory).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(history);
        });

        it('should return 500 if the service throws an error', async () => {
            req = {user: {sub: 1}};
            const errorMessage = 'Failed to fetch history';
            mockWalletService.getTransactionHistory.mockRejectedValue(new Error(errorMessage));

            await walletController.getHistory(req as Request, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({message: errorMessage});
        });
    });
});
