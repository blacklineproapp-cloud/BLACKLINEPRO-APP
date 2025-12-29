/**
 * Script para remover console.logs de produção (versão 2 - Windows friendly)
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = process.cwd();

// Lista de arquivos críticos com console.logs (baseado no grep anterior)
const FILES_TO_CLEAN = [
  'app/(dashboard)/editor/page.tsx',
  'app/(dashboard)/tools/page.tsx',
  'app/api/projects/route.ts',
  'app/api/adjust-stencil/route.ts',
  'app/api/stencil/generate/route.ts',
  'app/api/tools/split-a4/route.ts',
  'app/api/webhooks/clerk/route.ts',
  'app/api/webhooks/stripe/route.ts',
  'lib/gemini.ts',
  'lib/queue.ts',
  'components/split-a4/ImageCropControl.tsx',
];

function cleanFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Não encontrado: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let removedCount = 0;

  // Remover console.log(), console.warn(), console.info(), console.debug()
  // Mas MANTER console.error()
  const lines = content.split('\n');
  const cleanedLines = lines.filter(line => {
    // Se a linha tem console.error, manter
    if (line.includes('console.error')) {
      return true;
    }

    // Se a linha tem console.log/warn/info/debug, remover
    if (
      line.trim().startsWith('console.log(') ||
      line.trim().startsWith('console.warn(') ||
      line.trim().startsWith('console.info(') ||
      line.trim().startsWith('console.debug(')
    ) {
      removedCount++;
      return false;
    }

    // Manter linha
    return true;
  });

  content = cleanedLines.join('\n');

  // Remover linhas vazias em excesso
  content = content.replace(/\n{3,}/g, '\n\n');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return removedCount;
  }

  return 0;
}

console.log(`🔄 Removendo console.logs de ${FILES_TO_CLEAN.length} arquivos...\n`);

let totalRemoved = 0;
let filesModified = 0;

FILES_TO_CLEAN.forEach(file => {
  const fullPath = path.join(BASE_DIR, file);
  const removed = cleanFile(fullPath);

  if (removed > 0) {
    console.log(`✅ ${file} - ${removed} console.logs removidos`);
    totalRemoved += removed;
    filesModified++;
  } else if (removed === 0) {
    console.log(`⏭️  ${file} - sem console.logs ou já limpo`);
  }
});

console.log(`\n📊 Resultado:`);
console.log(`   ✅ Arquivos modificados: ${filesModified}`);
console.log(`   📝 Total de console.logs removidos: ${totalRemoved}`);
console.log(`\n🎉 Limpeza concluída!`);
console.log(`\n⚠️  NOTA: console.error foi MANTIDO para logs de erro críticos`);
