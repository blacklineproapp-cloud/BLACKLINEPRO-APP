# Como Aplicar as Otimizações do Supabase

## 🎯 Passo a Passo

### 1. Aplicar Migrations SQL

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor** (painel esquerdo)
3. Clique em **+ New query**
4. Copie TODO o conteúdo do arquivo [`optimize-performance.sql`](../migrations/optimize-performance.sql)
5. Cole no editor
6. Clique em **Run** (ou pressione Ctrl+Enter)

**Resultado esperado**:
```
✅ Índices otimizados criados
✅ VIEW admin_dashboard_stats criada
📊 Execute: SELECT * FROM admin_dashboard_stats para testar
```

### 2. Testar a VIEW

No mesmo SQL Editor, execute:
```sql
SELECT * FROM admin_dashboard_stats;
```

Você deve ver uma linha com todas as estatísticas:
- `total_users`
- `active_users`
- `total_projects`
- etc.

### 3. Reiniciar Servidor Local

No terminal:
```bash
# Pare o servidor atual (Ctrl+C)
npm run dev
```

### 4. Testar Localmente

1. **Dashboard**: Acesse http://localhost:3000/dashboard
   - ✅ Deve carregar sem erro 521
   - ✅ Deve mostrar projetos (limitado a 50)

2. **Admin Stats**: Acesse http://localhost:3000/api/admin/stats
   - ✅ Primeira vez: ~1-2 segundos (consulta VIEW)
   - ✅ Segunda vez: <100ms (cache ativado)

3. **Logs do Console**: Observe mensagens de cache:
   ```
   🔄 Cache MISS: admin-dashboard-stats - Buscando dados...
   ✅ Cache HIT: admin-dashboard-stats
   ```

## 📊 Monitorar Melhorias

### No Supabase Dashboard

1. Vá em **Reports** → **Database**
2. Observe gráficos de **CPU** e **RAM**
3. Compare antes/depois:
   - ❌ Antes: CPU 80-100%, RAM 90%+
   - ✅ Depois: CPU <50%, RAM <75%

### Queries Lentas

Execute no SQL Editor para ver queries mais lentas:
```sql
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## 🔄 Invalidar Cache (se necessário)

Se precisar limpar o cache manualmente, crie um endpoint de dev:

```typescript
// app/api/dev/clear-cache/route.ts
import { clearCache } from '@/lib/cache';
import { NextResponse } from 'next/server';

export async function POST() {
  clearCache();
  return NextResponse.json({ message: 'Cache limpo' });
}
```

## ⚠️ Problemas?

Se o erro 521 persistir:
1. Verifique se as migrations foram aplicadas com sucesso
2. Confirme que a VIEW `admin_dashboard_stats` existe
3. Monitore uso de CPU/RAM no Supabase Dashboard
4. Considere upgrade para Micro (US$ 5/mês) se necessário
