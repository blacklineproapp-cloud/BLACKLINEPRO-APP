'use server';

import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { userId: clerkId } = auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar usuário
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar customer do Stripe
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!customer?.stripe_customer_id) {
      // Retornar lista vazia se não tem customer
      return NextResponse.json({ invoices: [] });
    }

    // Buscar invoices do Stripe
    const stripeInvoices = await stripe.invoices.list({
      customer: customer.stripe_customer_id,
      limit: 24, // Últimos 2 anos
      expand: ['data.payment_intent']
    });

    // Mapear para formato simplificado
    const invoices = stripeInvoices.data.map(invoice => {
      // Verificar se é boleto
      const isBoleto = invoice.payment_settings?.payment_method_types?.includes('boleto') ||
                       invoice.collection_method === 'send_invoice';

      // Obter status legível
      let status: 'paid' | 'pending' | 'overdue' | 'void' = 'pending';
      if (invoice.status === 'paid') {
        status = 'paid';
      } else if (invoice.status === 'void' || invoice.status === 'uncollectible') {
        status = 'void';
      } else if (invoice.due_date && invoice.due_date * 1000 < Date.now()) {
        status = 'overdue';
      }

      return {
        id: invoice.id,
        status,
        amount: (invoice.amount_due || 0) / 100,
        currency: invoice.currency?.toUpperCase() || 'BRL',
        created_at: new Date(invoice.created * 1000).toISOString(),
        due_date: invoice.due_date 
          ? new Date(invoice.due_date * 1000).toISOString() 
          : null,
        paid_at: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : null,
        pdf_url: invoice.invoice_pdf || null,
        hosted_url: invoice.hosted_invoice_url || null,
        description: invoice.lines?.data?.[0]?.description || 'Assinatura StencilFlow',
        is_boleto: isBoleto,
        // Dados específicos do boleto (se disponível)
        boleto_barcode: null, // Stripe não expõe diretamente
        boleto_expiry: null
      };
    });

    // Filtrar apenas boletos ou retornar todos (configurável)
    const boletosOnly = invoices.filter(inv => inv.is_boleto);

    return NextResponse.json({ 
      invoices: boletosOnly.length > 0 ? boletosOnly : invoices,
      total: invoices.length,
      boletos_count: boletosOnly.length
    });

  } catch (error: any) {
    console.error('[API /user/invoices] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar invoices' },
      { status: 500 }
    );
  }
}
