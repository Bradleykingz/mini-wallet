import express from 'express';
import { AuthService } from "./domain/auth/auth.service";
import { AuthRouter } from "./domain/auth/auth.routes";
import { AuthRepository } from "./domain/auth/auth.repository";
import { RedisClient } from "./platform/in-memory/redis.client";
import { TokenService } from "./common/token.service";
import { WalletRouter } from "./domain/wallet/wallet.routes";
import { TransactionsRouter } from "./domain/transactions/transactions.routes";
import { TransactionService } from "./domain/transactions/transactions.service";
import { TransactionsRepository } from "./domain/transactions/transactions.repository";
import { WalletRepository } from "./domain/wallet/wallet.repository";
import { MockPaymentProvider } from "./platform/payments/mock.provider";
import { AlertService } from "./domain/alerts/alert.service";
import { UserRepository } from "./domain/users/users.repository";
import { AlertRouter } from "./domain/alerts/alert.routes";
import { WalletService } from "./domain/wallet/wallet.service";
import {AuthController} from "./domain/auth/auth.controller";
import {WalletController} from "./domain/wallet/wallet.controller";
import {TransactionsController} from "./domain/transactions/transactions.controller";

import cors from 'cors';
import {AlertController} from "./domain/alerts/alert.controller";
import {AlertRepository} from "./domain/alerts/alert.repository";

const port = parseInt(process.env.PORT || "2499", 10);

(async () => {
    const server = express();

    server.use(express.json());
    server.use(express.urlencoded({ extended: true }));
    // Enable CORS for all origins

    server.use(cors({
        origin: "*", // or "*" if during dev
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    }));

    const {db} = require('./db');

    const redisClient = await RedisClient.create();
    const tokenService = new TokenService(redisClient);

    server.set("tokenService", tokenService);

    const authRepository = new AuthRepository(db);
    const authService = new AuthService(authRepository, tokenService);
    const authController = new AuthController(authService);
    const authRouter = new AuthRouter(authController);
    server.use('/api/auth', authRouter.getRouter());


    const usersRepository = new UserRepository();
    const alertRepository = new AlertRepository();
    const alertService = new AlertService(alertRepository, usersRepository, redisClient);

    const walletRepository = new WalletRepository(db);
    const walletService = new WalletService(walletRepository, alertService, redisClient);
    const walletController = new WalletController(walletService);
    const walletRouter = new WalletRouter(walletController);
    server.use("/api/wallet", walletRouter.getRouter());

    const transactionsRepository = new TransactionsRepository();
    const paymentProvider = new MockPaymentProvider();

    const transactionsService = new TransactionService(
        transactionsRepository,
        walletRepository,
        paymentProvider,
        redisClient,
        alertService
    );

    const transactionsController = new TransactionsController(transactionsService);
    const transactionsRouter = new TransactionsRouter(transactionsController);
    server.use("/api/transactions", transactionsRouter.getRouter());

    const alertController = new AlertController(alertService);
    const alertsRouter = new AlertRouter(alertController);
    server.use("/api/alerts", alertsRouter.getRouter());

    server.listen(port, () => {
        console.log(`> API ready on http://localhost:${port}`);
    });
})();
