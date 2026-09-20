import React from 'react';
import { Plus, X } from 'lucide-react';

interface OrderTabsProps {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
}

/**
 * Numbered page tabs ("1", "2", "3", ...) for flipping between several
 * payment slips that are being built together and shared via a single link.
 */
const OrderTabs: React.FC<OrderTabsProps> = ({ count, activeIndex, onSelect, onAdd, onRemove }) => {
  if (count <= 1 && !onAdd) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {Array.from({ length: count }).map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <div key={index} className="relative group/tab">
            <button
              type="button"
              onClick={() => onSelect(index)}
              title={`Uplatnica ${index + 1}`}
              className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all flex items-center justify-center ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {index + 1}
            </button>
            {onRemove && count > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                title="Ukloni uplatnicu"
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/tab:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          title="Dodaj novu uplatnicu"
          className="w-8 h-8 rounded-lg text-sm font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center"
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  );
};

export default OrderTabs;
