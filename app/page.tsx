'use client';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Eye,
  EyeOff,
  Home as HomeIcon,
  LayoutDashboard,
  List,
  MoreHorizontal,
  PiggyBank,
  Plus,
  Receipt,
  Repeat2,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  loadFirebaseFinance,
  deleteFirebaseShoppingItem,
  recordFirebaseInvestmentSnapshot,
  saveFirebaseCategory,
  saveFirebaseShoppingItem,
  saveFirebaseTransaction,
  updateFirebaseShoppingItem,
  updateFirebaseBalance,
} from '@/lib/firebase-finance';
import { firebaseAuth } from '@/lib/firebase';

type Account = {
  id: string;
  name: string;
  kind: 'bank' | 'credit_card' | 'flash' | 'reserve';
  owner: 'Gui' | 'Fer';
  balanceCents: number;
  closingDay: number | null;
  dueDay: number | null;
};

type Transaction = {
  id: string;
  accountId: string;
  type: 'income' | 'expense';
  description: string;
  category: string;
  amountCents: number;
  transactionDate: string;
  direction: 'ida' | 'volta' | null;
  recurring: boolean;
  installment: string | null;
};

type Budget = {
  id: string;
  category: string;
  month: string;
  limitCents: number;
};

type InvestmentSnapshot = {
  date: string;
  totalCents: number;
};

type Category = {
  id: string;
  name: string;
  color: string;
};

type ShoppingItem = {
  id: string;
  name: string;
  category: 'Supermercado' | 'Manutenção' | 'Casa' | 'Outros';
  quantity: string;
  completed: boolean;
  createdAt: string;
};

type FinancePayload = {
  mode: 'preview' | 'shared';
  currentUser: { displayName: string; email: string };
  household: { name: string };
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  investmentSnapshots: InvestmentSnapshot[];
  categories: Category[];
  shoppingItems: ShoppingItem[];
};

type FormState = {
  type: 'expense' | 'income';
  description: string;
  amount: string;
  category: string;
  accountId: string;
  transactionDate: string;
  direction: 'ida' | 'volta' | '';
  recurring: boolean;
  installment: string;
};

const monthLabel = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});
const shortDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
});
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const categories = [
  { name: 'Alimentação', color: '#f59e0b' },
  { name: 'Transporte', color: '#5b61d6' },
  { name: 'Moradia', color: '#de745a' },
  { name: 'Saúde', color: '#2e9d83' },
  { name: 'Assinaturas', color: '#ad7dd8' },
  { name: 'Lazer', color: '#e17eaa' },
  { name: 'Salário', color: '#2e9d83' },
  { name: 'Outros', color: '#a0a9a8' },
];

const navItems = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'transactions', label: 'Lançamentos', icon: List },
  { id: 'accounts', label: 'Contas e cartões', icon: WalletCards },
  { id: 'budgets', label: 'Limites', icon: SlidersHorizontal },
  { id: 'shopping', label: 'Lista de compras', icon: ShoppingCart },
] as const;

const today = new Date().toISOString().slice(0, 10);

function formatMoney(cents: number) {
  return currency.format(cents / 100);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function accountIcon(kind: Account['kind']) {
  if (kind === 'credit_card') return CreditCard;
  if (kind === 'reserve') return PiggyBank;
  if (kind === 'flash') return Sparkles;
  return Building2;
}

function categoryColor(category: string) {
  return categories.find((item) => item.name === category)?.color ?? '#8d9996';
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return shortDate.format(date).replace('.', '');
}

function getCurrentMonth() {
  const current = new Date().toISOString().slice(0, 7);
  return current === '2026-09' ? '2026-09' : current;
}

function SignInGate({ initialError = '' }: { initialError?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      if (firebaseAuth.currentUser) await signOut(firebaseAuth);
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch {
      setError('E-mail ou senha inválidos.');
    }
  }
  return (
    <main className="access-gate">
      <div className="access-card">
        <span className="access-mark">
          <CircleDollarSign size={23} />
        </span>
        <p className="eyebrow">Nossa casa · finanças a dois</p>
        <h1>Entre para acessar o controle</h1>
        <p>
          Os saldos e lançamentos da casa ficam visíveis somente para quem
          entrar na própria conta.
        </p>
        <form className="access-form" onSubmit={submit}>
          <input
            required
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            required
            minLength={6}
            type="password"
            placeholder="Senha (mínimo 6 caracteres)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && <small className="access-error">{error}</small>}
          <button className="primary-button access-button">
            Entrar <ArrowUpRight size={16} />
          </button>
        </form>
        <small>
          Usuários são cadastrados pelo administrador do sistema.
        </small>
      </div>
    </main>
  );
}

export default function Home() {
  const [activeView, setActiveView] =
    useState<(typeof navItems)[number]['id']>('overview');
  const [payload, setPayload] = useState<FinancePayload>({
    mode: 'preview',
    currentUser: { displayName: 'Gui & Fer', email: '' },
    household: { name: 'Casa do Gui & Fer' },
    accounts: [],
    transactions: [],
    budgets: [],
    investmentSnapshots: [],
    categories: [],
    shoppingItems: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isBalanceEditorOpen, setIsBalanceEditorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingBalances, setIsSavingBalances] = useState(false);
  const [accessState, setAccessState] = useState<
    'checking' | 'authenticated' | 'anonymous' | 'error'
  >('checking');
  const [notice, setNotice] = useState('');
  const [accessError, setAccessError] = useState('');
  const [hideBalances, setHideBalances] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [shoppingName, setShoppingName] = useState('');
  const [shoppingQuantity, setShoppingQuantity] = useState('');
  const [shoppingCategory, setShoppingCategory] =
    useState<ShoppingItem['category']>('Supermercado');
  const [filter, setFilter] = useState('Todos');
  const [balanceDrafts, setBalanceDrafts] = useState<Record<string, string>>(
    {},
  );
  const [form, setForm] = useState<FormState>({
    type: 'expense',
    description: '',
    amount: '',
    category: 'Alimentação',
    accountId: '',
    transactionDate: today,
    direction: '',
    recurring: false,
    installment: '',
  });

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        setAccessError('');
        setAccessState('anonymous');
        setIsLoading(false);
        return;
      }
      try {
        const financeData = await loadFirebaseFinance();
        if (!active) return;
        setPayload({
          mode: 'shared',
          currentUser: {
            displayName: user.displayName ?? user.email ?? 'Usuário',
            email: user.email ?? '',
          },
          household: { name: 'Casa do Gui & Fer' },
          ...financeData,
        });
        setForm((current) => ({
          ...current,
          accountId: financeData.accounts[0]?.id ?? '',
        }));
        setAccessState('authenticated');
      } catch {
        if (active) {
          setAccessError(
            'Não foi possível carregar seus dados. Confira seu acesso e tente novamente.',
          );
          setAccessState('anonymous');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const currentMonth = getCurrentMonth();
  const monthName = monthLabel.format(new Date(`${currentMonth}-01T12:00:00`));
  const monthTransactions = useMemo(
    () =>
      payload.transactions.filter((transaction) =>
        transaction.transactionDate.startsWith(currentMonth),
      ),
    [payload.transactions, currentMonth],
  );
  const expenses = useMemo(
    () =>
      monthTransactions.filter((transaction) => transaction.type === 'expense'),
    [monthTransactions],
  );
  const incomes = useMemo(
    () =>
      monthTransactions.filter((transaction) => transaction.type === 'income'),
    [monthTransactions],
  );
  const totalExpenses = expenses.reduce(
    (sum, transaction) => sum + transaction.amountCents,
    0,
  );
  const totalIncomes = incomes.reduce(
    (sum, transaction) => sum + transaction.amountCents,
    0,
  );
  const uberExpenses = payload.transactions.filter(
    (transaction) =>
      transaction.description.toLowerCase().includes('uber') &&
      transaction.type === 'expense',
  );
  const uberTotal = uberExpenses.reduce(
    (sum, transaction) => sum + transaction.amountCents,
    0,
  );
  const bankBalance = payload.accounts
    .filter((account) => account.kind === 'bank')
    .reduce((sum, account) => sum + account.balanceCents, 0);
  const flashBalance = payload.accounts
    .filter((account) => account.kind === 'flash')
    .reduce((sum, account) => sum + account.balanceCents, 0);
  const cardBalance = payload.accounts
    .filter((account) => account.kind === 'credit_card')
    .reduce((sum, account) => sum + account.balanceCents, 0);
  const available = bankBalance + flashBalance - cardBalance;
  const displayBalance = (cents: number) =>
    hideBalances ? '••••••' : formatMoney(cents);
  const reserves = payload.accounts
    .filter((account) => account.kind === 'reserve')
    .reduce((sum, account) => sum + account.balanceCents, 0);
  const filteredTransactions = payload.transactions.filter(
    (transaction) =>
      filter === 'Todos' || transaction.type === filter.toLowerCase(),
  );
  const categoryTotals = expenses.reduce<Record<string, number>>(
    (totals, transaction) => {
      totals[transaction.category] =
        (totals[transaction.category] ?? 0) + transaction.amountCents;
      return totals;
    },
    {},
  );
  const budgetProgress = payload.budgets
    .filter((budget) => budget.month === currentMonth)
    .map((budget) => ({
      ...budget,
      spentCents: categoryTotals[budget.category] ?? 0,
      percent: budget.limitCents
        ? Math.round(
            ((categoryTotals[budget.category] ?? 0) / budget.limitCents) * 100,
          )
        : 0,
    }));

  function openBalanceEditor() {
    setBalanceDrafts(
      Object.fromEntries(
        payload.accounts.map((account) => [
          account.id,
          (account.balanceCents / 100).toFixed(2).replace('.', ','),
        ]),
      ),
    );
    setIsBalanceEditorOpen(true);
  }

  async function saveBalances() {
    setIsSavingBalances(true);
    const updates = payload.accounts.map((account) => ({
      accountId: account.id,
      balanceCents: Math.round(
        Number((balanceDrafts[account.id] ?? '').replace(',', '.')) * 100,
      ),
    }));
    setPayload((current) => ({
      ...current,
      accounts: current.accounts.map((account) => {
        const update = updates.find((item) => item.accountId === account.id);
        return update
          ? {
              ...account,
              balanceCents: Number.isFinite(update.balanceCents)
                ? update.balanceCents
                : account.balanceCents,
            }
          : account;
      }),
    }));
    try {
      await Promise.all(
        updates.map((update) =>
          updateFirebaseBalance(update.accountId, update.balanceCents),
        ),
      );
      const updatedInvestments = updates
        .filter((update) =>
          payload.accounts.some(
            (account) =>
              account.id === update.accountId && account.kind === 'reserve',
          ),
        )
        .reduce((sum, update) => sum + update.balanceCents, 0);
      if (updatedInvestments) {
        await recordFirebaseInvestmentSnapshot(updatedInvestments);
        setPayload((current) => ({
          ...current,
          investmentSnapshots: [
            ...current.investmentSnapshots.filter(
              (snapshot) => snapshot.date !== new Date().toISOString().slice(0, 10),
            ),
            { date: new Date().toISOString().slice(0, 10), totalCents: updatedInvestments },
          ],
        }));
      }
      setNotice('Saldos atualizados no controle compartilhado.');
    } catch {
      setNotice('Saldos atualizados nesta sessão.');
    } finally {
      setIsSavingBalances(false);
      setIsBalanceEditorOpen(false);
    }
  }

  async function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const optimistic: Transaction = {
      id: `local-${Date.now()}`,
      accountId: form.accountId,
      type: form.type,
      description: form.description,
      category: form.category,
      amountCents: Math.round(Number(form.amount.replace(',', '.')) * 100),
      transactionDate: form.transactionDate,
      direction: form.direction || null,
      recurring: form.recurring,
      installment: form.installment || null,
    };
    try {
      const selectedAccount = payload.accounts.find(
        (account) => account.id === optimistic.accountId,
      );
      if (!selectedAccount) throw new Error('account-not-found');
      const balanceDelta =
        optimistic.type === 'expense'
          ? selectedAccount.kind === 'credit_card'
            ? optimistic.amountCents
            : -optimistic.amountCents
          : selectedAccount.kind === 'credit_card'
            ? -optimistic.amountCents
            : optimistic.amountCents;
      const saved = await saveFirebaseTransaction(
        optimistic,
        selectedAccount.balanceCents,
        balanceDelta,
      );
      setPayload((current) => ({
        ...current,
        accounts: current.accounts.map((account) =>
          account.id === saved.accountId
            ? { ...account, balanceCents: account.balanceCents + balanceDelta }
            : account,
        ),
        transactions: [saved, ...current.transactions],
      }));
      setNotice('Lançamento salvo no controle compartilhado.');
    } catch {
      setPayload((current) => ({
        ...current,
        transactions: [optimistic, ...current.transactions],
      }));
      setNotice('Lançamento adicionado nesta sessão.');
    } finally {
      setIsSubmitting(false);
      setIsComposerOpen(false);
      setForm((current) => ({
        ...current,
        description: '',
        amount: '',
        installment: '',
        recurring: false,
      }));
    }
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    if (
      [...categories, ...payload.categories].some(
        (category) => category.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setNotice('Essa categoria já existe.');
      return;
    }
    const category: Category = {
      id: `category-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`,
      name,
      color: '#8d9996',
    };
    try {
      await saveFirebaseCategory(category);
      setPayload((current) => ({
        ...current,
        categories: [...current.categories, category],
      }));
      setForm((current) => ({ ...current, category: name }));
      setNewCategoryName('');
      setIsAddingCategory(false);
      setNotice('Categoria adicionada.');
    } catch {
      setNotice('Não foi possível salvar a categoria.');
    }
  }

  async function addShoppingItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = shoppingName.trim();
    if (!name) return;
    const item: ShoppingItem = {
      id: `shopping-${Date.now()}`,
      name,
      category: shoppingCategory,
      quantity: shoppingQuantity.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    try {
      await saveFirebaseShoppingItem(item);
      setPayload((current) => ({
        ...current,
        shoppingItems: [item, ...current.shoppingItems],
      }));
      setNotice('Item adicionado à lista.');
    } catch {
      setNotice('Não foi possível salvar o item.');
    }
    setShoppingName('');
    setShoppingQuantity('');
  }

  async function toggleShoppingItem(item: ShoppingItem) {
    const completed = !item.completed;
    setPayload((current) => ({
      ...current,
      shoppingItems: current.shoppingItems.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, completed } : currentItem,
      ),
    }));
    try {
      await updateFirebaseShoppingItem(item.id, completed);
    } catch {
      setPayload((current) => ({
        ...current,
        shoppingItems: current.shoppingItems.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, completed: item.completed }
            : currentItem,
        ),
      }));
      setNotice('Não foi possível atualizar o item.');
    }
  }

  async function removeShoppingItem(item: ShoppingItem) {
    setPayload((current) => ({
      ...current,
      shoppingItems: current.shoppingItems.filter(
        (currentItem) => currentItem.id !== item.id,
      ),
    }));
    try {
      await deleteFirebaseShoppingItem(item.id);
    } catch {
      setPayload((current) => ({
        ...current,
        shoppingItems: [item, ...current.shoppingItems],
      }));
      setNotice('Não foi possível remover o item.');
    }
  }

  function renderOverview() {
    const maxCategory = Math.max(...Object.values(categoryTotals), 1);
    const foodEnd = Math.min(
      ((categoryTotals['Alimentação'] ?? 0) / Math.max(totalExpenses, 1)) * 360,
      360,
    );
    const transportEnd = Math.min(
      (((categoryTotals['Alimentação'] ?? 0) +
        (categoryTotals['Transporte'] ?? 0)) /
        Math.max(totalExpenses, 1)) *
        360,
      360,
    );
    const balanceFor = (kind: Account['kind'], owner: Account['owner']) =>
      payload.accounts
        .filter((account) => account.kind === kind && account.owner === owner)
        .reduce((sum, account) => sum + account.balanceCents, 0);
    const accountFor = (kind: Account['kind'], owner: Account['owner']) =>
      payload.accounts.find(
        (account) => account.kind === kind && account.owner === owner,
      );
    return (
      <>
        <section className="welcome-row">
          <div>
            <p className="eyebrow">
              <span className="status-dot" /> Controle compartilhado
            </p>
            <h1>Bom dia, Gui & Fer</h1>
            <p className="muted">Uma visão calma do dinheiro da casa.</p>
          </div>
          <div className="month-switcher" aria-label="Mês selecionado">
            <CalendarDays size={16} />
            <span>{monthName}</span>
            <ChevronDown size={15} />
          </div>
        </section>
        <section className="balance-cards">
          <article className="balance-card bank-balance-card">
            <div className="balance-card-top">
              <div>
                <div className="hero-label">
                  <Building2 size={17} /> Conta Banco
                </div>
                <p>Saldo disponível</p>
              </div>
              <div className="balance-value">
                <strong>{displayBalance(bankBalance)}</strong>
                <button
                  className="privacy-toggle"
                  aria-label={hideBalances ? 'Mostrar saldos' : 'Esconder saldos'}
                  onClick={() => setHideBalances((current) => !current)}
                >
                  {hideBalances ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="owner-balance-list">
              <div>
                <span className="owner-avatar gui-avatar">G</span>
                <span>Gui</span>
                <b>{displayBalance(balanceFor('bank', 'Gui'))}</b>
              </div>
              <div>
                <span className="owner-avatar fer-avatar">F</span>
                <span>Fer</span>
                <b>{displayBalance(balanceFor('bank', 'Fer'))}</b>
              </div>
            </div>
          </article>
          <article className="balance-card flash-balance-card">
            <div className="balance-card-top">
              <div>
                <div className="hero-label">
                  <Sparkles size={17} /> Conta Flash
                </div>
                <p>Saldo disponível</p>
              </div>
              <div className="balance-value">
                <strong>{displayBalance(flashBalance)}</strong>
                <button
                  className="privacy-toggle"
                  aria-label={hideBalances ? 'Mostrar saldos' : 'Esconder saldos'}
                  onClick={() => setHideBalances((current) => !current)}
                >
                  {hideBalances ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="owner-balance-list">
              <div>
                <span className="owner-avatar gui-avatar">G</span>
                <span>Gui</span>
                <b>{displayBalance(balanceFor('flash', 'Gui'))}</b>
              </div>
              <div>
                <span className="owner-avatar fer-avatar">F</span>
                <span>Fer</span>
                <b>{displayBalance(balanceFor('flash', 'Fer'))}</b>
              </div>
            </div>
          </article>
          <article className="balance-card investment-balance-card">
            <div className="balance-card-top">
              <div>
                <div className="hero-label">
                  <PiggyBank size={17} /> Investimentos
                </div>
                <p>Valor investido</p>
              </div>
              <div className="balance-value">
                <strong>{displayBalance(reserves)}</strong>
                <button
                  className="privacy-toggle"
                  aria-label={hideBalances ? 'Mostrar saldos' : 'Esconder saldos'}
                  onClick={() => setHideBalances((current) => !current)}
                >
                  {hideBalances ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="owner-balance-list">
              <div>
                <span className="owner-avatar gui-avatar">G</span>
                <span>Gui</span>
                <b>{displayBalance(balanceFor('reserve', 'Gui'))}</b>
              </div>
              <div>
                <span className="owner-avatar fer-avatar">F</span>
                <span>Fer</span>
                <b>{displayBalance(balanceFor('reserve', 'Fer'))}</b>
              </div>
            </div>
          </article>
        </section>
        <div className="invoice-heading">
          <div>
            <p className="eyebrow">Cartões</p>
            <h2>Faturas abertas</h2>
          </div>
          <span>Por pessoa</span>
        </div>
        <section className="invoice-cards">
          <article className="invoice-card">
            <div className="invoice-card-top">
              <span className="invoice-icon">
                <CreditCard size={17} />
              </span>
              <div>
                <h3>Cartão do Gui</h3>
                <small>Fatura aberta</small>
              </div>
              <strong>{displayBalance(balanceFor('credit_card', 'Gui'))}</strong>
            </div>
            <div className="invoice-card-foot">
              <span>Gui</span>
              <b>
                {accountFor('credit_card', 'Gui')?.dueDay
                  ? `Vence dia ${accountFor('credit_card', 'Gui')?.dueDay}`
                  : 'Vencimento não definido'}
              </b>
            </div>
          </article>
          <article className="invoice-card">
            <div className="invoice-card-top">
              <span className="invoice-icon fer-invoice-icon">
                <CreditCard size={17} />
              </span>
              <div>
                <h3>Cartão da Fer</h3>
                <small>Fatura aberta</small>
              </div>
              <strong>{displayBalance(balanceFor('credit_card', 'Fer'))}</strong>
            </div>
            <div className="invoice-card-foot">
              <span>Fer</span>
              <b>
                {accountFor('credit_card', 'Fer')?.dueDay
                  ? `Vence dia ${accountFor('credit_card', 'Fer')?.dueDay}`
                  : 'Vencimento não definido'}
              </b>
            </div>
          </article>
        </section>
        <section className="content-grid overview-spending-grid">
          <article className="panel spending-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Ritmo do mês</p>
                <h2>Para onde está indo</h2>
              </div>
              <button
                className="quiet-button"
                onClick={() => setActiveView('budgets')}
              >
                Ver limites <ArrowUpRight size={15} />
              </button>
            </div>
            <div className="spending-visual">
              <div
                className="donut"
                style={{
                  background: `conic-gradient(${categoryColor('Alimentação')} 0 ${foodEnd}deg, ${categoryColor('Transporte')} ${foodEnd}deg ${transportEnd}deg, #e7ece9 ${transportEnd}deg 360deg)`,
                }}
              >
                <div>
                  {formatMoney(totalExpenses)}
                  <small>no mês</small>
                </div>
              </div>
              <div className="legend-list">
                {Object.entries(categoryTotals).length ? (
                  Object.entries(categoryTotals)
                    .slice(0, 4)
                    .map(([category, value]) => (
                      <div className="legend-row" key={category}>
                        <span
                          className="legend-dot"
                          style={{ background: categoryColor(category) }}
                        />
                        <span>{category}</span>
                        <b>{formatMoney(value)}</b>
                        <small>
                          {Math.round(
                            (value / Math.max(totalExpenses, 1)) * 100,
                          )}
                          %
                        </small>
                      </div>
                    ))
                ) : (
                  <div className="empty-copy">
                    Nenhum gasto registrado ainda.
                    <small>Comece pelo botão +</small>
                  </div>
                )}
              </div>
            </div>
            <div className="bar-chart" aria-label="Gastos por categoria">
              <div className="bar-axis">
                <span>100%</span>
                <span>50%</span>
                <span>0%</span>
              </div>
              <div className="bars">
                {Object.entries(categoryTotals).length ? (
                  Object.entries(categoryTotals)
                    .slice(0, 5)
                    .map(([category, value]) => (
                      <div className="bar-wrap" key={category}>
                        <div
                          className="bar"
                          style={{
                            height: `${Math.max((value / maxCategory) * 100, 8)}%`,
                            background: categoryColor(category),
                          }}
                        />
                        <small>
                          {category === 'Alimentação'
                            ? 'Alim.'
                            : category.slice(0, 7)}
                        </small>
                      </div>
                    ))
                ) : (
                  <span className="chart-empty">Sem dados neste mês</span>
                )}
              </div>
            </div>
          </article>
        </section>
      </>
    );
  }

  function renderTransactions() {
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Histórico compartilhado</p>
            <h1>Todos os lançamentos</h1>
            <p className="muted">
              Entradas, despesas recorrentes e o dia a dia da casa.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => setIsComposerOpen(true)}
          >
            <Plus size={17} /> Novo lançamento
          </button>
        </div>
        <div className="toolbar">
          <div className="segmented">
            <button
              className={filter === 'Todos' ? 'active' : ''}
              onClick={() => setFilter('Todos')}
            >
              Todos
            </button>
            <button
              className={filter === 'Expense' ? 'active' : ''}
              onClick={() => setFilter('Expense')}
            >
              Despesas
            </button>
            <button
              className={filter === 'Income' ? 'active' : ''}
              onClick={() => setFilter('Income')}
            >
              Entradas
            </button>
          </div>
          <button className="filter-button">
            <SlidersHorizontal size={15} /> Filtrar <ChevronDown size={14} />
          </button>
        </div>
        <div className="panel table-panel">
          <div className="transaction-table-head">
            <span>Descrição</span>
            <span>Categoria</span>
            <span>Conta</span>
            <span>Data</span>
            <span>Valor</span>
          </div>
          {filteredTransactions.length ? (
            filteredTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                accounts={payload.accounts}
                detailed
              />
            ))
          ) : (
            <div className="empty-panel">
              <span className="empty-icon">
                <List size={17} />
              </span>
              <b>Nada por aqui ainda</b>
              <small>
                Adicione um lançamento para começar a acompanhar o mês.
              </small>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderAccounts() {
    const groups = [
      {
        key: 'bank',
        title: 'Contas bancárias',
        copy: 'Saldos informados manualmente',
      },
      {
        key: 'credit_card',
        title: 'Cartões de crédito',
        copy: 'Faturas abertas e vencimentos',
      },
      { key: 'flash', title: 'Flash', copy: 'Benefícios por pessoa' },
      {
        key: 'reserve',
        title: 'Investimentos',
        copy: 'Valor informado manualmente',
      },
    ] as const;
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Patrimônio da casa</p>
            <h1>Contas e cartões</h1>
            <p className="muted">
              Cada pessoa tem suas contas; a visão continua sendo uma só.
            </p>
          </div>
          <button className="secondary-button" onClick={openBalanceEditor}>
            <Settings size={16} /> Ajustar saldos
          </button>
        </div>
        <div className="account-summary">
          <div>
            <span>Saldo do banco</span>
            <strong>{formatMoney(bankBalance)}</strong>
          </div>
          <div>
            <span>Saldo do Flash</span>
            <strong>{formatMoney(flashBalance)}</strong>
          </div>
          <div>
            <span>Disponível total</span>
            <strong>{formatMoney(available)}</strong>
          </div>
          <div>
            <span>Investimentos</span>
            <strong>{formatMoney(reserves)}</strong>
          </div>
          <div>
            <span>Faturas abertas</span>
            <strong>{formatMoney(cardBalance)}</strong>
          </div>
        </div>
        {groups.map((group) => (
          <div className="account-group" key={group.key}>
            <div className="group-heading">
              <div>
                <h2>{group.title}</h2>
                <p>{group.copy}</p>
              </div>
              <button className="icon-button">
                <Plus size={17} />
              </button>
            </div>
            <div className="accounts-grid">
              {payload.accounts
                .filter((account) => account.kind === group.key)
                .map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
            </div>
          </div>
        ))}
      </section>
    );
  }

  function renderBudgets() {
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Plano do mês</p>
            <h1>Limites por categoria</h1>
            <p className="muted">
              Defina um teto que ajude, sem transformar a casa em uma planilha.
            </p>
          </div>
          <button className="secondary-button">
            <Plus size={16} /> Novo limite
          </button>
        </div>
        <div className="limits-highlight">
          <div>
            <span>Gasto total no mês</span>
            <strong>{formatMoney(totalExpenses)}</strong>
          </div>
          <div className="limit-copy">
            <Sparkles size={17} />
            <p>
              Você está usando{' '}
              <b>
                {totalIncomes
                  ? Math.round((totalExpenses / totalIncomes) * 100)
                  : 0}
                %
              </b>{' '}
              das entradas deste mês.
            </p>
          </div>
        </div>
        <div className="budget-grid">
          {budgetProgress.length ? (
            budgetProgress.map((budget) => (
              <div className="limit-card" key={budget.id}>
                <div className="limit-card-head">
                  <span
                    className="category-dot"
                    style={{ background: categoryColor(budget.category) }}
                  />
                  <div>
                    <h2>{budget.category}</h2>
                    <p>
                      {formatMoney(budget.spentCents)} de{' '}
                      {formatMoney(budget.limitCents)}
                    </p>
                  </div>
                  <button className="icon-button">
                    <MoreHorizontal size={17} />
                  </button>
                </div>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${Math.min(budget.percent, 100)}%`,
                      background: categoryColor(budget.category),
                    }}
                  />
                </div>
                <div className="limit-foot">
                  <span>{budget.percent}% usado</span>
                  <b>
                    {budget.percent > 85
                      ? 'Atenção ao ritmo'
                      : 'Dentro do combinado'}
                  </b>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-panel wide-empty">
              <span className="empty-icon">
                <SlidersHorizontal size={17} />
              </span>
              <b>Nenhum limite configurado</b>
              <small>
                Crie limites por categoria quando definirem os valores da casa.
              </small>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderShopping() {
    const pendingItems = payload.shoppingItems.filter((item) => !item.completed);
    const completedItems = payload.shoppingItems.filter((item) => item.completed);
    const items = [...pendingItems, ...completedItems];
    return (
      <section className="page-section shopping-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Hub da casa</p>
            <h1>Lista de compras</h1>
            <p className="muted">Uma lista compartilhada para Gui e Fer.</p>
          </div>
          <span className="shopping-count">{pendingItems.length} pendentes</span>
        </div>
        <form className="shopping-form" onSubmit={addShoppingItem}>
          <input
            required
            value={shoppingName}
            onChange={(event) => setShoppingName(event.target.value)}
            placeholder="O que precisamos comprar?"
          />
          <input
            value={shoppingQuantity}
            onChange={(event) => setShoppingQuantity(event.target.value)}
            placeholder="Quantidade (opcional)"
          />
          <select
            value={shoppingCategory}
            onChange={(event) =>
              setShoppingCategory(event.target.value as ShoppingItem['category'])
            }
          >
            <option>Supermercado</option>
            <option>Manutenção</option>
            <option>Casa</option>
            <option>Outros</option>
          </select>
          <button className="primary-button" type="submit">
            <Plus size={16} /> Adicionar
          </button>
        </form>
        <div className="shopping-list panel">
          {items.length ? (
            items.map((item) => (
              <div className={`shopping-item ${item.completed ? 'completed' : ''}`} key={item.id}>
                <button
                  className="shopping-check"
                  aria-label={item.completed ? 'Marcar como pendente' : 'Marcar como comprado'}
                  onClick={() => toggleShoppingItem(item)}
                >
                  {item.completed ? <Check size={15} /> : null}
                </button>
                <div className="shopping-item-copy">
                  <b>{item.name}</b>
                  <small>{item.quantity || 'Sem quantidade'} · {item.category}</small>
                </div>
                <button
                  className="icon-button shopping-delete"
                  aria-label={`Excluir ${item.name}`}
                  onClick={() => removeShoppingItem(item)}
                >
                  <X size={15} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-panel wide-empty">
              <span className="empty-icon"><ShoppingCart size={17} /></span>
              <b>Lista vazia</b>
              <small>Adicione o primeiro item da casa.</small>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (isLoading || accessState === 'checking')
    return (
      <div className="loading-state">
        <div className="loading-orb" />
        <p>Carregando o controle da casa…</p>
      </div>
    );
  if (accessState === 'anonymous')
    return <SignInGate initialError={accessError} />;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <CircleDollarSign size={19} />
          </span>
          <div>
            <b>nossa casa</b>
            <span>finanças a dois</span>
          </div>
        </div>
        <div className="household-switcher">
          <span className="household-avatar">
            G<span>F</span>
          </span>
          <div>
            <small>Casa do Gui & Fer</small>
            <b>Visão compartilhada</b>
          </div>
          <ChevronDown size={15} />
        </div>
        <nav className="main-nav" aria-label="Navegação principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeView === item.id ? 'active' : ''}
                onClick={() => setActiveView(item.id)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button>
            <Repeat2 size={17} />
            <span>Recorrentes</span>
          </button>
          <button>
            <Settings size={17} />
            <span>Configurações</span>
          </button>
          <div className="profile-row">
            <div className="profile-avatar">
              {initials(payload.currentUser.displayName || 'GF')}
            </div>
            <div>
              <b>{payload.currentUser.displayName || 'Gui & Fer'}</b>
              <small>Conta conectada</small>
            </div>
            <MoreHorizontal size={17} />
          </div>
          <button onClick={() => signOut(firebaseAuth)}>
            <ArrowUpRight size={17} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">
              <CircleDollarSign size={18} />
            </span>
            <b>nossa casa</b>
          </div>
          <div className="topbar-spacer" />
          <button className="topbar-icon" aria-label="Notificações">
            <Bell size={18} />
            <i />
          </button>
          <div className="topbar-user">
            <div className="couple-avatars">
              <span>G</span>
              <span>F</span>
            </div>
            <span>Gui & Fer</span>
            <ChevronDown size={14} />
          </div>
        </header>
        <div className="content-wrap">
          {activeView === 'overview'
            ? renderOverview()
            : activeView === 'transactions'
              ? renderTransactions()
              : activeView === 'accounts'
                ? renderAccounts()
                : activeView === 'budgets'
                  ? renderBudgets()
                  : renderShopping()}
        </div>
      </main>
      <button
        className="floating-add"
        onClick={() => setIsComposerOpen(true)}
        aria-label="Novo lançamento"
      >
        <Plus size={22} />
      </button>
      <nav className="mobile-nav" aria-label="Navegação móvel">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={activeView === item.id ? 'active' : ''}
              onClick={() => setActiveView(item.id)}
            >
              <Icon size={18} />
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
      {notice && (
        <div className="toast">
          <Check size={16} />
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Fechar aviso">
            <X size={14} />
          </button>
        </div>
      )}
      {isBalanceEditorOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setIsBalanceEditorOpen(false)}
        >
          <div
            className="composer balance-editor"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="composer-head">
              <div>
                <p className="eyebrow">Saldos manuais</p>
                <h2>Atualizar saldos</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsBalanceEditorOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="balance-note">
              Use esta tela para reconciliar o app com o saldo real de cada
              conta.
            </p>
            <div className="balance-list">
              {payload.accounts.map((account) => (
                <label className="balance-row" key={account.id}>
                  <span>
                    <b>{account.name}</b>
                    <small>
                      {account.owner} ·{' '}
                      {account.kind === 'credit_card'
                        ? 'fatura aberta'
                        : account.kind === 'reserve'
                          ? 'reserva'
                          : 'saldo disponível'}
                    </small>
                  </span>
                  <input
                    inputMode="decimal"
                    value={balanceDrafts[account.id] ?? ''}
                    onChange={(event) =>
                      setBalanceDrafts((current) => ({
                        ...current,
                        [account.id]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <button
              className="primary-button form-submit"
              onClick={saveBalances}
              disabled={isSavingBalances}
            >
              {isSavingBalances ? 'Salvando…' : 'Salvar saldos'}{' '}
              <Check size={16} />
            </button>
          </div>
        </div>
      )}
      {isComposerOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setIsComposerOpen(false)}
        >
          <div
            className="composer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="composer-head">
              <div>
                <p className="eyebrow">Novo registro</p>
                <h2>Adicionar lançamento</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsComposerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitTransaction}>
              <div className="type-toggle">
                <button
                  type="button"
                  className={form.type === 'expense' ? 'active expense' : ''}
                  onClick={() =>
                    setForm((current) => ({ ...current, type: 'expense' }))
                  }
                >
                  <ArrowUpRight size={16} /> Despesa
                </button>
                <button
                  type="button"
                  className={form.type === 'income' ? 'active income' : ''}
                  onClick={() =>
                    setForm((current) => ({ ...current, type: 'income' }))
                  }
                >
                  <ArrowDownLeft size={16} /> Entrada
                </button>
              </div>
              <label>
                Descrição
                <input
                  required
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder={
                    form.type === 'expense'
                      ? 'Ex.: Uber para o trabalho'
                      : 'Ex.: entrada mensal'
                  }
                />
              </label>
              <div className="form-grid">
                <label>
                  Valor
                  <input
                    required
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="R$ 0,00"
                  />
                </label>
                <label>
                  Data
                  <input
                    required
                    type="date"
                    value={form.transactionDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        transactionDate: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="form-grid">
                <div className="category-field">
                  <label>
                    Categoria
                    <select
                      required
                      value={form.category}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                    >
                      {[...categories, ...payload.categories]
                        .filter((category) =>
                          form.type === 'income'
                            ? category.name === 'Salário' ||
                              category.name === 'Outros'
                            : category.name !== 'Salário',
                        )
                        .map((category) => (
                          <option key={category.name}>{category.name}</option>
                        ))}
                    </select>
                  </label>
                  {isAddingCategory ? (
                    <div className="new-category-row">
                      <input
                        autoFocus
                        value={newCategoryName}
                        onChange={(event) =>
                          setNewCategoryName(event.target.value)
                        }
                        placeholder="Nome da categoria"
                      />
                      <button type="button" onClick={addCategory}>
                        Adicionar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="add-category-button"
                      onClick={() => setIsAddingCategory(true)}
                    >
                      <Plus size={13} /> Nova categoria
                    </button>
                  )}
                </div>
                <label>
                  Conta
                  <select
                    required
                    value={form.accountId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        accountId: event.target.value,
                      }))
                    }
                  >
                    {payload.accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {form.category === 'Transporte' && (
                <label>
                  Trajeto
                  <select
                    value={form.direction}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        direction: event.target.value as FormState['direction'],
                      }))
                    }
                  >
                    <option value="">Não especificar</option>
                    <option value="ida">Ida</option>
                    <option value="volta">Volta</option>
                  </select>
                </label>
              )}
              <div className="form-options">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={form.recurring}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        recurring: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    <Repeat2 size={14} /> Lançamento recorrente
                  </span>
                </label>
                <input
                  className="installment-input"
                  value={form.installment}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      installment: event.target.value,
                    }))
                  }
                  placeholder="Parcela (ex.: 2/10)"
                />
              </div>
              <button
                className="primary-button form-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando…' : 'Salvar lançamento'}{' '}
                <ArrowUpRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionRow({
  transaction,
  accounts,
  detailed = false,
}: {
  transaction: Transaction;
  accounts: Account[];
  detailed?: boolean;
}) {
  const account = accounts.find((item) => item.id === transaction.accountId);
  return (
    <div className={detailed ? 'transaction-row detailed' : 'transaction-row'}>
      <div className="transaction-main">
        <span
          className="transaction-icon"
          style={{
            background: `${categoryColor(transaction.category)}18`,
            color: categoryColor(transaction.category),
          }}
        >
          {transaction.category === 'Transporte' ? (
            <Car size={16} />
          ) : transaction.category === 'Salário' ? (
            <TrendingUp size={16} />
          ) : transaction.category === 'Moradia' ? (
            <HomeIcon size={16} />
          ) : (
            <Receipt size={16} />
          )}
        </span>
        <div>
          <b>{transaction.description}</b>
          <small>
            {transaction.direction
              ? `${transaction.direction === 'ida' ? 'Ida' : 'Volta'} · `
              : ''}
            {transaction.recurring ? 'Recorrente · ' : ''}
            {transaction.category}
          </small>
        </div>
      </div>
      {detailed && (
        <span className="transaction-category">
          <span
            className="legend-dot"
            style={{ background: categoryColor(transaction.category) }}
          />
          {transaction.category}
        </span>
      )}
      <span className="transaction-account">{account?.name ?? 'Conta'}</span>
      <span className="transaction-date">
        {formatDate(transaction.transactionDate)}
      </span>
      <strong
        className={
          transaction.type === 'income' ? 'income-text' : 'expense-text'
        }
      >
        {transaction.type === 'income' ? '+' : '-'}{' '}
        {formatMoney(transaction.amountCents)}
      </strong>
    </div>
  );
}

function AccountCard({ account }: { account: Account }) {
  const Icon = accountIcon(account.kind);
  const isCard = account.kind === 'credit_card';
  return (
    <article className={`account-card ${isCard ? 'card-account' : ''}`}>
      <div className="account-card-head">
        <span className="account-icon">
          <Icon size={17} />
        </span>
        <span className="owner-chip">{account.owner}</span>
      </div>
      <h3>{account.name}</h3>
      <strong>{formatMoney(account.balanceCents)}</strong>
      <p>
        {isCard
          ? account.dueDay
            ? `Vence dia ${account.dueDay}`
            : 'Vencimento não definido'
          : account.kind === 'reserve'
            ? 'Saldo reservado'
            : 'Saldo atual'}
      </p>
      {isCard && (
        <div className="card-due">
          <CalendarDays size={14} />{' '}
          {account.closingDay
            ? `Fecha dia ${account.closingDay}`
            : 'Fechamento não definido'}
        </div>
      )}
    </article>
  );
}

function BudgetRow({
  budget,
}: {
  budget: {
    category: string;
    spentCents: number;
    limitCents: number;
    percent: number;
  };
}) {
  return (
    <div className="budget-row">
      <div className="budget-row-top">
        <span
          className="legend-dot"
          style={{ background: categoryColor(budget.category) }}
        />
        <b>{budget.category}</b>
        <small>
          {formatMoney(budget.spentCents)} / {formatMoney(budget.limitCents)}
        </small>
      </div>
      <div className="progress-track">
        <span
          style={{
            width: `${Math.min(budget.percent, 100)}%`,
            background: categoryColor(budget.category),
          }}
        />
      </div>
    </div>
  );
}
