import { PaymentData } from '@/types';

/**
 * Local autofill memory: receivers, payers and purposes the user has already
 * used, kept in this browser's localStorage only (nothing leaves the device).
 * Entries are remembered when a slip is saved, shared or downloaded, and the
 * most recently used ones are offered first.
 */

export interface ReceiverProfile {
  receiverName: string;
  receiverAddress: string;
  receiverCity: string;
  receiverAccount: string;
  lastUsed: number;
}

export interface PayerProfile {
  payerName: string;
  payerAddress: string;
  payerCity: string;
  payerAccount: string;
  lastUsed: number;
}

export interface PurposeEntry {
  purpose: string;
  lastUsed: number;
}

export interface FieldHistory {
  receivers: ReceiverProfile[];
  payers: PayerProfile[];
  purposes: PurposeEntry[];
}

export type FieldHistoryKind = keyof FieldHistory;

const STORAGE_KEY = 'fieldHistory';
const MAX_ENTRIES = 30;

export const emptyFieldHistory = (): FieldHistory => ({ receivers: [], payers: [], purposes: [] });

const normalize = (value: string) => value.trim().toLowerCase();

// Identity of an entry: the same receiver account (or payer/purpose text) is
// one entry, refreshed with the latest details instead of duplicated.
export const receiverKey = (r: Pick<ReceiverProfile, 'receiverAccount' | 'receiverName'>) =>
  r.receiverAccount.replace(/[^0-9]/g, '') || normalize(r.receiverName);
export const payerKey = (p: Pick<PayerProfile, 'payerName' | 'payerAddress'>) =>
  `${normalize(p.payerName)}|${normalize(p.payerAddress)}`;
export const purposeKey = (p: Pick<PurposeEntry, 'purpose'>) => normalize(p.purpose);

const upsert = <T extends { lastUsed: number }>(list: T[], entry: T, key: (item: T) => string): T[] => {
  const k = key(entry);
  return [entry, ...list.filter((item) => key(item) !== k)].slice(0, MAX_ENTRIES);
};

export const loadFieldHistory = (): FieldHistory => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return emptyFieldHistory();
    const parsed = JSON.parse(stored);
    return {
      receivers: Array.isArray(parsed.receivers) ? parsed.receivers : [],
      payers: Array.isArray(parsed.payers) ? parsed.payers : [],
      purposes: Array.isArray(parsed.purposes) ? parsed.purposes : [],
    };
  } catch {
    return emptyFieldHistory();
  }
};

export const saveFieldHistory = (history: FieldHistory) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Storage full or blocked (private mode) — autofill is a convenience, ignore.
  }
};

/** Fold the receiver, payer and purpose of each slip into the history. */
export const rememberSlips = (
  history: FieldHistory,
  slips: PaymentData[],
  now: number = Date.now()
): FieldHistory => {
  let next = history;
  // Oldest first so the first slip ends up on top of the list.
  [...slips].reverse().forEach((data) => {
    if (data.receiverName.trim() && data.receiverAccount.trim()) {
      next = {
        ...next,
        receivers: upsert<ReceiverProfile>(
          next.receivers,
          {
            receiverName: data.receiverName.trim(),
            receiverAddress: data.receiverAddress.trim(),
            receiverCity: data.receiverCity.trim(),
            receiverAccount: data.receiverAccount.replace(/[^0-9]/g, ''),
            lastUsed: now,
          },
          receiverKey
        ),
      };
    }
    if (data.payerName.trim()) {
      // An "uplata" slip has no payer account; keep the one remembered from a "prenos".
      const previous = next.payers.find((p) => payerKey(p) === payerKey(data));
      next = {
        ...next,
        payers: upsert<PayerProfile>(
          next.payers,
          {
            payerName: data.payerName.trim(),
            payerAddress: data.payerAddress.trim(),
            payerCity: data.payerCity.trim(),
            payerAccount: data.payerAccount.replace(/[^0-9]/g, '') || previous?.payerAccount || '',
            lastUsed: now,
          },
          payerKey
        ),
      };
    }
    if (data.purpose.trim()) {
      next = {
        ...next,
        purposes: upsert<PurposeEntry>(next.purposes, { purpose: data.purpose.trim(), lastUsed: now }, purposeKey),
      };
    }
  });
  return next;
};
