# 🚀 Passo a Passo - Upload e Teste

## ✅ IDs Confirmados

- **SPREADSHEET_ID**: `1D4zN9rcF4-XO-5VT76D7IHjxXCe4x3Gmb2D_MCEuPp0` ✅
- **API_URL**: `https://script.google.com/macros/s/AKfycbyRKZwWzCDKEZuxzYt8Sw63CxYAJhNeigRw0QGlh-W8TQzAp16UdORo-kjkK7kzoIat/exec` ✅

---

## 📤 OPÇÃO 1: Upload Manual (Mais Simples)

### Passo 1: Abrir a Planilha
1. Acesse: https://docs.google.com/spreadsheets/d/1D4zN9rcF4-XO-5VT76D7IHjxXCe4x3Gmb2D_MCEuPp0/edit
2. Certifique-se de que você tem permissão de edição

### Passo 2: Abrir Apps Script
1. Na planilha, clique em **Extensões** (menu superior)
2. Clique em **Apps Script**
3. Uma nova aba abrirá com o editor

### Passo 3: Limpar e Colar o Código
1. **Delete TODO** o código que está lá (se houver)
2. Abra o arquivo `Code.gs` do seu projeto
3. **Copie TODO** o conteúdo (Ctrl+A, Ctrl+C)
4. **Cole** no editor do Apps Script (Ctrl+V)
5. Clique em **Salvar** (💾 ou Ctrl+S)

### Passo 4: Executar Setup
1. No menu superior do editor, clique em **Executar** ▶️
2. Selecione a função `setupSpreadsheet`
3. Clique em **Executar**
4. Na primeira vez, vai pedir autorização:
   - Clique em **Revisar permissões**
   - Escolha sua conta Google
   - Clique em **Avançado** > **Ir para [nome do projeto] (não seguro)**
   - Clique em **Permitir**
5. Aguarde a execução terminar
6. Volte para a planilha e verifique:
   - ✅ Abas criadas (Gestantes, ConsultasPN, MonitoramentoPN, LOG, RegrasPN)
   - ✅ Cabeçalhos na linha 1
   - ✅ Formatações aplicadas

### Passo 5: Publicar como Web App
1. No editor Apps Script, clique em **Implantar** > **Nova implantação**
2. Clique no ícone ⚙️ ao lado de "Selecionar tipo"
3. Escolha **Aplicativo da Web**
4. Configure:
   - **Descrição**: "API Pré-Natal v1"
   - **Executar como**: "Eu (seu e-mail)"
   - **Quem tem acesso**: **"Qualquer pessoa em sua organização"**
5. Clique em **Implantar**
6. **COPIE A URL** que aparece (algo como: `https://script.google.com/macros/s/.../exec`)
7. Se pedir autorização novamente, permita

### Passo 6: Atualizar Frontend
1. Abra o arquivo `frontend/config.js`
2. Cole a URL que você copiou no passo anterior:
   ```javascript
   const API_URL = "COLE_A_URL_AQUI";
   ```
3. Salve o arquivo

---

## 📤 OPÇÃO 2: Upload com clasp (Avançado)

### Pré-requisitos
```bash
npm install -g @google/clasp
clasp login
```

### Passos
```bash
# 1. Navegar até a pasta do projeto
cd C:\Users\05251902956\Documents\prenatal-mvp

# 2. Criar projeto Apps Script vinculado à planilha
clasp create --title "PreNatal Backend" --type sheets --rootDir .

# 3. Fazer push do código
clasp push

# 4. Abrir no editor web
clasp open
```

Depois siga os **Passos 4, 5 e 6** da Opção 1.

---

## 🧪 Como Testar

### Teste 1: Verificar Setup da Planilha
1. Abra a planilha: https://docs.google.com/spreadsheets/d/1D4zN9rcF4-XO-5VT76D7IHjxXCe4x3Gmb2D_MCEuPp0/edit
2. Verifique:
   - ✅ 5 abas existem (Gestantes, ConsultasPN, MonitoramentoPN, LOG, RegrasPN)
   - ✅ Aba RegrasPN tem dados (linha 2 em diante)
   - ✅ Cabeçalhos na linha 1 de cada aba
   - ✅ Primeira linha congelada (freeze)

### Teste 2: Testar API (Health Check)
1. Abra o navegador
2. Cole a URL da API no navegador:
   ```
   https://script.google.com/macros/s/SEU_ID_AQUI/exec?action=health
   ```
3. Deve retornar: `{"ok":true,"message":"API Online"}`

### Teste 3: Testar pelo Frontend
1. Abra o arquivo `frontend/index.html` no navegador
   - Ou publique no GitHub Pages
   - Ou use um servidor local (Live Server no VS Code)
2. Abra o Console do navegador (F12)
3. Deve aparecer: `✅ API Online: API Online`
4. Se aparecer erro, verifique:
   - URL no `config.js` está correta?
   - Web App está publicado?
   - Permissões estão corretas?

### Teste 4: Testar Cadastro de Gestante
1. No frontend, vá na aba **"Cadastrar Gestante"**
2. Preencha:
   - Nome: Maria Silva
   - DN: 01/01/1990
   - DUM: 01/06/2024
   - Risco: HABITUAL
3. Clique em **"Salvar Gestante"**
4. Verifique na planilha (aba Gestantes):
   - ✅ Nova linha com ID `PN-000001`
   - ✅ Dados preenchidos corretamente

### Teste 5: Testar Busca
1. No frontend, vá na aba **"Buscar Gestante"**
2. Digite: "Maria"
3. Clique em **"Buscar"**
4. Deve aparecer o card da Maria Silva

### Teste 6: Testar Abertura de Pré-Natal
1. Após buscar "Maria", clique em **"🆕 Abertura"**
2. Preencha alguns campos
3. Clique em **"Salvar Abertura de Pré-Natal"**
4. Verifique:
   - ✅ Consulta salva na aba ConsultasPN
   - ✅ MonitoramentoPN atualizado
   - ✅ Texto Celk gerado

---

## 🔍 Troubleshooting Rápido

### Erro: "Não autorizado" ou 403
- Verifique se o Web App está como **"Qualquer pessoa em sua organização"**
- Refaça o deploy

### Erro: "CORS" ou "Network Error"
- Verifique se a URL no `config.js` está correta
- Teste a URL diretamente no navegador (deve retornar JSON)

### Erro: "Função não encontrada"
- Verifique se o `Code.gs` foi salvo completamente
- Recarregue a página do Apps Script

### Planilha não tem as abas
- Execute `setupSpreadsheet()` novamente no Apps Script

### API não responde
- Verifique se o Web App está publicado
- Verifique se a URL termina com `/exec`
- Teste com `?action=health` no final da URL

---

## ✅ Checklist Final

- [ ] Código `Code.gs` colado no Apps Script
- [ ] Função `setupSpreadsheet()` executada com sucesso
- [ ] Web App publicado e URL copiada
- [ ] URL atualizada no `frontend/config.js`
- [ ] Teste de health check funcionando
- [ ] Frontend consegue buscar gestantes
- [ ] Cadastro de gestante funcionando

---

**Dica**: Se algo der errado, me avise qual passo falhou e qual erro apareceu! 🚀

