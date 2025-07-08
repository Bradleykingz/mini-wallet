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

const port = parseInt(process.env.PORT || "2499", 10);

(async () => {
    const server = express();

    server.use(express.json());
    server.use(express.urlencoded({ extended: true }));

    const {db} = require('./db');

    const authRepository = new AuthRepository(db);
    const redisClient = await RedisClient.create();
    const tokenService = new TokenService(redisClient);
    const authService = new AuthService(authRepository, tokenService);
    const authRouter = new AuthRouter(authService);
    server.use('/api/auth', authRouter.getRouter());

    const walletRepository = new WalletRepository(db);
    const walletService = new WalletService(walletRepository, redisClient);
    const walletRouter = new WalletRouter(walletService);
    server.use("/api/wallet", walletRouter.getRouter());

    const usersRepository = new UserRepository();
    const alertService = new AlertService(db, usersRepository, redisClient);
    const transactionsRepository = new TransactionsRepository();
    const paymentProvider = new MockPaymentProvider();

    const transactionsService = new TransactionService(
        transactionsRepository,
        walletRepository,
        paymentProvider,
        redisClient,
        alertService
    );

    const transactionsRouter = new TransactionsRouter(transactionsService);
    server.use("/api/transactions", transactionsRouter.getRouter());

    const alertsRouter = new AlertRouter(alertService);
    server.use("/api/alerts", alertsRouter.getRouter());

    server.listen(port, () => {
        console.log(`> API ready on http://localhost:${port}`);
    });
})();
