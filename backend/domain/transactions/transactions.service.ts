import {v4 as uuidv4} from 'uuid';
import {IWalletRepository} from '../wallet/wallet.repository';
import {ITransactionRepository} from './transactions.repository';
import {InMemoryClient} from '../../platform/in-memory/in-memory.client';
import {IPaymentProvider} from "../../platform/payments/mock.provider";
import {IAlertService} from "../../domain/alerts/alert.service";

function getBalanceCacheKey(walletId: number): string {
    return `wallet:${walletId}:balance`;
}

export abstract class ITransactionService {
    /**
     * Fetches a transaction by its public reference ID to display as a receipt.
     */
    abstract getReceipt(referenceId: string): Promise<any>;

    /**
     * Initiates a cash-in transaction, calling the payment provider and updating the wallet balance.
     */
    abstract cashIn(userId: number, amount: number): Promise<any>;

    /**
     * Initiates a cash-out transaction, calling the payment provider and updating the wallet balance.
     * If the provider fails, it refunds the user.
     */
    abstract cashOut(userId: number, amount: number): Promise<any>;

}

export class TransactionService extends ITransactionService {
    constructor(
        private readonly transactionRepo: ITransactionRepository,
        private readonly walletRepo: IWalletRepository,
        private readonly paymentProvider: IPaymentProvider,
        private readonly cache: InMemoryClient,
        private readonly alertService: IAlertService
    ) {
        super()
    }

    /**
     * Fetches a transaction by its public reference ID to display as a receipt.
     */
    public async getReceipt(referenceId: string) {
        const transaction = await this.transactionRepo.findByReferenceId(referenceId);
        if (!transaction) {
            throw new Error('Transaction not found.');
        }
        return transaction;
    }

    public async cashIn(walletId: number, amount: number) {
        const referenceId = uuidv4();
        const wallet = await this.walletRepo.findWalletById(walletId);

        // No initial DB record here. We only act after the provider confirms.

        try {
            // 1. Call the external provider
            const providerResponse = await this.paymentProvider.initiateDeposit(amount, wallet.currency);

            // 2. On provider success, perform our atomic DB update
            const transaction = await this.transactionRepo.createAndUpdateBalance({
                referenceId,
                walletId: wallet.id,
                amount: amount.toFixed(4),
                currency: wallet.currency,
                type: 'cash_in',
                status: 'completed',
                externalProviderId: providerResponse.providerTransactionId,
                description: `Cash-in of ${amount} ${wallet.currency}`
            });

            // 3. Invalidate Redis cache on success
            await this.cache.del(getBalanceCacheKey(walletId));

            return transaction; // This is the digital receipt
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error occurred');
            // If the provider fails, we don't touch our DB or cache.
            console.error(`[TransactionService] Cash-in failed for user ${walletId}:`, error);
            throw new Error(`Payment provider failed: ${err.message}`);
        }
    }

    public async cashOut(userId: number, amount: number) {
        const referenceId = uuidv4();
        const wallet = await this.walletRepo.findWalletById(userId);

        // 1. Atomically debit funds and create a PENDING transaction record.
        // This reserves the funds and prevents double-spending.
        const {updatedWallet, newTransaction} = await this.transactionRepo.createAndUpdateBalance({
            referenceId,
            walletId: wallet.id,
            amount: amount.toFixed(4),
            currency: wallet.currency,
            type: 'cash_out',
            status: 'pending', // IMPORTANT: Status is pending
            description: `Cash-out of ${amount} ${wallet.currency}`
        });

        // 2. Invalidate cache immediately since balance has changed.
        await this.cache.del(getBalanceCacheKey(userId));

        /// 3. trigger alert check
        await this.alertService.checkForLowBalance(userId, parseFloat(updatedWallet.balance), updatedWallet.currency);

        try {
            // 3. Call the external provider
            const providerResponse = await this.paymentProvider.initiateWithdrawal(amount, wallet.currency);

            // 4. On provider success, mark our transaction as COMPLETED
            const completedTx = await this.transactionRepo.updateStatus(
                referenceId,
                'completed',
                providerResponse.providerTransactionId
            );

            return completedTx; // The digital receipt
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error occurred');
            // 5. On provider failure, we must REFUND the user.
            console.error(`[TransactionService] Cash-out failed for user ${userId}, initiating refund:`, error);

            // Create a compensating transaction (credit) to refund the user
            await this.transactionRepo.createAndUpdateBalance({
                referenceId: uuidv4(), // A new reference for the refund itself
                walletId: wallet.id,
                amount: amount.toFixed(4),
                currency: wallet.currency,
                type: 'credit', // Type is 'credit', not 'cash_in'
                status: 'completed',
                description: `Refund for failed cash-out ref: ${referenceId}`
            });

            // Mark the original cash-out transaction as FAILED
            await this.transactionRepo.updateStatus(referenceId, 'failed');

            // Invalidate cache again because balance has changed due to the refund
            await this.cache.del(getBalanceCacheKey(userId));

            throw new Error(`Withdrawal failed and funds have been returned to your wallet. Reason: ${err.message}`);
        }
    }
}