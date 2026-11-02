// Round-trip and compatibility tests for the payment-link codec (src/utils/slipLink.ts).
// Run with: npm test   (Node 22.6+, uses built-in type stripping — no test framework needed)
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { encodeSlipsData, decodeSlipsData, V2_FIELD_ORDER } from '../src/utils/slipLink.ts';

const base = { payerName:'', payerAddress:'', payerCity:'', payerAccount:'', purpose:'', receiverName:'', receiverAddress:'',
  receiverCity:'', receiverAccount:'', paymentCode:'189', currency:'RSD', amount:'', model:'', reference:'', debitModel:'', debitReference:'' };
const b64u = (buf: Buffer) => buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
let passed = 0;
const test = async (name: string, fn: () => Promise<void>) => { await fn(); passed++; console.log('ok -', name); };

const uplata = { formType: 'uplata' as const, data: { ...base, receiverName:'EPS Snabdevanje d.o.o.', receiverAccount:'160000000012345678',
  amount:'4527.83', purpose:'Račun za struju 10/2026', model:'97', reference:'1234567890123', payerName:'Petar Petrović', payerCity:'Novi Sad' } };
const prenos = { formType: 'prenos' as const, data: { ...base, payerName:'Петар Петровић', payerAddress:'Булевар ослобођења 12', payerCity:'Нови Сад',
  payerAccount:'325950060012345678', purpose:'Уплата по рачуну бр. 2026-117', receiverName:'Предузеће Пример д.о.о.', receiverAddress:'Кнеза Милоша 45',
  receiverCity:'Београд', receiverAccount:'205000000012345678', paymentCode:'221', amount:'187500.00', model:'97', reference:'4512345678901',
  debitModel:'97', debitReference:'2212345678901', currency:'EUR' } };

await test('single uplata round-trips', async () => {
  const enc = await encodeSlipsData([uplata]);
  assert.ok(enc.startsWith('2.'));
  assert.deepEqual(await decodeSlipsData('#' + enc), [uplata]);
});

await test('cyrillic prenos with every field (incl. non-default code/currency) round-trips', async () => {
  assert.deepEqual(await decodeSlipsData(await encodeSlipsData([prenos])), [prenos]);
});

await test('several slips round-trip in order with their own types', async () => {
  const list = [uplata, prenos, { ...uplata, data: { ...uplata.data, amount: '1.00' } }];
  assert.deepEqual(await decodeSlipsData(await encodeSlipsData(list)), list);
});

await test('defaults 189/RSD are omitted and restored', async () => {
  const enc = await encodeSlipsData([uplata]);
  const json = zlib.inflateRawSync(Buffer.from(enc.slice(2), 'base64url')).toString();
  assert.ok(!json.includes('189') && !json.includes('RSD'), json);
  const [slip] = (await decodeSlipsData(enc))!;
  assert.equal(slip.data.paymentCode, '189');
  assert.equal(slip.data.currency, 'RSD');
});

await test('v2 is shorter than v1 for the same slip', async () => {
  const v1 = b64u(Buffer.from(JSON.stringify({ pn: prenos.data.payerName, pa: prenos.data.payerAddress, pc: prenos.data.payerCity,
    pac: prenos.data.payerAccount, pu: prenos.data.purpose, rn: prenos.data.receiverName, ra: prenos.data.receiverAddress,
    rc: prenos.data.receiverCity, rac: prenos.data.receiverAccount, sf: '221', cur: 'EUR', am: prenos.data.amount, mo: '97',
    re: prenos.data.reference, dm: '97', dr: prenos.data.debitReference, t: 'prenos' })));
  const v2 = await encodeSlipsData([prenos]);
  console.log(`   v1 ${v1.length} -> v2 ${v2.length} chars`);
  assert.ok(v2.length < v1.length * 0.65);
});

await test('legacy v1 single link still decodes', async () => {
  const v1 = b64u(Buffer.from(JSON.stringify({ rn: 'Moja Firma d.o.o.', rac: '160000000012345678', am: '1234.56', pu: 'Račun', t: 'prenos' })));
  const [slip] = (await decodeSlipsData('#' + v1))!;
  assert.equal(slip.formType, 'prenos');
  assert.equal(slip.data.receiverName, 'Moja Firma d.o.o.');
  assert.equal(slip.data.purpose, 'Račun');
  assert.equal(slip.data.paymentCode, '189');
});

await test('legacy v1 multi link ({L:[...]}) still decodes', async () => {
  const v1 = b64u(Buffer.from(JSON.stringify({ L: [{ rn: 'A', rac: '1', am: '1' }, { rn: 'B', rac: '2', am: '2', t: 'prenos' }] })));
  const out = (await decodeSlipsData(v1))!;
  assert.deepEqual(out.map((o) => [o.data.receiverName, o.formType]), [['A', 'uplata'], ['B', 'prenos']]);
});

await test('GZIP payload (Apps Script Utilities.gzip / Node) is accepted, padding too', async () => {
  const payload = ['u', 'Moja Firma d.o.o.', '160000000012345678', '1234.56', 'Račun 2026-001'];
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'));
  const padded = gz.toString('base64').replace(/\+/g, '-').replace(/\//g, '_'); // base64EncodeWebSafe keeps '='
  const [slip] = (await decodeSlipsData('2.' + padded))!;
  assert.equal(slip.data.receiverName, 'Moja Firma d.o.o.');
  assert.equal(slip.data.purpose, 'Račun 2026-001');
});

await test('middle empty fields stay empty, positions are respected', async () => {
  const payload = ['u', 'X', '160000000012345678', '10', '', '', '', '', '', '', 'Ana'];
  const enc = '2.' + b64u(zlib.deflateRawSync(JSON.stringify(payload)));
  const [slip] = (await decodeSlipsData(enc))!;
  assert.equal(V2_FIELD_ORDER[9], 'payerName');
  assert.equal(slip.data.payerName, 'Ana');
  assert.equal(slip.data.purpose, '');
});

await test('malformed input resolves to null, never throws', async () => {
  const bad = ['', '#', '2.', '2.!!!!', '2.' + b64u(Buffer.from('not deflate')), 'garbage', '#eyJub3QganNvbg',
    '2.' + b64u(zlib.deflateRawSync('{"a":1}')), '2.' + b64u(zlib.deflateRawSync('[]')), '2.' + b64u(zlib.deflateRawSync('["x","a"]')),
    '2.' + b64u(zlib.deflateRawSync(JSON.stringify(['u', ...Array(20).fill('a')]))),
    '2.' + b64u(zlib.deflateRawSync(JSON.stringify([['u', 'a'], 'oops'])))];
  for (const f of bad) assert.equal(await decodeSlipsData(f), null, `expected null for ${JSON.stringify(f)}`);
});

await test('decompression bomb is rejected', async () => {
  const bomb = zlib.deflateRawSync(Buffer.from('["u","' + 'a'.repeat(5 * 1024 * 1024) + '"]'));
  const enc = '2.' + b64u(bomb);
  console.log(`   bomb fragment ${enc.length} chars`);
  assert.equal(await decodeSlipsData(enc), null);
});

console.log(`\n${passed} tests passed`);
