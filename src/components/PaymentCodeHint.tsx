import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Info } from 'lucide-react';
import { COMMON_PAYMENT_CODES, PAYMENT_CODE_BASES, checkPaymentCode } from '@/utils/paymentCodes';

// Suggestions for the payment code input: the most common codes first, then every basis as a
// cash code (1xx), the way it is printed on a paper slip. The app turns it into 2xx for the QR.
const OPTIONS = [
  ...COMMON_PAYMENT_CODES,
  ...PAYMENT_CODE_BASES.map((b) => '1' + b.code).filter((c) => !COMMON_PAYMENT_CODES.includes(c)),
].map((code) => ({ code, name: PAYMENT_CODE_BASES.find((b) => b.code === code.slice(1))?.name ?? '' }));

export const PaymentCodeOptions: React.FC<{ id: string }> = ({ id }) => (
  <datalist id={id}>
    {OPTIONS.map(({ code, name }) => (
      <option key={code} value={code} label={name} />
    ))}
  </datalist>
);

const GuideLink = () => (
  <Link to="/sifre-placanja" className="whitespace-nowrap font-semibold text-blue-600 hover:underline">
    Sve šifre
  </Link>
);

/** One line under the code/amount row that says what the typed payment code means. */
export const PaymentCodeHint: React.FC<{ code: string }> = ({ code }) => {
  const check = checkPaymentCode(code);
  const base = 'col-span-12 -mt-1 flex items-start gap-1.5 text-[11px] leading-snug';

  if (check.status === 'ok' || check.status === 'empty') {
    const text =
      check.status === 'empty'
        ? 'Prazno polje znači šifru 189 (transakcije po nalogu građana).'
        : check.note
          ? `${check.basis.name}. ${check.note}`
          : `${check.basis.name}${check.basis.hint ? ` (${check.basis.hint.toLowerCase()})` : ''}.`;
    return (
      <p id="payment-code-hint" className={`${base} text-gray-500`}>
        <Info size={13} className="mt-px shrink-0" />
        <span>
          {text} <GuideLink />
        </span>
      </p>
    );
  }

  return (
    <p id="payment-code-hint" role="alert" className={`${base} ${check.status === 'error' ? 'text-red-600' : 'text-amber-700'}`}>
      <AlertCircle size={13} className="mt-px shrink-0" />
      <span>
        {check.message} <GuideLink />
      </span>
    </p>
  );
};
