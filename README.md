# Assistente Pré-Natal - APS

Sistema inteligente de apoio ao pré-natal para Atenção Primária à Saúde, com dois fluxos clínicos distintos, orientações automáticas por IG, pendências inteligentes e geração automática de texto para prontuário.

## 🎯 Objetivo

Automatizar e otimizar o atendimento de pré-natal na APS, reduzindo tempo de preenchimento manual e erros, fornecendo:
- **Dois fluxos clínicos**: Abertura (primeira consulta) e Seguimento (rotina)
- **Orientações automáticas** por Idade Gestacional (IG)
- **Pendências inteligentes** (sorologias, exames, vacinas)
- **Atualização automática** da planilha de monitoramento
- **Geração automática** de texto para prontuário (Celk)

## 🏗️ Arquitetura

- **Backend**: Google Apps Script (Web App)
- **Banco de Dados**: Google Sheets (5 abas)
- **Frontend**: GitHub Pages (HTML + Tailwind + JS)
- **API**: URLSearchParams (sem preflight CORS)

## 📋 Funcionalidades Principais

### A) Dois Fluxos Clínicos

#### 1. Abertura de Pré-Natal (Primeira Consulta)
- Planejamento/desejo da gestação
- Primigesta/multigesta
- Histórico obstétrico básico
- Vacinas (status)
- Uso de ácido fólico
- Sinais de alerta iniciais
- Exames já feitos: beta-hCG, 1º USG
- Sorologias (HIV, HBsAg, HCV, VDRL)
- Vacinas (dTpa, Hepatite B, Influenza)

#### 2. Consulta de Seguimento (Rotina)
- Queixas/intercorrências
- Sinais de alerta
- Exame físico (PA, peso, AU, BCF, edema)
- Condutas (solicitações, orientações, encaminhamentos)

### B) Dicas e Orientações Automáticas por IG

Ao abrir a tela de consulta, o app mostra automaticamente:
- **Checklist** do que perguntar (por IG e tipo de consulta)
- **Orientações** recomendadas por IG
- Diferenciação para **médico vs enfermeira**

### C) Atualização Automática da Planilha de Monitoramento

Ao salvar qualquer consulta:
- Data do último atendimento
- IG calculada por DUM (e trimestre)
- Nº de consultas total e por profissional (médico/enfermeira)
- Último profissional que atendeu
- Risco (habitual/alto) e motivo se houver
- Pendências resumidas (string curta)
- Retorno sugerido (data) e periodicidade

### D) Geração Automática de Texto para Prontuário (Celk)

Gera automaticamente uma nota/anamnese completa:
- Resumo (IG, DUM, DPP se houver)
- Queixas/intercorrências
- Exame físico
- Avaliação/conduta
- Orientações
- Pendências e plano
- Sorologias e vacinas (se aplicável)

### E) Pendências Inteligentes

O app avisa automaticamente o que está faltando:
- **Sorologias**: HIV, HBsAg, HCV, VDRL (datas e status)
- **Exames** do 1º/2º/3º trimestre (configurável em RegrasPN)
- **Vacinas**: dTpa, Hepatite B, Influenza
- Exibição em formato de checklist com prioridades

### F) Retorno Automático

Calcula retorno padrão:
- **<28 semanas**: MENSAL (28 dias)
- **28 a 36 semanas**: QUINZENAL (14 dias)
- **≥36 semanas**: SEMANAL (7 dias)
- Permite ajuste manual

## 🚀 Setup Completo

### 1. Criar a Planilha Google Sheets

1. Acesse [Google Sheets](https://sheets.google.com)
2. Crie uma nova planilha
3. Renomeie para "Sistema Pré-Natal"
4. Copie o ID da planilha da URL:
   ```
   https://docs.google.com/spreadsheets/d/SEU_SPREADSHEET_ID_AQUI/edit
   ```

### 2. Criar as Abas e Colunas

Crie 5 abas com os seguintes cabeçalhos (linha 1):

#### Aba: **Gestantes**
```
id_gestante | nome | dn | telefone | dum | dpp_usg | risco | observacoes | created_at | updated_at
```

#### Aba: **ConsultasPN**
```
id_consulta | id_gestante | tipo_consulta | data_consulta | profissional | tipo_profissional | pa | peso | au | bcf | edema | queixas | condutas | flags | planejamento_gestacao | primigesta | historico_obstetrico | acido_folico | sinais_alerta | beta_hcg | primeira_usg | sorologias | vacinas | note_gerada
```

**Nota**: As colunas `sorologias` e `vacinas` armazenam JSON stringificado.

#### Aba: **MonitoramentoPN**
```
ultima_consulta_em | ultimo_atendimento_por | ig_formatada | trimestre | periodicidade | nome | dn | idade | observacoes | risco | dum | ig_dum_num | dpp_usg | exames_sorologicos_ok | vacinas_em_dia | monitorada_em | retorno_em | com_a_profissional | id_gestante | total_consultas | consultas_medico | consultas_enfermeira | pendencias
```

#### Aba: **RegrasPN** (Tabela de Conhecimento)

Esta é a **aba mais importante** para personalizar o sistema. Estrutura:

```
tipo | categoria | ig_min | ig_max | conteudo | para
```

**Tipos**:
- `CHECKLIST`: Itens para perguntar/verificar
- `ORIENTACAO`: Orientações a dar à gestante
- `EXAME`: Exames pendentes por trimestre

**Para**:
- `MEDICO`: Apenas para médico
- `ENFERMEIRA`: Apenas para enfermeira
- `AMBOS`: Para ambos

**Exemplos de linhas**:

```
CHECKLIST | Anamnese | 0 | 13 | Verificar uso de ácido fólico | AMBOS
CHECKLIST | Anamnese | 0 | 13 | Investigar planejamento da gestação | MEDICO
ORIENTACAO | Alimentação | 0 | 13 | Orientar sobre alimentação saudável e ganho de peso | AMBOS
ORIENTACAO | Sinais de Alerta | 0 | 40 | Orientar sobre sinais de alerta: sangramento, perda de líquido, dor abdominal | AMBOS
CHECKLIST | Exame Físico | 28 | 40 | Verificar presença de edema | AMBOS
ORIENTACAO | Preparo Parto | 32 | 40 | Orientar sobre preparo para parto e sinais de trabalho de parto | ENFERMEIRA
EXAME | 1T | 0 | 13 | Hemograma completo | AMBOS
EXAME | 1T | 0 | 13 | Glicemia de jejum | AMBOS
EXAME | 2T | 14 | 27 | USG morfológica | AMBOS
EXAME | 3T | 28 | 40 | USG do 3º trimestre | AMBOS
```

**Dica**: Você pode adicionar quantas regras quiser. O sistema filtra automaticamente por IG e tipo de profissional.

#### Aba: **LOG**
```
timestamp | acao | id_gestante | id_consulta | usuario | detalhes
```

### 3. Configurar o Backend (Google Apps Script)

#### Opção A: Com clasp (Recomendado)

1. Instale o clasp globalmente:
```bash
npm install -g @google/clasp
```

2. Faça login no Google:
```bash
clasp login
```

3. Crie um projeto Apps Script vinculado à planilha:
```bash
clasp create --title "PreNatal Backend" --type sheets --rootDir .
```

4. Edite `Code.gs` e configure o `SPREADSHEET_ID`:
```javascript
const SPREADSHEET_ID = "SEU_SPREADSHEET_ID_AQUI";
```

5. Faça push do código:
```bash
clasp push
```

#### Opção B: Manualmente

1. Na planilha, vá em **Extensões > Apps Script**
2. Delete o código padrão
3. Copie todo o conteúdo de `Code.gs` e cole no editor
4. Configure o `SPREADSHEET_ID` no topo do arquivo
5. Salve o projeto (Ctrl+S)

### 4. Publicar o Web App

1. No editor do Apps Script, clique em **Implantar > Nova implantação**
2. Clique em ⚙️ e selecione **Aplicativo da Web**
3. Configure:
   - **Descrição**: "API Pré-Natal v1"
   - **Executar como**: "Eu (seu e-mail)"
   - **Quem tem acesso**: **"Qualquer pessoa em sua organização"**
4. Clique em **Implantar**
5. Copie a **URL da Web App** (termina com `/exec`)
6. Clique em **Autorizar acesso** e permita as autorizações necessárias

### 5. Configurar o Frontend

1. Edite `frontend/config.js` e cole a URL do Web App:
```javascript
const API_URL = "https://script.google.com/macros/s/SEU_DEPLOYMENT_ID/exec";
```

### 6. Publicar no GitHub Pages

1. Crie um repositório no GitHub (pode ser privado)
2. Faça push do código:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/seu-usuario/prenatal-mvp.git
git push -u origin main
```

3. Ative o GitHub Pages:
   - Vá em **Settings > Pages**
   - Em **Source**, selecione a branch `main`
   - Em **Folder**, selecione `/frontend`
   - Clique em **Save**

4. Acesse a URL gerada (algo como `https://seu-usuario.github.io/prenatal-mvp/`)

## 🎯 Como Usar

### 1. Cadastrar Gestante

1. Acesse o sistema
2. Vá na aba **"Cadastrar Gestante"**
3. Preencha todos os campos obrigatórios (*)
4. Use formato `dd/MM/aaaa` para todas as datas
5. Clique em **"Salvar Gestante"**

### 2. Abertura de Pré-Natal

1. Vá na aba **"Buscar Gestante"**
2. Digite o nome ou ID da gestante
3. Clique em **"Buscar"**
4. Clique no botão **"🆕 Abertura"** no card da gestante
5. O sistema mostrará:
   - **Resumo** da gestante
   - **Checklist e orientações** por IG
   - **Pendências** (se houver)
6. Preencha todos os campos da abertura
7. Clique em **"Salvar Abertura de Pré-Natal"**
8. O texto para Celk será gerado automaticamente
9. Clique em **"📋 Copiar Texto"** para usar no prontuário

### 3. Consulta de Seguimento

1. Vá na aba **"Buscar Gestante"**
2. Digite o nome ou ID da gestante
3. Clique em **"Buscar"**
4. Clique no botão **"📋 Seguimento"** no card da gestante
5. O sistema mostrará:
   - **Resumo** da gestante
   - **Checklist e orientações** por IG
   - **Pendências** atualizadas
6. Preencha os dados da consulta
7. Clique em **"Salvar Consulta de Seguimento"**
8. O texto para Celk será gerado automaticamente
9. Clique em **"📋 Copiar Texto"** para usar no prontuário

## 📊 Regras de Negócio

### IDs Automáticos

- **Gestantes**: `PN-000001`, `PN-000002`, etc. (incremental seguro)
- **Consultas**: `C-000001`, `C-000002`, etc.

### Cálculo de IG (Idade Gestacional)

- Baseado na DUM (Data da Última Menstruação)
- Formato: `34 + 1 d` (34 semanas e 1 dia)
- Cálculo em dias: total de dias desde DUM

### Trimestres

- **1º Trimestre**: < 14 semanas
- **2º Trimestre**: 14 a 27 semanas e 6 dias
- **3º Trimestre**: ≥ 28 semanas

### Periodicidade de Retorno

- **MENSAL**: < 28 semanas (retorno em 28 dias)
- **QUINZENAL**: 28 a 36 semanas (retorno em 14 dias)
- **SEMANAL**: ≥ 36 semanas (retorno em 7 dias)
- **CUSTOMIZADO**: Permite ajuste manual

### MonitoramentoPN

- Sistema de **UPSERT**: atualiza se existe, cria se não existe
- Baseado no `id_gestante` (sem duplicatas)
- Atualizado automaticamente após cada consulta
- Conta consultas por profissional (médico/enfermeira)

### Pendências Inteligentes

- Verifica automaticamente sorologias, vacinas e exames
- Prioridades: ALTA ou MÉDIA
- Atualizadas em tempo real conforme consultas são salvas

## 🔒 CORS e Segurança

### Por que URLSearchParams?

Para evitar **preflight CORS**, o frontend envia dados como `application/x-www-form-urlencoded` (URLSearchParams) em vez de JSON.

```javascript
// ✅ Correto (sem preflight)
const params = new URLSearchParams({ action: 'health' });
fetch(API_URL, { method: 'POST', body: params });

// ❌ Evitar (causa preflight)
fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'health' })
});
```

### Resposta do Backend

O backend sempre responde com JSON via `ContentService`:

```javascript
return ContentService
  .createTextOutput(JSON.stringify({ ok: true, data: ... }))
  .setMimeType(ContentService.MimeType.JSON);
```

## 🐛 Troubleshooting

### Erro 403: Permissão Negada

**Causa**: Web App não está configurado corretamente.

**Solução**:
1. Verifique se o deploy está como **"Qualquer pessoa em sua organização"**
2. Se for uso pessoal, mude para **"Qualquer pessoa"** (mas atenção à segurança!)
3. Certifique-se de que autorizou todas as permissões

### Erro: CORS / Network Error

**Causa**: Preflight CORS ou URL incorreta.

**Solução**:
1. Verifique se está usando **URLSearchParams** (não JSON)
2. Confirme que `API_URL` está correto e termina com `/exec`
3. Teste a URL diretamente no navegador (deve retornar erro 405, mas mostra que está online)

### Datas não aparecem / formato errado

**Causa**: Formato de data incompatível.

**Solução**:
1. Use **sempre** formato `dd/MM/aaaa`
2. Verifique se as células no Sheets estão formatadas como **Data** (não Texto)
3. No Apps Script, as datas são objetos `Date` nativos

### Gestante não é encontrada na busca

**Causa**: Dados não foram salvos ou busca está incorreta.

**Solução**:
1. Verifique se a gestante foi realmente salva na aba **Gestantes**
2. Busca é case-insensitive e busca em `id_gestante` e `nome`
3. Verifique se não há espaços extras no nome

### MonitoramentoPN está duplicando

**Causa**: Lógica de UPSERT não está funcionando.

**Solução**:
1. Verifique se o campo `id_gestante` está preenchido corretamente
2. A última coluna da aba **MonitoramentoPN** deve ser `id_gestante`
3. Se duplicou, delete as linhas extras manualmente

### Texto Celk não aparece

**Causa**: Consulta não foi salva ou erro no backend.

**Solução**:
1. Verifique o console do navegador (F12) para erros
2. Confirme que a consulta foi salva na aba **ConsultasPN**
3. Veja a coluna `note_gerada` para confirmar o texto

### Orientações/Checklist não aparecem

**Causa**: Aba RegrasPN não está configurada ou IG não corresponde.

**Solução**:
1. Verifique se a aba **RegrasPN** existe e tem dados
2. Confirme que a estrutura está correta: `tipo | categoria | ig_min | ig_max | conteudo | para`
3. Verifique se a IG da gestante está dentro do range (`ig_min` a `ig_max`)
4. Confirme que o tipo de profissional corresponde (`MEDICO`, `ENFERMEIRA` ou `AMBOS`)

### Pendências não aparecem

**Causa**: Lógica de pendências não está encontrando dados.

**Solução**:
1. Verifique se as sorologias/vacinas estão sendo salvas corretamente (coluna JSON)
2. Confirme que a aba **RegrasPN** tem regras do tipo `EXAME` para o trimestre atual
3. Verifique o console do navegador para erros

### LOG não registra usuário

**Causa**: `Session.getActiveUser().getEmail()` pode falhar em alguns contextos.

**Solução**:
- É esperado! O código usa fallback para `"Sistema"`
- Para registrar corretamente, execute o script como você (não como serviço)

## 🧪 Teste Rápido

1. **Cadastre uma gestante de teste**:
   - Nome: Maria Silva
   - DN: 01/01/1990
   - DUM: 01/06/2024
   - Risco: HABITUAL

2. **Configure a aba RegrasPN** com pelo menos:
   - 2-3 linhas de CHECKLIST
   - 2-3 linhas de ORIENTACAO
   - 1-2 linhas de EXAME

3. **Busque por "Maria"**

4. **Registre uma Abertura**:
   - Data: hoje
   - Profissional: Dr. João
   - Tipo: Médico
   - Preencha alguns campos
   - Salve

5. **Verifique**:
   - Aba **Gestantes**: deve ter ID `PN-000001`
   - Aba **ConsultasPN**: deve ter a consulta com `tipo_consulta = ABERTURA`
   - Aba **MonitoramentoPN**: deve ter 1 linha com dados da Maria
   - Aba **LOG**: deve ter registros de ações
   - Texto Celk deve aparecer

6. **Registre um Seguimento**:
   - Busque novamente
   - Clique em "Seguimento"
   - Preencha e salve
   - Verifique se o monitoramento foi atualizado

## 📝 Personalização da Aba RegrasPN

A aba **RegrasPN** é o coração do sistema. Você pode personalizar completamente:

### Estrutura

| Coluna | Descrição | Exemplo |
|--------|-----------|---------|
| `tipo` | Tipo da regra | `CHECKLIST`, `ORIENTACAO`, `EXAME` |
| `categoria` | Categoria/agrupamento | `Anamnese`, `Alimentação`, `1T` |
| `ig_min` | IG mínima (semanas) | `0`, `14`, `28` |
| `ig_max` | IG máxima (semanas) | `13`, `27`, `40` |
| `conteudo` | Texto da regra | `Verificar uso de ácido fólico` |
| `para` | Profissional | `MEDICO`, `ENFERMEIRA`, `AMBOS` |

### Exemplos Práticos

**Checklist para 1º Trimestre (médico)**:
```
CHECKLIST | Anamnese | 0 | 13 | Verificar uso de ácido fólico | MEDICO
CHECKLIST | Anamnese | 0 | 13 | Investigar planejamento da gestação | MEDICO
CHECKLIST | Exame | 0 | 13 | Verificar pressão arterial | AMBOS
```

**Orientações para 3º Trimestre (enfermeira)**:
```
ORIENTACAO | Preparo Parto | 32 | 40 | Orientar sobre preparo para parto | ENFERMEIRA
ORIENTACAO | Sinais de Alerta | 32 | 40 | Reforçar sinais de alerta e quando procurar UBS | ENFERMEIRA
```

**Exames por Trimestre**:
```
EXAME | 1T | 0 | 13 | Hemograma completo | AMBOS
EXAME | 1T | 0 | 13 | Glicemia de jejum | AMBOS
EXAME | 2T | 14 | 27 | USG morfológica | AMBOS
EXAME | 3T | 28 | 40 | USG do 3º trimestre | AMBOS
```

## 🚀 Próximos Passos (Roadmap)

- [ ] Autenticação de usuários
- [ ] Edição de gestantes existentes
- [ ] Histórico de consultas por gestante
- [ ] Dashboard com métricas (total de gestantes, consultas por mês, etc.)
- [ ] Exportação de relatórios
- [ ] Notificações de retorno via WhatsApp/SMS
- [ ] Integração com exames laboratoriais
- [ ] Sistema de vacinas mais detalhado
- [ ] Gráficos de evolução (peso, PA, AU)

## 📄 Licença

Este projeto é de uso interno educacional/organizacional.

## 👨‍💻 Suporte

Em caso de dúvidas ou problemas:
1. Verifique o console do navegador (F12)
2. Verifique o log de execuções no Apps Script
3. Confira a aba **LOG** da planilha
4. Revise este README
5. Verifique a aba **RegrasPN** (pode estar faltando configuração)

---

**Desenvolvido com ❤️ para otimizar o atendimento pré-natal na APS**
