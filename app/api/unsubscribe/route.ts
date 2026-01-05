import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * API Route: Unsubscribe de Emails de Marketing
 * 
 * POST: Adiciona email à lista de unsubscribe
 */

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Adicionar email à lista de unsubscribe
    const { error } = await supabaseAdmin
      .from('email_unsubscribes')
      .insert({
        email: email.toLowerCase().trim(),
        unsubscribed_at: new Date().toISOString(),
      });

    // Ignora erro de duplicata (email já está na lista)
    if (error && error.code !== '23505') {
      console.error('[Unsubscribe] Erro ao inserir:', error);
      throw error;
    }

    console.log(`[Unsubscribe] Email adicionado à lista: ${email}`);

    return NextResponse.json({ 
      success: true,
      message: 'Email removido da lista de marketing com sucesso'
    });

  } catch (error: any) {
    console.error('[Unsubscribe] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar cancelamento' },
      { status: 500 }
    );
  }
}

// GET: Verificar se email está na lista de unsubscribe (opcional, para debug)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('email_unsubscribes')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return NextResponse.json({
      unsubscribed: !!data,
      data: data || null
    });

  } catch (error: any) {
    console.error('[Unsubscribe GET] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar status' },
      { status: 500 }
    );
  }
}
