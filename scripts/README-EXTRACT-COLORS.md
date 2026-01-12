# Extração de Cores de Tintas - Instruções

## 📋 Pré-requisitos

### 1. Instalar Dependências
```bash
npm install pdf2pic @google/generative-ai sharp
```

### 2. Configurar Gemini API Key
```bash
# Windows
set GEMINI_API_KEY=sua-chave-aqui

# Linux/Mac
export GEMINI_API_KEY=sua-chave-aqui
```

### 3. Baixar PDFs Manualmente

Baixe os catálogos e salve em `catalogs/`:

- **Intenze:** https://pt.scribd.com/document/739438528/CATALOGO-TINTA-INTENZE
  - Salvar como: `catalogs/intenze.pdf`

- **Eternal Ink:** https://pt.scribd.com/document/596803291/CATALOGO-ETERNAL-INK
  - Salvar como: `catalogs/eternal.pdf`

- **Iron Works:** https://www.ironworksbrasil.com.br/_files/ugd/a0188f_f097fb35d02340b192031d5631b713f4.pdf
  - Salvar como: `catalogs/ironworks.pdf`

---

## 🚀 Executar Script

```bash
# Criar banco de dados
psql -U postgres -d stencilflow -f migrations/005_create_tattoo_inks_table.sql

# Executar extração
npx tsx scripts/extract-ink-colors.ts
```

---

## 📊 Output

O script irá:

1. ✅ Converter cada página do PDF em imagem
2. ✅ Analisar com Gemini Vision
3. ✅ Extrair cores (nome + hex + categoria)
4. ✅ Salvar JSON individual por marca
5. ✅ Salvar JSON consolidado
6. ✅ Popular banco de dados

### Arquivos Gerados

```
output/
  ├── intenze-colors.json
  ├── eternal-colors.json
  ├── ironworks-colors.json
  └── all-ink-colors.json
```

---

## ⚠️ Notas

- **Rate Limit:** Gemini API tem limite de 15 RPM
- **Custo:** ~$0.001 por imagem (~$0.50 total)
- **Tempo:** ~5-10 minutos por catálogo
- **Precisão:** Depende da qualidade do PDF

---

## 🔧 Troubleshooting

### Erro: "GEMINI_API_KEY not found"
```bash
# Configurar variável de ambiente
set GEMINI_API_KEY=sua-chave
```

### Erro: "PDF not found"
- Baixe os PDFs manualmente
- Salve em `catalogs/` com nomes corretos

### Erro: "Rate limit exceeded"
- Aguarde 1 minuto
- Execute novamente
