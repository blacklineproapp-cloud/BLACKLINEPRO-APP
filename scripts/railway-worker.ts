import 'dotenv/config';

// Importar workers
import { startAllWorkers } from '../lib/queue-worker';

console.log('Starting Railway Workers...');
console.log('Environment:', process.env.NODE_ENV || 'production');
console.log('');

// Verificar configuracoes criticas
const checks: Record<string, string | undefined> = {
  'Railway Redis URL': process.env.REDIS_URL,
  'Supabase URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'Supabase Service Key': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'Gemini API Key': process.env.GEMINI_API_KEY,
  'Clerk Secret': process.env.CLERK_SECRET_KEY,
};

console.log('Configuration Check:');
Object.entries(checks).forEach(([key, value]) => {
  const display = value ? 'Configured' : 'Missing';
  console.log(`  ${key}: ${display}`);
});

console.log('');

// Verificar se todas as configuracoes estao OK
const allConfigured = Object.values(checks).every(v => v);

if (!allConfigured) {
  console.error('Missing required environment variables!');
  console.error('Please configure all variables in Railway dashboard.');
  process.exit(1);
}

// Iniciar workers
console.log('Starting workers...');
startAllWorkers();

console.log('');
console.log('Workers started successfully!');
console.log('');
console.log('Workers running:');
console.log('  - Stencil Generation');
console.log('  - Image Enhancement');
console.log('  - AI Generation');
console.log('  - Color Matching');

// Keep-alive robusto com setInterval (nao depende de stdin)
// Imprime heartbeat a cada 60s para Railway saber que o processo esta vivo
const heartbeat = setInterval(() => {
  console.log(`[Heartbeat] Workers alive | ${new Date().toISOString()} | memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
}, 60000);

// Nao deixar o heartbeat impedir o shutdown
heartbeat.unref();

// SIGTERM/SIGINT sao tratados pelo queue-worker.ts (gracefulShutdown)
// Nao registrar handlers duplicados aqui

// Capturar erros nao tratados para evitar crash silencioso
process.on('uncaughtException', (err) => {
  console.error('[Worker] uncaughtException:', err.message);
  console.error(err.stack);
  // Dar tempo para logs serem enviados antes de sair
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[Worker] unhandledRejection:', reason?.message || reason);
  // Nao encerrar em unhandledRejection - apenas logar
  // BullMQ pode gerar rejeicoes durante reconexao que nao sao fatais
});
