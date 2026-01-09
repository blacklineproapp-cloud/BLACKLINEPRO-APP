# 🚀 Claude Code Plugins Instalados - StencilFlow

**Data de Instalação:** 08 de Janeiro de 2026
**Projeto:** StencilFlow - Editor de Stencils com IA
**Stack:** Next.js 14 + TypeScript + Supabase + Stripe + Gemini AI

---

## 📦 PLUGINS INSTALADOS

### 🤖 Agents (5 instalados)

Agents são especialistas autônomos que podem ser invocados para tarefas específicas. Eles rodam de forma independente e têm acesso completo ao contexto do projeto.

#### 1. **nextjs-app-router-developer**
- **Localização:** `~/.claude/agents/nextjs-app-router-developer.md`
- **Descrição:** Especialista em Next.js 14+ App Router, Server Components, Server Actions, PPR e caching avançado
- **Quando usar:**
  - Criar novas rotas no App Router
  - Implementar Server Components e Client Components
  - Otimizar performance com PPR e streaming
  - Migrar de Pages Router para App Router
  - Implementar Server Actions para forms
- **Uso proativo:** ✅ Usa automaticamente quando detecta tarefas de Next.js
- **Exemplo:**
  ```
  "Criar uma nova rota /dashboard/analytics com Server Components"
  → O agent será automaticamente invocado para implementar
  ```

#### 2. **backend-architect**
- **Localização:** `~/.claude/agents/backend-architect.md`
- **Descrição:** Arquiteto de backend para APIs RESTful, microserviços e design de database
- **Quando usar:**
  - Criar novos endpoints de API
  - Design de schemas de database
  - Revisar arquitetura de serviços
  - Identificar bottlenecks de performance
  - Planejar escalabilidade
- **Uso proativo:** ✅ Usa automaticamente para arquitetura de backend
- **Relevância StencilFlow:**
  - Revisar estrutura de billing
  - Otimizar queries do Supabase
  - Design de novos endpoints (ex: /api/stencil/*)
  - Planejar arquitetura para 1000+ usuários

#### 3. **api-security-audit**
- **Localização:** `~/.claude/agents/api-security-audit.md`
- **Descrição:** Especialista em auditoria de segurança de APIs REST
- **Quando usar:**
  - Revisar endpoints de API
  - Validar autenticação Clerk
  - Verificar autorização e RBAC
  - Testar injeção e vulnerabilidades
  - Revisar rate limiting
- **Uso proativo:** ✅ Usa automaticamente para revisões de segurança
- **Relevância StencilFlow:**
  - Auditar `/api/stencil/*` endpoints
  - Verificar proteção de `/api/admin/*`
  - Validar webhook do Stripe
  - Revisar implementação de RLS do Supabase

#### 4. **security-auditor**
- **Localização:** `~/.claude/agents/security-auditor.md`
- **Descrição:** Auditor de segurança geral seguindo OWASP Top 10
- **Quando usar:**
  - Auditoria completa de segurança
  - Implementar autenticação segura
  - Revisar fluxos OAuth2/JWT
  - Verificar CORS e CSP
  - Validar encriptação
- **Uso proativo:** ✅ Usa automaticamente para reviews de segurança
- **Relevância StencilFlow:**
  - Auditar integração com Clerk
  - Revisar proteção de API keys (Gemini, Stripe)
  - Validar segurança de webhooks
  - Verificar proteção de dados sensíveis

#### 5. **code-reviewer**
- **Localização:** `~/.claude/agents/code-reviewer.md`
- **Descrição:** Especialista em code review focado em qualidade e maintainability
- **Quando usar:**
  - Review de código antes de commit
  - Validar qualidade de PRs
  - Identificar code smells
  - Verificar duplicação de código
  - Validar error handling
- **Uso proativo:** ✅ Usa automaticamente após mudanças significativas
- **Feedback Structure:**
  - 🔴 **Crítico**: Vulnerabilidades, breaking changes
  - 🟡 **Warning**: Performance, missing tests
  - 🟢 **Sugestão**: Refactoring, melhorias

---

### ⚡ Commands (2 instalados)

Commands são ações diretas que você pode executar via slash commands (`/command-name`).

#### 1. **/security-audit**
- **Localização:** `~/.claude/commands/security-audit.md`
- **Descrição:** Auditoria de segurança completa em 10 etapas
- **Como usar:**
  ```
  /security-audit
  ```
- **O que faz:**
  1. Environment setup (stack, tools, infra)
  2. Dependency security (`npm audit`)
  3. Authentication & Authorization (Clerk, JWT)
  4. Input validation (SQL injection, XSS)
  5. Data protection (encryption, HTTPS)
  6. Secrets management (API keys, .env)
  7. Error handling (logging, info disclosure)
  8. Infrastructure (containers, CI/CD)
  9. Security headers (CSP, CORS)
  10. Reporting (findings por severidade)
- **Relevância StencilFlow:**
  - Executar antes de deploys importantes
  - Após adicionar novos endpoints
  - Mensalmente como rotina de segurança

#### 2. **/dependency-audit**
- **Localização:** `~/.claude/commands/dependency-audit.md`
- **Descrição:** Auditoria completa de dependências em 13 fases
- **Como usar:**
  ```
  /dependency-audit
  ```
- **O que faz:**
  1. Discovery (package.json, lockfiles)
  2. Version review (updates disponíveis)
  3. Security scanning (`npm audit`, CVEs)
  4. License analysis (GPL, MIT, etc)
  5. Health evaluation (manutenção, community)
  6. Performance impact (bundle size)
  7. Alternative options (alternativas mais leves)
  8. Conflict resolution (peer dependencies)
  9. Build assessment (dev vs prod)
  10. Supply chain (typosquatting, malware)
  11. Update planning (priorização)
  12. Automation (Dependabot, Renovate)
  13. Reporting (ações por prioridade)
- **Relevância StencilFlow:**
  - Executar mensalmente
  - Antes de major updates
  - Após adicionar novas libs

---

### 🔒 Hooks (2 instalados)

Hooks são automações que rodam automaticamente em eventos específicos (antes ou depois de tool use).

#### 1. **security-scanner**
- **Localização:** `~/.claude/hooks/security-scanner.md`
- **Event:** `PostToolUse` (depois de Edit/Write)
- **Descrição:** Scannea código para vulnerabilidades e secrets após modificações
- **O que detecta:**
  - API keys expostas
  - Passwords hardcoded
  - Tokens vazados
  - Vulnerabilidades de segurança
- **Funcionamento:**
  - Roda automaticamente após qualquer edit/write
  - Não precisa invocar manualmente
  - Alerta se encontrar issues
- **Relevância StencilFlow:**
  - Previne commit de `.env` com secrets
  - Detecta API keys do Gemini/Stripe no código
  - Valida que credenciais estão em variáveis de ambiente

#### 2. **file-protection**
- **Localização:** `~/.claude/hooks/file-protection.md`
- **Event:** `PreToolUse` (antes de Edit/Write)
- **Descrição:** Protege arquivos críticos de modificação acidental
- **Arquivos protegidos (configurável):**
  - `.env`, `.env.production`
  - `package-lock.json`
  - Arquivos de configuração críticos
  - Database schemas
- **Funcionamento:**
  - Roda ANTES de qualquer edit/write
  - Bloqueia operação se arquivo protegido
  - Alerta com mensagem de warning
- **Relevância StencilFlow:**
  - Previne edição acidental de `.env`
  - Protege lockfiles de mudanças não-intencionais
  - Garante que arquivos críticos só sejam alterados intencionalmente

---

## 🎯 COMO USAR NO DIA A DIA

### Workflow de Desenvolvimento

1. **Criar nova feature:**
   ```
   "Criar endpoint /api/billing/upgrade para upgrade de plano"
   ```
   - ✅ `backend-architect` é invocado automaticamente
   - ✅ Implementa endpoint seguindo padrões do projeto
   - ✅ `code-reviewer` revisa código após implementação
   - ✅ `security-scanner` valida após save

2. **Antes de commit:**
   ```
   /security-audit
   ```
   - Valida segurança completa
   - Verifica se não há secrets expostos
   - Confirma que tudo está OK para commit

3. **Mensalmente:**
   ```
   /dependency-audit
   ```
   - Atualiza dependências
   - Remove packages abandonados
   - Corrige vulnerabilidades

4. **Review de segurança:**
   ```
   "Revisar segurança dos endpoints de billing"
   ```
   - ✅ `api-security-audit` é invocado
   - ✅ Gera report completo de vulnerabilidades
   - ✅ Prioriza correções por severidade

---

## 🔧 INTEGRAÇÃO COM STENCILFLOW

### Casos de Uso Específicos

#### 1. Revisar Billing System
```
"Usar api-security-audit para revisar endpoints de billing"
```
**O que acontece:**
- Valida autenticação Clerk em todas rotas
- Verifica autorização (user pode acessar own data)
- Testa proteção contra IDOR
- Valida webhook do Stripe
- Verifica rate limiting

#### 2. Otimizar Performance
```
"Usar backend-architect para otimizar queries do Supabase"
```
**O que acontece:**
- Analisa queries lentas
- Sugere indexes
- Identifica N+1 queries
- Propõe caching strategies
- Documenta bottlenecks

#### 3. Criar Nova Feature
```
"Usar nextjs-app-router-developer para criar dashboard de analytics"
```
**O que acontece:**
- Design de estrutura de rotas
- Implementação de Server Components
- Setup de streaming para dados grandes
- Caching strategy
- Loading states

#### 4. Review Completo
```
/security-audit
```
**O que acontece:**
- Auditoria completa em 10 passos
- Report de vulnerabilidades
- Checklist de compliance (OWASP)
- Priorização de fixes

---

## 📋 CHECKLIST DE SEGURANÇA STENCILFLOW

Use os plugins para validar:

### ✅ Autenticação (Clerk)
- [ ] Todas rotas protegidas usam `await auth()`
- [ ] Nunca confiar em headers customizados
- [ ] JWT validado corretamente
- [ ] Webhooks do Clerk validados

### ✅ Database (Supabase)
- [ ] RLS habilitado em todas tabelas
- [ ] service_role_key NUNCA exposto
- [ ] Queries parametrizadas (sem SQL injection)
- [ ] Indexes em campos filtrados

### ✅ Billing (Stripe)
- [ ] Webhook signatures SEMPRE validadas
- [ ] Idempotência implementada
- [ ] Metadata completo em subscriptions
- [ ] Try/catch em todas operações

### ✅ IA (Gemini)
- [ ] API keys NUNCA logadas
- [ ] Rate limiting por usuário
- [ ] Custos calculados ANTES de processar
- [ ] Inputs validados antes de enviar

---

## 🚀 PRÓXIMOS PASSOS

### Plugins Recomendados para Instalar Depois

1. **Test Automator** - Gerar testes automaticamente
2. **Performance Engineer** - Otimização de performance
3. **Database Operations** - Comandos de database
4. **CI/CD Deployment** - Automação de deploy

### Configurações Adicionais

1. **Configurar Dependabot:**
   ```json
   // .github/dependabot.yml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
   ```

2. **Configurar pre-commit hooks:**
   ```bash
   npm install -D husky lint-staged
   npx husky install
   ```

3. **Adicionar mais arquivos protegidos:**
   - Editar `~/.claude/hooks/file-protection.md`
   - Adicionar patterns de arquivos críticos

---

## 📚 DOCUMENTAÇÃO DOS PLUGINS

- **Build with Claude:** https://www.buildwithclaude.com
- **GitHub Repo:** https://github.com/davepoon/buildwithclaude
- **Plugin Browser:** https://www.buildwithclaude.com/plugins

---

## ⚙️ CONFIGURAÇÃO

### Localização dos Plugins

```
C:\Users\erick\.claude\
├── agents/                    # 5 agents instalados
│   ├── nextjs-app-router-developer.md
│   ├── backend-architect.md
│   ├── api-security-audit.md
│   ├── security-auditor.md
│   └── code-reviewer.md
├── commands/                  # 2 commands instalados
│   ├── security-audit.md
│   └── dependency-audit.md
├── hooks/                     # 2 hooks instalados
│   ├── security-scanner.md
│   └── file-protection.md
└── skills/                    # Skills customizados StencilFlow
    ├── billing-review/
    │   └── SKILL.md
    └── api-security/
        └── SKILL.md
```

### bwc-cli

O `bwc-cli` está instalado globalmente:
```bash
bwc --version  # 1.2.4
bwc status     # Ver status de instalação
```

---

**Última atualização:** 08 de Janeiro de 2026
**Versão:** 1.0.0
