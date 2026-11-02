import type { PaymentData, FormType } from '@/types';

/**
 * Stateless payment-link codec.
 *
 * One or more payment slips are carried in the URL fragment (e.g. `/s#2.<encoded>`).
 * No server or database is involved — the share page decodes the fragment and
 * renders the slip(s) directly. Because it lives in the fragment, the data never
 * reaches the server or its logs.
 *
 * Two formats are understood:
 *
 * - v2 (`2.<base64url>`, what the app creates): a JSON array of field values in
 *   the fixed V2_FIELD_ORDER below, compressed with raw DEFLATE. A single slip is
 *   `["u"|"p", ...values]`; several slips are an array of those. GZIP input is
 *   accepted too, so integrations can use whatever their platform ships
 *   (e.g. Apps Script's `Utilities.gzip`).
 * - v1 (legacy, `ey…`): base64url of uncompressed JSON with short keys, either one
 *   object or `{ L: [...] }`. Links already in circulation and simple integrations
 *   keep working; the app no longer creates them.
 *
 * IMPORTANT: the v1 key map and the v2 field order are public formats, mirrored in
 * `docs/apps-script-example.gs` and on the /api page. Never reorder or rename —
 * only append.
 */

// Full PaymentData field -> short key used in v1 JSON.
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

// v1: form type travels under its own short key; omitted when it is the default.
const FORM_TYPE_KEY = 't';

// v1: multiple slips travel under this key as an array of compact objects.
const LIST_KEY = 'L';

// v2: position of each field in the value array. Most-used fields first, so the
// trailing empty ones can be dropped.
export const V2_FIELD_ORDER: (keyof PaymentData)[] = [
  'receiverName',
  'receiverAccount',
  'amount',
  'purpose',
  'model',
  'reference',
  'paymentCode',
  'receiverAddress',
  'receiverCity',
  'payerName',
  'payerAddress',
  'payerCity',
  'payerAccount',
  'debitModel',
  'debitReference',
  'currency',
];

const V2_PREFIX = '2.';
const V2_TYPE: Record<FormType, string> = { uplata: 'u', prenos: 'p' };

// Guards against absurd or malicious fragments (e.g. a decompression bomb).
const MAX_V2_FRAGMENT_LENGTH = 64 * 1024;
const MAX_V2_DECOMPRESSED_BYTES = 1024 * 1024;

// Values the decoder fills in when a field is absent, so the encoder can omit them.
const DEFAULT_PAYMENT_CODE = '189';
const DEFAULT_CURRENCY = 'RSD';

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
  paymentCode: DEFAULT_PAYMENT_CODE,
  currency: DEFAULT_CURRENCY,
  amount: '',
  model: '',
  reference: '',
  debitModel: '',
  debitReference: '',
});

// UTF-8 safe base64url. btoa/atob alone operate on Latin1 and corrupt Cyrillic,
// so we always go through bytes.
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

// Native CompressionStream — no library needed (all current browsers, Node 18+).
const compress = async (text: string): Promise<Uint8Array> => {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const decompress = async (bytes: Uint8Array): Promise<string> => {
  // GZIP starts with 0x1f 0x8b; that can never begin a valid raw DEFLATE stream.
  const format = bytes[0] === 0x1f && bytes[1] === 0x8b ? 'gzip' : 'deflate-raw';
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format)).getReader();

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_V2_DECOMPRESSED_BYTES) {
      await reader.cancel();
      throw new Error('Decompressed payload too large');
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(out);
};

export interface DecodedSlip {
  data: PaymentData;
  formType: FormType;
}

export interface SlipOrder {
  data: PaymentData;
  formType: FormType;
}

// ---- v2 ----

const buildV2Values = ({ data, formType }: SlipOrder): string[] => {
  const values = V2_FIELD_ORDER.map((field) => {
    const value = data[field]?.trim() ?? '';
    if (field === 'paymentCode' && value === DEFAULT_PAYMENT_CODE) return '';
    if (field === 'currency' && value === DEFAULT_CURRENCY) return '';
    return value;
  });
  while (values.length > 0 && values[values.length - 1] === '') values.pop();
  return [V2_TYPE[formType], ...values];
};

const parseV2Values = (entry: unknown): DecodedSlip | null => {
  if (!Array.isArray(entry) || entry.length === 0 || entry.length > V2_FIELD_ORDER.length + 1) {
    return null;
  }
  const [type, ...values] = entry;
  if (type !== V2_TYPE.uplata && type !== V2_TYPE.prenos) return null;

  const data = emptyPaymentData();
  values.forEach((value, index) => {
    if (typeof value === 'string' && value !== '') data[V2_FIELD_ORDER[index]] = value;
  });
  return { data, formType: type === V2_TYPE.prenos ? 'prenos' : 'uplata' };
};

const decodeV2 = async (encoded: string): Promise<DecodedSlip[] | null> => {
  if (encoded.length > MAX_V2_FRAGMENT_LENGTH) return null;
  const parsed: unknown = JSON.parse(await decompress(base64UrlToBytes(encoded)));
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  // A single slip is a flat ["u", ...]; several are [["u", ...], ["p", ...]].
  const entries = Array.isArray(parsed[0]) ? parsed : [parsed];
  const orders = entries.map(parseV2Values);
  return orders.every((order): order is DecodedSlip => order !== null) ? orders : null;
};

// ---- v1 (legacy) ----

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

const decodeV1 = (encoded: string): DecodedSlip[] | null => {
  const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded)));
  if (typeof parsed !== 'object' || parsed === null) return null;

  const list = (parsed as Record<string, unknown>)[LIST_KEY];
  if (Array.isArray(list)) {
    const orders = list
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map(parseCompact);
    return orders.length > 0 ? orders : null;
  }

  return [parseCompact(parsed as Record<string, unknown>)];
};

// ---- public API ----

/**
 * Encode one or more payment slips into a v2 fragment (no leading `#`).
 */
export const encodeSlipsData = async (orders: SlipOrder[]): Promise<string> => {
  const list = orders.length > 0 ? orders : [{ data: emptyPaymentData(), formType: 'uplata' as FormType }];
  const payload = list.length === 1 ? buildV2Values(list[0]) : list.map(buildV2Values);
  return V2_PREFIX + bytesToBase64Url(await compress(JSON.stringify(payload)));
};

/**
 * Decode a fragment (with or without a leading `#`) back into one or more
 * payment slips. Understands v2 and legacy v1 links. Resolves to null on any
 * malformed input — never rejects.
 */
export const decodeSlipsData = async (fragment: string): Promise<DecodedSlip[] | null> => {
  const raw = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  if (!raw) return null;

  try {
    return raw.startsWith(V2_PREFIX) ? await decodeV2(raw.slice(V2_PREFIX.length)) : decodeV1(raw);
  } catch {
    return null;
  }
};
