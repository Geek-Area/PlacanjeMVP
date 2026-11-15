import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronDown, Info, Star } from 'lucide-react';
import {
  COMMON_PAYMENT_CODES,
  PAYMENT_CODE_BASES,
  PaymentCodeBasis,
  checkPaymentCode,
} from '@/utils/paymentCodes';

interface CodeOption {
  code: string;
  basis: PaymentCodeBasis;
  common: boolean;
}

// The most common codes first, then every basis as a cash code (1xx), the way it is printed on a
// paper slip. The app turns it into 2xx for the QR.
const OPTIONS: CodeOption[] = [
  ...COMMON_PAYMENT_CODES,
  ...PAYMENT_CODE_BASES.map((b) => '1' + b.code).filter((c) => !COMMON_PAYMENT_CODES.includes(c)),
].map((code) => ({
  code,
  basis: PAYMENT_CODE_BASES.find((b) => b.code === code.slice(1))!,
  common: COMMON_PAYMENT_CODES.includes(code),
}));

// Typed digits match the code as printed (1xx) or its cashless twin (2xx), so "25" finds 153.
const matches = (option: CodeOption, digits: string) =>
  !digits || option.code.startsWith(digits) || ('2' + option.basis.code).startsWith(digits) || option.basis.code.startsWith(digits);

interface PaymentCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Payment code field with a dropdown of codes and their names, styled like the app's autofill
 * lists. Typing digits filters the list; arrow keys + Enter pick, Escape closes.
 */
export const PaymentCodeInput: React.FC<PaymentCodeInputProps> = ({ value, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  // Filter only after the user types; on focus the whole list is shown so a filled code can be changed.
  const [filtering, setFiltering] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  const visible = useMemo(() => {
    const digits = filtering ? value.replace(/\D/g, '') : '';
    return OPTIONS.filter((o) => matches(o, digits));
  }, [value, filtering]);

  const showList = open && visible.length > 0;
  const firstOther = visible.findIndex((o) => !o.common);

  useEffect(() => {
    if (highlighted < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  const close = () => {
    setOpen(false);
    setFiltering(false);
    setHighlighted(-1);
  };

  const pick = (code: string) => {
    onChange(code);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showList) {
        setOpen(true);
        return;
      }
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setHighlighted((h) => (h + step + visible.length) % visible.length);
    } else if (e.key === 'Enter' && showList && highlighted >= 0) {
      e.preventDefault();
      pick(visible[highlighted].code);
    } else if (e.key === 'Escape' && showList) {
      e.preventDefault();
      close();
    }
  };

  const activeId = showList && highlighted >= 0 ? `payment-code-${visible[highlighted].code}` : undefined;

  return (
    <div className="relative">
      <input
        name="paymentCode"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.replace(/\D/g, '').slice(0, 3));
          setOpen(true);
          setFiltering(true);
          setHighlighted(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={close}
        onKeyDown={handleKeyDown}
        className={`${className} pr-6`}
        maxLength={3}
        inputMode="numeric"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls="payment-code-list"
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-describedby="payment-code-hint"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Prikaži šifre plaćanja"
        onMouseDown={(e) => {
          e.preventDefault();
          if (showList) close();
          else {
            setOpen(true);
            (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.focus();
          }
        }}
        className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-gray-400 hover:text-blue-600"
      >
        <ChevronDown size={14} className={`transition-transform ${showList ? 'rotate-180' : ''}`} />
      </button>

      {showList && (
        <ul
          id="payment-code-list"
          ref={listRef}
          role="listbox"
          aria-label="Šifre plaćanja"
          // Keep focus in the input so clicking an item doesn't blur-close the list first.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 top-full mt-1 z-30 w-80 max-w-[calc(100vw-2.5rem)] max-h-72 overflow-y-auto overscroll-contain bg-white border border-gray-200 rounded-lg shadow-lg py-1"
        >
          {visible.map((o, index) => (
            <React.Fragment key={o.code}>
              {index === 0 && o.common && <GroupLabel icon={<Star size={11} />}>Najčešće šifre</GroupLabel>}
              {index === firstOther && <GroupLabel>{firstOther === 0 ? 'Šifre plaćanja' : 'Sve šifre'}</GroupLabel>}
              <li
                id={`payment-code-${o.code}`}
                data-index={index}
                role="option"
                aria-selected={o.code === value}
                onClick={() => pick(o.code)}
                onMouseEnter={() => setHighlighted(index)}
                className={`flex items-start gap-3 px-3 py-2 cursor-pointer text-sm ${
                  index === highlighted ? 'bg-blue-50' : ''
                }`}
              >
                <span
                  className={`shrink-0 mt-px px-1.5 py-0.5 rounded-md font-mono text-xs font-semibold ${
                    o.code === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {o.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-gray-800 leading-snug">{o.basis.name}</span>
                  {o.basis.hint && <span className="block text-xs text-gray-500 leading-snug mt-0.5">{o.basis.hint}</span>}
                </span>
              </li>
            </React.Fragment>
          ))}
          <li role="presentation" className="border-t border-gray-100 mt-1 px-3 pt-2 pb-1.5 text-xs">
            <Link to="/sifre-placanja" className="font-semibold text-blue-600 hover:underline">
              Kako izabrati šifru →
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
};

const GroupLabel: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <li role="presentation" className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
    {icon}
    {children}
  </li>
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
