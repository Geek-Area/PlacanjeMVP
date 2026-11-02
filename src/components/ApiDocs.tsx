import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Code2, Link2, KeyRound, FileCode2, AppWindow } from 'lucide-react';
import Footer from '@/components/Footer';
// Raw import keeps this page and the downloadable file as a single source of truth.
import appsScriptExample from '../../docs/apps-script-example.gs?raw';

interface FieldRow {
  key: string;
  name: string;
  required: boolean;
  note: string;
}

// Listed in v2 order: the row index is the field's position in the v2 value array.
const FIELDS: FieldRow[] = [
  { key: 'rn', name: 'receiverName', required: true, note: 'Naziv primaoca' },
  { key: 'rac', name: 'receiverAccount', required: true, note: 'Račun primaoca — 18 cifara (sa ili bez crtica)' },
  { key: 'am', name: 'amount', required: true, note: 'Iznos, npr. "1234.56" ili "1.234,56"' },
  { key: 'pu', name: 'purpose', required: false, note: 'Svrha plaćanja' },
  { key: 'mo', name: 'model', required: false, note: 'Model poziva na broj (npr. 97)' },
  { key: 're', name: 'reference', required: false, note: 'Poziv na broj (odobrenje)' },
  { key: 'sf', name: 'paymentCode', required: false, note: 'Šifra plaćanja (prazno = 189)' },
  { key: 'ra', name: 'receiverAddress', required: false, note: 'Adresa primaoca' },
  { key: 'rc', name: 'receiverCity', required: false, note: 'Mesto primaoca' },
  { key: 'pn', name: 'payerName', required: false, note: 'Uplatilac' },
  { key: 'pa', name: 'payerAddress', required: false, note: 'Adresa uplatioca' },
  { key: 'pc', name: 'payerCity', required: false, note: 'Mesto uplatioca' },
  { key: 'pac', name: 'payerAccount', required: false, note: 'Račun uplatioca (nalog za prenos)' },
  { key: 'dm', name: 'debitModel', required: false, note: 'Model — zaduženje (nalog za prenos)' },
  { key: 'dr', name: 'debitReference', required: false, note: 'Poziv na broj — zaduženje (nalog za prenos)' },
  { key: 'cur', name: 'currency', required: false, note: 'Valuta (prazno = RSD)' },
];

const jsExample = `// Radi u pregledaču i u Node.js 18+ (ugrađen CompressionStream, bez biblioteka).
async function buildPaymentLink(slips) {
  const json = JSON.stringify(slips);
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  const encoded = btoa(binary).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
  return "https://placanje.rs/s#2." + encoded;
}

// Jedna uplatnica: tip ("u" = uplata, "p" = prenos), pa vrednosti po redosledu iz tabele.
const link = await buildPaymentLink([
  "u",
  "Moja Firma d.o.o.",     // 1 receiverName
  "160000000012345678",    // 2 receiverAccount
  "1234.56",               // 3 amount
  "Racun 2026-001",        // 4 purpose
  "97",                    // 5 model
  "9712345678901"          // 6 reference
]);`;

const multiSlipJsExample = `// buildPaymentLink je iz JavaScript primera na dnu strane.
const link = await buildPaymentLink([
  ["u", "Moja Firma d.o.o.", "160000000012345678", "1234.56", "Racun 2026-001"],
  ["u", "Moja Firma d.o.o.", "160000000012345678", "2500.00", "Racun 2026-002"]
]);`;

const embedExample = `<iframe src="https://placanje.rs/e#2.<kod>"
        style="width:100%;max-width:720px;height:420px;border:0"
        title="Uplatnica — Plaćanje.rs" loading="lazy"></iframe>
<!-- Opciono: podešava visinu okvira prema uplatnici -->
<script src="https://placanje.rs/embed.js" async></script>`;

const legacyExample = `const data = { rn: "Moja Firma d.o.o.", rac: "160000000012345678", am: "1234.56", pu: "Racun 2026-001" };
const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))))
  .replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
const link = "https://placanje.rs/s#" + encoded;

// Više uplatnica u v1: { L: [ { ... }, { ... } ] }; nalog za prenos: dodati t: "prenos".`;

const Section: React.FC<{
  id?: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ id, icon, title, children }) => (
  <section id={id} className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 scroll-mt-4">
    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
      <span className="text-blue-600">{icon}</span>
      {title}
    </h2>
    {children}
  </section>
);

const CodeBlock: React.FC<{ children: string }> = ({ children }) => (
  <pre className="bg-gray-900 text-gray-100 text-xs leading-relaxed rounded-xl p-4 overflow-x-auto">
    <code>{children}</code>
  </pre>
);

const ApiDocs: React.FC = () => (
  <div className="min-h-screen bg-gray-100 p-4 lg:p-8 font-sans">
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-4"
        >
          <ArrowLeft size={16} />
          Nazad na generator
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <span className="p-2 bg-blue-100 text-blue-600 rounded-xl">
            <Code2 size={28} />
          </span>
          API — programsko kreiranje linkova
        </h1>
        <p className="text-gray-500 mt-3 leading-relaxed">
          Placanje.RS podržava <strong>besplatne "stateless" linkove</strong> za uplatnice.
          Svi podaci uplatnice se enkodiraju direktno u URL (u fragment iza <code>#</code>),
          pa za kreiranje linka nije potreban server, baza podataka, niti API ključ.
          Link možete napraviti iz Google Apps Script-a, ili bilo kog jezika, i ubaciti ga u email.
        </p>
      </div>

      {/* How it works */}
      <Section icon={<Link2 size={22} />} title="Format linka">
        <p className="text-sm text-gray-600 mb-3">
          Link ima oblik <code className="bg-gray-100 px-1.5 py-0.5 rounded">https://placanje.rs/s#2.&lt;kod&gt;</code>.
          Otvaranjem linka aplikacija dekodira podatke i prikazuje uplatnicu sa QR kodom.
          Podaci su kompresovani, pa je link 25–45% kraći za jednu uplatnicu, a 55–90% za više njih.
        </p>
        <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
          <li>
            Napravite JSON niz: prvo tip (<code>"u"</code> = uplata, <code>"p"</code> = nalog za prenos),
            zatim vrednosti polja <strong>po redosledu iz tabele ispod</strong>. Prazna polja na kraju izostavite,
            a prazna polja u sredini pišite kao <code>""</code>.
          </li>
          <li>
            Kompresujte UTF-8 bajtove algoritmom <strong>DEFLATE (raw)</strong> ili <strong>GZIP</strong>,
            šta god vaša platforma ima.
          </li>
          <li>Enkodirajte rezultat kao Base64URL (znaci <code>+/</code> → <code>-_</code>, bez <code>=</code> na kraju).</li>
          <li>Dodajte ga kao fragment sa prefiksom <code>2.</code>: <code>/s#2.&lt;kod&gt;</code>.</li>
        </ol>
      </Section>

      {/* Field reference */}
      <Section icon={<KeyRound size={22} />} title="Polja">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4 font-semibold">#</th>
                <th className="py-2 pr-4 font-semibold">Polje</th>
                <th className="py-2 pr-4 font-semibold">v1 ključ</th>
                <th className="py-2 pr-4 font-semibold">Obavezno</th>
                <th className="py-2 font-semibold">Opis</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((f, index) => (
                <tr key={f.key} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-gray-400">{index + 1}</td>
                  <td className="py-2 pr-4 font-mono text-gray-700">{f.name}</td>
                  <td className="py-2 pr-4 font-mono text-blue-700">{f.key}</td>
                  <td className="py-2 pr-4">
                    {f.required ? (
                      <span className="text-red-600 font-medium">da</span>
                    ) : (
                      <span className="text-gray-400">ne</span>
                    )}
                  </td>
                  <td className="py-2 text-gray-600">{f.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Redosled je deo formata i neće se menjati — nova polja se dodaju samo na kraj.
          Kolona „v1 ključ“ važi za stari format (vidi dole).
        </p>
      </Section>

      {/* Multiple slips */}
      <Section icon={<Link2 size={22} />} title="Više uplatnica u jednom linku">
        <p className="text-sm text-gray-600 mb-3">
          Jedan link može da nosi i više uplatnica odjednom — na primer nekoliko računa
          poslatih istom kupcu. Otvaranjem takvog linka, aplikacija ih prikazuje kao
          numerisane stranice (1, 2, 3, ...) sa navigacijom, svaku sa svojim QR kodom.
        </p>
        <p className="text-sm text-gray-600 mb-3">
          Umesto jednog niza pošaljite niz nizova — svaki u istom obliku kao za jednu uplatnicu
          (sa svojim tipom na početku). Sve uplatnice se kompresuju zajedno, pa svaka sledeća
          dodaje svega 25–100 znakova:
        </p>
        <CodeBlock>{multiSlipJsExample}</CodeBlock>
      </Section>

      {/* Embed */}
      <Section id="embed" icon={<AppWindow size={22} />} title="Embed na sajtu">
        <p className="text-sm text-gray-600 mb-3">
          Isti kod može da se prikaže i na vašem sajtu: zamenite <code>/s</code> sa <code>/e</code> i stavite
          link u <code>&lt;iframe&gt;</code>. Prikazuje se samo uplatnica sa QR kodom (za više uplatnica, sa
          tabovima), a na uskom ekranu samo QR kod, primalac, iznos i svrha. Kod za kopiranje daje i dugme
          „Ugradi na sajt“ na početnoj strani.
        </p>
        <CodeBlock>{embedExample}</CodeBlock>
        <p className="text-xs text-gray-400 mt-3">
          Okvir ne čita ništa sa vaše stranice. Jedino što šalje nazad je visina sadržaja
          (poruka <code>placanje-embed:height</code>), koju koristi <code>embed.js</code>.
        </p>
      </Section>

      {/* Google Apps Script */}
      <Section icon={<FileCode2 size={22} />} title="Google Apps Script">
        <p className="text-sm text-gray-600 mb-3">
          Nalepite ovaj kod u Apps Script projekat, podesite <code>APP_URL</code> u
          Script Properties, i pozovite <code>sendInvoiceEmail()</code>. Ne šalje nikakav
          zahtev ka serveru — link se pravi lokalno.
        </p>
        <CodeBlock>{appsScriptExample}</CodeBlock>
      </Section>

      {/* Generic example */}
      <Section icon={<Code2 size={22} />} title="Bilo koji jezik (JavaScript primer)">
        <p className="text-sm text-gray-600 mb-3">
          Isti princip radi u bilo kom jeziku — napravite JSON niz, kompresujte ga, enkodirajte Base64URL
          i dodajte kao fragment:
        </p>
        <CodeBlock>{jsExample}</CodeBlock>
      </Section>

      {/* Legacy v1 */}
      <Section icon={<Link2 size={22} />} title="Stari format (v1)">
        <p className="text-sm text-gray-600 mb-3">
          Linkovi u starom formatu — Base64URL nekompresovanog JSON objekta sa skraćenim ključevima
          (kolona „v1 ključ“) — i dalje rade i nastaviće da rade. Jednostavniji su za pravljenje,
          ali su znatno duži, pa za nove integracije preporučujemo v2.
        </p>
        <CodeBlock>{legacyExample}</CodeBlock>
      </Section>
    </div>

    <Footer />
  </div>
);

export default ApiDocs;
