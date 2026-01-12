import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminAction } from '@/lib/admin-audit';

// Schema de validação
const renewCourtesySchema = z.object({
  userId: z.string().uuid('ID de usuário inválido'),
  newExpirationDate: z.string().datetime('Data de expiração inválida')
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
    const validated = renewCourtesySchema.parse(body);

    const newExpiration = new Date(validated.newExpirationDate);
    const now = new Date();

    console.log('[Courtesy Renew] Data recebida:', {
      userId: validated.userId,
      newExpirationDate: validated.newExpirationDate,
      parsedDate: newExpiration.toISOString(),
      isFuture: newExpiration > now
    });

    // Validar que a nova data é futura
    if (newExpiration <= now) {
      return NextResponse.json(
        { error: 'Data de expiração deve ser futura' },
        { status: 400 }
      );
    }

    // 3. 📧 BUSCAR USUÁRIO
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, admin_courtesy, admin_courtesy_expires_at, plan')
      .eq('id', validated.userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // 4. ⚠️ VERIFICAR SE TEM CORTESIA
    if (!targetUser.admin_courtesy) {
      return NextResponse.json(
        { error: 'Usuário não possui cortesia ativa para renovar' },
        { status: 400 }
      );
    }

    // 5. 🔄 RENOVAR CORTESIA
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        admin_courtesy_expires_at: newExpiration.toISOString()
      })
      .eq('id', targetUser.id);

    if (updateError) {
      console.error('[Courtesy] Erro ao renovar:', updateError);
      return NextResponse.json(
        { error: 'Erro ao renovar cortesia' },
        { status: 500 }
      );
    }

    // 6. 📝 REGISTRAR NO AUDIT LOG
    await logAdminAction({
      adminId: userId,
      action: 'renew_courtesy',
      targetUserId: targetUser.id,
      metadata: {
        previous_expiration: targetUser.admin_courtesy_expires_at,
        new_expiration: newExpiration.toISOString(),
        user_email: targetUser.email,
        plan: targetUser.plan
      }
    });

    // 7. ✅ RETORNAR SUCESSO
    return NextResponse.json({
      success: true,
      message: 'Cortesia renovada com sucesso',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        plan: targetUser.plan,
        expires_at: newExpiration.toISOString()
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

    console.error('[Courtesy] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
