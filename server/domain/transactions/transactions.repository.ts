import {db} from '@server/db';
import {NewTransaction, Transaction, transactions, wallets} from '@server/db/schema';
import {eq} from 'drizzle-orm';

export abstract class ITransactionRepository {
    /**
     * Finds a transaction by its reference ID.
     * This is useful for checking the status of a transaction.
     */
    abstract findByReferenceId(referenceId: string): Promise<Transaction | null>;

    /**
     * Creates a transaction record and atomically updates the wallet balance.
     * This is the core of our atomic balance update logic.
     */
    abstract createAndUpdateBalance(data: Omit<NewTransaction, 'id' | 'createdAt'>): Promise<{
        newTransaction: Transaction,
        updatedWallet: typeof wallets.$inferSelect
    }>;


    /**
     * Updates the status and provider ID of an existing transaction.
     */
    abstract updateStatus(
        referenceId: string,
        status: 'completed' | 'failed',
        externalProviderId?: string
    ): Promise<Transaction>;

    /**
     * Retrieves a transaction by its public reference ID to display as a receipt.
     */
    abstract getReceipt(referenceId: string): Promise<Transaction>;
}

export class TransactionsRepository extends ITransactionRepository {


    constructor() {
        super();
    }

    async findByReferenceId(referenceId: string): Promise<Transaction | null> {
        const transaction = await db.query.transactions.findFirst({
            where: eq(transactions.referenceId, referenceId),
        });
        return transaction || null;
    }

    /**
     * Creates a transaction record and atomically updates the wallet balance.
     * This is the core of our atomic balance update logic.
     * @returns The newly created transaction.
     */
    public async createAndUpdateBalance(
        data: Omit<NewTransaction, 'id' | 'createdAt'>
    ): Promise<{ newTransaction: Transaction, updatedWallet: typeof wallets.$inferSelect }> {
        return db.transaction(async (tx) => {
            const [wallet] = await tx.select().from(wallets).where(eq(wallets.id, data.walletId)).for('update');
            if (!wallet) throw new Error('Wallet not found.');

            const currentBalance = parseFloat(wallet.balance);
            const transactionAmount = parseFloat(data.amount);
            let newBalance: number;

            if (data.type === 'debit' || data.type === 'cash_out') {
                if (currentBalance < transactionAmount) throw new Error('Insufficient funds.');
                newBalance = currentBalance - transactionAmount;
            } else { // credit or cash_in
                newBalance = currentBalance + transactionAmount;
            }

            const [updatedWallet] = await tx.update(wallets)
                .set({balance: newBalance.toFixed(4), updatedAt: new Date()})
                .where(eq(wallets.id, data.walletId))
                .returning();

            const [newTransaction] = await tx.insert(transactions).values(data).returning();
            return {newTransaction, updatedWallet};
        });
    }

    /**
     * Updates the status and provider ID of an existing transaction.
     */
    public async updateStatus(
        referenceId: string,
        status: 'completed' | 'failed',
        externalProviderId?: string
    ) {
        const [updatedTransaction] = await db.update(transactions)
            .set({status, externalProviderId})
            .where(eq(transactions.referenceId, referenceId))
            .returning();
        return updatedTransaction;
    }

    getReceipt(referenceId: string): Promise<Transaction> {
        throw new Error('Method not implemented.');
    }
}