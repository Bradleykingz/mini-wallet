import {Router} from 'express';
import {AlertController} from '../../domain/alerts/alert.controller';
import {AlertService} from '../../domain/alerts/alert.service';

export class AlertRouter {
    private alertController: AlertController;

    constructor(private router: Router, alertService: AlertService) {
        this.alertController = new AlertController(alertService);
        this.initializeRoutes()
    }

    public initializeRoutes() {
        // this.router.use(authMiddleware);
        this.router.get('/', (req, res) => this.alertController.getActiveAlerts(req, res));
        this.router.post('/read', (req, res) => this.alertController.markAsRead(req, res));
    }

    public getRouter() {
        return this.router;
    }
}
