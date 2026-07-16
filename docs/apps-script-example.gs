/**
 * Placanje.RS — kreiranje uplatnice i share linka iz Google Apps Script-a.
 *
 * Slip se upisuje direktno u Supabase `shared_slips` tabelu preko PostgREST
 * API-ja (isto kao dugme "Podeli" u aplikaciji), a QR kod se generiše na
 * share stranici pri otvaranju linka.
 *
 * PODEŠAVANJE (Apps Script editor → Project Settings → Script Properties):
 *   SUPABASE_URL      = https://<project>.supabase.co
 *   SUPABASE_ANON_KEY = <anon/public key iz Supabase dashboard-a>
 *   APP_URL           = https://placanje.rs
 *
 * NAPOMENE:
 *  - `amount` je string; prihvata se i "1.234,56" i "1234.56".
 *  - `paymentCode` je osnovna šifra (npr. "189") — aplikacija dodaje +100
 *    za QR string po NBS standardu (189 → 289).
 *  - Za model 97, `reference` mora sadržati i kontrolne cifre.
 *  - Link ističe 30 dana nakon kreiranja.
 */

/**
 * Kreira uplatnicu i vraća { id, url } gde je url share link.
 *
 * @param {Object} payment - obavezno: receiverName, receiverAccount, amount;
 *   opciono: receiverAddress, receiverCity, purpose, paymentCode, currency,
 *   model, reference, payerName, payerAddress, payerCity.
 * @return {{id: string, url: string}}
 */
function createPaymentLink(payment) {
  var props = PropertiesService.getScriptProperties();
  var supabaseUrl = props.getProperty('SUPABASE_URL');
  var anonKey = props.getProperty('SUPABASE_ANON_KEY');
  var appUrl = props.getProperty('APP_URL');
  if (!supabaseUrl || !anonKey || !appUrl) {
    throw new Error('Podesite SUPABASE_URL, SUPABASE_ANON_KEY i APP_URL u Script Properties.');
  }

  // Validacija — ista pravila kao generateIPSString u aplikaciji, da greška
  // pukne ovde umesto da se pošalje link bez QR koda.
  var receiverName = String(payment.receiverName || '').trim();
  if (!receiverName) {
    throw new Error('receiverName je obavezan.');
  }
  var accountDigits = String(payment.receiverAccount || '').replace(/[^0-9]/g, '');
  if (accountDigits.length !== 18) {
    throw new Error('receiverAccount mora imati tačno 18 cifara (uneto: ' + accountDigits.length + ').');
  }
  var amount = String(payment.amount || '').trim();
  var normalizedAmount = amount.indexOf(',') !== -1
    ? amount.replace(/\./g, '').replace(',', '.')
    : amount;
  if (!(parseFloat(normalizedAmount) > 0)) {
    throw new Error('amount mora biti veći od 0 (npr. "1.234,56" ili "1234.56").');
  }

  // Kompletan PaymentData objekat — share stranica prikazuje sva polja.
  var paymentData = {
    payerName: String(payment.payerName || ''),
    payerAddress: String(payment.payerAddress || ''),
    payerCity: String(payment.payerCity || ''),
    payerAccount: String(payment.payerAccount || ''),
    purpose: String(payment.purpose || ''),
    receiverName: receiverName,
    receiverAddress: String(payment.receiverAddress || ''),
    receiverCity: String(payment.receiverCity || ''),
    receiverAccount: String(payment.receiverAccount),
    paymentCode: String(payment.paymentCode || '189'),
    currency: String(payment.currency || 'RSD'),
    amount: amount,
    model: String(payment.model || ''),
    reference: String(payment.reference || ''),
    debitModel: String(payment.debitModel || ''),
    debitReference: String(payment.debitReference || ''),
  };

  var expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

  var response = UrlFetchApp.fetch(supabaseUrl + '/rest/v1/shared_slips', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: anonKey,
      Authorization: 'Bearer ' + anonKey,
      Prefer: 'return=representation',
    },
    payload: JSON.stringify({
      data: paymentData,
      qr_string: null, // share stranica generiše QR iz podataka
      form_type: 'uplata',
      expires_at: expiresAt,
    }),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 201) {
    throw new Error('Kreiranje uplatnice nije uspelo (' + response.getResponseCode() + '): ' + response.getContentText());
  }

  var row = JSON.parse(response.getContentText())[0];
  return {
    id: row.id,
    url: appUrl.replace(/\/+$/, '') + '/share/' + row.id,
  };
}

/**
 * Primer: kreira uplatnicu i šalje email sa linkom.
 */
function sendInvoiceEmail() {
  var link = createPaymentLink({
    receiverName: 'Moja Firma d.o.o.',
    receiverAddress: 'Kralja Petra 1',
    receiverCity: 'Beograd',
    receiverAccount: '160-0000000012345-78',
    amount: '1.234,56',
    purpose: 'Racun 2026-001',
    paymentCode: '189',
    model: '97',
    reference: '9712345678901', // kompletna referenca sa kontrolnim ciframa
  });

  GmailApp.sendEmail(
    'kupac@example.com',
    'Račun 2026-001 — uplatnica',
    'Poštovani,\n\nUplatnicu sa IPS QR kodom možete otvoriti ovde: ' + link.url +
      '\n\nLink važi 30 dana.\n\nSrdačan pozdrav',
    {
      htmlBody:
        'Poštovani,<br><br>' +
        'Uplatnicu sa IPS QR kodom možete otvoriti ovde: ' +
        '<a href="' + link.url + '">' + link.url + '</a><br><br>' +
        'Link važi 30 dana.<br><br>Srdačan pozdrav',
    }
  );
}
