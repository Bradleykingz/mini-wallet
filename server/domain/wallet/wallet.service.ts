import {IWalletRepository, WalletRepository} from "@server/domain/wallet/wallet.repository";
import {InMemoryClient} from "@server/platform/in-memory/in-memory.client";

const CACHE_TTL_SECONDS = 60 * 5; // 5 minutes

function getBalanceCacheKey(userId: number): string {
    return `wallet:balance:${userId}`;
}

export abstract class IWalletService {
    abstract getBalance(userId: number): Promise<{ balance: string, source: 'cache' | 'db' }>;
    abstract credit(userId: number, amount: number, description?: string): Promise<any>;
    abstract debit(userId: number, amount: number, description?: string): Promise<any>;
    abstract getTransactionHistory(userId: number): Promise<any>;
}

export class WalletService extends IWalletService {

    constructor(private readonly walletRepository: IWalletRepository,
                        private readonly inMemoryClient: InMemoryClient) {
        super()
    }

    /**
     * Gets the wallet balance. Tries cache first, then falls back to the database.
     */
    public async getBalance(userId: number): Promise<{ balance: string, source: 'cache' | 'db' }> {
        const cacheKey = getBalanceCacheKey(userId);

        const cachedBalance = await this.inMemoryClient.get(cacheKey);
        if (cachedBalance) {
            return {balance: cachedBalance, source: 'cache'};
        }

        const wallet = await this.walletRepository.findOrCreateWalletByUserId(userId);

        // Store the fresh balance in the cache
        await this.inMemoryClient.set(cacheKey, wallet.balance, {EX: CACHE_TTL_SECONDS});

        return {balance: wallet.balance, source: 'db'};
    }

    /**
     * Handles a credit transaction and updates the cache.
     */
    public async credit(userId: number, amount: number, description?: string) {
        if (amount <= 0) {
            throw new Error('Credit amount must be positive.');
        }

        const wallet = await this.walletRepository.findOrCreateWalletByUserId(userId);

        const updatedWallet = await this.walletRepository.createTransaction({
            walletId: wallet.id,
            amount: amount.toFixed(4),
            type: 'credit',
            description,
        });

        // Update cache with the new balance
        await this.inMemoryClient.set(getBalanceCacheKey(userId), updatedWallet.balance, {EX: CACHE_TTL_SECONDS});

        return updatedWallet;
    }

    /**
     * Handles a debit transaction and updates the cache.
     */
    public async debit(userId: number, amount: number, description?: string) {
        if (amount <= 0) {
            throw new Error('Debit amount must be positive.');
        }

        const wallet = await this.walletRepository.findOrCreateWalletByUserId(userId);

        const updatedWallet = await this.walletRepository.createTransaction({
            walletId: wallet.id,
            amount: amount.toFixed(4),
            type: 'debit',
            description,
        });

        // Update cache with the new balance
        await this.inMemoryClient.set(getBalanceCacheKey(userId), updatedWallet.balance, {EX: CACHE_TTL_SECONDS});

        return updatedWallet;
    }

    /**
     * Gets transaction history for a user.
     */
    public async getTransactionHistory(userId: number) {
        const wallet = await this.walletRepository.findOrCreateWalletByUserId(userId);
        return this.walletRepository.getTransactionHistory(wallet.id);
    }
}