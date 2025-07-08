import {Router} from "express";
import {WalletController} from "../../domain/wallet/wallet.controller";
import {WalletService} from "../../domain/wallet/wallet.service";
import {authMiddleware} from "../auth/auth.middleware";

export class WalletRouter {

    private readonly router: Router = Router();

    constructor(private walletController: WalletController) {
        this.router.use(authMiddleware)

        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/history', this.walletController.getHistory.bind(this.walletController));
        this.router.get('/balance', this.walletController.getBalance.bind(this.walletController));
        this.router.post('/transact', this.walletController.transact.bind(this.walletController));

    }

    getRouter() {
        return this.router;
    }
}