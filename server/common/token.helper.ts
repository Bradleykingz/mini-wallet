import * as jwt from 'jsonwebtoken';
import {InMemoryClient} from "@server/platform/in-memory/in-memory.client";
import {v4 as uuidv4} from "uuid";

export class TokenHelper {

    private static TOKEN_EXP: number;
    private static TOKEN_SECRET: string;

    constructor(private readonly client: InMemoryClient) {
        if (!process.env.TOKEN_EXPIRY_SECONDS || !process.env.TOKEN_SECRET) {
            throw new Error('Token environment variables not set');
        }
        TokenHelper.TOKEN_EXP = parseInt(process.env.TOKEN_EXPIRY_SECONDS, 10);
        TokenHelper.TOKEN_SECRET = process.env.TOKEN_SECRET;
    }

    generateToken(jti: string, payload: Record<string, any>): string {
        return jwt.sign(payload,
            TokenHelper.TOKEN_SECRET, {
                jwtid: jti,
                expiresIn: TokenHelper.TOKEN_EXP,
                algorithm: 'HS256',
            }
        );
    }

    async storeJti(jti: string, userId: number, expirySeconds: number): Promise<void> {
        await this.client.set(jti, userId.toString(), {EX: expirySeconds});
    }

    async isJtiStored(jti: string): Promise<boolean> {
        const result = await this.client.get(jti);
        return result !== null;
    }

    async clearJti(jti: string): Promise<void> {
        await this.client.del(jti);
    }
}