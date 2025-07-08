import {Db} from "../../db";
import {eq} from "drizzle-orm";
import {Agent, agents} from "../../db/schema";
import * as bcrypt from "bcrypt";

export abstract class IAuthRepository {

    abstract findOrCreate(email: string, password: string): Promise<Agent>;

    abstract findByEmail(email: string): Promise<Agent | null>;
}
export class AuthRepository extends IAuthRepository {


    constructor(private db: Db) {
        super();
    }

    async findOrCreate(email: string, password: string): Promise<Agent> {
        const agentData = { email, password };
        const existingAgent = await this.db.query.agents.findFirst({
            where: eq(agents.email, agentData.email),
        });

        if (existingAgent) {
            throw new Error('Agent with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [newAgent] = await this.db.insert(agents).values({
            email: agentData.email,
            password: hashedPassword,
        }).returning();

        return newAgent;
    }

    async findByEmail(email: string): Promise<Agent | null> {
        const agent = await this.db.query.agents.findFirst({
            where: eq(agents.email, email),
        });

        return agent || null;
    }


}