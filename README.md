# Plaćanje.rs

Web aplikacija za brzo kreiranje uplatnica i naloga za prenos sa **NBS IPS QR kodom** i deljenje putem linka.
Korisnik popuni uplatnicu, dobije QR kod koji se skenira mobilnim bankarstvom i može da pošalje link
(jedne ili više uplatnica) nekome drugom na plaćanje.

Produkcija: <https://placanje.rs>

## Funkcionalnosti

- **Uplatnica i nalog za prenos** — dva tipa obrasca (`uplata` / `prenos`), sa pregledom koji izgleda kao papirni obrazac.
- **NBS IPS QR kod** — generiše se u realnom vremenu, uz validaciju:
  - račun primaoca mora imati tačno 18 cifara (automatsko formatiranje `XXX-XXXXXXXXXXXXX-XX`),
  - iznos se prihvata kao `1234.56` ili `1.234,56` i mora biti veći od nule,
  - kontrola poziva na broj za model 97,
  - šifra plaćanja se za QR uvećava za 100 po NBS standardu (189 → 289),
  - tekstualna polja se transliteruju i čiste od tipografskih znakova koje banke odbijaju.
- **Više uplatnica u jednoj sesiji** — tabovi za dodavanje/brisanje uplatnica; sve idu kroz jedan link.
- **Stateless linkovi za deljenje** — podaci su kompresovani i enkodirani u URL fragmentu (`/s#2.<kod>`), pa nema baze ni servera, a podaci ne stižu do servera ni do logova. Link ne ističe.
- **Preuzimanje** — QR kod (PNG) ili cela uplatnica (PNG); za više uplatnica ZIP arhiva.
- **Lokalno čuvanje** — sačuvane uplatnice se čuvaju u `localStorage` pregledača (istorija sa učitavanjem i brisanjem).
- **Javni „API“ za linkove** — stranica [`/api`](https://placanje.rs/api) opisuje format, pa link može da napravi bilo koji sistem (npr. Google Apps Script — primer u [`docs/apps-script-example.gs`](docs/apps-script-example.gs)).
- **Analitika** — Vercel Analytics i Google Analytics (tag u [`index.html`](index.html)).

## Tehnologije

- React 19 + TypeScript, Vite 6
- Tailwind CSS 3
- React Router 7
- `qrcode.react` (QR), `html2canvas` / `dom-to-image-more` (slike uplatnica), `jszip` (ZIP)
- Hosting: Vercel (SPA rewrite u [`vercel.json`](vercel.json); [`public/_redirects`](public/_redirects) i [`public/.htaccess`](public/.htaccess) za Netlify/Apache)

## Pokretanje lokalno

Potreban je Node.js 20+ (testirano na Node 22).

```bash
npm install
```

```bash
npm run dev
```

Aplikacija je na <http://localhost:3000>. Nisu potrebne promenljive okruženja ni baza.

Produkcioni build (izlaz u `dist/`) i lokalni pregled builda:

```bash
npm run build
```

```bash
npm run preview
```

## Rute

| Ruta | Opis |
| --- | --- |
| `/` | Forma za kreiranje uplatnica, QR kod, istorija, deljenje i preuzimanje |
| `/s#<kod>` | Prikaz podeljene uplatnice (ili više njih) iz linka |
| `/e#<kod>` | Ista uplatnica bez okvira stranice, za `<iframe>` na drugim sajtovima (jedina ruta koju drugi sajtovi smeju da uokvire); `/embed.js` podešava visinu okvira |
| `/share/:id` | Stari Supabase linkovi — prikazuju poruku da link nije važeći |
| `/api` | Dokumentacija formata linka za integracije |

## Format linka

Aplikacija pravi **v2** linkove:

```
https://placanje.rs/s#2.<base64url(DEFLATE(JSON))>
```

- JSON je niz vrednosti po fiksnom redosledu polja, sa tipom na početku: `["u", "Naziv primaoca", "160000000012345678", "1234.56", ...]` (`u` = uplata, `p` = nalog za prenos); prazna polja na kraju se izostavljaju, a podrazumevane vrednosti `189` i `RSD` se ne upisuju.
- više uplatnica: niz takvih nizova, `[["u", ...], ["p", ...]]`;
- kompresija je raw DEFLATE preko ugrađenog `CompressionStream`; dekoder prihvata i GZIP (npr. `Utilities.gzip` iz Apps Script-a).

Link je 25–45% kraći od starog formata za jednu uplatnicu, a 55–90% za više njih.
**Stari (v1) linkovi** — base64url nekompresovanog JSON-a sa skraćenim ključevima (`{ "rn": ..., "rac": ... }`, odnosno `{ "L": [...] }`) — i dalje se otvaraju.

Redosled polja (`V2_FIELD_ORDER`) i v1 ključevi su u [`src/utils/slipLink.ts`](src/utils/slipLink.ts) i na stranici `/api`.
**Isti redosled postoji i u [`docs/apps-script-example.gs`](docs/apps-script-example.gs) — to je javni format: polja se ne preuređuju niti preimenuju, samo se dodaju na kraj**, inače postojeći linkovi i integracije prestaju da rade.

Testovi za kodiranje linkova i QR kod (Node 22.6+):

```bash
npm test
```

**Zajednički test primeri** za format linka i NBS IPS QR string su u [`test-vectors/`](test-vectors/README.md). Druge implementacije (npr. .NET backend) testiraju se nad tim fajlovima, umesto da drže svoju kopiju očekivanih vrednosti. Posle namerne promene formata: `npm run test-vectors:write`.

## Struktura projekta

```
src/
  App.tsx                  glavna stranica: forma, validacija, QR, istorija, deljenje, preuzimanje
  main.tsx                 rute i Vercel Analytics
  components/
    PaymentSlip.tsx        izgled uplatnice / naloga za prenos
    ShareView.tsx          stranica za otvaranje podeljenog linka
    EmbedView.tsx          uplatnica za <iframe> (/e)
    EmbedCodeDialog.tsx    kod za ugradnju na sajt
    OrderTabs.tsx          tabovi za više uplatnica
    ApiDocs.tsx            dokumentacija formata linka (/api)
    Footer.tsx
  utils/
    ipsGenerator.ts        NBS IPS string, parsiranje i formatiranje iznosa, model 97, transliteracija
    slipLink.ts            enkodiranje/dekodiranje linkova
    downloadHelpers.ts     PNG/ZIP preuzimanja
  types/index.ts           PaymentData, FormType
docs/
  apps-script-example.gs   primer pravljenja linka iz Google Apps Script-a
scripts/                   testovi (npm test) i generisanje test primera
test-vectors/              zajednički test primeri za link i QR (JSON)
public/                    favicon-i, redirect pravila
```

## Povezani repozitorijumi

Ovaj repo je frontend MVP i trenutno radi bez backenda. Backend za naloge, čuvanje uplatnica i Instant plaćanje razvija se odvojeno:

- [`placanje_core`](https://github.com/Geek-Area/placanje_core) — Python backend (Supabase, merchant/POS nalozi, transakcije)
- [`placanje.NET`](https://github.com/Geek-Area/placanje.NET) — .NET 10 prepis backenda
- [`Instant-Placanje`](https://github.com/Geek-Area/Instant-Placanje) — Instant Plaćanje za trgovce

Ranija verzija deljenja preko Supabase-a sačuvana je na grani `supabase-sharing`.

## Doprinos

- Rad ide kroz grane i pull request-ove ka `main`.
- Issues i predlozi: [GitHub Issues](https://github.com/Geek-Area/PlacanjeMVP/issues).
