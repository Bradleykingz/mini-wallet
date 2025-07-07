import 'dotenv/config';
import { createClient, RedisClientType } from 'redis';
import {InMemoryClient} from "@server/platform/in-memory/in-memory.client";

export class RedisClient extends InMemoryClient {
    private client: RedisClientType;

    private constructor(client: RedisClientType) {
        super();
        this.client = client;
    }

    static async create(): Promise<RedisClient> {
        if (!process.env.REDIS_URL) {
            throw new Error('REDIS_URL environment variable not set');
        }

        const client: RedisClientType = createClient({ url: process.env.REDIS_URL });

        client.on('error', (err) => console.error('Redis Client Error', err));
        await client.connect();

        return new RedisClient(client);
    }

    async set(key: string, value: string, options?: { EX?: number }): Promise<void> {
        await this.client.set(key, value, options);
    }

    async get(key: string): Promise<string | null> {
        return await this.client.get(key);
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }
}
