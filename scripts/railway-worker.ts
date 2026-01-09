import 'dotenv/config';

// Importar workers
import { startAllWorkers } from '../lib/queue-worker';

console.log('🚀 Starting Railway Workers...');
console.log('Environment:', process.env.NODE_ENV || 'production');
console.log('');

// Verificar configurações críticas
const checks: Record<string, string | undefined> = {
  'Railway Redis URL': process.env.REDIS_URL,
  'Supabase URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'Supabase Service Key': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'Gemini API Key': process.env.GEMINI_API_KEY,
  'Clerk Secret': process.env.CLERK_SECRET_KEY,
};

console.log('Configuration Check:');
Object.entries(checks).forEach(([key, value]) => {
  const display = value ? '✅ Configured' : '❌ Missing';
  console.log(`  ${key}: ${display}`);
});

console.log('');

// Verificar se todas as configurações estão OK
const allConfigured = Object.values(checks).every(v => v);

if (!allConfigured) {
  console.error('❌ Missing required environment variables!');
  console.error('Please configure all variables in Railway dashboard.');
  process.exit(1);
}

// Iniciar workers
console.log('Starting workers...');
startAllWorkers();

console.log('');
console.log('✅ Workers started successfully!');
console.log('');
console.log('Workers running:');
console.log('  - Stencil Generation (concurrency: 5)');
console.log('  - Image Enhancement (concurrency: 3)');
console.log('  - AI Generation (concurrency: 3)');
console.log('  - Color Matching (concurrency: 10)');
console.log('');
console.log('Press Ctrl+C to stop');

// Manter processo vivo
process.stdin.resume();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
