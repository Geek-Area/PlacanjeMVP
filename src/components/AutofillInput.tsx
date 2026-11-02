import React, { useMemo, useState } from 'react';
import { History, X } from 'lucide-react';

export interface AutofillSuggestion {
  key: string;
  label: string;
  detail?: string;
  // Text the typed query is matched against (label, account, address…).
  search: string;
}

interface AutofillInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions: AutofillSuggestion[];
  onPick: (key: string) => void;
  onRemove?: (key: string) => void;
  // Extra overlay elements (status icons) rendered inside the relative wrapper.
  children?: React.ReactNode;
}

const MAX_VISIBLE = 6;

// Case- and diacritic-insensitive, so "cacak" finds "Čačak".
const fold = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'dj').toLowerCase().trim();

/**
 * Text input that offers previously used values in a dropdown when focused,
 * filtered by what is typed. Arrow keys + Enter pick, Escape closes.
 */
const AutofillInput: React.FC<AutofillInputProps> = ({
  suggestions,
  onPick,
  onRemove,
  children,
  onFocus,
  onBlur,
  onChange,
  onKeyDown,
  ...inputProps
}) => {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const query = String(inputProps.value ?? '');

  const visible = useMemo(() => {
    const q = fold(query);
    const qDigits = q.replace(/[^0-9]/g, '');
    const matches = suggestions.filter((s) => {
      if (!q) return true;
      const haystack = fold(s.search);
      if (haystack.includes(q)) return true;
      return qDigits.length >= 3 && haystack.replace(/[^0-9]/g, '').includes(qDigits);
    });
    // Nothing to offer if the only match is exactly what is already typed.
    if (matches.length === 1 && fold(matches[0].label) === q) return [];
    return matches.slice(0, MAX_VISIBLE);
  }, [suggestions, query]);

  const showList = open && visible.length > 0;

  const pick = (key: string) => {
    onPick(key);
    setOpen(false);
    setHighlighted(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted((h) => (h + 1) % visible.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted((h) => (h <= 0 ? visible.length - 1 : h - 1));
        return;
      }
      if (e.key === 'Enter' && highlighted >= 0) {
        e.preventDefault();
        pick(visible[highlighted].key);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative">
      <input
        {...inputProps}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        onFocus={(e) => {
          setOpen(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setOpen(false);
          setHighlighted(-1);
          onBlur?.(e);
        }}
        onChange={(e) => {
          setOpen(true);
          setHighlighted(-1);
          onChange?.(e);
        }}
        onKeyDown={handleKeyDown}
      />
      {children}
      {showList && (
        <ul
          role="listbox"
          // Keep focus in the input so clicking an item doesn't blur-close the list first.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
        >
          <li className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <History size={11} />
            Ranije korišćeno
          </li>
          {visible.map((s, index) => (
            <li
              key={s.key}
              role="option"
              aria-selected={index === highlighted}
              onClick={() => pick(s.key)}
              onMouseEnter={() => setHighlighted(index)}
              className={`group/item flex items-center gap-2 px-3 py-2 cursor-pointer text-sm ${
                index === highlighted ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-800 truncate">{s.label}</div>
                {s.detail && <div className="text-xs text-gray-500 truncate">{s.detail}</div>}
              </div>
              {onRemove && (
                <button
                  type="button"
                  title="Ukloni iz predloga"
                  aria-label="Ukloni iz predloga"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(s.key);
                  }}
                  className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 sm:opacity-0 sm:group-hover/item:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AutofillInput;
