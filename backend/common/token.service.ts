import * as jwt from 'jsonwebtoken';
import {InMemoryClient} from "../platform/in-memory/in-memory.client";
import "dotenv/config"

export class TokenService {

    private static TOKEN_EXP: number;
    private static TOKEN_SECRET: string;

    constructor(private readonly client: InMemoryClient) {
        if (!process.env.TOKEN_EXPIRY_SECONDS || !process.env.JWT_SECRET) {
            throw new Error('Token environment variables not set');
        }
        TokenService.TOKEN_EXP = parseInt(process.env.TOKEN_EXPIRY_SECONDS, 10);
        TokenService.TOKEN_SECRET = process.env.JWT_SECRET;
    }

    generateToken(jti: string, payload: Record<string, any>): string {
        return jwt.sign(payload,
            TokenService.TOKEN_SECRET, {
                jwtid: jti,
                expiresIn: TokenService.TOKEN_EXP,
                algorithm: 'HS256',
            }
        );
    }

    async storeJti(jti: string, agentId: number, expirySeconds: number): Promise<void> {
        await this.client.set(jti, agentId.toString(), {EX: expirySeconds});
    }

    async isJtiStored(jti: string): Promise<boolean> {
        const result = await this.client.get(jti);
        return result !== null;
    }

    async clearJti(jti: string): Promise<void> {
        await this.client.del(jti);
    }
}