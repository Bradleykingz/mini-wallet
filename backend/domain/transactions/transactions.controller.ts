import { Request, Response } from 'express';
import {TransactionService} from "./transactions.service";
import {IWalletService} from "../wallet/wallet.service";

export class TransactionsController {
    constructor(private transactionService: TransactionService, private walletRepository: IWalletService) {}

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
            const agentId = req.agent.id;

            const { amount, type } = req.body; // type: 'cashIn' | 'cashOut'

            if (typeof amount !== 'number' || amount <= 0) {
                res.status(400).json({ message: 'Invalid amount provided.' });
                return;
            }

            if (type !== 'cash_out' && type !== 'cash_in') {
                res.status(400).json({ message: 'Invalid transaction type.' });
                return;
            }

            const wallet = await this.walletRepository.findOrCreateWalletByAgentId(agentId);

            let result;
            if (type === 'cash_in') {
                result = await this.transactionService.cashIn(wallet.id, amount);
                res.status(201).json({ ...result });
            } else {
                result = await this.transactionService.cashOut(wallet.id, amount);
                res.status(200).json({ ...result });
            }
        } catch (error: any) {
            console.error("error while processing transaction", error);
            res.status(400).json({ message: error.message });
        }
    }

}