import { Request, Response } from 'express';
import {IWalletService} from "@server/domain/wallet/wallet.service";

export class WalletController {
    constructor(private walletService: IWalletService) {}

    async getBalance(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user.sub; // From JWT payload
            const balanceData = await this.walletService.getBalance(userId);
            res.status(200).json(balanceData);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async credit(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user.sub;
            const { amount, description } = req.body;

            if (typeof amount !== 'number' || amount <= 0) {
                res.status(400).json({ message: 'Invalid amount provided.' });
                return;
            }

            const updatedWallet = await this.walletService.credit(userId, amount, description);
            res.status(200).json({ message: 'Credit successful', wallet: updatedWallet });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    async debit(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user.sub;
            const { amount, description } = req.body;

            if (typeof amount !== 'number' || amount <= 0) {
                res.status(400).json({ message: 'Invalid amount provided.' });
                return;
            }

            const updatedWallet = await this.walletService.debit(userId, amount, description);
            res.status(200).json({ message: 'Debit successful', wallet: updatedWallet });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    async getHistory(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user.sub;
            const history = await this.walletService.getTransactionHistory(userId);
            res.status(200).json(history);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}