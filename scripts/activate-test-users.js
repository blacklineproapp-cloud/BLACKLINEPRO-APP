#!/usr/bin/env node

/**
 * Script para ativar usuários de teste em desenvolvimento
 *
 * Uso: node scripts/activate-test-users.js
 * Ou adicione ao package.json: npm run dev:activate-users
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const options = {
  hostname: HOST,
  port: PORT,
  path: '/api/dev/activate-test-users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log(`🔄 Ativando usuários de teste em http://${HOST}:${PORT}...\n`);

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);

      if (res.statusCode === 200) {
        console.log('✅ Sucesso!\n');
        console.log(`📊 ${response.activatedCount} usuário(s) ativado(s):\n`);

        response.users?.forEach((user, index) => {
          console.log(`${index + 1}. ${user.email}`);
          console.log(`   - is_paid: ${user.is_paid}`);
          console.log(`   - tools_unlocked: ${user.tools_unlocked}\n`);
        });
      } else {
        console.error('❌ Erro:', response.error);
        if (response.details) {
          console.error('Detalhes:', response.details);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar resposta:', error.message);
      console.log('Resposta raw:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro ao conectar ao servidor:', error.message);
  console.log('\n💡 Certifique-se de que o servidor está rodando com: npm run dev');
});

req.end();
