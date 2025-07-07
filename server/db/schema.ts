import {integer, numeric, pgEnum, pgTable, serial, text, timestamp, uniqueIndex} from 'drizzle-orm/pg-core';
import {relations} from 'drizzle-orm';

export const schema = pgTable('users', {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (users) => ({
    emailIndex: uniqueIndex('email_idx').on(users.email),
}));

export const currencyEnum = pgEnum('currency', ['USD']);

export const wallets = pgTable('wallets', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => schema.id, {onDelete: 'cascade'}),
    balance: numeric('balance', {precision: 19, scale: 4}).default('0.00').notNull(),
    currency: currencyEnum('currency').default('USD').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const transactionTypeEnum = pgEnum('transaction_type', ['credit', 'debit']);

export const transactions = pgTable('transactions', {
    id: serial('id').primaryKey(),
    walletId: integer('wallet_id').notNull().references(() => wallets.id, {onDelete: 'cascade'}),
    type: transactionTypeEnum('type').notNull(),
    amount: numeric('amount', {precision: 19, scale: 4}).notNull(),
    currency: currencyEnum('currency').default('USD').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});


export const usersRelations = relations(schema, ({one}) => ({
    wallet: one(wallets, {
        fields: [schema.id],
        references: [wallets.userId],
    }),
}));

export const walletsRelations = relations(wallets, ({one, many}) => ({
    user: one(schema, {
        fields: [wallets.userId],
        references: [schema.id],
    }),
    transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({one}) => ({
    wallet: one(wallets, {
        fields: [transactions.walletId],
        references: [wallets.id],
    }),
}));


export type User = typeof schema.$inferSelect;
export type NewUser = typeof schema.$inferInsert;
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;