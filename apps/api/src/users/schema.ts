import { uuid, pgTable, varchar, pgEnum, timestamp } from 'drizzle-orm/pg-core';

export const providersEnum = pgEnum('providers', ['email', 'github']);

export const usersTable = pgTable('users', {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 50 }).notNull(),
    email: varchar({ length: 40 }).notNull().unique(),
    provider: providersEnum().notNull(),
    pwd: varchar({ length: 60 }),
    githubId: varchar({ length: 40 }),
    pfpUrl: varchar({ length: 90 }),
    createdAt: timestamp().defaultNow(),
});

