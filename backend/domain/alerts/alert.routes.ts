import {Router} from 'express';
import {AlertController} from './alert.controller';
import {authMiddleware} from "../auth/auth.middleware";

export class AlertRouter {
    private router: Router = Router();

    constructor(private alertController: AlertController) {
        this.initializeRoutes()
    }

    public initializeRoutes() {
        this.router.use(authMiddleware);
        this.router.get('/', this.alertController.getActiveAlerts.bind(this.alertController));
        this.router.post('/read', this.alertController.markAsRead.bind(this.alertController));
    }

    public getRouter() {
        return this.router;
    }
}
