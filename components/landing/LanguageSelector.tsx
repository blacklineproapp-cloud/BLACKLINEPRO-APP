'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, X } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  flag: string;
  instructions: string;
}

const languages: Language[] = [
  {
    code: 'pt',
    name: 'Português',
    flag: '🇧🇷',
    instructions: ''
  },
  {
    code: 'en',
    name: 'English',
    flag: '🇺🇸',
    instructions: 'To translate this page to English, use your browser\'s built-in translation feature:\n\n• Chrome: Right-click → "Translate to English"\n• Safari: Click the translate icon in the address bar\n• Edge: Click the translate icon or right-click → "Translate"\n• Firefox: Install Google Translate extension'
  },
  {
    code: 'es',
    name: 'Español',
    flag: '🇪🇸',
    instructions: 'Para traducir esta página al español, usa la función de traducción de tu navegador:\n\n• Chrome: Clic derecho → "Traducir al español"\n• Safari: Haz clic en el icono de traducir en la barra de direcciones\n• Edge: Haz clic en el icono de traducir o clic derecho → "Traducir"\n• Firefox: Instala la extensión Google Translate'
  }
];

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState<Language | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageSelect = (lang: Language) => {
    setIsOpen(false);
    if (lang.code === 'pt') {
      // Já está em português
      return;
    }
    setShowModal(lang);
  };

  return (
    <>
      {/* Botão de seleção de idioma */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 hover:text-white transition-all text-sm"
          aria-label="Selecionar idioma"
        >
          <Globe size={16} />
          <span className="hidden sm:inline">PT</span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    lang.code === 'pt'
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                  {lang.code === 'pt' && (
                    <span className="ml-auto text-xs text-emerald-500">Atual</span>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-zinc-800 p-2">
              <p className="text-[10px] text-zinc-500 text-center">
                Use a tradução do navegador
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de instruções */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
          onClick={() => setShowModal(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{showModal.flag}</span>
                <div>
                  <h3 className="text-white font-bold">Translate to {showModal.name}</h3>
                  <p className="text-zinc-500 text-sm">Traduzir para {showModal.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(null)}
                className="text-zinc-500 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-300 text-sm whitespace-pre-line leading-relaxed">
                  {showModal.instructions}
                </p>
              </div>

              {/* Dica visual para Chrome */}
              <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-600/20 rounded-lg flex items-center justify-center shrink-0">
                    <Globe size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-emerald-400 font-medium text-sm">
                      {showModal.code === 'en' ? 'Quick tip' : 'Consejo rápido'}
                    </p>
                    <p className="text-zinc-400 text-xs mt-1">
                      {showModal.code === 'en'
                        ? 'Most browsers will automatically offer to translate when they detect a different language.'
                        : 'La mayoría de los navegadores ofrecerán traducir automáticamente cuando detecten un idioma diferente.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800">
              <button
                onClick={() => setShowModal(null)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors"
              >
                {showModal.code === 'en' ? 'Got it!' : '¡Entendido!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
