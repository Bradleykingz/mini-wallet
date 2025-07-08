import {IAlertRepository} from './alert.repository';
import { InMemoryClient } from '../../platform/in-memory/in-memory.client';
import {AgentRepository} from "../agents/agents.repository";
import {formatCurrency} from "../../common/currency-formatter";
import {Alert} from "../../db/schema";

const ALERTS_CACHE_KEY_PREFIX = 'alerts:agent:';
const ALERTS_CACHE_TTL_SECONDS = 60 * 5; // 5 minutes

export abstract class IAlertService {
    /**
     * Checks if the agent's balance is below their alert threshold and creates an alert if so.
     */
    abstract checkForLowBalance(agentId: number, currentBalance: number, currency: string): Promise<void>;
    /**
     * Gets active alerts for a agent, using a cache-aside strategy.
     */
    abstract getActiveAlerts(agentId: number): Promise<{alerts: Alert[], source: 'cache' | 'db'}>;

    /**
     * Marks alerts as read and clears the cache.
     */
    abstract markAlertsAsRead(agentId: number, alertIds: number[]): Promise<void>;

    /**
     * Gets the cache key for a agent's alerts.
     */
    abstract getCacheKey(agentId: number): string;
}

export class AlertService extends IAlertService {
    constructor(
        private readonly alertRepo: IAlertRepository,
        private readonly agentRepo: AgentRepository,
        private readonly cache: InMemoryClient,
    ) {
        super();
    }

    /**
     * The core trigger. Checks balance against threshold and creates an alert if needed.
     */
    public async checkForLowBalance(agentId: number, currentBalance: number, currency: string) {
        const agent = await this.agentRepo.findById(agentId);
        if (!agent || !agent.alertThreshold) {
            return; // No threshold set for this agent, do nothing.
        }

        const threshold = parseFloat(agent.alertThreshold);

        if (currentBalance < threshold) {
            const message = `Account balance is low: ${formatCurrency(currentBalance, currency)}. Threshold is ${formatCurrency(threshold, currency)}.`;

            await this.alertRepo.create({
                agentId,
                title: "low balance",
                message,
                level: 'warning',
            });

            // Invalidate the cache so the next fetch includes the new alert.
            await this.cache.del(this.getCacheKey(agentId));
        }
    }

    /**
     * Gets active alerts for a agent, using a cache-aside strategy.
     */
    public async getActiveAlerts(agentId: number): Promise<{alerts: Alert[], source: 'cache' | 'db'}> {
        const cacheKey = this.getCacheKey(agentId);
        const cachedAlerts = await this.cache.get(cacheKey);

        if (cachedAlerts) {
            const parsed = JSON.parse(cachedAlerts);
            parsed.forEach((alert: any) => {
                alert.createdAt = new Date(alert.createdAt);
            });
            return { alerts: parsed, source: 'cache' as const };
        }

        const alertsFromDb = await this.alertRepo.findActiveByAgent(agentId);
        await this.cache.set(cacheKey, JSON.stringify(alertsFromDb), { EX: ALERTS_CACHE_TTL_SECONDS });

        return { alerts: alertsFromDb, source: 'db' as const };
    }


    /**
     * Marks alerts as read and clears the cache.
     */
    public async markAlertsAsRead(agentId: number, alertIds: number[]) {
        await this.alertRepo.markAsRead(agentId, alertIds);
        await this.cache.del(this.getCacheKey(agentId)); // Invalidate cache
    }

    getCacheKey(agentId: number): string {
        return `${ALERTS_CACHE_KEY_PREFIX}${agentId}`;
    }
}