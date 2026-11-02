// Shared test vectors for the public formats other services depend on: the v2 payment link
// (src/utils/slipLink.ts) and the NBS IPS QR string (src/utils/ipsGenerator.ts).
//
// The cases below are the source of truth. Expected outputs are computed from this repo's code
// and written to test-vectors/*.json, which other implementations (e.g. placanje.NET) test
// against. See test-vectors/README.md.
//
//   npm test                         checks the JSON files still match the code
//   npm run test-vectors:write       regenerates them after an intended format change
import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { encodeSlipsData, decodeSlipsData, V2_FIELD_ORDER } from '../src/utils/slipLink.ts';
import { generateIPSString } from '../src/utils/ipsGenerator.ts';
import type { PaymentData, FormType } from '../src/types/index.ts';

const OUT_DIR = new URL('../test-vectors/', import.meta.url);
const write = process.argv.includes('--write');

const base: PaymentData = {
  payerName: '', payerAddress: '', payerCity: '', payerAccount: '', purpose: '', receiverName: '',
  receiverAddress: '', receiverCity: '', receiverAccount: '', paymentCode: '189', currency: 'RSD',
  amount: '', model: '', reference: '', debitModel: '', debitReference: '',
};
const slip = (data: Partial<PaymentData>, formType: FormType = 'uplata') => ({ formType, data: { ...base, ...data } });
const b64u = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const payloadOf = (fragment: string) =>
  JSON.parse(zlib.inflateRawSync(Buffer.from(fragment.slice(2), 'base64url')).toString('utf8'));

// ---- v2 link cases ----

const minimal = slip({ receiverName: 'Moja Firma d.o.o.', receiverAccount: '160000000012345678', amount: '1234.56', purpose: 'Racun 2026-001' });
const typical = slip({
  receiverName: 'EPS Snabdevanje d.o.o.', receiverAddress: 'Bulevar umetnosti 12', receiverCity: 'Beograd',
  receiverAccount: '160000000012345678', amount: '4527.83', purpose: 'Račun za struju 10/2026', model: '97',
  reference: '921234567890', payerName: 'Petar Petrović', payerAddress: 'Bulevar oslobođenja 12', payerCity: 'Novi Sad',
});
const cyrillicPrenos = slip({
  payerName: 'Петар Петровић', payerAddress: 'Булевар ослобођења 12', payerCity: 'Нови Сад', payerAccount: '325950060012345678',
  purpose: 'Уплата по рачуну бр. 2026-117', receiverName: 'Предузеће Пример д.о.о.', receiverAddress: 'Кнеза Милоша 45',
  receiverCity: 'Београд', receiverAccount: '205000000012345678', paymentCode: '221', amount: '187500.00', model: '97',
  reference: '184512345678', debitModel: '97', debitReference: '182026001', currency: 'EUR',
}, 'prenos');
const gapsOnlyPayer = slip({ receiverName: 'X', receiverAccount: '160000000012345678', amount: '10', payerName: 'Ana' });
const specialChars = slip({
  receiverName: 'Firma "Navodnici" — test', receiverAccount: '160000000012345678', amount: '1,00',
  purpose: 'Svrha | sa crtom\ni novim redom ✓',
});

const linkCases: { name: string; slips: ReturnType<typeof slip>[] }[] = [
  { name: 'one uplata, required fields only', slips: [minimal] },
  { name: 'one uplata, receiver and payer address, model 97', slips: [typical] },
  { name: 'one prenos in Cyrillic, every field, non-default payment code and currency', slips: [cyrillicPrenos] },
  { name: 'empty fields in the middle are kept as ""', slips: [gapsOnlyPayer] },
  { name: 'quotes, dash, pipe, newline and non-Latin symbols', slips: [specialChars] },
  { name: 'several slips of both types in one link', slips: [minimal, cyrillicPrenos, typical] },
];

// Fragments made elsewhere that every decoder must accept (they are never produced by the encoder).
const v1 = (value: unknown) => b64u(Buffer.from(JSON.stringify(value)));
const decodeOnlyCases = [
  {
    name: 'legacy v1 link, one slip',
    fragment: v1({ rn: 'Moja Firma d.o.o.', rac: '160000000012345678', am: '1234.56', pu: 'Račun', t: 'prenos' }),
  },
  {
    name: 'legacy v1 link, several slips ({ L: [...] })',
    fragment: v1({ L: [{ rn: 'A', rac: '160000000012345678', am: '1' }, { rn: 'B', rac: '205000000012345678', am: '2', t: 'prenos' }] }),
  },
  {
    // What Apps Script's Utilities.gzip + base64EncodeWebSafe produce: GZIP instead of raw DEFLATE, '=' padding kept.
    name: 'v2 link compressed with GZIP, with base64 padding',
    fragment: '2.' + zlib.gzipSync(Buffer.from(JSON.stringify(['u', 'Moja Firma d.o.o.', '160000000012345678', '1234.56', 'Račun 2026-001'])))
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
  },
];

const deflate = (value: unknown) => '2.' + b64u(zlib.deflateRawSync(JSON.stringify(value)));
const invalidFragments = [
  '', '2.', '2.!!!!', 'garbage', '2.' + b64u(Buffer.from('not deflate')),
  deflate({ a: 1 }), deflate([]), deflate(['x', 'a']), deflate(['u', ...Array(V2_FIELD_ORDER.length + 1).fill('a')]),
  deflate([['u', 'a'], 'oops']),
];

// ---- NBS IPS QR cases ----

const qrCases: { name: string; data: PaymentData }[] = [
  { name: 'required fields only', data: minimal.data },
  { name: 'receiver address and city, model 97 reference; payer is never included', data: typical.data },
  { name: 'Cyrillic is transliterated, non-default payment code and currency', data: cyrillicPrenos.data },
  {
    name: 'typographic characters and the "|" separator are replaced',
    data: { ...minimal.data, receiverName: 'Firma „Navodnici“ — test', purpose: 'Uplata | rata… 1/2' },
  },
  {
    name: 'receiver block is cut to 70 and purpose to 35 characters',
    data: { ...minimal.data, receiverName: 'Udruženje građana za razvoj lokalne zajednice i očuvanje', receiverAddress: 'Kralja Aleksandra Karađorđevića 123', receiverCity: 'Sremska Mitrovica', purpose: 'Članarina za drugo polugodište školske 2026/2027 godine' },
  },
  { name: 'amount with thousand dots and a decimal comma', data: { ...minimal.data, amount: '1.234.567,8' } },
  { name: 'amount with a decimal point and one decimal', data: { ...minimal.data, amount: '1234.5' } },
  { name: 'amount with a single dot as thousand separator', data: { ...minimal.data, amount: '1.234' } },
  { name: 'account with dashes is accepted', data: { ...minimal.data, receiverAccount: '160-0000000123456-78' } },
  { name: 'invalid: short account form (not padded to 18 digits)', data: { ...minimal.data, receiverAccount: '160-12345678-90' } },
  { name: 'reference without a model gets model 00', data: { ...minimal.data, model: '', reference: '2026-001' } },
  { name: 'invalid: account is not 18 digits', data: { ...minimal.data, receiverAccount: '16000000001234567' } },
  { name: 'invalid: model 97 with wrong check digits', data: { ...minimal.data, model: '97', reference: '001234567890' } },
  { name: 'invalid: zero amount', data: { ...minimal.data, amount: '0' } },
  { name: 'invalid: receiver name missing', data: { ...minimal.data, receiverName: '' } },
];

// ---- build and check ----

const linkVectors = {
  description: 'Shared test vectors for the placanje.rs v2 payment link. Generated by scripts/test-vectors.ts; do not edit by hand.',
  fieldOrder: V2_FIELD_ORDER,
  defaults: { paymentCode: '189', currency: 'RSD' },
  encode: await Promise.all(linkCases.map(async ({ name, slips }) => {
    const fragment = await encodeSlipsData(slips);
    return { name, slips, payload: payloadOf(fragment), fragment };
  })),
  decode: await Promise.all(decodeOnlyCases.map(async ({ name, fragment }) => ({ name, fragment, slips: await decodeSlipsData(fragment) }))),
  invalid: invalidFragments,
};

const qrVectors = {
  description: 'Shared test vectors for the NBS IPS QR string (K:PR) as placanje.rs builds it from a slip. Generated by scripts/test-vectors.ts; do not edit by hand. "qr": null means no QR code is produced.',
  cases: qrCases.map(({ name, data }) => ({ name, data, qr: generateIPSString(data) })),
};

// Every vector must hold for this repo's own code, whatever the file says.
for (const v of linkVectors.encode) assert.deepEqual(await decodeSlipsData(v.fragment), v.slips, v.name);
for (const v of linkVectors.decode) assert.ok(v.slips, `${v.name}: decodes`);
for (const f of linkVectors.invalid) assert.equal(await decodeSlipsData(f), null, `invalid: ${JSON.stringify(f)}`);

const files = { 'v2-links.json': linkVectors, 'ips-qr.json': qrVectors };
for (const [file, vectors] of Object.entries(files)) {
  const url = new URL(file, OUT_DIR);
  const json = JSON.stringify(vectors, null, 2) + '\n';
  if (write) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(url, json);
    console.log('wrote test-vectors/' + file);
    continue;
  }

  const stored = JSON.parse(fs.readFileSync(url, 'utf8'));
  if (file === 'v2-links.json') {
    // Compressed bytes may differ between zlib versions, so stored fragments are checked by
    // decoding them; everything else must match exactly.
    for (const v of stored.encode) assert.deepEqual(await decodeSlipsData(v.fragment), v.slips, `${file}: ${v.name}`);
    const strip = (x: typeof linkVectors) => ({ ...x, encode: x.encode.map(({ fragment: _, ...rest }) => rest) });
    assert.deepEqual(strip(stored), strip(JSON.parse(JSON.stringify(vectors))), `${file} is out of date: run npm run test-vectors:write`);
  } else {
    assert.deepEqual(stored, JSON.parse(json), `${file} is out of date: run npm run test-vectors:write`);
  }
  console.log(`ok - test-vectors/${file} matches the code`);
}
