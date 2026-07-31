import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Code2, Link2, KeyRound, FileCode2 } from 'lucide-react';
import Footer from '@/components/Footer';
// Raw import keeps this page and the downloadable file as a single source of truth.
import appsScriptExample from '../../docs/apps-script-example.gs?raw';

interface FieldRow {
  position: number;
  name: string;
  required: boolean;
  note: string;
}

const FIELDS: FieldRow[] = [
  { position: 0, name: 'payerName', required: false, note: 'Ime ili naziv uplatioca' },
  { position: 1, name: 'payerAddress', required: false, note: 'Adresa uplatioca' },
  { position: 2, name: 'payerCity', required: false, note: 'Mesto uplatioca' },
  { position: 3, name: 'payerAccount', required: false, note: 'Račun uplatioca' },
  { position: 4, name: 'purpose', required: false, note: 'Svrha plaćanja' },
  { position: 5, name: 'receiverName', required: true, note: 'Naziv primaoca' },
  { position: 6, name: 'receiverAddress', required: false, note: 'Adresa primaoca' },
  { position: 7, name: 'receiverCity', required: false, note: 'Mesto primaoca' },
  { position: 8, name: 'receiverAccount', required: true, note: 'Račun primaoca — 18 cifara' },
  { position: 9, name: 'paymentCode', required: false, note: 'Šifra plaćanja (189 ili 253)' },
  { position: 10, name: 'currency', required: false, note: 'Valuta (podrazumevano RSD)' },
  { position: 11, name: 'amount', required: true, note: 'Iznos, npr. "1234.56" ili "1.234,56"' },
  { position: 12, name: 'model', required: false, note: 'Model poziva na broj' },
  { position: 13, name: 'reference', required: false, note: 'Poziv na broj (odobrenje)' },
  { position: 14, name: 'debitModel', required: false, note: 'Model zaduženja' },
  { position: 15, name: 'debitReference', required: false, note: 'Poziv na broj zaduženja' },
];

const jsExample = `import { gzipSync } from "node:zlib";

const values = [
  "", "", "", "", "Racun 2026-001",
  "Moja Firma d.o.o.", "", "", "16000000001234578",
  "", "", "1234.56", "97", "9712345678901"
];

const encoded = gzipSync(Buffer.from(JSON.stringify(values), "utf8"))
  .toString("base64url");

const link = "https://placanje.rs/s#2u." + encoded;`;

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
          gde <code>&lt;kod&gt;</code> počinje sa <code>2u.</code> ili <code>2p.</code>, a zatim sadrži
          GZIP kompresovan i Base64URL enkodiran niz podataka uplatnice.
          Otvaranjem linka aplikacija dekodira podatke i prikazuje uplatnicu sa QR kodom.
        </p>
        <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
          <li>Napravite JSON niz vrednosti po redosledu iz tabele.</li>
          <li>Uklonite prazne vrednosti sa kraja i GZIP kompresujte UTF-8 JSON.</li>
          <li>Enkodirajte bajtove kao Base64URL bez <code>=</code> na kraju.</li>
          <li>Dodajte prefiks <code>2u.</code> za uplatu ili <code>2p.</code> za prenos.</li>
        </ol>
        <p className="text-xs text-gray-400 mt-3">
          Stari Base64URL JSON linkovi i dalje rade; novi format je kraći i preporučen.
        </p>
      </Section>

      {/* Field reference */}
      <Section icon={<KeyRound size={22} />} title="Polja">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4 font-semibold">Pozicija</th>
                <th className="py-2 pr-4 font-semibold">Polje</th>
                <th className="py-2 pr-4 font-semibold">Obavezno</th>
                <th className="py-2 font-semibold">Opis</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((f) => (
                <tr key={f.position} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-blue-700">{f.position}</td>
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
          Prazna polja ostaju prazni stringovi; samo prazne vrednosti na kraju niza mogu da se izostave.
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
      <Section icon={<Code2 size={22} />} title="Bilo koji jezik (Node.js primer)">
        <p className="text-sm text-gray-600 mb-3">
          Isti princip radi u bilo kom jeziku koji podržava GZIP i Base64URL:
        </p>
        <CodeBlock>{jsExample}</CodeBlock>
      </Section>
    </div>

    <Footer />
  </div>
);

export default ApiDocs;
