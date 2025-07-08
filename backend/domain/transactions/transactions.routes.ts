import {Router} from 'express';
import {TransactionsController} from "../../domain/transactions/transactions.controller";
import {authMiddleware} from "../auth/auth.middleware";

export class TransactionsRouter {
    private readonly router: Router = Router();

    constructor(private controller: TransactionsController) {
        this.router.use(authMiddleware)
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/cash-in', (req, res) => this.controller.cashIn(req, res));
        this.router.post('/cash-out', (req, res) => this.controller.cashOut(req, res));
        this.router.get('/:referenceId', (req, res) => this.controller.getReceipt(req, res));
    }

    getRouter(){
        return this.router;
    }
}