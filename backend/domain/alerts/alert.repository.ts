import { db } from '../../db';
import {Alert, alerts, NewAlert} from '../../db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export abstract class IAlertRepository {
    /**
     * Creates a new alert for a agent.
     */
    abstract create(data: NewAlert): Promise<Alert>;

    /**
     * Finds active (unread) alerts for a given agent.
     */
    abstract findActiveByAgent(agentId: number): Promise<Alert[]>;

    /**
     * Marks a list of alerts as read for a specific agent to ensure authorization.
     */
    abstract markAsRead(agentId: number, alertIds: number[]): Promise<void>;
}

export class AlertRepository implements IAlertRepository {
    public async create(data: NewAlert): Promise<Alert> {
        const [newAlert] = await db.insert(alerts).values(data).returning();
        return newAlert;
    }

    /**
     * Finds active (unread) alerts for a given agent.
     */
    public async findActiveByAgent(agentId: number): Promise<Alert[]> {
        return db.query.alerts.findMany({
            where: and(
                eq(alerts.agentId, agentId),
                eq(alerts.isRead, false)
            ),
            orderBy: (alerts, { desc }) => [desc(alerts.createdAt)],
            limit: 50, // Don't overwhelm the frontend
        });
    }

    /**
     * Marks a list of alerts as read for a specific agent to ensure authorization.
     */
    public async markAsRead(agentId: number, alertIds: number[]): Promise<void> {
        if (alertIds.length === 0) return;

        await db.update(alerts)
            .set({ isRead: true })
            .where(and(
                eq(alerts.agentId, agentId),
                inArray(alerts.id, alertIds)
            ));
    }
}