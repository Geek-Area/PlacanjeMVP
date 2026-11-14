import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ListOrdered, Search } from 'lucide-react';
import Footer from '@/components/Footer';
import { PAYMENT_CODE_BASES, PAYMENT_CODE_GROUPS, PAYMENT_FORMS } from '@/utils/paymentCodes';

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'dj');

const PaymentCodesGuide: React.FC = () => {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const matches = PAYMENT_CODE_BASES.filter(
      (b) => !q || normalize(`1${b.code} 2${b.code} ${b.name} ${b.hint}`).includes(q),
    );
    return PAYMENT_CODE_GROUPS.map((group) => ({ group, rows: matches.filter((b) => b.group === group) })).filter(
      (g) => g.rows.length > 0,
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-8 font-sans">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-4">
            <ArrowLeft size={16} />
            Nazad na generator
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <span className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <ListOrdered size={28} />
            </span>
            Šifre plaćanja
          </h1>
          <p className="text-gray-600 mt-3">
            Šifra plaćanja ima tri cifre. Prva cifra je oblik plaćanja, a druge dve osnov plaćanja, odnosno zašto se
            novac šalje. Šifre propisuje Narodna banka Srbije (Prilog 3 odluke o obrascima platnih naloga u dinarima).
          </p>
        </div>

        <section className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Kako izabrati šifru</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
            <li>
              <strong>Prva cifra</strong> je oblik plaćanja:{' '}
              {Object.entries(PAYMENT_FORMS)
                .map(([digit, name]) => `${digit} – ${name.toLowerCase()}`)
                .join(', ')}
              . Na papirnoj uplatnici za uplatu gotovinom obično piše 1, a za plaćanje s računa 2.
            </li>
            <li>
              <strong>Druge dve cifre</strong> birate prema tome šta se plaća, iz tabele ispod.
            </li>
            <li>
              <strong>189 / 289</strong> (transakcije po nalogu građana) važi samo kada plaća fizičko lice. Kada plaća
              firma ili preduzetnik, mora se izabrati druga šifra, najčešće 221 za račune za robu i usluge.
            </li>
            <li>
              <strong>U IPS QR kodu</strong> prva cifra može biti samo 1 ili 2. Šifre koje počinju sa 3 (obračunska
              plaćanja) ili 9 (preknjižavanje) ne mogu da se koriste za plaćanje QR kodom.
            </li>
          </ol>
          <p className="text-sm text-gray-600">
            Najčešće šifre u IPS QR kodovima, prema NBS: <strong>121 ili 221</strong> – promet robe i usluga, finalna
            potrošnja, i <strong>122 ili 222</strong> – usluge javnih preduzeća.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-lg p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-800">Osnov plaćanja</h2>
            <label className="relative block sm:w-72">
              <span className="sr-only">Pretraga šifara</span>
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pretraga: zakup, 153, struja…"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          {groups.length === 0 && <p className="text-sm text-gray-500">Nema šifre za „{query}“.</p>}

          <div className="space-y-6">
            {groups.map(({ group, rows }) => (
              <div key={group}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200">
                        <th className="py-2 pr-3 font-medium whitespace-nowrap">Šifra</th>
                        <th className="py-2 font-medium">Osnov i kada se koristi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((b) => (
                        <tr key={b.code} className="border-b border-gray-100 align-top">
                          <td className="py-2 pr-3 font-mono whitespace-nowrap text-gray-800">
                            1{b.code} / 2{b.code}
                          </td>
                          <td className="py-2 text-gray-700">
                            <div className="font-medium">{b.name}</div>
                            {b.hint && <div className="text-gray-500 text-xs mt-0.5">{b.hint}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-6">
            Nazivi su prema Prilogu 3 odluke NBS; kratka objašnjenja su pojednostavljena. Ako niste sigurni koju šifru
            da koristite, proverite kod primaoca plaćanja ili svoje banke.
          </p>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default PaymentCodesGuide;
