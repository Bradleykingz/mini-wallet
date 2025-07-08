import * as bcrypt from 'bcrypt';
import {v4 as uuidv4} from "uuid";
import {NewAgent} from '../../db/schema';
import {IAuthRepository} from "./auth.repository";
import {TokenService} from "../../common/token.service";

// Exclude password from agent object returned to client
function toAgentResponse(agent: NewAgent) {
    const { password, ...response } = agent;
    return response;
}

export class AuthService {
    private readonly jwtSecret = process.env.JWT_SECRET!;
    private readonly jwtExpiration = process.env.JWT_EXPIRATION!;

    constructor(private authRepository: IAuthRepository, private tokenService: TokenService) {
        if (!this.jwtSecret || !this.jwtExpiration) {
            throw new Error('JWT environment variables not set');
        }
    }

    async register(agentData: Pick<NewAgent, 'email' | 'password'>) {
        const data = await this.authRepository.findOrCreate(agentData.email, agentData.password);
        return toAgentResponse(data);
    }

    async login(credentials: Pick<NewAgent, 'email' | 'password'>) {
        const agent = await this.authRepository.findByEmail(credentials.email);

        if (!agent) {
            throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, agent.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        const jti = uuidv4();

        const token = this.tokenService.generateToken(jti, {
            id: agent.id,
            email: agent.email,
        });

        await this.tokenService.storeJti(jti, agent.id, parseInt(this.jwtExpiration, 10));

        return {
            accessToken: token,
        };
    }

    async logout(jti: string): Promise<void> {
        // 3. On logout, clear the JTI from Redis
        await this.tokenService.clearJti(jti);
    }
}