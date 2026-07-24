import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Code2, Link2, KeyRound, FileCode2 } from 'lucide-react';
import Footer from '@/components/Footer';
// Raw import keeps this page and the downloadable file as a single source of truth.
import appsScriptExample from '../../docs/apps-script-example.gs?raw';

interface FieldRow {
  key: string;
  name: string;
  required: boolean;
  note: string;
}

const FIELDS: FieldRow[] = [
  { key: 'rn', name: 'receiverName', required: true, note: 'Naziv primaoca' },
  { key: 'rac', name: 'receiverAccount', required: true, note: 'Račun primaoca — 18 cifara (sa ili bez crtica)' },
  { key: 'am', name: 'amount', required: true, note: 'Iznos, npr. "1234.56" ili "1.234,56"' },
  { key: 'pu', name: 'purpose', required: false, note: 'Svrha plaćanja' },
  { key: 'sf', name: 'paymentCode', required: false, note: 'Šifra plaćanja (podrazumevano 189)' },
  { key: 'mo', name: 'model', required: false, note: 'Model poziva na broj (npr. 97)' },
  { key: 're', name: 'reference', required: false, note: 'Poziv na broj (odobrenje)' },
  { key: 'ra', name: 'receiverAddress', required: false, note: 'Adresa primaoca' },
  { key: 'rc', name: 'receiverCity', required: false, note: 'Mesto primaoca' },
  { key: 'cur', name: 'currency', required: false, note: 'Valuta (podrazumevano RSD)' },
  { key: 't', name: 'form_type', required: false, note: '"prenos" za nalog za prenos (podrazumevano uplata)' },
];

const jsExample = `const data = {
  rn: "Moja Firma d.o.o.",
  rac: "160000000012345 78".replace(/\\s/g, ""),
  am: "1234.56",
  pu: "Racun 2026-001",
  sf: "189",
  mo: "97",
  re: "9712345678901"
};

const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))))
  .replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");

const link = "https://placanje.rs/s#" + encoded;`;

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <section className="bg-white rounded-2xl shadow-lg p-6 lg:p-8">
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
          Link ima oblik <code className="bg-gray-100 px-1.5 py-0.5 rounded">https://placanje.rs/s#&lt;kod&gt;</code>,
          gde je <code>&lt;kod&gt;</code> Base64URL enkodiran JSON objekat sa podacima uplatnice.
          Otvaranjem linka aplikacija dekodira podatke i prikazuje uplatnicu sa QR kodom.
        </p>
        <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
          <li>Napravite JSON objekat sa skraćenim ključevima (tabela ispod).</li>
          <li>Enkodirajte ga kao UTF-8 → Base64URL (znaci <code>+/</code> → <code>-_</code>, bez <code>=</code> na kraju).</li>
          <li>Dodajte ga kao fragment: <code>/s#&lt;kod&gt;</code>.</li>
        </ol>
      </Section>

      {/* Field reference */}
      <Section icon={<KeyRound size={22} />} title="Polja">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4 font-semibold">Ključ</th>
                <th className="py-2 pr-4 font-semibold">Polje</th>
                <th className="py-2 pr-4 font-semibold">Obavezno</th>
                <th className="py-2 font-semibold">Opis</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((f) => (
                <tr key={f.key} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-blue-700">{f.key}</td>
                  <td className="py-2 pr-4 font-mono text-gray-700">{f.name}</td>
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
          Za nalog za prenos dostupna su i polja platioca (<code>pn</code>, <code>pa</code>,{' '}
          <code>pc</code>, <code>pac</code>) i zaduženja (<code>dm</code>, <code>dr</code>).
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
          Isti princip radi u bilo kom jeziku — napravite JSON, enkodirajte ga Base64URL, dodajte kao fragment:
        </p>
        <CodeBlock>{jsExample}</CodeBlock>
      </Section>
    </div>

    <Footer />
  </div>
);

export default ApiDocs;
