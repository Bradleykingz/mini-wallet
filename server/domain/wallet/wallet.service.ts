import {IWalletRepository} from "@server/domain/wallet/wallet.repository";
import {InMemoryClient} from "@server/platform/in-memory/in-memory.client";

const CACHE_TTL_SECONDS = 60 * 5; // 5 minutes

function getBalanceCacheKey(walletId: number): string {
    return `wallet:${walletId}:balance`;
}

export abstract class IWalletService {
    abstract getBalance(userId: number): Promise<{ balance: string, currency: string, source: 'cache' | 'db' }>;

    abstract credit(userId: number, amount: number, description?: string): Promise<any>;

    abstract debit(userId: number, amount: number, description?: string): Promise<any>;

    abstract getTransactionHistory(userId: number): Promise<any>;
}

// Define a type for our cached object for better clarity
type CachedBalance = {
    balance: string;
    currency: string;
};

export class WalletService extends IWalletService {
    constructor(
        private readonly walletRepository: IWalletRepository,
        private readonly inMemoryClient: InMemoryClient
    ) {
        super()
    }

    /**
     * Gets the wallet balance and currency. Tries cache first.
     */
    public async getBalance(walletId: number): Promise<{ balance: string; currency: string; source: 'cache' | 'db' }> {
        const cacheKey = getBalanceCacheKey(walletId);
        const cachedData = await this.inMemoryClient.get(cacheKey);

        if (cachedData) {
            const {balance, currency} = JSON.parse(cachedData) as CachedBalance;
            return {balance, currency, source: 'cache'};
        }

        const wallet = await this.walletRepository.findWalletById(walletId);
        const dataToCache: CachedBalance = {balance: wallet.balance, currency: wallet.currency};

        // Store the fresh balance and currency in the cache as a JSON string
        await this.inMemoryClient.set(cacheKey, JSON.stringify(dataToCache), {EX: CACHE_TTL_SECONDS});

        return {balance: wallet.balance, currency: wallet.currency, source: 'db'};
    }

    /**
     * Handles a credit transaction and updates the cache.
     */
    public async credit(walletId: number, amount: number, description?: string) {
        if (amount <= 0) {
            throw new Error('Credit amount must be positive.');
        }

        const wallet = await this.walletRepository.findWalletById(walletId);

        const updatedWallet = await this.walletRepository.createTransaction({
            walletId: wallet.id,
            amount: amount.toFixed(4),
            type: 'credit',
            currency: wallet.currency,
            description,
        });

        // Update cache with the new balance and currency
        const dataToCache: CachedBalance = {
            balance: updatedWallet.balance,
            currency: updatedWallet.currency
        };
        await this.inMemoryClient.set(getBalanceCacheKey(wallet.id), JSON.stringify(dataToCache), {EX: CACHE_TTL_SECONDS});

        return updatedWallet;
    }

    /**
     * Handles a debit transaction and updates the cache.
     */
    public async debit(walletId: number, amount: number, description?: string) {
        if (amount <= 0) {
            throw new Error('Debit amount must be positive.');
        }

        const wallet = await this.walletRepository.findWalletById(walletId);

        const updatedWallet = await this.walletRepository.createTransaction({
            walletId: wallet.id,
            amount: amount.toFixed(4),
            type: 'debit',
            currency: wallet.currency,
            description,
        });

        // Update cache with the new balance and currency
        const dataToCache: CachedBalance = {balance: updatedWallet.balance, currency: updatedWallet.currency};
        await this.inMemoryClient.set(getBalanceCacheKey(updatedWallet.id), JSON.stringify(dataToCache), {EX: CACHE_TTL_SECONDS});

        return updatedWallet;
    }

    /**
     * Gets the last 50 transactions. The limit is handled by the repository.
     */
    public async getTransactionHistory(walletId: number) {
        const wallet = await this.walletRepository.findOrCreateWalletByUserId(walletId);
        return this.walletRepository.getTransactionHistory(wallet.id);
    }
}