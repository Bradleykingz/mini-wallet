import { Request, Response } from 'express';
import {TransactionService} from "./transactions.service";

export class TransactionsController {
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

    async transact(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user.sub;
            const { amount, type } = req.body; // type: 'cashIn' | 'cashOut'

            if (typeof amount !== 'number' || amount <= 0) {
                res.status(400).json({ message: 'Invalid amount provided.' });
                return;
            }

            if (type !== 'cash_out' && type !== 'cash_in') {
                res.status(400).json({ message: 'Invalid transaction type.' });
                return;
            }

            let transaction;
            if (type === 'cash_in') {
                transaction = await this.transactionService.cashIn(userId, amount);
                res.status(201).json({ message: 'Cash-in successful.', receipt: transaction });
            } else {
                transaction = await this.transactionService.cashOut(userId, amount);
                res.status(200).json({ message: 'Cash-out initiated successfully.', receipt: transaction });
            }
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

}