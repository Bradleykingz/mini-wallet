import {IWalletRepository} from "../../domain/wallet/wallet.repository";
import {InMemoryClient} from "../../platform/in-memory/in-memory.client";
import {Wallet} from "../../db/schema";
import {Promise} from "@sinclair/typebox";
import {IAlertService} from "../alerts/alert.service";

const CACHE_TTL_SECONDS = 60 * 5; // 5 minutes

function getBalanceCacheKey(walletId: number): string {
    return `wallet:${walletId}:balance`;
}

export abstract class IWalletService {
    abstract getBalance(walletId: number): Promise<{ balance: string, currency: string, source: 'cache' | 'db' }>;

    abstract findOrCreateWalletByAgentId(agentId: number): Promise<Wallet>;

    abstract credit(agentId: number, amount: number, description?: string): Promise<any>;

    abstract debit(agentId: number, amount: number, description?: string): Promise<any>;

    abstract getTransactionHistory(agentId: number): Promise<any>;
}

// Define a type for our cached object for better clarity
type CachedBalance = {
    balance: string;
    currency: string;
};

export class WalletService extends IWalletService {
    constructor(
        private readonly walletRepository: IWalletRepository,
        private readonly alertService: IAlertService,
        private readonly inMemoryClient: InMemoryClient,
    ) {
        super()
    }

    findOrCreateWalletByAgentId(agentId: number): Promise<Wallet> {
        return this.walletRepository.findOrCreateWalletByAgentId(agentId);
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

        // create transaction and update the wallet balance
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

        await this.alertService.checkForLowBalance(wallet.agentId, parseInt(updatedWallet.balance), updatedWallet.currency);

        return updatedWallet;
    }

    /**
     * Gets the last 50 transactions. The limit is handled by the repository.
     */
    public async getTransactionHistory(walletId: number) {
        const wallet = await this.walletRepository.findOrCreateWalletByAgentId(walletId);
        return this.walletRepository.getTransactionHistory(wallet.id);
    }
}