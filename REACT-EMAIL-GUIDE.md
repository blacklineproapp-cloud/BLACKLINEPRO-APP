# 📧 React Email - Guia Completo StencilFlow

Sistema profissional de templates de email usando React Email, totalmente integrado com Resend.

---

## 🎨 O que foi implementado

### ✅ Estrutura Completa
```
emails/
├── components/              # Componentes reutilizáveis
│   ├── EmailHeader.tsx      # Header com logo e gradiente
│   ├── EmailButton.tsx      # CTA button estilizado
│   ├── EmailFooter.tsx      # Footer com links
│   ├── HighlightBox.tsx     # Box destacado para features
│   └── Stats.tsx            # Estatísticas visuais
├── templates/               # Templates completos
│   ├── RemarketingInitial.tsx    # Email Dia 1
│   ├── RemarketingReminder.tsx   # Email Dia 7
│   └── RemarketingFinal.tsx      # Email Dia 14
```

### ✅ Integração com Resend
- Renderização automática de React para HTML
- Função `sendRemarketingEmail()` atualizada
- Preserva toda a funcionalidade existente

---

## 🚀 Como Usar

### **1. Preview Local (Servidor de Desenvolvimento)**

Inicie o servidor de preview do React Email:

```bash
cd stencilflow-nextjs
npm run email:dev
```

Acesse: **http://localhost:3000**

Você verá:
- ✅ Lista de todos os templates
- ✅ Preview em tempo real
- ✅ Hot reload ao editar
- ✅ Teste responsivo (mobile/desktop)
- ✅ Enviar email de teste direto do preview

**Screenshot do Preview:**
```
┌─────────────────────────────────────┐
│  📧 React Email Preview             │
├─────────────────────────────────────┤
│  › RemarketingInitial               │
│  › RemarketingReminder              │
│  › RemarketingFinal                 │
└─────────────────────────────────────┘
```

---

### **2. Editar Templates**

#### Editar Conteúdo:

**Exemplo: Mudar texto da campanha inicial**

```tsx
// emails/templates/RemarketingInitial.tsx

<Text style={styles.paragraph}>
  Olá, <strong>{userName}</strong>!
</Text>

<Text style={styles.paragraph}>
  Vimos que você criou sua conta no <strong>StencilFlow</strong>...
  {/* 👆 Edite aqui */}
</Text>
```

Salve o arquivo → O preview atualiza automaticamente ✨

#### Adicionar Nova Feature à Lista:

```tsx
<HighlightBox title="🎨 Com a Tecnologia Stencil Flow você tem:">
  <ul style={styles.list}>
    <li style={styles.listItem}>
      <strong>Nova Feature</strong> - Descrição aqui
    </li>
    {/* Adicione mais itens */}
  </ul>
</HighlightBox>
```

#### Mudar Preço:

```tsx
<Section style={styles.priceBox}>
  <Text style={styles.priceLabel}>Plano Starter</Text>
  <Text style={styles.priceValue}>
    R$ 50<span style={{ fontSize: '16px' }}>/mês</span>
    {/* 👆 Mude o preço aqui */}
  </Text>
</Section>
```

---

### **3. Criar Novo Template**

#### Passo 1: Criar arquivo do template

```tsx
// emails/templates/WelcomeEmail.tsx

import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text } from '@react-email/components';
import { EmailHeader } from '../components/EmailHeader';
import { EmailButton } from '../components/EmailButton';
import { EmailFooter } from '../components/EmailFooter';

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
  appUrl: string;
}

export const WelcomeEmail = ({
  userName,
  userEmail,
  appUrl,
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Bem-vindo ao StencilFlow!</Preview>
      <Body style={styles.body}>
        <div style={styles.wrapper}>
          <Container style={styles.container}>
            <EmailHeader title="Bem-vindo ao StencilFlow!" />

            <Section style={styles.content}>
              <Text style={styles.paragraph}>
                Olá, <strong>{userName}</strong>!
              </Text>

              <Text style={styles.paragraph}>
                Sua conta foi criada com sucesso...
              </Text>

              <div style={{ textAlign: 'center', margin: '40px 0' }}>
                <EmailButton href={`${appUrl}/dashboard`}>
                  Acessar Dashboard
                </EmailButton>
              </div>
            </Section>

            <EmailFooter unsubscribeEmail={userEmail} appUrl={appUrl} />
          </Container>
        </div>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

const styles = {
  body: {
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#09090b',
  },
  wrapper: {
    backgroundColor: '#09090b',
    padding: '40px 20px',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
  },
  content: {
    padding: '40px 30px',
  },
  paragraph: {
    color: '#3f3f46',
    lineHeight: 1.7,
    margin: '0 0 16px 0',
  },
};
```

#### Passo 2: Adicionar função de envio

```tsx
// lib/email/index.ts

import WelcomeEmail from '@/emails/templates/WelcomeEmail';

export async function sendWelcomeEmail(email: string, nome: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stencilflow.com.br';

  const html = render(
    WelcomeEmail({
      userName: nome,
      userEmail: email,
      appUrl,
    })
  );

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Bem-vindo ao StencilFlow!',
    html,
  });
}
```

---

### **4. Testar Envio de Email**

Direto do preview server:

1. Abra `http://localhost:3000`
2. Clique no template
3. Clique em **"Send test email"**
4. Digite seu email
5. Verifique sua caixa de entrada

Ou via código:

```tsx
// Testar em algum endpoint de teste
import { sendRemarketingEmail } from '@/lib/email';

await sendRemarketingEmail(
  'seu-email@example.com',
  'Seu Nome',
  'initial'
);
```

---

## 🎨 Componentes Disponíveis

### 1. **EmailHeader**

```tsx
import { EmailHeader } from '../components/EmailHeader';

<EmailHeader title="Título do Email" />
```

**Props:**
- `title`: string - Título principal do email

**Renderiza:**
- Logo "StencilFlow"
- Tagline "A Arte do Estêncil"
- Gradiente emerald → purple
- Título fornecido

---

### 2. **EmailButton**

```tsx
import { EmailButton } from '../components/EmailButton';

<EmailButton href="https://stencilflow.com.br/pricing">
  Ver Planos
</EmailButton>
```

**Props:**
- `href`: string - URL do link
- `children`: ReactNode - Texto do botão

**Estilo:**
- Gradiente emerald → purple
- Shadow com efeito hover
- Border radius 12px
- Padding 18px 48px

---

### 3. **EmailFooter**

```tsx
import { EmailFooter } from '../components/EmailFooter';

<EmailFooter
  unsubscribeEmail="user@example.com"
  appUrl="https://stencilflow.com.br"
/>
```

**Props:**
- `unsubscribeEmail`: string - Email do usuário
- `appUrl`: string - URL base do app

**Renderiza:**
- Logo e tagline
- Links: Site, Ver Planos, Acessar App
- Link de cancelar inscrição

---

### 4. **HighlightBox**

```tsx
import { HighlightBox } from '../components/HighlightBox';

<HighlightBox title="🎨 Recursos Premium">
  <ul>
    <li>Feature 1</li>
    <li>Feature 2</li>
  </ul>
</HighlightBox>
```

**Props:**
- `title`: string - Título do box
- `children`: ReactNode - Conteúdo (pode ser lista, texto, etc)

**Estilo:**
- Gradiente suave emerald/purple
- Border-left verde
- Padding 25px

---

### 5. **Stats**

```tsx
import { Stats } from '../components/Stats';

<Stats
  stats={[
    { number: '2.500+', label: 'Tatuadores' },
    { number: '300 DPI', label: 'Qualidade' },
  ]}
/>
```

**Props:**
- `stats`: Array<{ number: string, label: string }>

**Renderiza:**
- Números grandes com gradiente
- Labels abaixo
- Layout flex (lado a lado)

---

## 🔧 Customização Avançada

### Mudar Cores Globais

Edite os estilos nos componentes:

```tsx
// emails/components/EmailHeader.tsx

<Section
  style={{
    background: 'linear-gradient(135deg, #10b981 0%, #a855f7 100%)',
    //                                    👆 Primary     👆 Secondary
  }}
>
```

### Adicionar Nova Fonte

```tsx
// No template
<Head>
  <style>
    {`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');`}
  </style>
</Head>

<Body style={{ fontFamily: 'Poppins, sans-serif' }}>
```

### Adicionar Imagens

```tsx
import { Img } from '@react-email/components';

<Img
  src="https://stencilflow.com.br/logo.png"
  alt="Logo"
  width="150"
  style={{ margin: '0 auto' }}
/>
```

**IMPORTANTE:** Use URLs absolutas, não caminhos relativos.

---

## 📊 Integração com Resend Dashboard

### Sincronizar Templates com Resend

**Agora você pode salvar os templates React diretamente no Resend Dashboard!**

```bash
cd stencilflow-nextjs
npm run email:sync
```

**O que acontece:**
1. ✅ Renderiza os 3 templates React para HTML
2. ✅ Cria (ou atualiza) no Resend Dashboard
3. ✅ Publica automaticamente
4. ✅ Adiciona variáveis: `{{{userName}}}`, `{{{userEmail}}}`, `{{{appUrl}}}`

**Resultado:**
```
✅ Templates StencilFlow no Resend: 3

1. stencilflow-remarketing-initial
   ID: abc123...
   Status: ✅ Publicado

2. stencilflow-remarketing-reminder
   ID: def456...
   Status: ✅ Publicado

3. stencilflow-remarketing-final
   ID: ghi789...
   Status: ✅ Publicado
```

### Ver no Painel Resend

Acesse: **https://resend.com/templates**

Você verá seus 3 templates com:
- ✅ Preview visual
- ✅ Variáveis configuradas
- ✅ Versões publicadas
- ✅ Histórico de mudanças

### Atualizar Templates

Editou um template React? Re-sincronize:

```bash
# 1. Edite o arquivo
# emails/templates/RemarketingInitial.tsx

# 2. Sincronize novamente
npm run email:sync
```

O script automaticamente **atualiza** os templates existentes (não duplica).

### Deletar Templates (Cuidado!)

Para remover todos os templates StencilFlow do Resend:

```bash
npm run email:sync -- --delete
```

**⚠️ ATENÇÃO:** Não pode ser desfeito!

### Usar Variáveis do Resend

No código dos templates, use a sintaxe do Resend:

```tsx
<Text>
  Olá, {{{userName}}}!
  {/* 👆 Resend substitui na hora do envio */}
</Text>
```

**Variáveis disponíveis:**
- `{{{userName}}}` - Nome do usuário
- `{{{userEmail}}}` - Email do usuário
- `{{{appUrl}}}` - URL do app

---

## 🧪 Testes

### Testar Responsividade

No preview (`npm run email:dev`):
- Clique no ícone de mobile/desktop
- Teste em diferentes larguras
- Veja media queries em ação

### Testar em Clientes de Email

Ferramentas recomendadas:
- **Litmus** (pago) - Testa em Gmail, Outlook, Apple Mail, etc
- **Email on Acid** (pago) - Similar ao Litmus
- **Mailtrap** (gratuito) - Sandbox para testar envios

---

## 🚀 Deploy e Produção

### Variáveis de Ambiente

Certifique-se de ter:

```env
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=StencilFlow <noreply@stencilflow.com>
NEXT_PUBLIC_APP_URL=https://stencilflow.com.br
```

### Build

Os templates React são compilados automaticamente no build:

```bash
npm run build
```

Não precisa fazer nada extra - o Next.js cuida de tudo.

---

## 📝 Checklist de Implementação

- [x] React Email instalado
- [x] Componentes criados (Header, Footer, Button, etc)
- [x] 3 templates de remarketing
- [x] Preview server configurado
- [x] Integração com `sendRemarketingEmail()`
- [ ] Testar preview local (`npm run email:dev`)
- [ ] Enviar email de teste
- [ ] Verificar recebimento em inbox
- [ ] Testar em mobile
- [ ] Verificar taxa de entrega no Resend

---

## 🎯 Próximos Passos

### 1. **Criar mais templates:**
- Welcome email (novo cadastro)
- Payment confirmation
- Subscription canceled
- Usage limit warning (80% do limite)

### 2. **Adicionar tracking:**
- UTM parameters nos links
- Pixel de abertura (Resend faz automaticamente)
- Click tracking

### 3. **A/B Testing:**
- Criar variações de assunto
- Testar CTAs diferentes
- Comparar taxas de conversão

---

## ❓ FAQ

### P: Como atualizar um email que já foi enviado?

**R:** Emails já enviados não podem ser alterados. Mas as próximas pessoas receberão a versão nova automaticamente.

### P: Posso usar imagens do projeto?

**R:** Sim, mas precisam estar em URLs públicas:
- ✅ `https://stencilflow.com.br/logo.png`
- ❌ `/public/logo.png` (não funciona em email)

### P: Como debugar erros de renderização?

**R:**
1. Abra `npm run email:dev`
2. Erros aparecem no console do navegador
3. TypeScript erros aparecem no terminal

### P: Posso usar Tailwind CSS?

**R:** Não diretamente. React Email usa inline styles para máxima compatibilidade com clientes de email.

---

## 🔗 Links Úteis

- [React Email Docs](https://react.email/docs/introduction)
- [Resend Docs](https://resend.com/docs/send-with-react)
- [Lista de Componentes](https://react.email/docs/components/html)
- [Exemplos](https://react.email/examples)

---

**Criado para StencilFlow - Sistema Profissional de Emails** 📧
