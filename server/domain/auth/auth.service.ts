import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';
import {NewUser, users} from '../../db/users';
import {db} from "../../db";
import {redisService} from "../../common/redis";

// Exclude password from user object returned to client
function toUserResponse(user: NewUser) {
    const { password, ...response } = user;
    return response;
}

export class AuthService {
    private readonly jwtSecret = process.env.JWT_SECRET!;
    private readonly jwtExpiration = process.env.JWT_EXPIRATION!;
    private readonly saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS!, 10);
    private readonly tokenExpirySeconds = parseInt(process.env.TOKEN_EXPIRY_SECONDS!, 10);

    constructor() {
        if (!this.jwtSecret || !this.jwtExpiration) {
            throw new Error('JWT environment variables not set');
        }
    }

    async register(userData: Pick<NewUser, 'email' | 'password'>) {
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, userData.email),
        });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(userData.password, this.saltRounds);

        const [newUser] = await db.insert(users).values({
            email: userData.email,
            password: hashedPassword,
        }).returning();

        return toUserResponse(newUser);
    }

    async login(credentials: Pick<NewUser, 'email' | 'password'>) {
        const user = await db.query.users.findFirst({
            where: eq(users.email, credentials.email),
        });

        if (!user) {
            throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // 1. Generate JWT with a unique token ID (jti)
        const jti = uuidv4();
        const token = jwt.sign(
            { sub: user.id, email: user.email },
            this.jwtSecret, {
                jwtid: jti,
                expiresIn: parseInt(this.jwtExpiration)
            }
        );

        // 2. Store JTI in Redis with the same expiry as the token
        await redisService.storeJti(jti, user.id, this.tokenExpirySeconds);

        return {
            user: toUserResponse(user),
            accessToken: token,
        };
    }

    async logout(jti: string): Promise<void> {
        // 3. On logout, clear the JTI from Redis
        await redisService.clearJti(jti);
    }
}