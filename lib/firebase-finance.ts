import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firestore, firebaseStorage } from './firebase';

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
  receiptUrl?: string | null;
  receiptName?: string | null;
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
  return {
    accounts: accountsResult.docs.map((item) => item.data() as FirebaseAccount),
    transactions: transactionsResult.docs.map(
      (item) => item.data() as FirebaseTransaction,
    ),
    budgets: [],
  };
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
  receipt?: File | null,
) {
  let receiptUrl = transaction.receiptUrl ?? null;
  if (receipt) {
    const receiptRef = ref(
      firebaseStorage,
      `households/${HOUSEHOLD_ID}/receipts/${transaction.id}/${receipt.name}`,
    );
    await uploadBytes(receiptRef, receipt, { contentType: receipt.type });
    receiptUrl = await getDownloadURL(receiptRef);
  }
  const saved = {
    ...transaction,
    receiptUrl,
    receiptName: receipt?.name ?? transaction.receiptName ?? null,
  };
  const batch = writeBatch(firestore);
  batch.set(doc(transactionsPath, transaction.id), saved);
  batch.update(doc(accountsPath, transaction.accountId), {
    balanceCents: currentBalanceCents + balanceDelta,
  });
  await batch.commit();
  return saved;
}
