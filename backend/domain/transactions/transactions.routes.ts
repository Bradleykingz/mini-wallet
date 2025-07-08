import {Router} from 'express';
import {TransactionsController} from "./transactions.controller";
import {authMiddleware} from "../auth/auth.middleware";

export class TransactionsRouter {
    private readonly router: Router = Router();

    constructor(private controller: TransactionsController) {
        this.router.use(authMiddleware)
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/transact', (req, res) => this.controller.transact(req, res));
        this.router.get('/:referenceId', (req, res) => this.controller.getReceipt(req, res));
    }

    getRouter(){
        return this.router;
    }
}