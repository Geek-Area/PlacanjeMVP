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
 * Skraćeni ključevi ispod moraju odgovarati mapi u src/utils/slipLink.ts.
 */

// "Lepi" naziv polja -> skraćeni ključ koji čita aplikacija.
var FIELD_MAP = {
  payerName: 'pn', payerAddress: 'pa', payerCity: 'pc', payerAccount: 'pac',
  purpose: 'pu',
  receiverName: 'rn', receiverAddress: 'ra', receiverCity: 'rc', receiverAccount: 'rac',
  paymentCode: 'sf', currency: 'cur', amount: 'am',
  model: 'mo', reference: 're',
  debitModel: 'dm', debitReference: 'dr'
};

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

  // Kompaktni objekat sa skraćenim ključevima; prazna polja se izostavljaju.
  var compact = {};
  Object.keys(FIELD_MAP).forEach(function (field) {
    var value = payment[field];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      compact[FIELD_MAP[field]] = String(value);
    }
  });
  if (String(payment.formType || 'uplata') === 'prenos') {
    compact.t = 'prenos';
  }

  var json = JSON.stringify(compact);
  var encoded = Utilities.base64EncodeWebSafe(json, Utilities.Charset.UTF_8).replace(/=+$/, '');
  return appUrl.replace(/\/+$/, '') + '/s#' + encoded;
}

/**
 * Vraća share URL za VIŠE uplatnica odjednom (npr. ceo račun sa više stavki).
 * Otvaranjem linka korisnik vidi uplatnice kao stranice (1, 2, 3, ...) sa
 * navigacijom, svaku sa svojim QR kodom.
 *
 * @param {Object[]} payments niz objekata istog oblika kao u buildPaymentLink().
 * @return {string} npr. https://placanje.rs/s#<kod>
 */
function buildMultiPaymentLink(payments) {
  var appUrl = PropertiesService.getScriptProperties().getProperty('APP_URL') || 'https://placanje.rs';

  var compactList = payments.map(function (payment) {
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

    var compact = {};
    Object.keys(FIELD_MAP).forEach(function (field) {
      var value = payment[field];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        compact[FIELD_MAP[field]] = String(value);
      }
    });
    if (String(payment.formType || 'uplata') === 'prenos') {
      compact.t = 'prenos';
    }
    return compact;
  });

  // Više uplatnica putuje pod ključem "L"; jedna uplatnica ostaje u starom,
  // "ravnom" obliku (bez "L") radi kompatibilnosti sa postojećim linkovima.
  var json = compactList.length === 1
    ? JSON.stringify(compactList[0])
    : JSON.stringify({ L: compactList });
  var encoded = Utilities.base64EncodeWebSafe(json, Utilities.Charset.UTF_8).replace(/=+$/, '');
  return appUrl.replace(/\/+$/, '') + '/s#' + encoded;
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
