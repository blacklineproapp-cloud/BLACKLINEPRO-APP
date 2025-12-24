# Endpoints de Desenvolvimento

Estes endpoints estão disponíveis apenas em ambiente de desenvolvimento (`NODE_ENV !== 'production'`).

## Ativar Usuários de Teste

**Endpoint:** `POST /api/dev/activate-test-users`

Ativa automaticamente os seguintes emails com acesso total (assinatura + ferramentas):
- coutthomas7@gmail.com
- erickrussomat@gmail.com
- yurilojavirtual@gmail.com

### Como usar:

#### Opção 1: cURL
```bash
curl -X POST http://localhost:3000/api/dev/activate-test-users
```

#### Opção 2: Navegador (JavaScript Console)
```javascript
fetch('/api/dev/activate-test-users', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

#### Opção 3: Script Node.js
```javascript
const response = await fetch('http://localhost:3000/api/dev/activate-test-users', {
  method: 'POST'
});
const data = await response.json();
console.log(data);
```

### Resposta de sucesso:
```json
{
  "success": true,
  "message": "Usuários de teste ativados com sucesso!",
  "activatedCount": 3,
  "users": [
    { "email": "coutthomas7@gmail.com", "is_paid": true, "tools_unlocked": true },
    { "email": "erickrussomat@gmail.com", "is_paid": true, "tools_unlocked": true },
    { "email": "yurilojavirtual@gmail.com", "is_paid": true, "tools_unlocked": true }
  ]
}
```

### Quando usar:
- Após criar/recriar os usuários no Clerk
- Quando precisar testar o app com acesso total
- Sempre que os usuários de teste precisarem de acesso ilimitado

### Segurança:
- Apenas funciona em desenvolvimento
- Retorna erro 403 em produção
- Só ativa emails específicos (não aceita parâmetros externos)
