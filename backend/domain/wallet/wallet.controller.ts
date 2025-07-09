import { Request, Response } from 'express';
import {IWalletService} from "./wallet.service";

export class WalletController {
    constructor(private walletService: IWalletService) {}

    async getBalance(req: Request, res: Response): Promise<void> {
        try {
            const agentId = req.agent.id;
            const { id: walletId } = await this.walletService.findOrCreateWalletByAgentId(agentId);
            const balanceData = await this.walletService.getBalance(walletId);
            res.status(200).json(balanceData);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
    // perform debit or credit operations
    async transact(req: Request, res: Response): Promise<void> {
        try {
            const { amount, description, type } = req.body;

            if (typeof amount !== 'number' || amount <= 0) {
                res.status(400).json({ message: 'Invalid amount provided.' });
                return;
            }

            const agentId = req.agent.id;
            const {id: walletId} = await this.walletService.findOrCreateWalletByAgentId(agentId);

            let updatedWallet;
            if (type === 'credit') {
                updatedWallet = await this.walletService.credit(walletId, amount, description);
            } else if (type === 'debit') {
                updatedWallet = await this.walletService.debit(walletId, amount, description);
            } else {
                res.status(400).json({ message: 'Invalid transaction type.' });
                return;
            }

            res.status(200).json({ ...updatedWallet });
        } catch (e) {
            res.status(500).json({ message: e });
        }
    }

    async getHistory(req: Request, res: Response): Promise<void> {
        try {

            const agentId = req.agent.id;
            const { id: walletId } = await this.walletService.findOrCreateWalletByAgentId(agentId);
            const history = await this.walletService.getTransactionHistory(walletId);
            res.status(200).json(history);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}