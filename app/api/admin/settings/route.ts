import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getCached, setCache } from '@/lib/cache-redis';

const SETTINGS_KEY = 'system_settings';
const DEFAULT_SETTINGS = {
  maintenance_mode: false,
  enable_pix: true,
  enable_new_ai_models: false,
};

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId || !(await isAdmin(userId))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar configurações do cache (ou padrão)
    // Cache infinito (ou muito longo) para configs
    const settings = await getCached(
      SETTINGS_KEY,
      async () => DEFAULT_SETTINGS,
      24 * 60 * 60 * 1000 // 24 horas (renovado no set)
    );

    return NextResponse.json({ settings });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId || !(await isAdmin(userId))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

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

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
