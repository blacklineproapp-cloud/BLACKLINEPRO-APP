# Extração de Cores - Python

## Instalar Dependências

```bash
pip install pdf2image pillow google-generativeai python-dotenv
```

## Instalar Poppler

### Windows
1. Download: https://github.com/oschwartz10612/poppler-windows/releases/
2. Extrair para `C:\poppler`
3. Adicionar ao PATH:
   ```bash
   setx PATH "%PATH%;C:\poppler\Library\bin"
   ```

### Verificar
```bash
pdftoppm -v
```

## Executar

```bash
python scripts/extract-ink-colors.py
```

## Output

- `output/iron-works.json`
- `output/radiant-colors.json`
- `output/all-colors.json`
