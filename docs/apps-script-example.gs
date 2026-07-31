/**
 * Placanje.RS — kreiranje besplatnog "stateless" payment linka iz Google Apps Script-a.
 *
 * Link sadrži sve podatke uplatnice enkodirane u samom URL-u (fragment iza #),
 * pa NIJE potreban server, baza podataka, niti API ključ. Otvaranjem linka
 * korisnik vidi uplatnicu sa NBS IPS QR kodom.
 *
 * PODEŠAVANJE (Apps Script editor -> Project Settings -> Script Properties):
 *   APP_URL = https://placanje.rs
 *
 * NAPOMENE:
 *  - amount je string; prihvata se "1234.56" ili "1.234,56".
 *  - paymentCode je osnovna šifra (npr. "189"); aplikacija dodaje +100 za QR
 *    po NBS standardu (189 -> 289).
 *  - Za model "97", reference mora sadržati i kontrolne cifre.
 *  - Link ne ističe i ne kreira nikakav zapis u bazi.
 *
 * Redosled polja ispod je deo v2 formata i mora odgovarati FIELD_ORDER nizu u
 * src/utils/slipLink.ts.
 */

var FIELD_ORDER = [
  'payerName', 'payerAddress', 'payerCity', 'payerAccount', 'purpose',
  'receiverName', 'receiverAddress', 'receiverCity', 'receiverAccount',
  'paymentCode', 'currency', 'amount', 'model', 'reference',
  'debitModel', 'debitReference'
];

/**
 * Vraća share URL za dati objekat uplatnice.
 * Obavezno: receiverName, receiverAccount, amount.
 * Opciono: purpose, paymentCode, model, reference, receiverAddress, receiverCity,
 *          currency, formType ('prenos' za nalog za prenos) i payer/debit polja.
 *
 * @param {Object} payment
 * @return {string} npr. https://placanje.rs/s#<kod>
 */
function buildPaymentLink(payment) {
  var appUrl = PropertiesService.getScriptProperties().getProperty('APP_URL') || 'https://placanje.rs';

  // Validacija (ista pravila kao u aplikaciji) — greška pukne ovde, a ne kao QR bez sadržaja.
  var receiverName = String(payment.receiverName || '').trim();
  if (!receiverName) {
    throw new Error('receiverName je obavezan.');
  }
  var accountDigits = String(payment.receiverAccount || '').replace(/[^0-9]/g, '');
  if (accountDigits.length !== 18) {
    throw new Error('receiverAccount mora imati tačno 18 cifara (uneto: ' + accountDigits.length + ').');
  }
  var amount = String(payment.amount || '').trim();
  var amountNum = amount.indexOf(',') !== -1 ? amount.replace(/\./g, '').replace(',', '.') : amount;
  if (!(parseFloat(amountNum) > 0)) {
    throw new Error('amount mora biti veći od 0 (npr. "1.234,56" ili "1234.56").');
  }

  var formType = String(payment.formType || 'uplata') === 'prenos' ? 'prenos' : 'uplata';
  var defaultPaymentCode = formType === 'prenos' ? '253' : '189';
  var values = FIELD_ORDER.map(function (field) {
    var value = payment[field];
    if (value === undefined || value === null || String(value).trim() === '') return '';
    if (field === 'currency' && String(value) === 'RSD') return '';
    if (field === 'paymentCode' && String(value) === defaultPaymentCode) return '';
    return String(value);
  });
  while (values.length && values[values.length - 1] === '') {
    values.pop();
  }

  var compressed = Utilities.gzip(Utilities.newBlob(JSON.stringify(values))).getBytes();
  var encoded = Utilities.base64EncodeWebSafe(compressed).replace(/=+$/, '');
  var prefix = formType === 'prenos' ? '2p.' : '2u.';
  return appUrl.replace(/\/+$/, '') + '/s#' + prefix + encoded;
}

/**
 * Primer: kreira link i šalje email sa uplatnicom.
 */
function sendInvoiceEmail() {
  var url = buildPaymentLink({
    receiverName: 'Moja Firma d.o.o.',
    receiverAddress: 'Kralja Petra 1',
    receiverCity: 'Beograd',
    receiverAccount: '160-0000000012345-78',
    amount: '1.234,56',
    purpose: 'Racun 2026-001',
    paymentCode: '189',
    model: '97',
    reference: '9712345678901' // kompletna referenca sa kontrolnim ciframa
  });

  GmailApp.sendEmail(
    'kupac@example.com',
    'Račun 2026-001 — uplatnica',
    'Poštovani,\n\nUplatnicu sa IPS QR kodom otvorite ovde: ' + url + '\n\nSrdačan pozdrav',
    {
      htmlBody:
        'Poštovani,<br><br>' +
        'Uplatnicu sa IPS QR kodom otvorite ovde: ' +
        '<a href="' + url + '">' + url + '</a><br><br>' +
        'Srdačan pozdrav'
    }
  );
}
