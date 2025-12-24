/**
 * SCRIPT DE MIGRAÇÃO: Base64 → Supabase Storage
 *
 * Este script migra todas as imagens de Base64 (no banco) para Supabase Storage.
 *
 * COMO EXECUTAR:
 * npx tsx scripts/migrate-images-to-storage.ts
 *
 * O que faz:
 * 1. Busca todos os projetos com migrated_to_storage = false
 * 2. Faz upload das imagens para o Storage
 * 3. Atualiza o registro com as URLs
 * 4. Marca como migrado
 *
 * SEGURO: Não deleta os dados antigos, apenas adiciona os novos
 */

import { supabaseAdmin } from '../lib/supabase';
import { uploadImage, ensureBucketExists } from '../lib/storage';

interface Project {
  id: string;
  user_id: string;
  name: string;
  original_image: string;
  stencil_image: string;
  migrated_to_storage: boolean;
}

async function migrateProject(project: Project): Promise<boolean> {
  try {
    console.log(`\n📦 Migrando projeto: ${project.name} (${project.id})`);

    // Verificar se tem imagens em Base64
    if (!project.original_image || !project.stencil_image) {
      console.log('⚠️  Projeto sem imagens, pulando...');
      return false;
    }

    // Verificar se já foi migrado
    if (project.migrated_to_storage) {
      console.log('✅ Já migrado, pulando...');
      return true;
    }

    // Upload da imagem original
    console.log('  📤 Fazendo upload da imagem original...');
    const originalResult = await uploadImage(
      project.original_image,
      project.user_id,
      project.id,
      'original'
    );
    console.log(`  ✅ Original: ${originalResult.publicUrl}`);

    // Upload do stencil
    console.log('  📤 Fazendo upload do stencil...');
    const stencilResult = await uploadImage(
      project.stencil_image,
      project.user_id,
      project.id,
      'stencil'
    );
    console.log(`  ✅ Stencil: ${stencilResult.publicUrl}`);

    // Atualizar banco de dados
    console.log('  💾 Atualizando banco de dados...');
    const { error } = await supabaseAdmin
      .from('projects')
      .update({
        original_image_url: originalResult.publicUrl,
        stencil_image_url: stencilResult.publicUrl,
        migrated_to_storage: true,
      })
      .eq('id', project.id);

    if (error) {
      console.error('  ❌ Erro ao atualizar:', error.message);
      return false;
    }

    console.log('  ✅ Projeto migrado com sucesso!');
    return true;
  } catch (error: any) {
    console.error(`  ❌ Erro ao migrar projeto ${project.id}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 INICIANDO MIGRAÇÃO DE IMAGENS\n');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar/criar bucket
    console.log('\n1️⃣  Verificando bucket...');
    await ensureBucketExists();

    // 2. Buscar projetos não migrados
    console.log('\n2️⃣  Buscando projetos não migrados...');
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('migrated_to_storage', false)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar projetos: ${error.message}`);
    }

    if (!projects || projects.length === 0) {
      console.log('\n✅ Nenhum projeto para migrar! Tudo já está no Storage.');
      return;
    }

    console.log(`\n📊 Encontrados ${projects.length} projetos para migrar\n`);

    // 3. Migrar cada projeto
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i] as Project;
      console.log(`\n[${i + 1}/${projects.length}]`);

      const success = await migrateProject(project);

      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Pausa de 100ms entre projetos para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 4. Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RELATÓRIO FINAL');
    console.log(`   Total de projetos: ${projects.length}`);
    console.log(`   ✅ Migrados com sucesso: ${successCount}`);
    console.log(`   ❌ Falharam: ${failCount}`);
    console.log(`   📈 Taxa de sucesso: ${((successCount / projects.length) * 100).toFixed(1)}%`);

    // 5. Verificar progresso geral
    console.log('\n5️⃣  Verificando progresso geral...');
    const { data: progress } = await supabaseAdmin
      .from('migration_progress')
      .select('*')
      .single();

    if (progress) {
      console.log(`\n   Total de projetos: ${progress.total_projects}`);
      console.log(`   Migrados: ${progress.migrated}`);
      console.log(`   Pendentes: ${progress.pending}`);
      console.log(`   Progresso: ${progress.percentage_migrated}%`);
    }

    console.log('\n✅ MIGRAÇÃO CONCLUÍDA!\n');

    if (failCount > 0) {
      console.log('⚠️  Alguns projetos falharam. Execute o script novamente para tentar migrar os pendentes.');
    }
  } catch (error: any) {
    console.error('\n❌ ERRO FATAL:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Executar
main()
  .then(() => {
    console.log('\n👋 Finalizando...');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Erro não capturado:', error);
    process.exit(1);
  });
