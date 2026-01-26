'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Ruler } from 'lucide-react';
import {
  BODY_AREAS,
  BODY_AREA_CATEGORIES,
  getBodyAreasByCategory,
  formatAreaDimensions,
  type BodyAreaKey,
  type BodyAreaCategory,
} from '@/lib/constants/body-areas';

interface BodyAreaSelectorProps {
  value: BodyAreaKey | null;
  onChange: (key: BodyAreaKey, width: number | null, height: number | null) => void;
  className?: string;
}

export default function BodyAreaSelector({
  value,
  onChange,
  className = '',
}: BodyAreaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const groupedAreas = getBodyAreasByCategory();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedArea = value ? BODY_AREAS[value] : null;

  const handleSelect = (key: BodyAreaKey) => {
    const area = BODY_AREAS[key];
    onChange(key, area.width, area.height);
    setIsOpen(false);
  };

  // Order of categories to display
  const categoryOrder: BodyAreaCategory[] = ['bracos', 'pernas', 'tronco', 'outros', 'personalizado'];

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Label */}
      <label className="block text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
        <Ruler size={12} />
        Área do Corpo
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2
          px-3 py-2.5 rounded-xl
          bg-zinc-800/80 border border-zinc-700
          hover:border-zinc-600 hover:bg-zinc-800
          transition-all duration-200
          text-left
          ${isOpen ? 'border-blue-500 ring-1 ring-blue-500/30' : ''}
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedArea ? (
            <>
              <span className="text-lg flex-shrink-0">{selectedArea.emoji}</span>
              <div className="min-w-0">
                <div className="text-sm text-white font-medium truncate">
                  {selectedArea.label}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {formatAreaDimensions(selectedArea)}
                </div>
              </div>
            </>
          ) : (
            <span className="text-sm text-zinc-400">Selecione a área...</span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-zinc-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 py-1 rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl shadow-black/50 max-h-[320px] overflow-y-auto">
          {categoryOrder.map((category) => {
            const items = groupedAreas[category];
            if (!items.length) return null;

            const categoryInfo = BODY_AREA_CATEGORIES[category];

            return (
              <div key={category}>
                {/* Category Header */}
                <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-800/50 sticky top-0">
                  {categoryInfo.emoji} {categoryInfo.label}
                </div>

                {/* Items */}
                {items.map(({ key, area }) => {
                  const isSelected = value === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelect(key)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2
                        text-left transition-colors duration-150
                        ${isSelected
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'hover:bg-zinc-800 text-zinc-300'
                        }
                      `}
                    >
                      <span className="text-base flex-shrink-0">{area.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{area.label}</div>
                        <div className="text-[10px] text-zinc-500">
                          {area.width && area.height
                            ? `${area.width} × ${area.height} cm`
                            : area.description}
                        </div>
                      </div>
                      {isSelected && (
                        <Check size={14} className="text-blue-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Area Description */}
      {selectedArea && selectedArea.category !== 'personalizado' && (
        <p className="mt-1.5 text-[10px] text-zinc-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          {selectedArea.description}
        </p>
      )}
    </div>
  );
}
