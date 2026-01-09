# 🚀 Claude Code: Skills, Agents e Automações - StencilFlow

**Data:** 08 de Janeiro de 2026
**Projeto:** StencilFlow - Editor de Stencils com IA
**Stack:** Next.js 14 + TypeScript + Supabase + Stripe + Gemini AI + BullMQ

---

## 📊 ANÁLISE DA STACK ATUAL

### Tecnologias Principais:
- **Frontend:** Next.js 14.2, React 18, TypeScript
- **Auth:** Clerk (@clerk/nextjs)
- **Database:** Supabase (PostgreSQL + RLS)
- **Billing:** Stripe (subscriptions, webhooks)
- **IA:** Google Gemini AI (image processing)
- **Jobs:** BullMQ + Redis (background processing)
- **Cache/Rate Limit:** Upstash Redis / Railway Redis
- **Monitoring:** Sentry
- **Email:** React Email + Resend

### Arquitetura:
```
📁 app/
├── (dashboard)/          # Dashboard routes
│   ├── admin/           # Painel admin (2239 linhas!)
│   ├── dashboard/       # User dashboard
│   ├── editor/          # Stencil editor
│   └── tools/           # IA tools
├── api/                 # API routes
│   ├── admin/          # Admin endpoints
│   ├── stencil/        # Stencil generation
│   ├── tools/          # IA tools
│   └── webhooks/       # Stripe, Clerk webhooks
└── success/            # Payment success

📁 lib/
├── admin/              # Admin utilities
├── billing/            # Billing logic, limits
├── stripe/             # Stripe services
├── auth.ts             # Clerk helpers
├── gemini.ts           # Gemini AI
├── queue.ts            # BullMQ queues
└── supabase.ts         # Supabase client
```

---

## 🎯 RECURSOS DO CLAUDE CODE A IMPLEMENTAR

### 1. SKILLS (Descoberta Automática)
### 2. AGENTS (Tarefas Especializadas)
### 3. HOOKS (Automações Determinísticas)
### 4. MCP SERVERS (Integrações Externas)
### 5. SLASH COMMANDS (Comandos Rápidos)

---

## 📁 ESTRUTURA A CRIAR

```
.claude/
├── settings.json           # Configuração principal
├── CLAUDE.md              # Instruções do projeto
├── skills/                # Skills auto-descobertos
│   ├── billing-review/
│   │   ├── SKILL.md
│   │   └── checklist.md
│   ├── api-security/
│   │   └── SKILL.md
│   ├── database-review/
│   │   └── SKILL.md
│   └── stripe-integration/
│       └── SKILL.md
├── agents/                # Subagents especializados
│   ├── admin-refactor.md
│   ├── billing-auditor.md
│   ├── security-reviewer.md
│   └── performance-analyzer.md
├── commands/              # Slash commands
│   ├── commit.md
│   ├── deploy-staging.md
│   ├── test-billing.md
│   └── db-migrate.md
└── hooks/                 # Automações
    ├── format-on-save.sh
    └── audit-log.sh
```

---

## 🎨 IMPLEMENTAÇÃO PRÁTICA

Vou criar os arquivos agora com foco nas necessidades do StencilFlow!

---

## RECURSOS ESPECÍFICOS PARA STENCILFLOW:

### Skills Customizados:
1. **Billing Review** - Analisa código de billing (Stripe, limites)
2. **API Security** - Verifica Clerk auth, Supabase RLS, Stripe webhooks
3. **Database Review** - Checa queries, indexes, N+1 problems
4. **Gemini Integration** - Valida prompts, custos, rate limits

### Agents Especializados:
1. **Admin Refactor Agent** - Quebrar admin page.tsx (2239 linhas)
2. **Billing Auditor** - Analisar fluxo de pagamentos
3. **Security Reviewer** - Audit de segurança completo
4. **Performance Analyzer** - Identificar bottlenecks

### Hooks:
1. **Format TypeScript** - Auto-format após edits
2. **Protect Secrets** - Bloquear commits com .env
3. **Audit Log** - Registrar todas mudanças

### MCP Servers:
1. **Supabase DB** - Query direto no banco
2. **BullMQ Monitor** - Status das filas
3. **Stripe API** - Consultar subscriptions

### Slash Commands:
1. **/commit** - Commit semântico
2. **/test-billing** - Testar fluxo de billing
3. **/deploy-staging** - Deploy para staging
4. **/db-migrate** - Criar migration

---

**Vou criar todos esses arquivos agora!**
