/**
 * API: Processa migração Stripe → Asaas
 * POST /api/migration/process
 *
 * Body: { cpfCnpj: string, name?: string, phone?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { StripeToAsaasMigration } from '@/lib/migration/stripe-to-asaas';

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const { cpfCnpj, name, phone } = body;

    if (!cpfCnpj) {
      return NextResponse.json(
        { error: 'CPF/CNPJ é obrigatório' },
        { status: 400 }
      );
    }

    // Validar CPF/CNPJ
    const validation = StripeToAsaasMigration.validateCpfCnpj(cpfCnpj);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'CPF/CNPJ inválido. Verifique os números e tente novamente.' },
        { status: 400 }
      );
    }

    // Buscar usuário no banco
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Processar migração
    const result = await StripeToAsaasMigration.processMigration({
      userId: user.id,
      cpfCnpj: validation.cleaned,
      name: name || user.name || 'Cliente StencilFlow',
      phone,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao processar migração' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Migração realizada com sucesso!',
      asaasCustomerId: result.asaasCustomerId,
      asaasSubscriptionId: result.asaasSubscriptionId,
    });

  } catch (error) {
    console.error('[API] Erro ao processar migração:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar migração' },
      { status: 500 }
    );
  }
}
