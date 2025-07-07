import * as bcrypt from 'bcrypt';
import {v4 as uuidv4} from "uuid";
import {NewUser} from '../../db/schema';
import {IAuthRepository} from "../../domain/auth/auth.repository";
import {TokenHelper} from "../../common/token.helper";

// Exclude password from user object returned to client
function toUserResponse(user: NewUser) {
    const { password, ...response } = user;
    return response;
}

export class AuthService {
    private readonly jwtSecret = process.env.JWT_SECRET!;
    private readonly jwtExpiration = process.env.JWT_EXPIRATION!;

    constructor(private authRepository: IAuthRepository, private tokenService: TokenHelper) {
        if (!this.jwtSecret || !this.jwtExpiration) {
            throw new Error('JWT environment variables not set');
        }
    }

    async register(userData: Pick<NewUser, 'email' | 'password'>) {
        const data = await this.authRepository.findOrCreate(userData.email, userData.password);
        return toUserResponse(data);
    }

    async login(credentials: Pick<NewUser, 'email' | 'password'>) {
        const user = await this.authRepository.findByEmail(credentials.email);

        if (!user) {
            throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        const jti = uuidv4();

        const token = this.tokenService.generateToken(jti, {
            id: user.id,
            email: user.email,
        });

        await this.tokenService.storeJti(jti, user.id, parseInt(this.jwtExpiration, 10));

        return {
            accessToken: token,
        };
    }

    async logout(jti: string): Promise<void> {
        // 3. On logout, clear the JTI from Redis
        await this.tokenService.clearJti(jti);
    }
}