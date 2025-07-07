import {Router} from 'express';
import {TransactionService} from "../../domain/transactions/transactions.service";
import {TransactionController} from "../../domain/transactions/transactions.controller";

export class TransactionsRouter {
    private readonly controller: TransactionController;

    constructor(private router: Router, transactionService: TransactionService) {
        // this.router.use(authMiddleware)
        this.controller = new TransactionController(transactionService);
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