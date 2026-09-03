import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { firestore } from './firebase';

export const HOUSEHOLD_ID = 'main';

export type FirebaseAccount = {
  id: string;
  name: string;
  kind: 'bank' | 'credit_card' | 'flash' | 'reserve';
  owner: 'Gui' | 'Fer';
  balanceCents: number;
  closingDay: number | null;
  dueDay: number | null;
};

export type FirebaseTransaction = {
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

export type FirebaseInvestmentSnapshot = {
  date: string;
  totalCents: number;
};

export type FirebaseCategory = {
  id: string;
  name: string;
  color: string;
};

export type FirebaseShoppingItem = {
  id: string;
  name: string;
  category: 'Supermercado' | 'Manutenção' | 'Casa' | 'Outros';
  quantity: string;
  completed: boolean;
  createdAt: string;
};

const accountsPath = collection(
  firestore,
  'households',
  HOUSEHOLD_ID,
  'accounts',
);
const transactionsPath = collection(
  firestore,
  'households',
  HOUSEHOLD_ID,
  'transactions',
);
const investmentSnapshotsPath = collection(
  firestore,
  'households',
  HOUSEHOLD_ID,
  'investmentSnapshots',
);
const categoriesPath = collection(
  firestore,
  'households',
  HOUSEHOLD_ID,
  'categories',
);
const shoppingItemsPath = collection(
  firestore,
  'households',
  HOUSEHOLD_ID,
  'shoppingItems',
);

const starterAccounts: FirebaseAccount[] = [
  ['bank-gui', 'Banco do Gui', 'bank', 'Gui', 356399],
  ['bank-fer', 'Banco da Fer', 'bank', 'Fer', 0],
  ['card-gui', 'Cartão do Gui', 'credit_card', 'Gui', 0],
  ['card-fer', 'Cartão da Fer', 'credit_card', 'Fer', 0],
  ['flash-gui', 'Flash do Gui', 'flash', 'Gui', 105912],
  ['flash-fer', 'Flash da Fer', 'flash', 'Fer', 0],
  ['reserve-gui', 'Investimentos do Gui', 'reserve', 'Gui', 3132155],
  ['reserve-fer', 'Investimentos da Fer', 'reserve', 'Fer', 0],
].map(
  ([id, name, kind, owner, balanceCents]) =>
    ({
      id,
      name,
      kind,
      owner,
      balanceCents,
      closingDay: null,
      dueDay: null,
    }) as FirebaseAccount,
);

const starterTransactions: FirebaseTransaction[] = [
  [
    'sheet-payment-old-rent',
    'Aluguel antigo',
    'Moradia',
    'bank-gui',
    139000,
    '2026-09-02',
  ],
  [
    'sheet-payment-new-rent',
    'Novo aluguel',
    'Moradia',
    'bank-gui',
    351237,
    '2026-09-02',
  ],
  [
    'sheet-payment-condo',
    'Condomínio',
    'Moradia',
    'bank-gui',
    76000,
    '2026-09-02',
  ],
  [
    'sheet-payment-card',
    'Pagamento do cartão de crédito',
    'Outros',
    'bank-gui',
    446699,
    '2026-09-02',
  ],
  ['sheet-payment-josy', 'Josy', 'Outros', 'bank-gui', 20000, '2026-09-02'],
  [
    'sheet-payment-energy',
    'Energia',
    'Moradia',
    'bank-gui',
    29000,
    '2026-09-02',
  ],
  [
    'sheet-payment-sanasa',
    'Sanasa',
    'Moradia',
    'bank-gui',
    19000,
    '2026-09-02',
  ],
  [
    'sheet-payment-internet',
    'Internet',
    'Assinaturas',
    'bank-gui',
    10200,
    '2026-09-02',
  ],
  [
    'sheet-payment-spotify',
    'Spotify',
    'Assinaturas',
    'bank-gui',
    1364,
    '2026-09-02',
  ],
  [
    'sheet-uber-0901-1',
    'Uber para trabalhar',
    'Transporte',
    'flash-gui',
    1104,
    '2026-09-01',
  ],
  [
    'sheet-uber-0901-2',
    'Uber para trabalhar',
    'Transporte',
    'flash-gui',
    1290,
    '2026-09-01',
  ],
  [
    'sheet-uber-0902-1',
    'Uber para trabalhar',
    'Transporte',
    'flash-gui',
    4202,
    '2026-09-02',
  ],
].map(
  ([id, description, category, accountId, amountCents, transactionDate]) =>
    ({
      id,
      description,
      category,
      accountId,
      amountCents,
      transactionDate,
      type: 'expense',
      direction: null,
      recurring: false,
      installment: null,
    }) as FirebaseTransaction,
);

export async function ensureMember(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
}) {
  await setDoc(
    doc(firestore, 'households', HOUSEHOLD_ID, 'members', user.uid),
    {
      email: user.email ?? '',
      displayName: user.displayName ?? user.email ?? 'Usuário',
    },
    { merge: true },
  );
  await setDoc(
    doc(firestore, 'households', HOUSEHOLD_ID),
    { name: 'Casa do Gui & Fer' },
    { merge: true },
  );
}

export async function loadFirebaseFinance() {
  const accountSnapshot = await getDocs(accountsPath);
  if (accountSnapshot.empty) {
    const batch = writeBatch(firestore);
    starterAccounts.forEach((account) =>
      batch.set(doc(accountsPath, account.id), account),
    );
    await batch.commit();
  }
  const [accountsResult, transactionsResult] = await Promise.all([
    getDocs(accountsPath),
    getDocs(query(transactionsPath, orderBy('transactionDate', 'desc'))),
  ]);
  if (transactionsResult.empty) {
    const batch = writeBatch(firestore);
    starterTransactions.forEach((transaction) =>
      batch.set(doc(transactionsPath, transaction.id), transaction),
    );
    await batch.commit();
  }
  const finalTransactionsResult = transactionsResult.empty
    ? await getDocs(query(transactionsPath, orderBy('transactionDate', 'desc')))
    : transactionsResult;
  let snapshots: FirebaseInvestmentSnapshot[] = [];
  try {
    const snapshotsResult = await getDocs(
      query(investmentSnapshotsPath, orderBy('date', 'asc')),
    );
    snapshots = snapshotsResult.docs.map(
      (item) => item.data() as FirebaseInvestmentSnapshot,
    );
  } catch {
    // Keep authentication usable while an older Firestore ruleset is deployed.
  }
  let savedCategories: FirebaseCategory[] = [];
  try {
    const categoriesResult = await getDocs(categoriesPath);
    savedCategories = categoriesResult.docs.map(
      (item) => item.data() as FirebaseCategory,
    );
  } catch {
    // Keep the dashboard available while an older Firestore ruleset is deployed.
  }
  let shoppingItems: FirebaseShoppingItem[] = [];
  try {
    const shoppingItemsResult = await getDocs(shoppingItemsPath);
    shoppingItems = shoppingItemsResult.docs.map(
      (item) => item.data() as FirebaseShoppingItem,
    );
  } catch {
    // The shopping hub is optional while its Firestore rules are deployed.
  }
  if (!snapshots.length) {
    const initialTotalCents = accountsResult.docs
      .map((item) => item.data() as FirebaseAccount)
      .filter((account) => account.kind === 'reserve')
      .reduce((sum, account) => sum + account.balanceCents, 0);
    const date = new Date().toISOString().slice(0, 10);
    try {
      await setDoc(doc(investmentSnapshotsPath, date), {
        date,
        totalCents: initialTotalCents,
      });
    } catch {
      // The snapshot is optional; the dashboard can still show current balances.
    }
    snapshots.push({ date, totalCents: initialTotalCents });
  }
  return {
    accounts: accountsResult.docs.map((item) => item.data() as FirebaseAccount),
    transactions: finalTransactionsResult.docs.map(
      (item) => item.data() as FirebaseTransaction,
    ),
    budgets: [],
    investmentSnapshots: snapshots,
    categories: savedCategories,
    shoppingItems,
  };
}

export async function saveFirebaseCategory(category: FirebaseCategory) {
  await setDoc(doc(categoriesPath, category.id), category);
  return category;
}

export async function saveFirebaseShoppingItem(item: FirebaseShoppingItem) {
  await setDoc(doc(shoppingItemsPath, item.id), item);
  return item;
}

export async function updateFirebaseShoppingItem(
  id: string,
  completed: boolean,
) {
  await updateDoc(doc(shoppingItemsPath, id), { completed });
}

export async function deleteFirebaseShoppingItem(id: string) {
  await deleteDoc(doc(shoppingItemsPath, id));
}

export async function recordFirebaseInvestmentSnapshot(totalCents: number) {
  const date = new Date().toISOString().slice(0, 10);
  await setDoc(
    doc(investmentSnapshotsPath, date),
    { date, totalCents },
    { merge: true },
  );
}

export async function updateFirebaseBalance(
  accountId: string,
  balanceCents: number,
) {
  await updateDoc(doc(accountsPath, accountId), { balanceCents });
}

export async function saveFirebaseTransaction(
  transaction: FirebaseTransaction,
  currentBalanceCents: number,
  balanceDelta: number,
) {
  const batch = writeBatch(firestore);
  batch.set(doc(transactionsPath, transaction.id), transaction);
  batch.update(doc(accountsPath, transaction.accountId), {
    balanceCents: currentBalanceCents + balanceDelta,
  });
  await batch.commit();
  return transaction;
}
