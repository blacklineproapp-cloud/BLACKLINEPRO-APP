'use client';

import { Settings, Edit3, Download, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileActionBarProps {
  onToggleControls: () => void;
  onOpenDrawingMode: () => void;
  onDownload: () => void;
  onSave: () => void;
  onNewUpload: () => void;
  t: (key: string) => string;
}

export default function MobileActionBar({
  onToggleControls,
  onOpenDrawingMode,
  onDownload,
  onSave,
  onNewUpload,
  t,
}: MobileActionBarProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-700/50 p-2 safe-area-pb rounded-t-2xl">
      {/* Linha 1: Ações principais */}
      <div className="flex gap-1.5 mb-1.5">
        <Button
          onClick={onToggleControls}
          variant="outline"
          size="icon"
          className="w-11 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white py-2.5 rounded-lg border-zinc-700"
          title="Ajustes"
        >
          <Settings size={16} />
        </Button>
        <Button
          onClick={onOpenDrawingMode}
          variant="gradient"
          size="icon"
          className="w-11 bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-lg shadow-lg"
          title="Modo Desenho"
        >
          <Edit3 size={16} />
        </Button>
        <Button
          onClick={onDownload}
          className="flex-1 py-2.5 rounded-lg gap-1.5 shadow-lg text-sm"
        >
          <Download size={16} /> {t('actions.download')}
        </Button>
        <Button
          onClick={onSave}
          variant="secondary"
          className="flex-1 py-2.5 rounded-lg gap-1.5 text-sm"
        >
          <Save size={16} /> {t('actions.saveShort')}
        </Button>
        <Button
          onClick={onNewUpload}
          variant="danger-subtle"
          size="icon"
          className="w-11 py-2.5 rounded-lg border border-red-800"
          title={t('actions.new')}
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
}
