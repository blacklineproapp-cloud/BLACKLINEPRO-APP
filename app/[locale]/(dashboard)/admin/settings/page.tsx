'use client';

import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Save, AlertTriangle, 
  Activity, ToggleLeft, ToggleRight, Server 
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface SystemSettings {
  maintenance_mode: boolean;
  enable_pix: boolean;
  enable_new_ai_models: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: keyof SystemSettings) => {
    if (!settings) return;
    setSettings(prev => prev ? ({ ...prev, [key]: !prev[key] }) : null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingSpinner text="Carregando configurações..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-zinc-800 rounded-xl border border-zinc-700">
            <SettingsIcon size={24} className="text-zinc-300" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Configurações do Sistema</h1>
            <p className="text-zinc-400 text-sm">Gerenciamento global de recursos e manutenção</p>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-indigo-900/30 border border-indigo-800 text-indigo-400' : 
            'bg-red-900/30 border border-red-800 text-red-400'
          }`}>
             {message.type === 'success' ? <Activity size={20} /> : <AlertTriangle size={20} />}
             <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {settings && (
          <div className="grid gap-6">
            
            {/* Seção Crítica */}
            <div className="bg-zinc-900 border border-red-900/30 rounded-xl overflow-hidden">
               <div className="p-4 bg-red-950/10 border-b border-red-900/20">
                 <h2 className="font-semibold text-red-400 flex items-center gap-2">
                   <AlertTriangle size={18} />
                   Zona de Perigo
                 </h2>
               </div>
               <div className="p-6">
                 <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Modo de Manutenção</p>
                      <p className="text-sm text-zinc-500">Tira o app do ar para todos os usuários exceto admins.</p>
                    </div>
                    <button 
                      onClick={() => toggleSetting('maintenance_mode')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.maintenance_mode ? 'bg-red-600' : 'bg-zinc-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.maintenance_mode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                 </div>
               </div>
            </div>

            {/* Features */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
               <div className="p-4 bg-zinc-950 border-b border-zinc-800">
                 <h2 className="font-semibold text-zinc-300 flex items-center gap-2">
                   <Server size={18} />
                   Feature Flags
                 </h2>
               </div>
               <div className="p-6 space-y-6">
                 
                 <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Pagamentos via PIX</p>
                      <p className="text-sm text-zinc-500">Habilita ou desabilita pagamentos via PIX no checkout.</p>
                    </div>
                    <button 
                      onClick={() => toggleSetting('enable_pix')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enable_pix ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enable_pix ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                 </div>

                 <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Novos Modelos AI (Beta)</p>
                      <p className="text-sm text-zinc-500">Libera acesso aos modelos experimentais de geração.</p>
                    </div>
                    <button 
                      onClick={() => toggleSetting('enable_new_ai_models')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enable_new_ai_models ? 'bg-purple-600' : 'bg-zinc-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enable_new_ai_models ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                 </div>



               </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <LoadingSpinner />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
