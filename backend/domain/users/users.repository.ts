import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class UserRepository {
    public async findById(userId: number) {
        return db.query.users.findFirst({
            where: eq(users.id, userId),
        });
    }
}