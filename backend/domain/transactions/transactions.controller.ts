import { Request, Response } from 'express';
import {TransactionService} from "../../domain/transactions/transactions.service";

export class TransactionController {
    constructor(private transactionService: TransactionService) {}

    async getReceipt(req: Request, res: Response): Promise<void> {
        try {
            const { referenceId } = req.params;
            const receipt = await this.transactionService.getReceipt(referenceId);
            res.status(200).json(receipt);
        } catch (error: any) {
            res.status(404).json({ message: error.message });
        }
    }

    async cashIn(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user.sub;
            const { amount } = req.body;
            if (typeof amount !== 'number' || amount <= 0) {
                res.status(400).json({ message: 'Invalid amount provided.' });
                return;
            }
            const transaction = await this.transactionService.cashIn(userId, amount);
            res.status(201).json({ message: 'Cash-in successful.', receipt: transaction });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    async cashOut(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user.sub;
            const { amount } = req.body;
            if (typeof amount !== 'number' || amount <= 0) {
                res.status(400).json({ message: 'Invalid amount provided.' });
                return;
            }
            const transaction = await this.transactionService.cashOut(userId, amount);
            res.status(200).json({ message: 'Cash-out initiated successfully.', receipt: transaction });
        } catch (error: any) {
            // Handle specific errors like 'Insufficient funds' vs provider failure
            res.status(400).json({ message: error.message });
        }
    }
}