import {Router} from "express";
import {WalletController} from "@server/domain/wallet/wallet.controller";
import {WalletService} from "@server/domain/wallet/wallet.service";

export class WalletRouter {

    private readonly router: Router;
    private readonly walletController: WalletController;

    constructor(router: Router, service: WalletService) {
        this.router = router;
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