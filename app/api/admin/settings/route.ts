import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { getCached, setCache } from '@/lib/cache-redis';

const SETTINGS_KEY = 'system_settings';
const DEFAULT_SETTINGS = {
  maintenance_mode: false,
  enable_pix: true,
  enable_new_ai_models: false,
};

export const GET = withAdminAuth(async () => {
  // Buscar configurações do cache (ou padrão)
  const settings = await getCached(
    SETTINGS_KEY,
    async () => DEFAULT_SETTINGS,
    24 * 60 * 60 * 1000 // 24 horas
  );

  return NextResponse.json({ settings });
});

export const POST = withAdminAuth(async (req) => {
  const updates = await req.json();

  // Buscar atual
  const current = await getCached(
    SETTINGS_KEY,
    async () => DEFAULT_SETTINGS,
    24 * 60 * 60 * 1000
  );

  const newSettings = { ...current, ...updates };

  // Salvar no cache (persistência via Redis)
  await setCache(SETTINGS_KEY, newSettings, { ttl: 24 * 60 * 60 * 1000 * 30 }); // 30 dias

  return NextResponse.json({ success: true, settings: newSettings });
});
