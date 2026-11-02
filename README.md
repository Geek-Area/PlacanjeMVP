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
- **Stateless linkovi za deljenje** — podaci su enkodirani u URL fragmentu (`/s#<kod>`), pa nema baze ni servera, a podaci ne stižu do servera ni do logova. Link ne ističe.
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
| `/share/:id` | Stari Supabase linkovi — prikazuju poruku da link nije važeći |
| `/api` | Dokumentacija formata linka za integracije |

## Format linka

Uplatnica se pretvara u kompaktan JSON sa skraćenim ključevima (`rn` = naziv primaoca, `rac` = račun, `am` = iznos …),
zatim u UTF-8 base64url i stavlja iza `#`:

```
https://placanje.rs/s#<base64url(JSON)>
```

- jedna uplatnica: `{ "rn": "...", "rac": "...", "am": "1234.56", ... }`
- više uplatnica: `{ "L": [ { ... }, { ... } ] }`
- nalog za prenos: dodaje se `"t": "prenos"`

Puna lista ključeva je u [`src/utils/slipLink.ts`](src/utils/slipLink.ts) i na stranici `/api`.
**Mapa ključeva postoji i u [`docs/apps-script-example.gs`](docs/apps-script-example.gs) — ako se menja na jednom mestu, mora i na drugom**, inače stari linkovi i integracije prestaju da rade.

## Struktura projekta

```
src/
  App.tsx                  glavna stranica: forma, validacija, QR, istorija, deljenje, preuzimanje
  main.tsx                 rute i Vercel Analytics
  components/
    PaymentSlip.tsx        izgled uplatnice / naloga za prenos
    ShareView.tsx          stranica za otvaranje podeljenog linka
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
