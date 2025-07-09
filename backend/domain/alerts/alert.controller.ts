import { Request, Response } from 'express';
import {IAlertService} from './alert.service';

export class AlertController {
    constructor(private alertService: IAlertService) {}

    async getActiveAlerts(req: Request, res: Response): Promise<void> {
        try {
            const agentId = req.agent.id;
            const result = await this.alertService.getActiveAlerts(agentId);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: 'Failed to retrieve alerts.' });
        }
    }

    async markAsRead(req: Request, res: Response): Promise<void> {
        try {
            const agentId = req.agent.id;
            const { alertIds } = req.body;

            if (!Array.isArray(alertIds) || alertIds.length === 0) {
                res.status(400).json({ message: 'alertIds must be a non-empty array.' });
                return;
            }

            await this.alertService.markAlertsAsRead(agentId, alertIds);
            res.status(204).send(); // 204 No Content is appropriate here
        } catch (error: any) {
            res.status(500).json({ message: 'Failed to update alerts.' });
        }
    }
}