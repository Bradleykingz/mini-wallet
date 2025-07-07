import {pgTable, serial, text, timestamp, uniqueIndex} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (users) => {
    return {
        emailIndex: uniqueIndex('email_idx').on(users.email),
    }
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;