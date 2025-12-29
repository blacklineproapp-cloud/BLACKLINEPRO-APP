/**
 * Script para migrar de ADMIN_EMAILS hardcoded para sistema de roles
 *
 * Este script:
 * 1. Remove a constante ADMIN_EMAILS
 * 2. Adiciona import de isAdmin
 * 3. Substitui a lógica de checagem de email por isAdmin(userId)
 */

const fs = require('fs');
const path = require('path');

// Lista de arquivos para processar
const FILES_TO_MIGRATE = [
  'app/api/tools/split-a4/route.ts',
  'app/api/tools/enhance/route.ts',
  'app/api/admin/setup-payment/route.ts',
  'app/api/admin/activate-user/route.ts',
  'app/api/admin/activate-with-grace/route.ts',
  'app/api/admin/fix-my-account/route.ts',
  'app/api/admin/delete-user/route.ts',
  'app/api/admin/merge-users/route.ts',
  'app/api/admin/cleanup-duplicates/route.ts',
  'app/api/tools/color-match/route.ts',
  'app/api/admin/users/route.ts',
  'lib/credits.ts',
  'app/api/debug/user/route.ts',
  'app/api/admin/migrate-users/route.ts',
  'app/api/admin/stats/route.ts',
  'app/api/admin/metrics/route.ts',
  'app/api/dev/activate-test-users/route.ts',
];

const BASE_DIR = process.cwd();

function migrateFile(filePath) {
  const fullPath = path.join(BASE_DIR, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Verificar se já foi migrado
  if (!content.includes('ADMIN_EMAILS')) {
    console.log(`✅ Já migrado: ${filePath}`);
    return true;
  }

  // 1. Remover linha const ADMIN_EMAILS
  content = content.replace(/^\/\/ Emails admin com acesso ilimitado\nconst ADMIN_EMAILS = \['erickrussomat@gmail\.com', 'yurilojavirtual@gmail\.com'\];\n/gm, '');
  content = content.replace(/^const ADMIN_EMAILS = \['erickrussomat@gmail\.com', 'yurilojavirtual@gmail\.com'\];\n/gm, '');

  // 2. Adicionar import de isAdmin se necessário
  if (content.includes("from '@/lib/auth'") && !content.includes('isAdmin')) {
    // Caso 1: import { getOrCreateUser } from '@/lib/auth';
    content = content.replace(
      /import \{ (getOrCreateUser) \} from '@\/lib\/auth';/,
      "import { $1, isAdmin as checkIsAdmin } from '@/lib/auth';"
    );

    // Caso 2: pode ter outros imports também
    content = content.replace(
      /import \{ ([^}]+) \} from '@\/lib\/auth';/,
      (match, imports) => {
        if (!imports.includes('isAdmin')) {
          return `import { ${imports}, isAdmin as checkIsAdmin } from '@/lib/auth';`;
        }
        return match;
      }
    );
  } else if (!content.includes("from '@/lib/auth'")) {
    // Adicionar import completo se não existir
    const importLine = "import { isAdmin as checkIsAdmin } from '@/lib/auth';\n";
    // Adicionar após os imports do Next.js
    content = content.replace(
      /(import .+ from 'next\/server';)/,
      `$1\n${importLine}`
    );
  }

  // 3. Substituir lógica de checagem
  // Padrão 1: com userData.email
  content = content.replace(
    /const userEmailLower = userData\.email\?\.toLowerCase\(\) \|\| '';\s*const isAdmin = ADMIN_EMAILS\.some\(e => e\.toLowerCase\(\) === userEmailLower\);/g,
    'const userIsAdmin = await checkIsAdmin(userId);'
  );

  // Padrão 2: apenas com email
  content = content.replace(
    /const userEmail = user\.email\?\.toLowerCase\(\) \|\| '';\s*const isAdmin = ADMIN_EMAILS\.some\(e => e\.toLowerCase\(\) === userEmail\);/g,
    'const userIsAdmin = await checkIsAdmin(userId);'
  );

  // Padrão 3: includes
  content = content.replace(
    /const isAdmin = ADMIN_EMAILS\.includes\(userData\.email\);/g,
    'const userIsAdmin = await checkIsAdmin(userId);'
  );

  // 4. Substituir referências a isAdmin por userIsAdmin
  // Cuidado para não substituir a função importada
  content = content.replace(/\bisAdmin\b/g, (match, offset) => {
    const before = content.substring(Math.max(0, offset - 20), offset);
    // Não substituir se for parte do import
    if (before.includes('import') || before.includes('checkIsAdmin')) {
      return match;
    }
    return 'userIsAdmin';
  });

  // 5. Remover select de 'email' em queries se não for mais necessário
  // content = content.replace(
  //   /.select\('([^']*), email([^']*)'\)/g,
  //   ".select('$1$2')"
  // );

  // Salvar arquivo
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Migrado: ${filePath}`);
  return true;
}

// Executar migração
console.log('🔄 Iniciando migração de ADMIN_EMAILS...\n');

let success = 0;
let failed = 0;

FILES_TO_MIGRATE.forEach(file => {
  try {
    if (migrateFile(file)) {
      success++;
    } else {
      failed++;
    }
  } catch (error) {
    console.error(`❌ Erro ao migrar ${file}:`, error.message);
    failed++;
  }
});

console.log(`\n📊 Resultado:`);
console.log(`   ✅ Sucesso: ${success}`);
console.log(`   ❌ Falha: ${failed}`);
console.log(`\n🎉 Migração concluída!`);
console.log(`\n📝 Próximos passos:`);
console.log(`   1. Execute a migration: 004_create_admin_users.sql no Supabase`);
console.log(`   2. Adicione os admins na tabela admin_users`);
console.log(`   3. Teste as rotas protegidas`);
