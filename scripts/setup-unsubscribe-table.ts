import dotenv from 'dotenv';

// Carregar variáveis de ambiente PRIMEIRO
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

/**
 * Script para criar tabela email_unsubscribes
 */

async function createUnsubscribeTable() {
  console.log('🔧 CRIANDO TABELA EMAIL_UNSUBSCRIBES\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Criar cliente Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('✅ Conectado ao Supabase\n');

  try {
    // Ler arquivo SQL
    const sqlPath = path.join(process.cwd(), 'scripts', 'create-unsubscribe-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 Executando SQL...\n');
    console.log(sql);
    console.log('\n');

    // Executar SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Se a função exec_sql não existir, tentar criar a tabela diretamente
      console.log('⚠️  Função exec_sql não encontrada, tentando método alternativo...\n');
      
      // Executar cada comando SQL separadamente
      const commands = sql
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0);

      for (const command of commands) {
        if (command.startsWith('--') || command.startsWith('COMMENT')) {
          continue; // Pular comentários
        }

        const { error: cmdError } = await supabase.rpc('exec', { query: command });
        
        if (cmdError) {
          console.error(`❌ Erro ao executar comando:`, cmdError);
          console.error(`Comando:`, command);
        }
      }
    }

    // Verificar se a tabela foi criada
    console.log('🔍 Verificando se a tabela foi criada...\n');
    
    const { count, error: countError } = await supabase
      .from('email_unsubscribes')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      if (countError.code === '42P01') {
        console.error('❌ Tabela não foi criada. Execute o SQL manualmente no Supabase Dashboard:\n');
        console.error('https://supabase.com/dashboard/project/YOUR_PROJECT/editor\n');
        console.error('SQL:\n');
        console.error(sql);
        process.exit(1);
      } else {
        throw countError;
      }
    }

    console.log('✅ Tabela email_unsubscribes criada com sucesso!');
    console.log(`   Registros atuais: ${count || 0}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 SETUP CONCLUÍDO!\n');
    console.log('A tabela está pronta para uso. Agora o sistema irá:');
    console.log('  • Respeitar unsubscribes de usuários');
    console.log('  • Filtrar automaticamente no admin panel');
    console.log('  • Melhorar deliverability dos emails\n');

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    console.error('\n📋 Stack trace:');
    console.error(error.stack);
    console.error('\n💡 SOLUÇÃO ALTERNATIVA:');
    console.error('Execute o SQL manualmente no Supabase Dashboard:');
    console.error('https://supabase.com/dashboard/project/YOUR_PROJECT/editor\n');
    
    const sqlPath = path.join(process.cwd(), 'scripts', 'create-unsubscribe-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    console.error('SQL:\n');
    console.error(sql);
    
    process.exit(1);
  }
}

// Executar
createUnsubscribeTable().catch(console.error);
