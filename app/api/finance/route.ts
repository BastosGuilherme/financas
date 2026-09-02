import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';

import { getChatGPTUser } from '@/app/chatgpt-auth';

export const dynamic = 'force-dynamic';

type FinanceUser = { userId: string; displayName: string; email: string };
type DemoAccount = { id: string; name: string; kind: string; owner: string; balanceCents: number; closingDay: number | null; dueDay: number | null };
type DemoTransaction = { id: string; accountId: string; type: 'income' | 'expense'; description: string; category: string; amountCents: number; transactionDate: string; direction: 'ida' | 'volta' | null; recurring: boolean; installment: string | null };

const householdId = 'household-main';
const nowIso = () => new Date().toISOString();

const demoAccounts: DemoAccount[] = [
  { id: 'bank-gui', name: 'Banco do Gui', kind: 'bank', owner: 'Gui', balanceCents: 356399, closingDay: null, dueDay: null },
  { id: 'bank-fer', name: 'Banco da Fer', kind: 'bank', owner: 'Fer', balanceCents: 0, closingDay: null, dueDay: null },
  { id: 'card-gui', name: 'Cartão do Gui', kind: 'credit_card', owner: 'Gui', balanceCents: 0, closingDay: null, dueDay: null },
  { id: 'card-fer', name: 'Cartão da Fer', kind: 'credit_card', owner: 'Fer', balanceCents: 0, closingDay: null, dueDay: null },
  { id: 'flash-gui', name: 'Flash do Gui', kind: 'flash', owner: 'Gui', balanceCents: 105912, closingDay: null, dueDay: null },
  { id: 'flash-fer', name: 'Flash da Fer', kind: 'flash', owner: 'Fer', balanceCents: 0, closingDay: null, dueDay: null },
  { id: 'reserve-gui', name: 'Reserva do Gui', kind: 'reserve', owner: 'Gui', balanceCents: 3132155, closingDay: null, dueDay: null },
  { id: 'reserve-fer', name: 'Reserva da Fer', kind: 'reserve', owner: 'Fer', balanceCents: 0, closingDay: null, dueDay: null },
];

const demoTransactions: DemoTransaction[] = [
  { id: 'sheet-payment-old-rent', accountId: 'bank-gui', type: 'expense', description: 'Aluguel antigo', category: 'Moradia', amountCents: 139000, transactionDate: '2026-09-02', direction: null, recurring: false, installment: null },
  { id: 'sheet-payment-new-rent', accountId: 'bank-gui', type: 'expense', description: 'Novo aluguel', category: 'Moradia', amountCents: 351237, transactionDate: '2026-09-02', direction: null, recurring: false, installment: null },
  { id: 'sheet-payment-condo', accountId: 'bank-gui', type: 'expense', description: 'Condomínio', category: 'Moradia', amountCents: 76000, transactionDate: '2026-09-02', direction: null, recurring: false, installment: null },
  { id: 'sheet-payment-card', accountId: 'bank-gui', type: 'expense', description: 'Pagamento do cartão de crédito', category: 'Outros', amountCents: 446699, transactionDate: '2026-09-02', direction: null, recurring: false, installment: null },
  { id: 'sheet-payment-josy', accountId: 'bank-gui', type: 'expense', description: 'Josy', category: 'Outros', amountCents: 20000, transactionDate: '2026-09-02', direction: null, recurring: false, installment: null },
  { id: 'sheet-payment-energy', accountId: 'bank-gui', type: 'expense', description: 'Energia', category: 'Moradia', amountCents: 29000, transactionDate: '2026-09-02', direction: null, recurring: false, installment: null },
  { id: 'sheet-payment-sanasa', accountId: 'bank-gui', type: 'expense', description: 'Sanasa', category: 'Moradia', amountCents: 19000, transactionDate: '2026-09-02', direction: null, recurring: false, installment: null },
  { id: 'sheet-payment-internet', accountId: 'bank-gui', type: 'expense', description: 'Internet', category: 'Assinaturas', amountCents: 10200, transactionDate: '2026-09-02', direction: null, recurring: false, installment: null },
  { id: 'sheet-payment-spotify', accountId: 'bank-gui', type: 'expense', description: 'Spotify', category: 'Assinaturas', amountCents: 1364, transactionDate: '2026-09-02', direction: null, recurring: false, installment: null },
  { id: 'sheet-food-lunch', accountId: 'flash-gui', type: 'expense', description: 'Almoço', category: 'Alimentação', amountCents: 3189, transactionDate: '2026-08-31', direction: null, recurring: false, installment: null },
  { id: 'sheet-food-snack', accountId: 'flash-gui', type: 'expense', description: 'Lanche à noite', category: 'Alimentação', amountCents: 6894, transactionDate: '2026-08-31', direction: null, recurring: false, installment: null },
  { id: 'sheet-uber-0831-1', accountId: 'flash-gui', type: 'expense', description: 'Uber para trabalhar', category: 'Transporte', amountCents: 906, transactionDate: '2026-08-31', direction: null, recurring: false, installment: null },
  { id: 'sheet-uber-0831-2', accountId: 'flash-gui', type: 'expense', description: 'Uber para trabalhar', category: 'Transporte', amountCents: 1398, transactionDate: '2026-08-31', direction: null, recurring: false, installment: null },
  { id: 'sheet-uber-0901-1', accountId: 'flash-gui', type: 'expense', description: 'Uber para trabalhar', category: 'Transporte', amountCents: 1104, transactionDate: '2026-09-01', direction: null, recurring: false, installment: null },
  { id: 'sheet-uber-0901-2', accountId: 'flash-gui', type: 'expense', description: 'Uber para trabalhar', category: 'Transporte', amountCents: 1290, transactionDate: '2026-09-01', direction: null, recurring: false, installment: null },
  { id: 'sheet-uber-0902-1', accountId: 'flash-gui', type: 'expense', description: 'Uber para trabalhar', category: 'Transporte', amountCents: 4202, transactionDate: '2026-09-02', direction: null, recurring: false, installment: null },
];
const demoBudgets: Array<{ id: string; category: string; month: string; limitCents: number }> = [];

async function ensureSchema() {
  if (!env.DB) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS households (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, household_id TEXT NOT NULL, user_id TEXT NOT NULL, email TEXT NOT NULL, display_name TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(household_id, user_id))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, household_id TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL, owner TEXT NOT NULL, balance_cents INTEGER NOT NULL DEFAULT 0, closing_day INTEGER, due_day INTEGER, created_at TEXT NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, household_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, household_id TEXT NOT NULL, account_id TEXT NOT NULL, user_id TEXT NOT NULL, type TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, amount_cents INTEGER NOT NULL, transaction_date TEXT NOT NULL, direction TEXT, recurring INTEGER NOT NULL DEFAULT 0, installment TEXT, created_at TEXT NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS budgets (id TEXT PRIMARY KEY, household_id TEXT NOT NULL, category TEXT NOT NULL, month TEXT NOT NULL, limit_cents INTEGER NOT NULL, UNIQUE(household_id, category, month))`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_transactions_household_date ON transactions(household_id, transaction_date)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_transactions_household_category ON transactions(household_id, category)`),
  ]);
}

async function ensureHousehold(user: FinanceUser) {
  if (!env.DB) return false;
  const existing = await env.DB.prepare(`SELECT id FROM members WHERE household_id = ? AND user_id = ? LIMIT 1`).bind(householdId, user.userId).first();
  if (existing) return true;
  const memberCount = await env.DB.prepare(`SELECT COUNT(*) AS count FROM members WHERE household_id = ?`).bind(householdId).first<{ count: number }>();
  if (Number(memberCount?.count ?? 0) >= 2) return false;
  const timestamp = nowIso();
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO households (id, name, created_at) VALUES (?, ?, ?)`).bind(householdId, 'Casa do Gui & Fer', timestamp),
    env.DB.prepare(`INSERT OR IGNORE INTO members (id, household_id, user_id, email, display_name, created_at) VALUES (?, ?, ?, ?, ?, ?)`).bind(`member-${user.userId}`, householdId, user.userId, user.email, user.displayName, timestamp),
  ]);
  return true;
}

async function seedHousehold(userId: string) {
  if (!env.DB) return;
  const legacyTransactionIds = ['tx-salary-gui', 'tx-salary-fer', 'tx-market', 'tx-uber-ida', 'tx-uber-volta', 'tx-lunch', 'tx-condo', 'tx-spotify', 'tx-pharmacy'];
  const legacyTransactions = await env.DB.prepare(`SELECT COUNT(*) AS count FROM transactions WHERE household_id = ? AND id IN (${legacyTransactionIds.map(() => '?').join(',')})`).bind(householdId, ...legacyTransactionIds).first<{ count: number }>();
  if (Number(legacyTransactions?.count ?? 0) > 0) {
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM transactions WHERE household_id = ? AND id IN (${legacyTransactionIds.map(() => '?').join(',')})`).bind(householdId, ...legacyTransactionIds),
      env.DB.prepare(`DELETE FROM budgets WHERE household_id = ? AND id IN ('budget-food', 'budget-transport', 'budget-home', 'budget-leisure')`).bind(householdId),
      env.DB.prepare(`UPDATE accounts SET balance_cents = 0, closing_day = NULL, due_day = NULL WHERE household_id = ? AND id IN ('bank-gui', 'bank-fer', 'card-gui', 'card-fer', 'flash-gui', 'flash-fer', 'reserve-gui', 'reserve-fer')`).bind(householdId),
    ]);
  }
  const existing = await env.DB.prepare(`SELECT id FROM accounts WHERE household_id = ? LIMIT 1`).bind(householdId).first();
  if (existing) {
    const imported = await env.DB.prepare(`SELECT id FROM transactions WHERE household_id = ? AND id = ? LIMIT 1`).bind(householdId, 'sheet-payment-old-rent').first();
    if (!imported) {
      const [transactionCount, nonZeroBalanceCount] = await Promise.all([
        env.DB.prepare(`SELECT COUNT(*) AS count FROM transactions WHERE household_id = ?`).bind(householdId).first<{ count: number }>(),
        env.DB.prepare(`SELECT COUNT(*) AS count FROM accounts WHERE household_id = ? AND balance_cents != 0`).bind(householdId).first<{ count: number }>(),
      ]);
      const statements = demoTransactions.map((transaction) => env.DB.prepare(`INSERT OR IGNORE INTO transactions (id, household_id, account_id, user_id, type, description, category, amount_cents, transaction_date, direction, recurring, installment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(transaction.id, householdId, transaction.accountId, userId, transaction.type, transaction.description, transaction.category, transaction.amountCents, transaction.transactionDate, transaction.direction, transaction.recurring ? 1 : 0, transaction.installment, nowIso()));
      if (Number(transactionCount?.count ?? 0) === 0 && Number(nonZeroBalanceCount?.count ?? 0) === 0) {
        statements.push(...demoAccounts.map((account) => env.DB.prepare(`UPDATE accounts SET balance_cents = ?, closing_day = ?, due_day = ? WHERE household_id = ? AND id = ?`).bind(account.balanceCents, account.closingDay, account.dueDay, householdId, account.id)));
      }
      await env.DB.batch(statements);
    }
    return;
  }
  const timestamp = nowIso();
  const statements = demoAccounts.map((account) => env.DB.prepare(`INSERT INTO accounts (id, household_id, name, kind, owner, balance_cents, closing_day, due_day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(account.id, householdId, account.name, account.kind, account.owner, account.balanceCents, account.closingDay, account.dueDay, timestamp));
  statements.push(...demoTransactions.map((transaction) => env.DB.prepare(`INSERT INTO transactions (id, household_id, account_id, user_id, type, description, category, amount_cents, transaction_date, direction, recurring, installment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(transaction.id, householdId, transaction.accountId, userId, transaction.type, transaction.description, transaction.category, transaction.amountCents, transaction.transactionDate, transaction.direction, transaction.recurring ? 1 : 0, transaction.installment, timestamp)));
  statements.push(...demoBudgets.map((budget) => env.DB.prepare(`INSERT INTO budgets (id, household_id, category, month, limit_cents) VALUES (?, ?, ?, ?, ?)`).bind(budget.id, householdId, budget.category, budget.month, budget.limitCents)));
  await env.DB.batch(statements);
}

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ error: 'É necessário entrar na sua conta para visualizar este controle.' }, { status: 401 });
  if (!env.DB) return NextResponse.json({ error: 'O banco de dados ainda não está disponível.' }, { status: 503 });
  const user = { userId: identity.userId, displayName: identity.displayName, email: identity.email };
  await ensureSchema();
  if (!(await ensureHousehold(user))) return NextResponse.json({ error: 'Este controle já está configurado para duas pessoas.' }, { status: 403 });
  await seedHousehold(user.userId);
  const [accountsResult, transactionsResult, budgetsResult] = await Promise.all([
    env.DB.prepare(`SELECT id, name, kind, owner, balance_cents AS balanceCents, closing_day AS closingDay, due_day AS dueDay FROM accounts WHERE household_id = ? ORDER BY kind, owner`).bind(householdId).all(),
    env.DB.prepare(`SELECT id, account_id AS accountId, type, description, category, amount_cents AS amountCents, transaction_date AS transactionDate, direction, recurring, installment FROM transactions WHERE household_id = ? ORDER BY transaction_date DESC, created_at DESC LIMIT 200`).bind(householdId).all(),
    env.DB.prepare(`SELECT id, category, month, limit_cents AS limitCents FROM budgets WHERE household_id = ? ORDER BY month DESC, category`).bind(householdId).all(),
  ]);
  return NextResponse.json({ mode: 'shared', currentUser: user, household: { id: householdId, name: 'Casa do Gui & Fer' }, accounts: accountsResult.results, transactions: (transactionsResult.results as Array<Record<string, unknown>>).map((transaction) => ({ ...transaction, recurring: Boolean(transaction.recurring) })), budgets: budgetsResult.results });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity || !env.DB) return NextResponse.json({ error: 'É necessário entrar na sua conta para salvar lançamentos.' }, { status: 401 });
  const body = (await request.json()) as Partial<DemoTransaction> & { amount?: number };
  const amountCents = body.amount != null ? Math.round(Number(body.amount) * 100) : Math.round(Number(body.amountCents ?? 0));
  if (!body.description || !body.accountId || !body.category || !body.transactionDate || !amountCents) return NextResponse.json({ error: 'Preencha descrição, conta, categoria, data e valor.' }, { status: 400 });
  await ensureSchema();
  if (!(await ensureHousehold({ userId: identity.userId, displayName: identity.displayName, email: identity.email }))) return NextResponse.json({ error: 'Este controle já está configurado para duas pessoas.' }, { status: 403 });
  const account = await env.DB.prepare(`SELECT id FROM accounts WHERE id = ? AND household_id = ? LIMIT 1`).bind(body.accountId, householdId).first();
  if (!account) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 400 });
  const transaction = { id: crypto.randomUUID(), accountId: body.accountId, type: body.type === 'income' ? 'income' : 'expense', description: body.description, category: body.category, amountCents, transactionDate: body.transactionDate, direction: body.direction ?? null, recurring: Boolean(body.recurring), installment: body.installment ?? null };
  await env.DB.prepare(`INSERT INTO transactions (id, household_id, account_id, user_id, type, description, category, amount_cents, transaction_date, direction, recurring, installment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(transaction.id, householdId, transaction.accountId, identity.userId, transaction.type, transaction.description, transaction.category, transaction.amountCents, transaction.transactionDate, transaction.direction, transaction.recurring ? 1 : 0, transaction.installment, nowIso()).run();
  return NextResponse.json(transaction, { status: 201 });
}

export async function PATCH(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity || !env.DB) return NextResponse.json({ error: 'É necessário entrar na sua conta para ajustar saldos.' }, { status: 401 });
  const body = (await request.json()) as { accountId?: string; balanceCents?: number };
  if (!body.accountId || !Number.isFinite(body.balanceCents)) return NextResponse.json({ error: 'Informe a conta e o saldo.' }, { status: 400 });
  await ensureSchema();
  if (!(await ensureHousehold({ userId: identity.userId, displayName: identity.displayName, email: identity.email }))) return NextResponse.json({ error: 'Este controle já está configurado para duas pessoas.' }, { status: 403 });
  const result = await env.DB.prepare(`UPDATE accounts SET balance_cents = ? WHERE id = ? AND household_id = ?`).bind(Math.round(Number(body.balanceCents)), body.accountId, householdId).run();
  if (!result.meta.changes) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
  return NextResponse.json({ accountId: body.accountId, balanceCents: Math.round(Number(body.balanceCents)) });
}
