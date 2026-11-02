import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Code2, Copy, X } from 'lucide-react';

interface EmbedCodeDialogProps {
  code: string;
  onClose: () => void;
}

/** Shows the <iframe> snippet for embedding the current slip(s) on another site. */
const EmbedCodeDialog: React.FC<EmbedCodeDialogProps> = ({ code, onClose }) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Kod kopiran u clipboard!', { duration: 2000, position: 'bottom-center' });
    } catch {
      window.prompt('Kopirajte kod:', code);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="embed-dialog-title"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 id="embed-dialog-title" className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Code2 size={20} className="text-blue-600" />
            Ugradi uplatnicu na sajt
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Zatvori">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Nalepite ovaj kod u HTML stranice. Uplatnica sa QR kodom prikazuje se na vašem sajtu,
          a skripta podešava visinu okvira. Svi podaci su u samom kodu, kao i kod linka.
        </p>
        <textarea
          readOnly
          value={code}
          rows={5}
          onFocus={(event) => event.currentTarget.select()}
          className="w-full font-mono text-xs bg-gray-900 text-gray-100 rounded-xl p-3 resize-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <a href="/api#embed" className="px-4 py-2 text-sm text-gray-600 hover:text-blue-600">
            Uputstvo
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
          >
            <Copy size={16} />
            Kopiraj kod
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmbedCodeDialog;
