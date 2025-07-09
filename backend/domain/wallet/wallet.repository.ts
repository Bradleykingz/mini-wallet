import {Db} from '../../db';
import {NewTransaction, transactions, wallets} from '../../db/schema';
import {eq} from 'drizzle-orm';
import * as crypto from "crypto";

export abstract class IWalletRepository {
    /**
     * Finds a wallet by agent ID. If it doesn't exist, it creates one.
     * This is useful to ensure every agent has a wallet.
     */
    abstract findOrCreateWalletByAgentId(agentId: number): Promise<typeof wallets.$inferSelect>;

    abstract findWalletById(walletId: number): Promise<typeof wallets.$inferSelect>;

    /**
     * Retrieves a agent's transaction history.
     */
    abstract getTransactionHistory(walletId: number): Promise<typeof transactions.$inferSelect[]>;

    /**
     * Creates a transaction (credit or debit) within a DB transaction to ensure atomicity.
     * This is the most critical part of the repository.
     */
    abstract createTransaction(data: Pick<NewTransaction, 'walletId' | 'type' | 'amount' | 'currency' | 'description'>): Promise<typeof wallets.$inferSelect>;
}

export class WalletRepository extends IWalletRepository {

    constructor(private db: Db) {
        super()
    }

    /**
     * Finds a wallet by agent ID. If it doesn't exist, it creates one.
     * This is useful to ensure every agent has a wallet.
     */
    public async findOrCreateWalletByAgentId(agentId: number) {
        let wallet = await this.db.query.wallets.findFirst({
            where: eq(wallets.agentId, agentId),
        });

        if (!wallet) {
            const [newWallet] = await this.db.insert(wallets).values({agentId}).returning();
            wallet = newWallet;
        }

        return wallet;
    }

    async findWalletById(walletId: number): Promise<typeof wallets.$inferSelect> {
        const wallet = await this.db.query.wallets.findFirst({
            where: eq(wallets.id, walletId),
        });

        if (!wallet) throw new Error('Wallet not found');

        return wallet;
    }

    /**
     * Retrieves a agent's transaction history.
     */
    public async getTransactionHistory(walletId: number) {
        return this.db.query.transactions.findMany({
            where: eq(transactions.walletId, walletId),
            orderBy: (transactions, {desc}) => [desc(transactions.createdAt)],
            limit: 50, // Add pagination in a real app
        });
    }

    /**
     * Creates a transaction (credit or debit) within a DB transaction to ensure atomicity, and updates the wallet's balance.
     * This is the most critical part of the repository.
     */
    public async createTransaction(data: Pick<NewTransaction, 'walletId' | 'type' | 'amount' | 'currency' | 'description'>) {
        return this.db.transaction(async (tx) => {
            // 1. Get the wallet and lock the row for the duration of the transaction
            // to prevent race conditions (e.g., two simultaneous debits).
            const [wallet] = await tx.select().from(wallets).where(eq(wallets.id, data.walletId)).for('update');

            if (!wallet) {
                throw new Error('Wallet not found.');
            }

            const currentBalance = parseFloat(wallet.balance);
            const transactionAmount = parseFloat(data.amount);

            let newBalance: number;

            // 2. Perform transaction logic
            if (data.type === 'debit') {
                if (currentBalance < transactionAmount) {
                    throw new Error('Insufficient funds.');
                }
                newBalance = currentBalance - transactionAmount;
            } else { // Credit
                newBalance = currentBalance + transactionAmount;
            }

            // 3. Update the wallet's balance
            const [updatedWallet] = await tx.update(wallets)
                .set({
                    currency: data.currency,
                    balance: newBalance.toFixed(4), // Store with fixed precision
                    updatedAt: new Date()
                })
                .where(eq(wallets.id, data.walletId))
                .returning();

            const referenceId = crypto.randomUUID();
            // 4. Record the transaction in the audit log
            await tx.insert(transactions).values({
                ...data,
                referenceId,
            });

            return updatedWallet;
        });
    }
}