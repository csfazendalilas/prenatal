# 🚀 Configurar GitHub Pages

## Passo a Passo

### 1. Ativar GitHub Pages

1. Acesse: https://github.com/csfazendalilas/prenatal/settings/pages
2. Em **Source**, selecione:
   - **Branch**: `main`
   - **Folder**: `/ (root)` ⚠️ **IMPORTANTE: Selecione a raiz (root)**
3. Clique em **Save**

### 2. Aguardar Deploy

- Aguarde 1-2 minutos
- A URL será: `https://csfazendalilas.github.io/prenatal/`

### 3. Verificar se Funcionou

1. Acesse a URL acima
2. Abra o Console (F12)
3. Deve aparecer: `✅ API Online: API Online`

### 4. Se Não Funcionar

- Verifique se o arquivo `frontend/config.js` tem a URL correta da API
- Verifique se o GitHub Pages está ativo (Settings > Pages)
- Aguarde mais alguns minutos (pode demorar até 10 minutos)

---

## ✅ Pronto!

Depois de configurado, você pode acessar o sistema em:
**https://csfazendalilas.github.io/prenatal/**

---

## 🔄 Atualizações Futuras

Para atualizar o site:
```bash
git add .
git commit -m "Descrição da atualização"
git push
```

O GitHub Pages atualiza automaticamente em 1-2 minutos.

