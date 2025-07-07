import { createClient, RedisClientType } from 'redis';
import 'dotenv/config';

class RedisService {
    private client: RedisClientType;
    private static instance: RedisService;

    private constructor() {
        if (!process.env.REDIS_URL) {
            throw new Error('REDIS_URL environment variable not set');
        }
        this.client = createClient({ url: process.env.REDIS_URL });

        this.client.on('error', (err) => console.error('Redis Client Error', err));
        this.client.connect();
    }

    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    async storeJti(jti: string, userId: number, expirySeconds: number): Promise<void> {
        // We store the JTI with the user ID as its value for potential future use.
        await this.client.set(jti, userId.toString(), {
            EX: expirySeconds,
        });
    }

    async isJtiStored(jti: string): Promise<boolean> {
        const result = await this.client.get(jti);
        return result !== null;
    }

    async clearJti(jti: string): Promise<void> {
        await this.client.del(jti);
    }
}

export const redisService = RedisService.getInstance();