import { Resend } from 'resend';
import { render } from '@react-email/components';
import RemarketingInitial from '../emails/templates/RemarketingInitial';
import RemarketingReminder from '../emails/templates/RemarketingReminder';
import RemarketingFinal from '../emails/templates/RemarketingFinal';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY não encontrada no .env.local');
  process.exit(1);
}

console.log(`🔑 API Key encontrada: ${resendApiKey.substring(0, 10)}...`);

const resend = new Resend(resendApiKey);

// Debug: Verificar se resend.templates existe
console.log(`🔍 Resend client criado`);
console.log(`🔍 resend.templates existe? ${resend.templates !== undefined}`);
console.log(`🔍 Métodos disponíveis:`, Object.keys(resend));

interface TemplateConfig {
  name: string;
  component: any;
  subject: string;
  description: string;
  variables: Array<{
    key: string;
    type: 'string' | 'number';
    fallbackValue: string | number;
  }>;
}

const templates: TemplateConfig[] = [
  {
    name: 'stencilflow-remarketing-initial',
    component: RemarketingInitial,
    subject: 'A Arte do Estêncil - Desbloqueie o StencilFlow Completo',
    description: 'Email de remarketing Dia 1 - Apresentação de recursos e benefícios',
    variables: [
      { key: 'userName', type: 'string', fallbackValue: 'Tatuador' },
      { key: 'userEmail', type: 'string', fallbackValue: 'user@example.com' },
      { key: 'appUrl', type: 'string', fallbackValue: 'https://stencilflow.com.br' },
    ],
  },
  {
    name: 'stencilflow-remarketing-reminder',
    component: RemarketingReminder,
    subject: '48% mais barato que Ghostline - StencilFlow',
    description: 'Email de remarketing Dia 7 - Comparação com concorrentes',
    variables: [
      { key: 'userName', type: 'string', fallbackValue: 'Tatuador' },
      { key: 'userEmail', type: 'string', fallbackValue: 'user@example.com' },
      { key: 'appUrl', type: 'string', fallbackValue: 'https://stencilflow.com.br' },
    ],
  },
  {
    name: 'stencilflow-remarketing-final',
    component: RemarketingFinal,
    subject: 'Upload → IA → Download - Simples assim',
    description: 'Email de remarketing Dia 14 - Última chamada com foco em simplicidade',
    variables: [
      { key: 'userName', type: 'string', fallbackValue: 'Tatuador' },
      { key: 'userEmail', type: 'string', fallbackValue: 'user@example.com' },
      { key: 'appUrl', type: 'string', fallbackValue: 'https://stencilflow.com.br' },
    ],
  },
];

async function syncTemplates() {
  console.log('🔄 SINCRONIZANDO TEMPLATES COM RESEND');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

  // Listar templates existentes no Resend
  console.log('📋 Buscando templates existentes no Resend...');

  let existingTemplates: any[] = [];
  try {
    const response = await resend.templates.list();
    existingTemplates = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);
    console.log(`✅ Encontrados ${existingTemplates.length} templates no Resend\n`);
  } catch (error: any) {
    console.log('ℹ️  Nenhum template encontrado (ou erro ao listar)\n');
  }

  // Processar cada template
  for (const template of templates) {
    console.log(`\n📧 Processando: ${template.name}`);
    console.log(`   Assunto: ${template.subject}`);
    console.log(`   Descrição: ${template.description}`);

    try {
      // Renderizar template React para HTML
      console.log(`   🔄 Renderizando React → HTML...`);

      const html = await render(
        template.component({
          userName: '{{{userName}}}',     // Resend variáveis
          userEmail: '{{{userEmail}}}',
          appUrl: '{{{appUrl}}}',
        })
      );

      // Verificar se já existe
      const existing = existingTemplates.find(
        (t: any) => t.name === template.name
      );

      if (existing) {
        // Atualizar template existente
        console.log(`   🔄 Template já existe (ID: ${existing.id}), atualizando...`);

        await resend.templates.update(existing.id, {
          name: template.name,
          html,
        });

        console.log(`   ✅ Template atualizado com sucesso!`);

        // Publicar
        console.log(`   📤 Publicando versão atualizada...`);
        await resend.templates.publish(existing.id);
        console.log(`   ✅ Publicado!`);
      } else {
        // Criar novo template
        console.log(`   ✨ Criando novo template...`);

        const created = await resend.templates.create({
          name: template.name,
          html,
        });

        if (created.data) {
          console.log(`   ✅ Template criado (ID: ${created.data.id})!`);

          // Publicar
          console.log(`   📤 Publicando...`);
          await resend.templates.publish(created.data.id);
          console.log(`   ✅ Publicado!`);
        } else {
          console.error(`   ❌ Erro ao criar template: ${created.error}`);
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Erro ao processar ${template.name}:`);
      console.error(`      ${error.message}`);
    }
  }

  // Listar templates finais
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESUMO FINAL');
  console.log('='.repeat(80));

  try {
    const finalList = await resend.templates.list();
    const finalData = Array.isArray(finalList.data) ? finalList.data : (finalList.data ? [finalList.data] : []);
    const stencilflowTemplates = finalData.filter((t: any) =>
      t.name.startsWith('stencilflow-')
    );

    console.log(`\n✅ Templates StencilFlow no Resend: ${stencilflowTemplates.length}\n`);

    stencilflowTemplates.forEach((t: any, index: number) => {
      console.log(`${index + 1}. ${t.name}`);
      console.log(`   ID: ${t.id}`);
      console.log(`   Status: ${t.published ? '✅ Publicado' : '⏳ Rascunho'}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('🎉 Sincronização concluída!');
    console.log('\n💡 Acesse o Resend Dashboard para visualizar os templates:');
    console.log('   https://resend.com/templates\n');
  } catch (error: any) {
    console.error('❌ Erro ao listar templates finais:', error.message);
  }
}

// Função auxiliar para deletar templates antigos (use com cuidado!)
async function deleteStencilflowTemplates() {
  console.log('🗑️  DELETANDO TEMPLATES STENCILFLOW DO RESEND');
  console.log('⚠️  ATENÇÃO: Esta ação não pode ser desfeita!\n');

  try {
    const list = await resend.templates.list();
    const listData = Array.isArray(list.data) ? list.data : (list.data ? [list.data] : []);
    const stencilflowTemplates = listData.filter((t: any) =>
      t.name.startsWith('stencilflow-')
    );

    if (stencilflowTemplates.length === 0) {
      console.log('ℹ️  Nenhum template StencilFlow encontrado.');
      return;
    }

    console.log(`Encontrados ${stencilflowTemplates.length} templates para deletar:\n`);

    for (const template of stencilflowTemplates) {
      console.log(`🗑️  Deletando: ${template.name} (${template.id})`);
      await resend.templates.remove(template.id);
      console.log(`   ✅ Deletado\n`);
    }

    console.log('✅ Todos os templates StencilFlow foram deletados.');
  } catch (error: any) {
    console.error('❌ Erro ao deletar templates:', error.message);
  }
}

// Parse argumentos
const args = process.argv.slice(2);

if (args.includes('--delete') || args.includes('-d')) {
  // Modo deletar
  deleteStencilflowTemplates().catch(console.error);
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📧 Script de Sincronização de Templates com Resend

Sincroniza os templates React Email locais com o Resend Dashboard.

Uso:
  npm run email:sync              # Criar/atualizar templates no Resend
  npm run email:sync -- --delete  # Deletar todos templates StencilFlow
  npm run email:sync -- --help    # Mostra esta ajuda

O que faz:
  1. Renderiza templates React para HTML
  2. Cria templates no Resend (ou atualiza se já existem)
  3. Publica automaticamente
  4. Lista todos os templates criados

Templates sincronizados:
  - stencilflow-remarketing-initial   (Dia 1)
  - stencilflow-remarketing-reminder  (Dia 7)
  - stencilflow-remarketing-final     (Dia 14)

Variáveis disponíveis:
  - {{{userName}}}   - Nome do usuário
  - {{{userEmail}}}  - Email do usuário
  - {{{appUrl}}}     - URL do app

Após sincronizar, visualize em:
  https://resend.com/templates

IMPORTANTE:
  - Templates são publicados automaticamente
  - Use --delete com cuidado (não pode ser desfeito)
  `);
  process.exit(0);
} else {
  // Modo sincronizar (padrão)
  syncTemplates().catch(console.error);
}
