
import { Request, Response } from 'express';
import { WalletController } from './wallet.controller';
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
      req = { user: { sub: 1 } }; // Mock user from JWT
      const balanceData = { balance: '100.0000', source: 'db' as "cache" | "db" };
      mockWalletService.getBalance.mockResolvedValue(balanceData);

      await walletController.getBalance(req as Request, res);

      expect(mockWalletService.getBalance).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(balanceData);
    });

    it('should return 500 if the service throws an error', async () => {
        req = { user: { sub: 1 } };
        const errorMessage = 'Database error';
        mockWalletService.getBalance.mockRejectedValue(new Error(errorMessage));
  
        await walletController.getBalance(req as Request, res);
  
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
      });
  });

  describe('POST /credit', () => {
    it('should credit the wallet and return a success message', async () => {
      req = { user: { sub: 1 }, body: { amount: 50, description: 'Deposit' } };
      const updatedWallet = { id: 1, userId: 1, balance: '150.0000', createdAt: new Date() };
      mockWalletService.credit.mockResolvedValue(updatedWallet);

      await walletController.credit(req as Request, res);

      expect(mockWalletService.credit).toHaveBeenCalledWith(1, 50, 'Deposit');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Credit successful', wallet: updatedWallet });
    });

    it('should return 400 for an invalid credit amount', async () => {
        req = { user: { sub: 1 }, body: { amount: -10 } };
  
        await walletController.credit(req as Request, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid amount provided.' });
        expect(mockWalletService.credit).not.toHaveBeenCalled();
      });
  });

  describe('POST /debit', () => {
    it('should debit the wallet and return a success message', async () => {
        req = { user: { sub: 1 }, body: { amount: 30, description: 'Withdrawal' } };
        const updatedWallet = { id: 1, userId: 1, balance: '120.0000', createdAt: new Date() };
        mockWalletService.debit.mockResolvedValue(updatedWallet);
  
        await walletController.debit(req as Request, res);
  
        expect(mockWalletService.debit).toHaveBeenCalledWith(1, 30, 'Withdrawal');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Debit successful', wallet: updatedWallet });
      });

      it('should return 400 if the service throws an error (e.g. insufficient funds)', async () => {
        req = { user: { sub: 1 }, body: { amount: 200, description: 'Large Withdrawal' } };
        const errorMessage = 'Insufficient funds';
        mockWalletService.debit.mockRejectedValue(new Error(errorMessage));
  
        await walletController.debit(req as Request, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
      });
  });

  describe('GET /history', () => {
    it('should return the transaction history', async () => {
        req = { user: { sub: 1 } };
        const history = [{ id: 1, walletId: 1, amount: '50.0000', type: 'credit', description: 'Deposit', createdAt: new Date() }];
        mockWalletService.getTransactionHistory.mockResolvedValue(history);
  
        await walletController.getHistory(req as Request, res);
  
        expect(mockWalletService.getTransactionHistory).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(history);
      });

      it('should return 500 if the service throws an error', async () => {
        req = { user: { sub: 1 } };
        const errorMessage = 'Failed to fetch history';
        mockWalletService.getTransactionHistory.mockRejectedValue(new Error(errorMessage));
  
        await walletController.getHistory(req as Request, res);
  
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
      });
  });
});
