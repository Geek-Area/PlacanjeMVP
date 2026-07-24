import { PaymentData, FormType } from '@/types';

/**
 * Stateless payment-link codec.
 *
 * A payment slip is encoded as compact JSON, base64url-encoded, and carried in
 * the URL fragment (e.g. `/s#<encoded>`). No server or database is involved —
 * the share page decodes the fragment and renders the slip directly. Because it
 * lives in the fragment, the data never reaches the server or its logs.
 *
 * IMPORTANT: the compact key map below is mirrored in
 * `docs/apps-script-example.gs`. If you change a key here, change it there too.
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

/** Encode a payment slip into a base64url fragment (no leading `#`). */
export const encodeSlipData = (
  data: PaymentData,
  formType: FormType = 'uplata'
): string => {
  const compact: Record<string, string> = {};
  (Object.keys(FIELD_TO_SHORT) as (keyof PaymentData)[]).forEach((field) => {
    const value = data[field];
    if (value && value.trim() !== '') compact[FIELD_TO_SHORT[field]] = value;
  });
  if (formType === 'prenos') compact[FORM_TYPE_KEY] = 'prenos';

  const json = JSON.stringify(compact);
  return bytesToBase64Url(new TextEncoder().encode(json));
};

export interface DecodedSlip {
  data: PaymentData;
  formType: FormType;
}

/**
 * Decode a fragment (with or without a leading `#`) back into a complete
 * PaymentData plus form type. Returns null on any malformed input — never throws.
 */
export const decodeSlipData = (fragment: string): DecodedSlip | null => {
  const raw = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  if (!raw) return null;

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(raw));
    const compact = JSON.parse(json);
    if (typeof compact !== 'object' || compact === null) return null;

    const data = emptyPaymentData();
    for (const [short, value] of Object.entries(compact)) {
      if (short === FORM_TYPE_KEY) continue;
      const field = SHORT_TO_FIELD[short];
      if (field && typeof value === 'string') data[field] = value;
    }
    const formType: FormType =
      (compact as Record<string, unknown>)[FORM_TYPE_KEY] === 'prenos'
        ? 'prenos'
        : 'uplata';
    return { data, formType };
  } catch {
    return null;
  }
};
