import express from 'express';
import next from 'next';
import {AuthService} from "@server/domain/auth/auth.service";
import {AuthRouter} from "@server/domain/auth/auth.routes";
import {AuthRepository} from "@server/domain/auth/auth.repository";
import {RedisClient} from "@server/platform/in-memory/redis.client";
import {TokenHelper} from "@server/common/token.helper";

const port = parseInt(process.env.PORT || "2499", 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
    const server = express();

    server.use(express.json());
    server.use(express.urlencoded({ extended: true }));

    const db = require('@server/db/db');

    const authRepository = new AuthRepository(db);
    const redisClient = await RedisClient.create();
    const tokenService = new TokenHelper(redisClient);
    const authService = new AuthService(authRepository, tokenService);

    const authRouter = new AuthRouter(authService);

    server.use('/api/auth', authRouter.getRouter());

    server.all('*', (req, res) => {
        return handle(req, res);
    });
    server.listen(port, (err?: any) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
    });
});
