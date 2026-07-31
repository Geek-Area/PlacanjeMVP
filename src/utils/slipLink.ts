import { PaymentData, FormType } from '@/types';
import { gzipSync, gunzipSync, strFromU8, strToU8 } from 'fflate';

/**
 * Stateless payment-link codec.
 *
 * A payment slip is encoded as compressed, ordered JSON values and carried in
 * the URL fragment (e.g. `/s#2u.<encoded>`). No server or database is involved.
 * Because the payload lives in the fragment, it never reaches server logs.
 *
 * Version 1 used base64url-encoded JSON objects. Its key map remains below so
 * links already in circulation continue to work.
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

// Version 2 uses field positions rather than repeating keys inside every link.
// This order is part of the public link format and is mirrored in the API docs.
const FIELD_ORDER = Object.keys(FIELD_TO_SHORT) as (keyof PaymentData)[];
const V2_UPLATA_PREFIX = '2u.';
const V2_PRENOS_PREFIX = '2p.';
const MAX_FRAGMENT_LENGTH = 8192;

const emptyPaymentData = (formType: FormType = 'uplata'): PaymentData => ({
  payerName: '',
  payerAddress: '',
  payerCity: '',
  payerAccount: '',
  purpose: '',
  receiverName: '',
  receiverAddress: '',
  receiverCity: '',
  receiverAccount: '',
  paymentCode: formType === 'prenos' ? '253' : '189',
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

/** Encode a payment slip into a compressed v2 fragment (no leading `#`). */
export const encodeSlipData = (
  data: PaymentData,
  formType: FormType = 'uplata'
): string => {
  const defaultPaymentCode = formType === 'prenos' ? '253' : '189';
  const values = FIELD_ORDER.map((field) => {
    const value = data[field];
    if (!value || value.trim() === '') return '';
    if (field === 'currency' && value === 'RSD') return '';
    if (field === 'paymentCode' && value === defaultPaymentCode) return '';
    return value;
  });
  while (values.at(-1) === '') values.pop();

  const compressed = gzipSync(strToU8(JSON.stringify(values)), { level: 9 });
  const prefix = formType === 'prenos' ? V2_PRENOS_PREFIX : V2_UPLATA_PREFIX;
  return prefix + bytesToBase64Url(compressed);
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
  if (!raw || raw.length > MAX_FRAGMENT_LENGTH) return null;

  try {
    if (raw.startsWith(V2_UPLATA_PREFIX) || raw.startsWith(V2_PRENOS_PREFIX)) {
      const formType: FormType = raw.startsWith(V2_PRENOS_PREFIX)
        ? 'prenos'
        : 'uplata';
      const prefixLength = formType === 'prenos'
        ? V2_PRENOS_PREFIX.length
        : V2_UPLATA_PREFIX.length;
      const values = JSON.parse(
        strFromU8(gunzipSync(base64UrlToBytes(raw.slice(prefixLength))))
      );
      if (!Array.isArray(values) || values.length > FIELD_ORDER.length) return null;

      const data = emptyPaymentData(formType);
      values.forEach((value, index) => {
        if (typeof value === 'string' && value !== '') {
          data[FIELD_ORDER[index]] = value;
        }
      });
      return { data, formType };
    }

    // Legacy v1 decoder for existing #ey... links.
    const json = new TextDecoder().decode(base64UrlToBytes(raw));
    const compact = JSON.parse(json);
    if (typeof compact !== 'object' || compact === null) return null;

    const formType: FormType =
      (compact as Record<string, unknown>)[FORM_TYPE_KEY] === 'prenos'
        ? 'prenos'
        : 'uplata';
    const data = emptyPaymentData(formType);
    for (const [short, value] of Object.entries(compact)) {
      if (short === FORM_TYPE_KEY) continue;
      const field = SHORT_TO_FIELD[short];
      if (field && typeof value === 'string') data[field] = value;
    }
    return { data, formType };
  } catch {
    return null;
  }
};
