import {Router} from "express";
import {WalletController} from "../../domain/wallet/wallet.controller";
import {WalletService} from "../../domain/wallet/wallet.service";

export class WalletRouter {

    private readonly router: Router = Router();
    private readonly walletController: WalletController;

    constructor(service: WalletService) {
        this.walletController = new WalletController(service);

        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/balance', this.walletController.getBalance);
        this.router.post('/history', this.walletController.getHistory);
        this.router.post('/transact', this.walletController.transact);
    }

    getRouter() {
        return this.router;
    }
}