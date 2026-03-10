'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Cookie, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Sempre true, não pode desativar
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Verificar se usuário já aceitou/rejeitou cookies
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Mostrar banner após 1 segundo
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Carregar preferências salvas
      try {
        const saved = JSON.parse(consent);
        setPreferences(saved);
        // Aplicar preferências (inicializar analytics, etc)
        applyPreferences(saved);
      } catch (e) {
        console.error('Erro ao carregar preferências de cookies:', e);
      }
    }
  }, []);

  const applyPreferences = (prefs: typeof preferences) => {
    // Aqui você implementaria a lógica para ativar/desativar analytics
    if (prefs.analytics) {
      // Inicializar Google Analytics
      console.log('[Cookies] Analytics habilitado');
      // window.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    if (prefs.marketing) {
      // Inicializar Meta Pixel
      console.log('[Cookies] Marketing habilitado');
      // window.fbq('consent', 'grant');
    }
  };

  const acceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    localStorage.setItem('cookie-consent', JSON.stringify(allAccepted));
    applyPreferences(allAccepted);
    setShowBanner(false);
    setShowSettings(false);
  };

  const rejectNonEssential = () => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      marketing: false,
    };
    setPreferences(essentialOnly);
    localStorage.setItem('cookie-consent', JSON.stringify(essentialOnly));
    applyPreferences(essentialOnly);
    setShowBanner(false);
    setShowSettings(false);
  };

  const savePreferences = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences));
    applyPreferences(preferences);
    setShowBanner(false);
    setShowSettings(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl">
        {/* Banner Principal */}
        {!showSettings ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-600/20 rounded-full flex items-center justify-center">
                <Cookie className="text-indigo-400" size={20} />
              </div>
              
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg mb-2">
                  🍪 Nós usamos cookies
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                  Utilizamos cookies essenciais para o funcionamento do site e cookies opcionais para analytics e marketing. 
                  Você pode escolher quais aceitar.{' '}
                  <Link href="/cookies" className="text-indigo-400 hover:underline">
                    Saiba mais
                  </Link>
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={acceptAll}
                    size="sm"
                    className="px-4 py-2 rounded-lg"
                  >
                    Aceitar Todos
                  </Button>
                  <Button
                    onClick={rejectNonEssential}
                    variant="secondary"
                    size="sm"
                    className="px-4 py-2 rounded-lg"
                  >
                    Apenas Essenciais
                  </Button>
                  <Button
                    onClick={() => setShowSettings(true)}
                    variant="secondary"
                    size="sm"
                    className="px-4 py-2 rounded-lg gap-2"
                  >
                    <Settings size={16} />
                    Personalizar
                  </Button>
                </div>
              </div>

              <Button
                onClick={rejectNonEssential}
                variant="ghost"
                size="icon"
                aria-label="Fechar"
              >
                <X size={20} />
              </Button>
            </div>
          </div>
        ) : (
          /* Configurações Detalhadas */
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 backdrop-blur-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">
                Preferências de Cookies
              </h3>
              <Button
                onClick={() => setShowSettings(false)}
                variant="ghost"
                size="icon"
              >
                <X size={20} />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Essenciais */}
              <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">Cookies Essenciais</h4>
                  <div className="px-3 py-1 bg-indigo-600/20 text-indigo-400 text-xs font-medium rounded-full">
                    Sempre Ativo
                  </div>
                </div>
                <p className="text-zinc-400 text-sm">
                  Necessários para o funcionamento básico do site (autenticação, segurança, preferências).
                </p>
              </div>

              {/* Analytics */}
              <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">Cookies de Analytics</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <p className="text-zinc-400 text-sm">
                  Ajudam a entender como você usa o site para melhorarmos a experiência (Google Analytics).
                </p>
              </div>

              {/* Marketing */}
              <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">Cookies de Marketing</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <p className="text-zinc-400 text-sm">
                  Usados para mostrar anúncios relevantes e medir eficácia de campanhas (Meta Pixel).
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={savePreferences}
                size="sm"
                className="flex-1 px-4 py-2 rounded-lg"
              >
                Salvar Preferências
              </Button>
              <Button
                onClick={acceptAll}
                variant="secondary"
                size="sm"
                className="px-4 py-2 rounded-lg"
              >
                Aceitar Todos
              </Button>
            </div>

            <p className="text-zinc-500 text-xs mt-4 text-center">
              Consulte nossa{' '}
              <Link href="/cookies" className="text-indigo-400 hover:underline">
                Política de Cookies
              </Link>
              {' '}para mais informações
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
