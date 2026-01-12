# Instalação do Poppler para Windows

## Download
1. Baixe Poppler para Windows: https://github.com/oschwartz10612/poppler-windows/releases/
2. Baixe a versão mais recente (ex: poppler-24.08.0.zip)
3. Extraia para: `C:\poppler`

## Adicionar ao PATH
```bash
# Adicionar ao PATH do sistema
setx PATH "%PATH%;C:\poppler\Library\bin"
```

## Verificar Instalação
```bash
pdftoppm -v
```

Se aparecer a versão, está instalado corretamente!

## Alternativa: Instalar via Chocolatey
```bash
choco install poppler
```
