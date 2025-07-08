import {boolean, integer, numeric, pgEnum, pgTable, serial, text, timestamp, uniqueIndex} from 'drizzle-orm/pg-core';
import {relations} from 'drizzle-orm';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    alertThreshold: numeric('alert_threshold', { precision: 19, scale: 4 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (users) => ({
    emailIndex: uniqueIndex('email_idx').on(users.email),
}));

export const alertLevelEnum = pgEnum('alert_level', ['info', 'warning', 'critical']);

export const alerts = pgTable('alerts', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    level: alertLevelEnum('level').default('warning').notNull(),
    message: text('message').notNull(),
    title: text('title').notNull().default("low balance alert"),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const currencyEnum = pgEnum('currency', ['USD']);

export const wallets = pgTable('wallets', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
    balance: numeric('balance', {precision: 19, scale: 4}).default('0.00').notNull(),
    currency: currencyEnum('currency').default('USD').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const transactionTypeEnum = pgEnum('transaction_type', ['credit', 'debit', 'cash_in', 'cash_out']);

export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'failed']);

export const transactions = pgTable('transactions', {
    id: serial('id').primaryKey(),
    referenceId: text('reference_id').notNull().unique(),
    walletId: integer('wallet_id').notNull().references(() => wallets.id, {onDelete: 'cascade'}),
    type: transactionTypeEnum('type').notNull(),
    status: transactionStatusEnum('status').default('pending').notNull(),
    amount: numeric('amount', {precision: 19, scale: 4}).notNull(),
    currency: currencyEnum('currency').notNull(),
    description: text('description'),
    externalProviderId: text('external_provider_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});


export const usersRelations = relations(users, ({one, many}) => ({
    wallet: one(wallets, {
        fields: [users.id],
        references: [wallets.userId],
    }),
    alerts: many(alerts),
}));

export const walletsRelations = relations(wallets, ({one, many}) => ({
    user: one(users, {
        fields: [wallets.userId],
        references: [users.id],
    }),
    transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({one}) => ({
    wallet: one(wallets, {
        fields: [transactions.walletId],
        references: [wallets.id],
    }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
    user: one(users, {
        fields: [alerts.id],
        references: [users.id],
    }),
}));


export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;