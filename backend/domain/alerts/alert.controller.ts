import { Request, Response } from 'express';
import { AlertService } from './alert.service';

export class AlertController {
    constructor(private alertService: AlertService) {}

    async getActiveAlerts(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user.sub;
            const result = await this.alertService.getActiveAlerts(userId);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: 'Failed to retrieve alerts.' });
        }
    }

    async markAsRead(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user.sub;
            const { alertIds } = req.body;

            if (!Array.isArray(alertIds) || alertIds.length === 0) {
                res.status(400).json({ message: 'alertIds must be a non-empty array.' });
                return;
            }

            await this.alertService.markAlertsAsRead(userId, alertIds);
            res.status(204).send(); // 204 No Content is appropriate here
        } catch (error: any) {
            res.status(500).json({ message: 'Failed to update alerts.' });
        }
    }
}