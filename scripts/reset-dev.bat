@echo off
REM Script para resetar ambiente de desenvolvimento (Windows)

echo.
echo ========================================
echo   RESETANDO AMBIENTE DE DESENVOLVIMENTO
echo ========================================
echo.

REM 1. Limpar cache do Next.js
echo [1/2] Limpando cache do Next.js...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo.
echo [2/2] Cache limpo!
echo.

echo ========================================
echo   AMBIENTE RESETADO COM SUCESSO!
echo ========================================
echo.
echo PROXIMOS PASSOS:
echo.
echo 1. No navegador:
echo    - Pressionar F12
echo    - Application -^> Clear storage -^> Clear site data
echo    - Fechar TODAS as abas do localhost:3000
echo.
echo 2. Reiniciar servidor:
echo    npm run dev
echo.
echo 3. Abrir em aba anonima:
echo    Ctrl+Shift+N (Chrome)
echo.
echo 4. Se ainda der erro de Clerk:
echo    - Ver instrucoes em: CORRIGIR_CLERK.md
echo.

pause
