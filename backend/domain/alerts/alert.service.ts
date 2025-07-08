import {IAlertRepository} from './alert.repository';
import { InMemoryClient } from '../../platform/in-memory/in-memory.client';
import {UserRepository} from "../users/users.repository";
import {formatCurrency} from "../../common/currency-formatter";
import {Alert} from "../../db/schema";

const ALERTS_CACHE_KEY_PREFIX = 'alerts:user:';
const ALERTS_CACHE_TTL_SECONDS = 60 * 5; // 5 minutes

export abstract class IAlertService {
    /**
     * Checks if the user's balance is below their alert threshold and creates an alert if so.
     */
    abstract checkForLowBalance(userId: number, currentBalance: number, currency: string): Promise<void>;
    /**
     * Gets active alerts for a user, using a cache-aside strategy.
     */
    abstract getActiveAlerts(userId: number): Promise<{alerts: Alert[], source: 'cache' | 'db'}>;

    /**
     * Marks alerts as read and clears the cache.
     */
    abstract markAlertsAsRead(userId: number, alertIds: number[]): Promise<void>;

    /**
     * Gets the cache key for a user's alerts.
     */
    abstract getCacheKey(userId: number): string;
}

export class AlertService extends IAlertService {
    constructor(
        private readonly alertRepo: IAlertRepository,
        private readonly userRepo: UserRepository,
        private readonly cache: InMemoryClient,
    ) {
        super();
    }

    /**
     * The core trigger. Checks balance against threshold and creates an alert if needed.
     */
    public async checkForLowBalance(userId: number, currentBalance: number, currency: string) {
        const user = await this.userRepo.findById(userId);
        if (!user || !user.alertThreshold) {
            return; // No threshold set for this user, do nothing.
        }

        const threshold = parseFloat(user.alertThreshold);

        if (currentBalance < threshold) {
            const message = `Account balance is low: ${formatCurrency(currentBalance, currency)}. Threshold is ${formatCurrency(threshold, currency)}.`;

            await this.alertRepo.create({
                userId,
                title: "low balance",
                message,
                level: 'warning',
            });

            // Invalidate the cache so the next fetch includes the new alert.
            await this.cache.del(this.getCacheKey(userId));
        }
    }

    /**
     * Gets active alerts for a user, using a cache-aside strategy.
     */
    public async getActiveAlerts(userId: number): Promise<{alerts: Alert[], source: 'cache' | 'db'}> {
        const cacheKey = this.getCacheKey(userId);
        const cachedAlerts = await this.cache.get(cacheKey);

        if (cachedAlerts) {
            const parsed = JSON.parse(cachedAlerts);
            parsed.forEach((alert: any) => {
                alert.createdAt = new Date(alert.createdAt);
            });
            return { alerts: parsed, source: 'cache' as const };
        }

        const alertsFromDb = await this.alertRepo.findActiveByUser(userId);
        await this.cache.set(cacheKey, JSON.stringify(alertsFromDb), { EX: ALERTS_CACHE_TTL_SECONDS });

        return { alerts: alertsFromDb, source: 'db' as const };
    }


    /**
     * Marks alerts as read and clears the cache.
     */
    public async markAlertsAsRead(userId: number, alertIds: number[]) {
        await this.alertRepo.markAsRead(userId, alertIds);
        await this.cache.del(this.getCacheKey(userId)); // Invalidate cache
    }

    getCacheKey(userId: number): string {
        return `${ALERTS_CACHE_KEY_PREFIX}${userId}`;
    }
}