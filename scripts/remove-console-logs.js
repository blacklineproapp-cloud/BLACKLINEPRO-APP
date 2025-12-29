/**
 * Script para remover console.logs de produção
 *
 * Mantém apenas: console.error (para erros críticos)
 * Remove: console.log, console.warn, console.info, console.debug
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_DIR = process.cwd();

// Padrões a remover
const PATTERNS_TO_REMOVE = [
  /^\s*console\.log\([^)]*\);?\s*$/gm,
  /^\s*console\.warn\([^)]*\);?\s*$/gm,
  /^\s*console\.info\([^)]*\);?\s*$/gm,
  /^\s*console\.debug\([^)]*\);?\s*$/gm,
];

// Padrões de comentários de debug
const DEBUG_COMMENT_PATTERNS = [
  /^\s*\/\/ Debug.*$/gm,
  /^\s*\/\/ TODO: remover.*$/gm,
  /^\s*\/\/ Log.*$/gm,
];

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalLength = content.length;

  // Remover console.logs
  PATTERNS_TO_REMOVE.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  // Remover comentários de debug
  DEBUG_COMMENT_PATTERNS.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  // Remover linhas vazias em excesso (máximo 2 linhas vazias consecutivas)
  content = content.replace(/\n{3,}/g, '\n\n');

  if (content.length !== originalLength) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

// Buscar todos arquivos com console.log
const files = execSync(
  'grep -rl "console\\.(log|warn|info|debug)" app/ lib/ components/ --include="*.ts" --include="*.tsx" 2>/dev/null || true',
  { cwd: BASE_DIR, encoding: 'utf8' }
)
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`🔍 Encontrados ${files.length} arquivos com console.logs\n`);

let cleaned = 0;
let skipped = 0;

files.forEach(file => {
  const fullPath = path.join(BASE_DIR, file);

  // Pular arquivos de backup
  if (file.includes('.backup')) {
    skipped++;
    return;
  }

  try {
    if (cleanFile(fullPath)) {
      console.log(`✅ Limpo: ${file}`);
      cleaned++;
    } else {
      console.log(`⏭️  Sem mudanças: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Erro em ${file}:`, error.message);
  }
});

console.log(`\n📊 Resultado:`);
console.log(`   ✅ Arquivos limpos: ${cleaned}`);
console.log(`   ⏭️  Sem mudanças: ${files.length - cleaned - skipped}`);
console.log(`   ⚠️  Ignorados (backup): ${skipped}`);
console.log(`\n🎉 Limpeza concluída!`);
console.log(`\n⚠️  NOTA: console.error foi MANTIDO para logs de erro críticos`);
