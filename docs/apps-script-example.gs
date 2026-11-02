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
 * FORMAT (v2): /s#2.<kod>, gde je <kod> = Base64URL( GZIP( JSON ) ), a JSON je
 * niz vrednosti po fiksnom redosledu V2_FIELD_ORDER ispod, sa tipom na početku:
 *   jedna uplatnica:  ["u", "Moja Firma d.o.o.", "160000000012345678", "1234.56", ...]
 *   više uplatnica:   [["u", ...], ["p", ...]]
 * ("u" = uplata, "p" = nalog za prenos; prazna polja na kraju se izostavljaju.)
 *
 * NAPOMENE:
 *  - amount je string; prihvata se "1234.56" ili "1.234,56".
 *  - paymentCode je osnovna šifra (npr. "189"); aplikacija dodaje +100 za QR
 *    po NBS standardu (189 -> 289). Prazno = 189.
 *  - Za model "97", reference mora sadržati i kontrolne cifre.
 *  - Link ne ističe i ne kreira nikakav zapis u bazi.
 *  - Stari (v1) linkovi, Base64URL nekompresovanog JSON-a sa skraćenim
 *    ključevima, i dalje rade, ali su znatno duži.
 *
 * Redosled polja mora odgovarati V2_FIELD_ORDER u src/utils/slipLink.ts.
 */

// Redosled polja u v2 formatu — javni format, ne sme se menjati (samo dopunjavati).
var V2_FIELD_ORDER = [
  'receiverName', 'receiverAccount', 'amount', 'purpose',
  'model', 'reference', 'paymentCode',
  'receiverAddress', 'receiverCity',
  'payerName', 'payerAddress', 'payerCity', 'payerAccount',
  'debitModel', 'debitReference', 'currency'
];

// Validacija (ista pravila kao u aplikaciji) i pretvaranje jedne uplatnice u
// niz vrednosti — greška pukne ovde, a ne kao QR bez sadržaja.
function toV2Values_(payment) {
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

  var values = V2_FIELD_ORDER.map(function (field) {
    var value = payment[field];
    value = value === undefined || value === null ? '' : String(value).trim();
    if (field === 'receiverAccount') {
      return accountDigits; // bez crtica — kraći link
    }
    // Podrazumevane vrednosti aplikacija sama dopuni.
    if ((field === 'paymentCode' && value === '189') || (field === 'currency' && value === 'RSD')) {
      return '';
    }
    return value;
  });
  while (values.length > 0 && values[values.length - 1] === '') {
    values.pop();
  }
  var type = String(payment.formType || 'uplata') === 'prenos' ? 'p' : 'u';
  return [type].concat(values);
}

// JSON -> UTF-8 -> GZIP -> Base64URL, uz prefiks "2.".
function encodeV2_(payload) {
  var utf8 = Utilities.newBlob('').setDataFromString(JSON.stringify(payload), 'UTF-8');
  var gzipped = Utilities.gzip(utf8).getBytes();
  return '2.' + Utilities.base64EncodeWebSafe(gzipped).replace(/=+$/, '');
}

function appUrl_() {
  var url = PropertiesService.getScriptProperties().getProperty('APP_URL') || 'https://placanje.rs';
  return url.replace(/\/+$/, '');
}

/**
 * Vraća share URL za dati objekat uplatnice.
 * Obavezno: receiverName, receiverAccount, amount.
 * Opciono: purpose, paymentCode, model, reference, receiverAddress, receiverCity,
 *          currency, formType ('prenos' za nalog za prenos) i payer/debit polja.
 *
 * @param {Object} payment
 * @return {string} npr. https://placanje.rs/s#2.<kod>
 */
function buildPaymentLink(payment) {
  return appUrl_() + '/s#' + encodeV2_(toV2Values_(payment));
}

/**
 * Vraća share URL za VIŠE uplatnica odjednom (npr. ceo račun sa više stavki).
 * Otvaranjem linka korisnik vidi uplatnice kao stranice (1, 2, 3, ...) sa
 * navigacijom, svaku sa svojim QR kodom.
 *
 * @param {Object[]} payments niz objekata istog oblika kao u buildPaymentLink().
 * @return {string} npr. https://placanje.rs/s#2.<kod>
 */
function buildMultiPaymentLink(payments) {
  var list = payments.map(toV2Values_);
  return appUrl_() + '/s#' + encodeV2_(list.length === 1 ? list[0] : list);
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

/**
 * Primer: kreira link sa VIŠE uplatnica (npr. za više računa istom kupcu).
 */
function sendMultiInvoiceEmail() {
  var url = buildMultiPaymentLink([
    {
      receiverName: 'Moja Firma d.o.o.',
      receiverAccount: '160-0000000012345-78',
      amount: '1.234,56',
      purpose: 'Racun 2026-001'
    },
    {
      receiverName: 'Moja Firma d.o.o.',
      receiverAccount: '160-0000000012345-78',
      amount: '2.500,00',
      purpose: 'Racun 2026-002'
    }
  ]);

  GmailApp.sendEmail(
    'kupac@example.com',
    'Uplatnice — 2 računa',
    'Poštovani,\n\nUplatnice sa IPS QR kodom otvorite ovde: ' + url + '\n\nSrdačan pozdrav'
  );
}
