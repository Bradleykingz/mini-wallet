import {Db} from "../../db";
import {eq} from "drizzle-orm";
import {User, users} from "../../db/schema";
import * as bcrypt from "bcrypt";

export abstract class IAuthRepository {

    abstract findOrCreate(email: string, password: string): Promise<User>;

    abstract findByEmail(email: string): Promise<User | null>;
}
export class AuthRepository extends IAuthRepository {


    constructor(private db: Db) {
        super();
    }

    async findOrCreate(email: string, password: string): Promise<User> {
        const userData = { email, password };
        const existingUser = await this.db.query.users.findFirst({
            where: eq(users.email, userData.email),
        });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(userData.password, 100);

        const [newUser] = await this.db.insert(users).values({
            email: userData.email,
            password: hashedPassword,
        }).returning();

        return newUser;
    }

    async findByEmail(email: string): Promise<User | null> {
        const user = await this.db.query.users.findFirst({
            where: eq(users.email, email),
        });

        return user || null;
    }


}