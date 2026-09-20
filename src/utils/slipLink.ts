import { PaymentData, FormType } from '@/types';

/**
 * Stateless payment-link codec.
 *
 * A payment slip (or several) is encoded as compact JSON, base64url-encoded, and
 * carried in the URL fragment (e.g. `/s#<encoded>`). No server or database is
 * involved — the share page decodes the fragment and renders the slip(s) directly.
 * Because it lives in the fragment, the data never reaches the server or its logs.
 *
 * IMPORTANT: the compact key map below (and the `L` list wrapper) is mirrored in
 * `docs/apps-script-example.gs`. If you change either here, change it there too.
 */

// Full PaymentData field -> short key used in the encoded JSON.
const FIELD_TO_SHORT: Record<keyof PaymentData, string> = {
  payerName: 'pn',
  payerAddress: 'pa',
  payerCity: 'pc',
  payerAccount: 'pac',
  purpose: 'pu',
  receiverName: 'rn',
  receiverAddress: 'ra',
  receiverCity: 'rc',
  receiverAccount: 'rac',
  paymentCode: 'sf',
  currency: 'cur',
  amount: 'am',
  model: 'mo',
  reference: 're',
  debitModel: 'dm',
  debitReference: 'dr',
};

const SHORT_TO_FIELD = Object.fromEntries(
  Object.entries(FIELD_TO_SHORT).map(([field, short]) => [short, field])
) as Record<string, keyof PaymentData>;

// Form type travels under its own short key; omitted when it is the default.
const FORM_TYPE_KEY = 't';

// Multiple slips travel under this key as an array of compact objects; a plain
// (non-list) compact object stays the single-slip format for backward compat
// with existing links and the public API.
const LIST_KEY = 'L';

const emptyPaymentData = (): PaymentData => ({
  payerName: '',
  payerAddress: '',
  payerCity: '',
  payerAccount: '',
  purpose: '',
  receiverName: '',
  receiverAddress: '',
  receiverCity: '',
  receiverAccount: '',
  paymentCode: '189',
  currency: 'RSD',
  amount: '',
  model: '',
  reference: '',
  debitModel: '',
  debitReference: '',
});

// UTF-8 safe base64url. btoa/atob alone operate on Latin1 and corrupt Cyrillic,
// so we round-trip through TextEncoder/TextDecoder.
const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64UrlToBytes = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded =
    base64.length % 4 === 0 ? base64 : base64 + '='.repeat(4 - (base64.length % 4));
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const buildCompact = (data: PaymentData, formType: FormType): Record<string, string> => {
  const compact: Record<string, string> = {};
  (Object.keys(FIELD_TO_SHORT) as (keyof PaymentData)[]).forEach((field) => {
    const value = data[field];
    if (value && value.trim() !== '') compact[FIELD_TO_SHORT[field]] = value;
  });
  if (formType === 'prenos') compact[FORM_TYPE_KEY] = 'prenos';
  return compact;
};

const parseCompact = (compact: Record<string, unknown>): DecodedSlip => {
  const data = emptyPaymentData();
  for (const [short, value] of Object.entries(compact)) {
    if (short === FORM_TYPE_KEY) continue;
    const field = SHORT_TO_FIELD[short];
    if (field && typeof value === 'string') data[field] = value;
  }
  const formType: FormType = compact[FORM_TYPE_KEY] === 'prenos' ? 'prenos' : 'uplata';
  return { data, formType };
};

export interface DecodedSlip {
  data: PaymentData;
  formType: FormType;
}

export interface SlipOrder {
  data: PaymentData;
  formType: FormType;
}

/**
 * Encode one or more payment slips into a base64url fragment (no leading `#`).
 * A single slip is encoded the same way it always has been, so existing
 * integrations (Apps Script, the public API) keep working unchanged.
 */
export const encodeSlipsData = (orders: SlipOrder[]): string => {
  const list = orders.length > 0 ? orders : [{ data: emptyPaymentData(), formType: 'uplata' as FormType }];

  let json: string;
  if (list.length === 1) {
    json = JSON.stringify(buildCompact(list[0].data, list[0].formType));
  } else {
    json = JSON.stringify({ [LIST_KEY]: list.map((o) => buildCompact(o.data, o.formType)) });
  }

  return bytesToBase64Url(new TextEncoder().encode(json));
};

/** Encode a single payment slip into a base64url fragment (no leading `#`). */
export const encodeSlipData = (data: PaymentData, formType: FormType = 'uplata'): string =>
  encodeSlipsData([{ data, formType }]);

/**
 * Decode a fragment (with or without a leading `#`) back into one or more
 * payment slips. Handles both the legacy single-object format and the
 * multi-slip `{ L: [...] }` format. Returns null on any malformed input —
 * never throws.
 */
export const decodeSlipsData = (fragment: string): DecodedSlip[] | null => {
  const raw = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  if (!raw) return null;

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(raw));
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const list = (parsed as Record<string, unknown>)[LIST_KEY];
    if (Array.isArray(list)) {
      const orders = list
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .map(parseCompact);
      return orders.length > 0 ? orders : null;
    }

    return [parseCompact(parsed as Record<string, unknown>)];
  } catch {
    return null;
  }
};

/**
 * Decode a fragment into a single slip (the first one, if the link carries
 * several). Kept for callers that only ever deal with one slip.
 */
export const decodeSlipData = (fragment: string): DecodedSlip | null => {
  const orders = decodeSlipsData(fragment);
  return orders ? orders[0] : null;
};
