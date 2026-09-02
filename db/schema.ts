import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const households = sqliteTable('households', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const members = sqliteTable(
  'members',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull(),
    userId: text('user_id').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    householdUserIdx: uniqueIndex('uq_members_household_user').on(table.householdId, table.userId),
    householdIdx: index('idx_members_household').on(table.householdId),
  }),
);

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull(),
    name: text('name').notNull(),
    kind: text('kind').notNull(),
    owner: text('owner').notNull(),
    balanceCents: integer('balance_cents').notNull().default(0),
    closingDay: integer('closing_day'),
    dueDay: integer('due_day'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({ householdIdx: index('idx_accounts_household').on(table.householdId) }),
);

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull(),
    name: text('name').notNull(),
    color: text('color').notNull(),
  },
  (table) => ({ householdIdx: index('idx_categories_household').on(table.householdId) }),
);

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull(),
    accountId: text('account_id').notNull(),
    userId: text('user_id').notNull(),
    type: text('type').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    amountCents: integer('amount_cents').notNull(),
    transactionDate: text('transaction_date').notNull(),
    direction: text('direction'),
    recurring: integer('recurring', { mode: 'boolean' }).notNull().default(false),
    installment: text('installment'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    householdDateIdx: index('idx_transactions_household_date').on(table.householdId, table.transactionDate),
    householdCategoryIdx: index('idx_transactions_household_category').on(table.householdId, table.category),
  }),
);

export const budgets = sqliteTable(
  'budgets',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull(),
    category: text('category').notNull(),
    month: text('month').notNull(),
    limitCents: integer('limit_cents').notNull(),
  },
  (table) => ({
    householdMonthIdx: uniqueIndex('uq_budgets_household_category_month').on(table.householdId, table.category, table.month),
  }),
);
