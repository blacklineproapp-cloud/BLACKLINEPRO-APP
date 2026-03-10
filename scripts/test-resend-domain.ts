import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testResendDomain() {
  console.log('🔍 TESTANDO CONFIGURAÇÃO RESEND\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // 1. Verificar API Key
  console.log('1️⃣ Verificando API Key...');
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY não encontrada no .env.local');
    process.exit(1);
  }
  console.log(`✅ API Key encontrada: ${process.env.RESEND_API_KEY.substring(0, 10)}...\n`);
  
  // 2. Listar domínios verificados
  console.log('2️⃣ Listando domínios verificados...');
  try {
    const domains = await resend.domains.list();
    
    if (domains.data?.data && domains.data.data.length > 0) {
      console.log(`✅ ${domains.data.data.length} domínio(s) encontrado(s):\n`);
      
      domains.data.data.forEach((domain: any) => {
        const statusEmoji = domain.status === 'verified' ? '✅' : '⚠️';
        console.log(`   ${statusEmoji} ${domain.name}`);
        console.log(`      Status: ${domain.status}`);
        console.log(`      Região: ${domain.region || 'N/A'}`);
        console.log(`      Criado: ${new Date(domain.created_at).toLocaleString('pt-BR')}\n`);
      });
    } else {
      console.log('⚠️ Nenhum domínio encontrado\n');
    }
  } catch (error: any) {
    console.error('❌ Erro ao listar domínios:', error.message);
  }
  
  // 3. Enviar email de teste
  console.log('3️⃣ Enviando email de teste...');
  console.log('   FROM: Black Line Pro <noreply@blacklinepro.com.br>');
  console.log('   TO: (insira seu email abaixo no código)\n');
  
  const testEmail = 'geanvitor.gonzales@gmail.com'; // ALTERE PARA SEU EMAIL
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Black Line Pro <noreply@blacklinepro.com.br>',
      to: [testEmail],
      subject: '✅ Teste de Domínio - Black Line Pro',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #1e293b; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #6366F1 0%, #14b8a6 50%, #a855f7 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
              .content { background: #ffffff; padding: 40px; border: 1px solid #e2e8f0; border-top: none; }
              .success { background: #ecfdf5; border-left: 4px solid #6366F1; padding: 16px; margin: 20px 0; border-radius: 8px; }
              .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 40px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Domínio Verificado!</h1>
                <p>blacklinepro.com.br</p>
              </div>
              <div class="content">
                <div class="success">
                  <p><strong>✅ Email de teste enviado com sucesso!</strong></p>
                  <p>O domínio <strong>blacklinepro.com.br</strong> está verificado e funcionando corretamente no Resend.</p>
                </div>
                
                <h3>📋 Detalhes Técnicos:</h3>
                <ul>
                  <li><strong>Domínio:</strong> blacklinepro.com.br</li>
                  <li><strong>Status:</strong> Verificado ✅</li>
                  <li><strong>DKIM:</strong> Configurado</li>
                  <li><strong>SPF:</strong> Configurado</li>
                  <li><strong>Remetente:</strong> noreply@blacklinepro.com.br</li>
                </ul>
                
                <p style="margin-top: 30px;">
                  Agora você pode enviar emails de remarketing e notificações através do painel admin sem problemas!
                </p>
              </div>
              <div class="footer">
                <p>Black Line Pro - A Arte do Estêncil</p>
                <p>Teste automático de configuração Resend</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    
    if (error) {
      console.error('❌ Erro ao enviar email:', error);
      console.error('\n📋 Detalhes do erro:');
      console.error(JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Email enviado com sucesso!');
      console.log(`   Email ID: ${data?.id}`);
      console.log(`\n📧 Verifique a caixa de entrada de: ${testEmail}`);
      console.log('   (Pode levar alguns segundos para chegar)\n');
    }
  } catch (err: any) {
    console.error('❌ Exceção ao enviar email:', err.message);
    console.error('\n📋 Stack trace:');
    console.error(err.stack);
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🏁 Teste concluído!\n');
}

testResendDomain().catch(console.error);
