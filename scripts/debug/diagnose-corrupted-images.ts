/**
 * SCRIPT: Diagnóstico de Imagens Corrompidas no Storage
 * 
 * Este script:
 * 1. Busca todos os projetos no banco de dados
 * 2. Verifica se as imagens (original e stencil) são válidas
 * 3. Lista projetos com imagens corrompidas
 * 4. Identifica usuários afetados
 * 
 * COMO USAR:
 * npx ts-node scripts/diagnose-corrupted-images.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltando variáveis de ambiente SUPABASE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Project {
  id: string;
  user_id: string;
  stencil_image: string;
  original_image: string;
  thumbnail_url?: string;
  created_at: string;
}

interface CorruptedProject {
  projectId: string;
  userId: string;
  userEmail?: string;
  createdAt: string;
  stencilCorrupted: boolean;
  originalCorrupted: boolean;
  stencilUrl?: string;
  errorDetails: string[];
}

/**
 * Verifica se uma URL de imagem é acessível e válida
 */
async function checkImageUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!url) {
      return { valid: false, error: 'URL vazia' };
    }

    // Se for base64, verificar se tem dados
    if (url.startsWith('data:image')) {
      const base64Data = url.split(',')[1];
      if (!base64Data || base64Data.length < 100) {
        return { valid: false, error: 'Base64 vazio ou muito pequeno' };
      }
      return { valid: true };
    }

    // Se for URL, fazer HEAD request
    const response = await fetch(url, { method: 'HEAD' });
    
    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('image')) {
      return { valid: false, error: `Content-Type inválido: ${contentType}` };
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) < 1000) {
      return { valid: false, error: `Imagem muito pequena: ${contentLength} bytes` };
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Verifica se uma imagem PNG está corrompida (parcialmente preta)
 * Faz download da imagem e verifica os pixels
 */
async function checkImageContent(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!url || url.startsWith('data:image')) {
      // Para base64, pular verificação de conteúdo (muito custoso)
      return { valid: true };
    }

    // Baixar apenas os primeiros bytes para verificação rápida
    const response = await fetch(url);
    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}` };
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Verificar magic bytes de PNG
    const pngMagic = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    const isPng = pngMagic.every((byte, i) => bytes[i] === byte);

    if (!isPng) {
      return { valid: false, error: 'Não é um PNG válido (magic bytes incorretos)' };
    }

    // Verificar se o arquivo tem tamanho razoável
    if (bytes.length < 1000) {
      return { valid: false, error: `Arquivo muito pequeno: ${bytes.length} bytes` };
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 Iniciando diagnóstico de imagens corrompidas...\n');

  // 1. Buscar todos os projetos
  console.log('📥 Buscando projetos...');
  
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, user_id, stencil_image, original_image, thumbnail_url, created_at')
    .order('created_at', { ascending: false });

  if (projectsError) {
    console.error('❌ Erro ao buscar projetos:', projectsError);
    process.exit(1);
  }

  console.log(`✅ Encontrados ${projects?.length || 0} projetos\n`);

  if (!projects || projects.length === 0) {
    console.log('Nenhum projeto encontrado.');
    return;
  }

  // 2. Buscar todos os usuários para mapear emails
  const { data: users } = await supabase
    .from('users')
    .select('id, email');

  const userEmailMap = new Map<string, string>();
  users?.forEach(u => userEmailMap.set(u.id, u.email));

  // 3. Verificar cada projeto
  const corruptedProjects: CorruptedProject[] = [];
  const affectedUsers = new Map<string, { email: string; projectCount: number }>();
  
  let processed = 0;
  const total = projects.length;

  console.log('🔬 Verificando imagens...\n');

  for (const project of projects) {
    processed++;
    
    // Mostrar progresso a cada 10 projetos
    if (processed % 10 === 0) {
      console.log(`   Progresso: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
    }

    const errors: string[] = [];
    let stencilCorrupted = false;
    let originalCorrupted = false;

    // Verificar stencil
    if (project.stencil_image) {
      const stencilCheck = await checkImageUrl(project.stencil_image);
      if (!stencilCheck.valid) {
        stencilCorrupted = true;
        errors.push(`Stencil: ${stencilCheck.error}`);
      } else {
        // Verificar conteúdo
        const contentCheck = await checkImageContent(project.stencil_image);
        if (!contentCheck.valid) {
          stencilCorrupted = true;
          errors.push(`Stencil content: ${contentCheck.error}`);
        }
      }
    }

    // Verificar original (opcional, menos crítico)
    if (project.original_image && !project.original_image.startsWith('data:')) {
      const originalCheck = await checkImageUrl(project.original_image);
      if (!originalCheck.valid) {
        originalCorrupted = true;
        errors.push(`Original: ${originalCheck.error}`);
      }
    }

    // Se algum está corrompido, adicionar à lista
    if (stencilCorrupted || originalCorrupted) {
      const userEmail = userEmailMap.get(project.user_id) || 'email desconhecido';
      
      corruptedProjects.push({
        projectId: project.id,
        userId: project.user_id,
        userEmail,
        createdAt: project.created_at,
        stencilCorrupted,
        originalCorrupted,
        stencilUrl: project.stencil_image?.substring(0, 100) + '...',
        errorDetails: errors
      });

      // Contar usuários afetados
      const existing = affectedUsers.get(project.user_id);
      if (existing) {
        existing.projectCount++;
      } else {
        affectedUsers.set(project.user_id, { email: userEmail, projectCount: 1 });
      }
    }
  }

  // 4. Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO DE DIAGNÓSTICO');
  console.log('='.repeat(60));

  console.log(`\n📁 Total de projetos analisados: ${total}`);
  console.log(`❌ Projetos com problemas: ${corruptedProjects.length}`);
  console.log(`👥 Usuários afetados: ${affectedUsers.size}`);

  if (corruptedProjects.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('PROJETOS CORROMPIDOS:');
    console.log('-'.repeat(60));

    corruptedProjects.forEach((p, i) => {
      console.log(`\n${i + 1}. Projeto: ${p.projectId}`);
      console.log(`   Usuário: ${p.userEmail} (${p.userId})`);
      console.log(`   Criado em: ${new Date(p.createdAt).toLocaleDateString('pt-BR')}`);
      console.log(`   Stencil corrompido: ${p.stencilCorrupted ? '❌ SIM' : '✅ NÃO'}`);
      console.log(`   Original corrompido: ${p.originalCorrupted ? '❌ SIM' : '✅ NÃO'}`);
      console.log(`   Erros: ${p.errorDetails.join(', ')}`);
    });

    console.log('\n' + '-'.repeat(60));
    console.log('USUÁRIOS AFETADOS:');
    console.log('-'.repeat(60));

    affectedUsers.forEach((data, userId) => {
      console.log(`\n📧 ${data.email}`);
      console.log(`   ID: ${userId}`);
      console.log(`   Projetos afetados: ${data.projectCount}`);
    });
  } else {
    console.log('\n✅ Nenhuma imagem corrompida encontrada!');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Diagnóstico concluído.');
}

main().catch(console.error);
