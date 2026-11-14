// Payment codes (šifre plaćanja) from Annex 3 (Prilog 3) of the NBS decision on the form, content and
// use of payment order forms for dinar transactions, plus the NBS IPS QR rules for the SF tag.
// A code has three digits: the form of payment (first digit) followed by the basis of payment (two digits).

export interface PaymentCodeBasis {
  /** Two-digit basis of payment, e.g. "89". */
  code: string;
  /** Official name of the basis (Osnov plaćanja). */
  name: string;
  /** Short plain-language hint for when to use it; empty when the name says it all. */
  hint: string;
  group: string;
}

export const PAYMENT_FORMS: Record<string, string> = {
  '1': 'Gotovinski',
  '2': 'Bezgotovinski',
  '3': 'Obračunski',
  '9': 'Preknjižavanje',
};

export const PAYMENT_CODE_GROUPS = [
  'Promet robe i usluga',
  'Raspodela',
  'Javni prihodi',
  'Transferi',
  'Finansijske transakcije',
  'Ostalo',
] as const;

const g = (group: (typeof PAYMENT_CODE_GROUPS)[number]) => group;

export const PAYMENT_CODE_BASES: PaymentCodeBasis[] = [
  { code: '20', group: g('Promet robe i usluga'), name: 'Promet robe i usluga – međufazna potrošnja', hint: 'Roba, sirovine i usluge koje firma koristi u svom poslovanju' },
  { code: '21', group: g('Promet robe i usluga'), name: 'Promet robe i usluga – finalna potrošnja', hint: 'Plaćanje računa za robu i usluge, članarine, provizije' },
  { code: '22', group: g('Promet robe i usluga'), name: 'Usluge javnih preduzeća', hint: 'Struja, voda, grejanje, komunalije i druge propisane obaveze javnim preduzećima' },
  { code: '23', group: g('Promet robe i usluga'), name: 'Investicije u objekte i opremu', hint: 'Izgradnja objekata i nabavka opreme' },
  { code: '24', group: g('Promet robe i usluga'), name: 'Investicije – ostalo', hint: '' },
  { code: '25', group: g('Promet robe i usluga'), name: 'Zakupnine stvari u javnoj svojini', hint: '' },
  { code: '26', group: g('Promet robe i usluga'), name: 'Zakupnine', hint: 'Zakup stana, poslovnog prostora i drugih stvari' },
  { code: '27', group: g('Promet robe i usluga'), name: 'Subvencije, regresi i premije s posebnih računa', hint: '' },
  { code: '28', group: g('Promet robe i usluga'), name: 'Subvencije, regresi i premije sa ostalih računa', hint: '' },
  { code: '29', group: g('Promet robe i usluga'), name: 'Digitalna imovina', hint: 'Virtuelne valute i digitalni tokeni' },
  { code: '30', group: g('Promet robe i usluga'), name: 'Promet nepokretnosti', hint: 'Kupoprodaja zemljišta, stanova, garaža i drugih nepokretnosti' },
  { code: '31', group: g('Promet robe i usluga'), name: 'Carine i druge uvozne dažbine', hint: '' },
  { code: '40', group: g('Raspodela'), name: 'Zarade i druga primanja zaposlenih', hint: 'Isplata plata' },
  { code: '41', group: g('Raspodela'), name: 'Neoporeziva primanja zaposlenih, socijalna i druga davanja izuzeta od oporezivanja', hint: '' },
  { code: '42', group: g('Raspodela'), name: 'Naknade zarada na teret poslodavca', hint: '' },
  { code: '44', group: g('Raspodela'), name: 'Isplate preko omladinskih i studentskih zadruga', hint: '' },
  { code: '45', group: g('Raspodela'), name: 'Penzije', hint: '' },
  { code: '46', group: g('Raspodela'), name: 'Obustave od penzija i zarada', hint: 'Administrativne zabrane za kredite, članarine i slično' },
  { code: '47', group: g('Raspodela'), name: 'Naknade zarada na teret drugih isplatilaca', hint: '' },
  { code: '48', group: g('Raspodela'), name: 'Prihodi fizičkih lica od kapitala i drugih imovinskih prava', hint: 'Kamate, dividende, izdavanje nepokretnosti, autorska prava' },
  { code: '49', group: g('Raspodela'), name: 'Ostali prihodi fizičkih lica', hint: 'Ugovor o delu, autorski honorari i slično' },
  { code: '53', group: g('Javni prihodi'), name: 'Uplata javnih prihoda izuzev poreza i doprinosa po odbitku', hint: 'Porezi, takse i naknade (npr. porez na imovinu, administrativne takse)' },
  { code: '54', group: g('Javni prihodi'), name: 'Uplata poreza i doprinosa po odbitku', hint: 'Porezi i doprinosi koje isplatilac plaća uz isplatu prihoda' },
  { code: '57', group: g('Javni prihodi'), name: 'Povraćaj više naplaćenih ili pogrešno naplaćenih tekućih prihoda', hint: '' },
  { code: '58', group: g('Javni prihodi'), name: 'Preknjižavanje više uplaćenih ili pogrešno uplaćenih tekućih prihoda', hint: '' },
  { code: '60', group: g('Transferi'), name: 'Premije osiguranja i nadoknada štete', hint: 'Plaćanje polise osiguranja' },
  { code: '61', group: g('Transferi'), name: 'Raspored tekućih prihoda', hint: '' },
  { code: '62', group: g('Transferi'), name: 'Transferi u okviru državnih organa', hint: '' },
  { code: '63', group: g('Transferi'), name: 'Ostali transferi', hint: 'Prenos u okviru istog pravnog lica i drugi transferi' },
  { code: '64', group: g('Transferi'), name: 'Prenos sredstava iz budžeta za obezbeđenje povraćaja više naplaćenih tekućih prihoda', hint: '' },
  { code: '65', group: g('Transferi'), name: 'Uplata pazara', hint: '' },
  { code: '66', group: g('Transferi'), name: 'Isplata gotovine', hint: '' },
  { code: '70', group: g('Finansijske transakcije'), name: 'Kratkoročni krediti', hint: '' },
  { code: '71', group: g('Finansijske transakcije'), name: 'Dugoročni krediti', hint: '' },
  { code: '72', group: g('Finansijske transakcije'), name: 'Aktivna kamata', hint: 'Plaćanje kamate po kreditima' },
  { code: '73', group: g('Finansijske transakcije'), name: 'Polaganje oročenih depozita', hint: '' },
  { code: '75', group: g('Finansijske transakcije'), name: 'Ostali plasmani', hint: '' },
  { code: '76', group: g('Finansijske transakcije'), name: 'Otplata kratkoročnih kredita', hint: '' },
  { code: '77', group: g('Finansijske transakcije'), name: 'Otplata dugoročnih kredita', hint: 'Rata kredita' },
  { code: '78', group: g('Finansijske transakcije'), name: 'Povraćaj oročenih depozita', hint: '' },
  { code: '79', group: g('Finansijske transakcije'), name: 'Pasivna kamata', hint: '' },
  { code: '80', group: g('Finansijske transakcije'), name: 'Eskont hartija od vrednosti', hint: '' },
  { code: '81', group: g('Finansijske transakcije'), name: 'Pozajmice osnivača za likvidnost', hint: '' },
  { code: '82', group: g('Finansijske transakcije'), name: 'Povraćaj pozajmice za likvidnost osnivaču', hint: '' },
  { code: '83', group: g('Finansijske transakcije'), name: 'Naplata čekova građana', hint: '' },
  { code: '84', group: g('Finansijske transakcije'), name: 'Platne kartice', hint: '' },
  { code: '85', group: g('Finansijske transakcije'), name: 'Menjački poslovi', hint: '' },
  { code: '86', group: g('Finansijske transakcije'), name: 'Kupoprodaja deviza', hint: '' },
  { code: '87', group: g('Ostalo'), name: 'Donacije i sponzorstva', hint: 'Iz sredstava banaka i drugih pravnih lica' },
  { code: '88', group: g('Ostalo'), name: 'Donacije', hint: 'Donacije iz međunarodnih ugovora' },
  { code: '89', group: g('Ostalo'), name: 'Transakcije po nalogu građana', hint: 'Samo kada plaća fizičko lice (građanin), za sve ostalo što nije navedeno' },
  { code: '90', group: g('Ostalo'), name: 'Druge transakcije', hint: '' },
];

/** Codes offered first in the picker, in this order. */
export const COMMON_PAYMENT_CODES = ['189', '121', '122', '153', '126', '160', '177', '187'];

export type PaymentCodeCheck =
  | { status: 'empty' }
  | { status: 'ok'; form: string; basis: PaymentCodeBasis; note?: string }
  | { status: 'warning'; message: string; basis?: PaymentCodeBasis }
  | { status: 'error'; message: string };

/** Explains a payment code as typed in the form, and flags codes that the NBS IPS QR will not accept. */
export const checkPaymentCode = (raw: string): PaymentCodeCheck => {
  const code = raw.trim();
  if (!code) return { status: 'empty' };
  if (!/^\d{3}$/.test(code)) return { status: 'error', message: 'Šifra plaćanja ima tačno tri cifre.' };

  const form = PAYMENT_FORMS[code[0]];
  const basis = PAYMENT_CODE_BASES.find((b) => b.code === code.slice(1));
  if (!form) return { status: 'error', message: `Prva cifra mora biti 1 (gotovinski) ili 2 (bezgotovinski), a ne ${code[0]}.` };
  if (!basis) return { status: 'error', message: `Osnov plaćanja ${code.slice(1)} ne postoji u spisku šifara NBS.` };
  if (code[0] === '3' || code[0] === '9') {
    return { status: 'warning', basis, message: `Prva cifra ${code[0]} (${form.toLowerCase()}) ne može da se koristi u IPS QR kodu; upotrebite ${'2' + basis.code} ili ${'1' + basis.code}.` };
  }
  const note = basis.code === '89' ? 'Samo za uplate građana. Ako plaća firma ili preduzetnik, izaberite drugu šifru.' : undefined;
  return { status: 'ok', form, basis, note };
};
