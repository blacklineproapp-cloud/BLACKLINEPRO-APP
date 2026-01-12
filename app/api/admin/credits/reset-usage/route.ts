import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminAction } from '@/lib/admin-audit';

// Schema de validação
const resetUsageSchema = z.object({
  userEmail: z.string().email('Email inválido'),
  reason: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres').max(500)
});

export async function POST(req: Request) {
  try {
    // 1. 🔒 VERIFICAR ADMIN
    const { userId } = await auth();
    
    if (!userId || !(await isAdmin(userId))) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // 2. 🔍 VALIDAR INPUT
    const body = await req.json();
    const validated = resetUsageSchema.parse(body);

    // 3. 📧 BUSCAR USUÁRIO (case-insensitive)
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, usage_this_month, plan')
      .ilike('email', validated.userEmail)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const previousUsage = targetUser.usage_this_month || {};

    // 4. 🔄 RESETAR USO MENSAL
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ usage_this_month: {} })
      .eq('id', targetUser.id);

    if (updateError) {
      console.error('[Credits] Erro ao resetar:', updateError);
      return NextResponse.json(
        { error: 'Erro ao resetar uso' },
        { status: 500 }
      );
    }

    // 5. 📝 AUDIT LOG
    await logAdminAction({
      adminId: userId,
      action: 'reset_usage',
      targetUserId: targetUser.id,
      metadata: {
        reason: validated.reason,
        user_email: targetUser.email,
        previous_usage: previousUsage,
        plan: targetUser.plan
      }
    });

    // 6. ✅ RETORNAR SUCESSO
    return NextResponse.json({
      success: true,
      message: 'Uso mensal resetado com sucesso',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        previous_usage: previousUsage
      }
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }

    console.error('[Credits] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
