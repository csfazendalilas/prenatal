# 🔐 Configurar Autenticação

## Passo 1: Configurar emails autorizados

Abra o arquivo `Code.gs` e edite as linhas 7-15:

```javascript
// Lista de emails autorizados (ou domínio)
// Adicione os emails da equipe aqui
const AUTHORIZED_EMAILS = [
  "seu-email@pmf.gov.br",
  "outro-email@pmf.gov.br"
  // Adicione mais emails conforme necessário
];

// Ou use um domínio autorizado (ex: "@pmf.gov.br")
const AUTHORIZED_DOMAIN = "@pmf.gov.br"; // Deixe vazio "" se quiser usar lista de emails
```

### Opção A: Autorizar por domínio (recomendado)

Se todos da equipe usam o mesmo domínio (ex: `@pmf.gov.br`):

```javascript
const AUTHORIZED_EMAILS = []; // Deixe vazio
const AUTHORIZED_DOMAIN = "@pmf.gov.br"; // Coloque seu domínio
```

### Opção B: Autorizar por lista de emails

Se quer controlar email por email:

```javascript
const AUTHORIZED_EMAILS = [
  "joao.silva@pmf.gov.br",
  "maria.santos@pmf.gov.br",
  "pedro.oliveira@pmf.gov.br"
];
const AUTHORIZED_DOMAIN = ""; // Deixe vazio
```

### Opção C: Combinar ambos

```javascript
const AUTHORIZED_EMAILS = [
  "convidado@outrodominio.com" // Emails específicos fora do domínio
];
const AUTHORIZED_DOMAIN = "@pmf.gov.br"; // Qualquer email do domínio
```

## Passo 2: Fazer push do código

```bash
clasp push
```

## Passo 3: Republicar o Web App

1. Abra o Apps Script: https://script.google.com/home/projects/1VKMEyQ7GZAqpPLrmjCsrJmYFc09IjfOYpn6lyKDFBB68DPSb7NxMRZZF/edit
2. Vá em **Implantar > Gerenciar implantações**
3. Clique no ícone de editar (lápis)
4. **IMPORTANTE**: Altere "Quem tem acesso" para:
   - **"Qualquer pessoa em sua organização"** (se usar domínio)
   - OU **"Qualquer pessoa"** (se usar lista de emails específicos)
5. Clique em **Nova versão**
6. Clique em **Implantar**

## Passo 4: Testar

1. Acesse: https://csfazendalilas.github.io/prenatal/
2. Se não estiver logado, faça login com sua conta Google autorizada
3. Se o email não for autorizado, verá uma mensagem de "Acesso Restrito"

## Como funciona

- O sistema verifica o email do usuário logado via `Session.getActiveUser().getEmail()`
- Se o email terminar com o domínio autorizado OU estiver na lista de emails, o acesso é liberado
- Caso contrário, todas as ações (exceto health check) retornam erro de autenticação

## Troubleshooting

### "Acesso não autorizado"
- Verifique se o email está correto no `Code.gs`
- Verifique se está logado com a conta certa no Google
- Verifique se o Web App está configurado como "Qualquer pessoa em sua organização"

### "Usuário não autenticado"
- O Web App pode estar configurado como "Somente eu"
- Altere para "Qualquer pessoa em sua organização" ou "Qualquer pessoa"

### Não pede login
- O navegador já está logado com uma conta
- Abra em aba anônima ou logout do Google e faça login novamente

