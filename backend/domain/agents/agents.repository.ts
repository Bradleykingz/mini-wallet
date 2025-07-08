import { db } from '../../db';
import { agents } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class AgentRepository {
    public async findById(agentId: number) {
        return db.query.agents.findFirst({
            where: eq(agents.id, agentId),
        });
    }
}