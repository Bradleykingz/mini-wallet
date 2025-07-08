import { Request, Response } from 'express';
import {IWalletService} from "../../domain/wallet/wallet.service";

export class WalletController {
    constructor(private walletService: IWalletService) {}

    async getBalance(req: Request, res: Response): Promise<void> {
        try {
            const walletId = parseInt(req.params.walletId);
            const balanceData = await this.walletService.getBalance(walletId);
            res.status(200).json(balanceData);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
    // perform debit or credit operations
    async transact(req: Request, res: Response): Promise<void> {
        try {
            const walletIdParams = req.params.walletId;
            const walletId = parseInt(walletIdParams)
            const { amount, description, type } = req.body;

            if (typeof amount !== 'number' || amount <= 0) {
                res.status(400).json({ message: 'Invalid amount provided.' });
                return;
            }

            let updatedWallet;
            if (type === 'credit') {
                updatedWallet = await this.walletService.credit(walletId, amount, description);
            } else if (type === 'debit') {
                updatedWallet = await this.walletService.debit(walletId, amount, description);
            } else {
                res.status(400).json({ message: 'Invalid transaction type.' });
                return;
            }

            res.status(200).json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} successful`, wallet: updatedWallet });
        } catch (e) {

        }
    }

    async getHistory(req: Request, res: Response): Promise<void> {
        try {
            const walletId = parseInt(req.params.walletId);
            const history = await this.walletService.getTransactionHistory(walletId);
            res.status(200).json(history);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}