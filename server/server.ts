import express from 'express';
import next from 'next';
import {AuthService} from "@server/domain/auth/auth.service";
import {AuthRouter} from "@server/domain/auth/auth.routes";
import {AuthRepository} from "@server/domain/auth/auth.repository";
import {RedisClient} from "@server/platform/in-memory/redis.client";
import {TokenHelper} from "@server/common/token.helper";
import {WalletRouter} from "@server/domain/wallet/wallet.routes";
import {TransactionsRouter} from "@server/domain/transactions/transactions.routes";
import {TransactionService} from "@server/domain/transactions/transactions.service";
import {TransactionsRepository} from "@server/domain/transactions/transactions.repository";
import {WalletRepository} from "@server/domain/wallet/wallet.repository";
import {MockPaymentProvider} from "@server/platform/payments/mock.provider";
import {AlertService} from "@server/domain/alerts/alert.service";
import {UserRepository} from "@server/domain/users/users.repository";
import {AlertRouter} from "@server/domain/alerts/alert.routes";
import {WalletService} from "@server/domain/wallet/wallet.service";

const port = parseInt(process.env.PORT || "2499", 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({dev});
const handle = app.getRequestHandler();

app.prepare().then(async () => {
    const server = express();

    const router = express.Router();
    server.use(express.json());
    server.use(express.urlencoded({extended: true}));

    const db = require('@server/db/db');

    const authRepository = new AuthRepository(db);
    const redisClient = await RedisClient.create();
    const tokenService = new TokenHelper(redisClient);
    const authService = new AuthService(authRepository, tokenService);

    const authRouter = new AuthRouter(router, authService);

    server.use('/api/auth', authRouter.getRouter());


    const walletRepository = new WalletRepository(db)
    const walletService = new WalletService(walletRepository, redisClient);
    const walletRouter = new WalletRouter(router, walletService)
    server.use("/api/wallet", walletRouter.getRouter());

    const usersRepository = new UserRepository();

    const alertService = new AlertService(db, usersRepository, redisClient);
    const transactionsRepository = new TransactionsRepository();
    const paymentProvider = new MockPaymentProvider()

    const transactionsService = new TransactionService(
        transactionsRepository,
        walletRepository,
        paymentProvider,
        redisClient,
        alertService
    )

    const transactionsRouter = new TransactionsRouter(router, transactionsService);
    server.use("/api/transactions", transactionsRouter.getRouter());


    const alertsRouter = new AlertRouter(router, alertService);
    server.use("/api/alerts", alertsRouter.getRouter());

    server.all('*', (req, res) => {
        return handle(req, res);
    });
    server.listen(port, (err?: any) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
    });
});
