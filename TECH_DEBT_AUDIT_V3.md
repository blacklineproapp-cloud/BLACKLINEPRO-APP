# Auditoria de Dívida Técnica — BlacklinePRO v3.0

**Data:** 10/03/2026
**Auditor:** Análise profunda automatizada (Claude)
**Stack:** Next.js 15.5.9 · React 18 · TypeScript 5.4 · Supabase · Clerk · BullMQ · Redis · Gemini AI · Asaas
**Codebase:** ~310 arquivos fonte · 16.500+ linhas em `lib/` · 75 rotas de API · 60+ componentes

---

## Resumo Executivo

O BlacklinePRO fez excelente progresso desde a auditoria v2.0 (9 de março): 82% dos 28 itens originais resolvidos, arquitetura modular estabelecida e 51 testes unitários implementados. Porém, esta auditoria mais profunda descobriu **19 itens de dívida técnica** em 6 categorias que a auditoria original não capturou. As lacunas mais críticas estão na cobertura de testes (98,7% sem testes), segurança de dependências (2 CVEs ativos) e duplicação de código nas rotas de ferramentas.

**Saúde geral do codebase: 7,5 / 10** — Boa base com caminho claro de melhoria.

---

## Metodologia de Pontuação

Cada item é avaliado em três eixos (escala 1–5):

| Eixo | Descrição |
|------|-----------|
| **Impacto** | Quanto desacelera o time ou degrada a qualidade? |
| **Risco** | O que acontece se ignorarmos? |
| **Esforço** | Quão difícil é a correção? (invertido: menor esforço = maior prioridade) |

> **Prioridade = (Impacto + Risco) × (6 − Esforço)**

| Faixa de Prioridade | Nível |
|----------------------|-------|
| ≥ 40 | 🔴 CRÍTICO |
| 25–39 | 🟠 ALTO |
| 15–24 | 🟡 MÉDIO |
| < 15 | 🟢 BAIXO |

---

## Itens de Dívida — Pontuados e Priorizados

### 🔴 CRÍTICO (Prioridade ≥ 40)

| # | Item | Tipo | Impacto | Risco | Esforço | Prioridade | Status |
|---|------|------|---------|-------|---------|------------|--------|
| C1 | **Cobertura de testes em 1,3%** — 4 arquivos de teste para 310 arquivos fonte. Webhooks de pagamento, auth, 75 rotas de API e todos os serviços Asaas têm zero testes. | Testes | 5 | 5 | 4 | **20** ¹ | NOVO |
| C2 | **2 vulnerabilidades npm ativas** — Next.js DoS (GHSA-9g9p, GHSA-h25m). @react-email/preview-server depende de Next.js vulnerável. | Dependências | 4 | 5 | 2 | **36** | NOVO |
| C3 | **Deploy remove package-lock.json** — `railway.json` executa `rm -f package-lock.json && npm install --legacy-peer-deps`, eliminando builds determinísticos. | Infra | 4 | 5 | 1 | **45** | NOVO |

¹ C1 pontua 20 pela fórmula mas é escalado para CRÍTICO porque código de pagamento/auth sem testes é um risco de continuidade do negócio.

---

### 🟠 ALTO (Prioridade 25–39)

| # | Item | Tipo | Impacto | Risco | Esforço | Prioridade | Status |
|---|------|------|---------|-------|---------|------------|--------|
| H1 | **Boilerplate duplicado nas rotas de ferramentas** — Rate-limiting, verificação de billing e validação de imagem são copiados identicamente em 4 rotas (~400 linhas duplicadas). | Código | 4 | 3 | 2 | **28** | NOVO |
| H2 | **ESLint desabilita segurança de tipos** — `no-explicit-any: off`, `ban-ts-comment: off`, `no-require-imports: off`. ~40+ usos de `any` permanecem sem verificação. | Código | 3 | 4 | 2 | **28** | NOVO |
| H3 | **DrawingCanvas.tsx tem 1.119 linhas** — Contém classe `StrokeStabilizer`, matemática Catmull-Rom, curvas de pressão e renderização tudo em um arquivo. | Código | 3 | 3 | 3 | **18** ² | Herdado (#8 parcial) |
| H4 | **Rota Split-A4 tem 465 linhas de lógica de processamento de imagem** dentro do handler HTTP — não testável, não reutilizável. | Arquitetura | 3 | 3 | 2 | **24** ² | NOVO |
| H5 | **God function `getOrCreateUser()`** — 360 linhas, 5+ responsabilidades (sync Clerk, criação de usuário, invalidação de cache, tracking de atividade, retry). | Arquitetura | 3 | 3 | 3 | **18** ² | Herdado (#10) |
| H6 | **CSP permite `unsafe-eval` e `unsafe-inline`** — Reduz proteção contra XSS. Múltiplos domínios de ad-network na whitelist. | Segurança | 2 | 4 | 2 | **24** | Herdado (#23) |
| H7 | **Sem pre-commit hooks ou gate de testes no CI** — Testes não são forçados antes de commits ou deploys. Build do Railway/nixpacks pula testes inteiramente. | Infra | 4 | 4 | 2 | **32** | NOVO |

² H3, H4, H5 pontuam menor pela fórmula mas são elevados para ALTO porque bloqueiam diretamente testabilidade e manutenibilidade.

---

### 🟡 MÉDIO (Prioridade 15–24)

| # | Item | Tipo | Impacto | Risco | Esforço | Prioridade | Status |
|---|------|------|---------|-------|---------|------------|--------|
| M1 | **Error handling inconsistente** — 3 padrões diferentes: return null/vazio, return false, throw. Sem Result type. Diferentes formatos de resposta de erro entre rotas de API. | Código | 3 | 3 | 3 | **18** | NOVO |
| M2 | **Sem estratégia de invalidação de cache** — Operações de crédito do admin bypassa cache sem invalidar. Sem circuit breaker para Redis. | Infra | 3 | 3 | 3 | **18** | Herdado (#28 expandido) |
| M3 | **Cobertura JSDoc ~2,3%** — `prompts-optimized.ts` (1.043 linhas), `asaas/payment-service.ts` (411 linhas), `asaas/subscription-service.ts` (412 linhas) têm documentação mínima ou zero. | Docs | 3 | 2 | 3 | **15** | NOVO |
| M4 | **Dependências críticas desatualizadas** — `@google/generative-ai` 0.11.5 (atual: 0.18+), AWS SDK v3.1001 (500+ versões atrás), Supabase auth helpers fixado em 0.10.0. | Dependências | 2 | 3 | 3 | **15** | Herdado (#16) |
| M5 | **Rotas de crédito admin 80% duplicadas** — `credits/add` e `credits/remove` compartilham validação, lookup de usuário e audit logging idênticos. Apenas o operador matemático difere. | Código | 2 | 2 | 1 | **20** | NOVO |
| M6 | **console.log no middleware.ts** — 5 chamadas diretas console.log/warn ao invés do logger estruturado. | Código | 2 | 2 | 1 | **20** | NOVO (regressão) |
| M7 | **`@types/ioredis` nas deps de produção** — Deveria ser devDependency. | Dependências | 1 | 1 | 1 | **10** ³ | NOVO |

³ M7 pontua 10 mas agrupado com MÉDIO por completude organizacional.

---

### 🟢 BAIXO (Prioridade < 15)

| # | Item | Tipo | Impacto | Risco | Esforço | Prioridade | Status |
|---|------|------|---------|-------|---------|------------|--------|
| L1 | **`gemini.ts.bak` (40KB) na árvore fonte** — Backup monolítico antigo. Histórico do git preserva isso. | Código | 1 | 1 | 1 | **10** | NOVO |
| L2 | **tsconfig target ES2017** — Padrão de 8 anos atrás. ES2020+ reduziria o tamanho do bundle. | Config | 1 | 1 | 1 | **10** | NOVO |
| L3 | **Tracking de atividade usa Map em memória** — `lastUpdateMap` em `auth.ts` não sobrevive entre processos. Deveria usar Redis. | Arquitetura | 1 | 2 | 2 | **12** | NOVO |
| L4 | **nixpacks.toml fixa Node 20** — Produção roda Node 20 enquanto dev usa Node 22. | Infra | 1 | 2 | 1 | **15** | NOVO |
| L5 | **Scripts excluídos da verificação TypeScript** — `tsconfig.json` exclui `scripts/**/*`. | Config | 1 | 2 | 1 | **15** | NOVO |

---

## Resumo por Categoria

| Categoria | Total | Crítico | Alto | Médio | Baixo |
|-----------|-------|---------|------|-------|-------|
| **Código** | 7 | 0 | 2 | 3 | 1 |
| **Arquitetura** | 3 | 0 | 2 | 0 | 1 |
| **Testes** | 1 | 1 | 0 | 0 | 0 |
| **Dependências** | 3 | 1 | 0 | 2 | 0 |
| **Infraestrutura** | 3 | 1 | 1 | 1 | 0 |
| **Segurança** | 1 | 0 | 1 | 0 | 0 |
| **Documentação** | 1 | 0 | 0 | 1 | 0 |
| **TOTAL** | **19** | **3** | **6** | **7** | **3** |

---

## Plano de Remediação por Fases

### Fase 6 — Segurança Crítica & Infraestrutura (Semana 1, ~1 dia)

| Tarefa | Resolve | Esforço | Justificativa de Negócio |
|--------|---------|---------|--------------------------|
| Corrigir `railway.json`: substituir `rm -f package-lock.json && npm install` por `npm ci --legacy-peer-deps` | C3 | 15 min | Builds não-determinísticos podem causar incidentes em produção por drift de dependências |
| Executar `npm audit fix` para vulnerabilidades DoS do Next.js | C2 | 1 hora | CVEs ativos em produção — atacante pode causar negação de serviço |
| Substituir `console.log` em middleware.ts por `logger` | M6 | 30 min | Logging estruturado necessário para observabilidade em produção |
| Deletar `gemini.ts.bak` | L1 | 5 min | Código morto na árvore fonte adiciona confusão |
| Atualizar nixpacks.toml para Node 22 | L4 | 15 min | Paridade dev/prod previne bugs "funciona na minha máquina" |

**Esforço total: ~1 dia**

---

### Fase 7 — Fundação de Testes (Semanas 1–2, ~5 dias)

| Tarefa | Resolve | Esforço | Justificativa de Negócio |
|--------|---------|---------|--------------------------|
| Escrever testes para `app/api/webhooks/asaas/route.ts` (webhook de pagamento) | C1 | 1 dia | Bugs na confirmação de pagamento perdem receita diretamente |
| Escrever testes para `lib/auth.ts` (`isAdmin`, `getOrCreateUser`) | C1 | 1 dia | Bypass de auth = brecha total de segurança |
| Escrever testes para `lib/asaas/payment-service.ts` | C1 | 1 dia | Cobranças incorretas ou reembolsos perdidos prejudicam usuários |
| Adicionar pre-commit hook (husky + lint-staged) para rodar testes | H7 | 0,5 dia | Previne envio de código quebrado |
| Corrigir setup de cobertura do vitest (npm install limpo para resolver @rollup faltando) | C1 | 0,5 dia | Métricas de cobertura necessárias para acompanhar progresso |
| Definir thresholds de cobertura: 80% para `lib/billing/`, 50% para rotas de API | C1 | 0,5 dia | Quality gate automatizado previne regressões |

**Esforço total: ~5 dias**

---

### Fase 8 — Eliminação de Duplicação & Abstrações (Semana 3, ~4 dias)

| Tarefa | Resolve | Esforço | Justificativa de Negócio |
|--------|---------|---------|--------------------------|
| Extrair wrapper de rota de ferramenta: `createToolRoute(toolName, handler)` com rate-limit + billing + validação compartilhados | H1 | 1 dia | Elimina 400+ linhas duplicadas; ponto único de mudança para lógica de billing/rate-limit |
| Extrair `splitImageIntoA4Pages()` do route handler para `lib/split-a4/processor.ts` | H4 | 0,5 dia | Torna 465 linhas de lógica de imagem testáveis e reutilizáveis |
| Criar helper genérico de operação de crédito em `lib/admin/credit-operations.ts` | M5 | 0,5 dia | Elimina 80% da duplicação entre rotas add/remove de crédito |
| Dividir `DrawingCanvas.tsx` em hooks + utils (StrokeStabilizer, curvas de pressão) | H3 | 1,5 dias | 1.119 → ~300 linhas no componente; cada peça se torna testável |
| Habilitar ESLint `no-explicit-any: warn`, `ban-ts-comment: warn` | H2 | 0,5 dia | Melhoria gradual de segurança de tipos sem quebrar o build |

**Esforço total: ~4 dias**

---

### Fase 9 — Arquitetura & Resiliência (Semana 4, ~4 dias)

| Tarefa | Resolve | Esforço | Justificativa de Negócio |
|--------|---------|---------|--------------------------|
| Dividir `getOrCreateUser()` em `getUserFromDB()`, `createUserFromClerk()`, `checkExpiredCourtesy()` | H5 | 1 dia | God function não é testável; divisão habilita teste unitário de cada caminho |
| Implementar padrão Result type para queries Supabase | M1 | 1 dia | Error handling consistente previne falhas silenciosas em produção |
| Adicionar circuit breaker para Redis (fast-fail após N erros, auto-recover) | M2 | 1 dia | Previne lentidão total do app quando Redis está degradado |
| Adicionar helpers de invalidação de cache para operações admin | M2 | 0,5 dia | Previne dados stale após mudanças admin (ex: ajustes de crédito) |
| Mover `lastUpdateMap` para Redis para suporte multi-processo | L3 | 0,5 dia | Tracking de atividade funciona corretamente em deploys escalados |

**Esforço total: ~4 dias**

---

### Fase 10 — Documentação & Modernização (Semana 5+, ~3 dias)

| Tarefa | Resolve | Esforço | Justificativa de Negócio |
|--------|---------|---------|--------------------------|
| Adicionar JSDoc a `prompts-optimized.ts`, `asaas/payment-service.ts`, `asaas/subscription-service.ts` | M3 | 1,5 dias | Tempo de onboarding reduzido; menos erros em módulos complexos |
| Atualizar `@google/generative-ai` para 0.18+, AWS SDK para último v3 | M4 | 1 dia | Correções de bugs, melhorias de performance, possíveis patches de segurança |
| Remover CSP `unsafe-eval`/`unsafe-inline`, implementar CSP baseado em nonce | H6 | 0,5 dia | Mitigação adequada de XSS |
| Atualizar tsconfig target para ES2020 | L2 | 15 min | Output menor, suporte a sintaxe moderna |
| Incluir `scripts/` na verificação do tsconfig | L5 | 15 min | Captura erros de tipo em scripts de manutenção |

**Esforço total: ~3 dias**

---

## Resumo de Esforço

| Fase | Foco | Dias | Itens Resolvidos |
|------|------|------|------------------|
| **Fase 6** | Correções críticas | 1 | C2, C3, M6, L1, L4 |
| **Fase 7** | Fundação de testes | 5 | C1, H7 |
| **Fase 8** | Deduplicação | 4 | H1, H2, H3, H4, M5 |
| **Fase 9** | Arquitetura | 4 | H5, M1, M2, L3 |
| **Fase 10** | Docs & modernização | 3 | M3, M4, H6, L2, L5 |
| **TOTAL** | | **~17 dias** | **19 itens** |

---

## O Que Está Indo Bem

O codebase tem fundamentos fortes que não devem ser ignorados:

- **Camada de segurança** — Proteção CSRF, rate limiting, RLS, verificação de role admin em middleware + API
- **Módulo de billing** — Separação limpa (plans, limits, costs, service) com 42 testes passando
- **Padrão de auth middleware** — `withAuth`, `withAdminAuth`, `withSuperAdminAuth` usados consistentemente em 23+ rotas
- **Logging estruturado** — 400+ `console.log` já migrados para `logger` na Fase 2
- **Sistema de filas** — BullMQ com isolamento adequado de worker, shutdown graceful, backoff exponencial
- **Docs de arquitetura** — 28KB `docs/ARCHITECTURE.md` cobrindo todos os 7 módulos, 77 rotas, infraestrutura
- **Cache com fallback** — Redis primário + fallback em memória com métricas
- **i18n** — 6 idiomas totalmente suportados
- **Execução da auditoria anterior** — 82% dos itens v2.0 resolvidos em um sprint

---

## Tracking: Status Combinado (v2.0 + v3.0)

| Métrica | Valor |
|---------|-------|
| **Itens originais (v2.0)** | 28 |
| **Resolvidos da v2.0** | 23 (82%) |
| **Restantes da v2.0** | 5 |
| **Novos itens (v3.0)** | 14 |
| **Total de itens abertos** | 19 |
| **Críticos abertos** | 3 |
| **Testes automatizados** | 51 (4 suites, todos passando) |
| **Remediação estimada** | ~17 dias de desenvolvedor |

---

*Relatório gerado em 10/03/2026 — Análise profunda em 310 arquivos fonte, 75 rotas de API e toda configuração de infraestrutura.*
