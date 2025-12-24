#!/bin/bash

# Script para resetar ambiente de desenvolvimento

echo "🔄 Resetando ambiente de desenvolvimento..."

# 1. Parar processos Node.js (se houver)
echo "📛 Parando processos Node.js..."
pkill -f "node" 2>/dev/null || true

# 2. Limpar cache do Next.js
echo "🗑️  Limpando cache do Next.js..."
rm -rf .next
rm -rf node_modules/.cache

# 3. Limpar Service Worker registrado
echo "🧹 Limpando Service Workers..."
# (isso é feito pelo componente ServiceWorkerRegister.tsx)

echo ""
echo "✅ Ambiente resetado!"
echo ""
echo "📝 Próximos passos:"
echo "1. No navegador:"
echo "   - Pressionar F12"
echo "   - Application → Clear storage → Clear site data"
echo "   - Fechar TODAS as abas do localhost:3000"
echo ""
echo "2. Reiniciar servidor:"
echo "   npm run dev"
echo ""
echo "3. Abrir em aba anônima:"
echo "   Ctrl+Shift+N (Chrome)"
echo ""
echo "4. Se ainda der erro de Clerk:"
echo "   - Ver instruções em: CORRIGIR_CLERK.md"
echo ""
