# 📁 Scripts Organization Guide

## ✅ ESSENTIAL - Keep in Production

### Database Migrations
- `create-tattoo-inks-table.sql` - Tabela de tintas
- `create-unsubscribe-table.sql` - Tabela de unsubscribe
- `setup-remarketing-table.sql` - Tabela de remarketing
- `add-legacy-fields.sql` - Campos legacy
- `fix-plan-constraint.sql` - Constraint de planos
- `make-admin.sql` - Criar admins

### Production Workers
- `railway-worker.ts` - Worker principal do Railway
- `railway-worker.js` - Versão JS do worker

### Email & Marketing
- `sync-email-templates.ts` - Sincronizar templates de email
- `automated-remarketing.ts` - Sistema de remarketing automático
- `send-remarketing-emails.ts` - Envio de emails de remarketing

### Stripe Integration
- `create-stripe-products.ts` - Criar produtos no Stripe
- `create-stripe-prices.ts` - Criar preços no Stripe
- `migrate-courtesy-to-stripe.ts` - Migrar cortesias para Stripe

## 🔧 DEVELOPMENT ONLY - Can be ignored in production

### Testing & Debugging
- `activate-test-users.js` ⚠️
- `check-*.ts` ⚠️ (todos os check)
- `debug-*.ts` ⚠️ (todos os debug)
- `test-*.ts` ⚠️ (todos os test)
- `verify-setup.ts` ⚠️
- `diagnose-payment-issue.ts` ⚠️
- `diagnostic-usage-count.ts` ⚠️

### Auditing Scripts
- `audit-*.ts` ⚠️
- `system-audit.ts` ⚠️
- `deep-payment-audit.ts` ⚠️
- `validate-total-revenue.ts` ⚠️
- `analyze-revenue.ts` ⚠️

### Data Migration (One-time use)
- `populate-historical-ip-data.ts` ⚠️
- `populate-historical-ip-data.sql` ⚠️
- `migrate-images-to-storage.ts` ⚠️
- `migrate-admin-emails.js` ⚠️
- `sync-missing-payments.ts` ⚠️

### User Management (Manual operations)
- `activate-boleto-users.ts` ⚠️
- `assign-legacy-plan.ts` ⚠️
- `convert-permanent-courtesy.ts` ⚠️
- `fix-blocked-boleto-users.ts` ⚠️
- `fix-incomplete-users.ts` ⚠️
- `unlock-*.ts` ⚠️
- `update-courtesy-users.ts` ⚠️
- `identify-courtesy-users.ts` ⚠️

### Listing Scripts (Manual queries)
- `list-*.ts` ⚠️ (todos)
- `find-*.ts` ⚠️

### Color Extraction (Development)
- `extract-ink-colors.py` ⚠️
- `extract-ink-colors.ts` ⚠️
- `import-colors-to-db.py` ⚠️
- `import-colors-to-db.ts` ⚠️
- `scrape-*.py` ⚠️
- `merge-all-colors.py` ⚠️
- `remove-duplicates.py` ⚠️

### Stripe Management (Manual operations)
- `archive-stripe-products.ts` ⚠️
- `create-legacy-stripe-plan.ts` ⚠️
- `add-semiannual-*.ts` ⚠️
- `retry-failed-webhooks.ts` ⚠️

### Development Tools
- `generate-icons.js` ⚠️
- `remove-console-logs*.js` ⚠️
- `reset-dev.*` ⚠️

### Documentation
- `README-*.md` ℹ️
- `INSTALL-POPPLER.md` ℹ️
- `add-aria-labels.md` ℹ️

### Output Directory
- `output/` ⚠️ - Arquivos temporários gerados

## 📝 Recommendation

### For Production Deployment:
1. **Keep only essential scripts** listed above
2. **Move development scripts** to a separate `dev-scripts/` folder
3. **Archive one-time migration scripts** - não precisam estar no repo ativo

### .gitignore Already Configured
The `.gitignore` now excludes most development scripts from version control, but they remain in your local environment for when you need them.

## ⚠️ IMPORTANT
**DO NOT DELETE** any scripts without reviewing their purpose first. Many are used for manual operations and troubleshooting.
