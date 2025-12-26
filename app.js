// ========================================
// ESTADO GLOBAL
// ========================================
let selectedGestante = null;
let currentIGWeeks = 0;

// ========================================
// UTILITÁRIOS
// ========================================
function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transition-opacity z-50';
  
  if (type === 'success') {
    toast.classList.add('bg-green-600', 'text-white');
  } else if (type === 'error') {
    toast.classList.add('bg-red-600', 'text-white');
  } else {
    toast.classList.add('bg-blue-600', 'text-white');
  }
  
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

function formatDateInput(input) {
  let value = input.value.replace(/\D/g, '');
  
  if (value.length >= 2) {
    value = value.substring(0, 2) + '/' + value.substring(2);
  }
  if (value.length >= 5) {
    value = value.substring(0, 5) + '/' + value.substring(5, 9);
  }
  
  input.value = value;
}

function validateDateBR(dateStr) {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateStr.match(regex);
  
  if (!match) return false;
  
  const day = parseInt(match[1]);
  const month = parseInt(match[2]);
  const year = parseInt(match[3]);
  
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  return true;
}

function calculateIGFromDUM(dumStr) {
  if (!dumStr) return null;
  
  const dum = parseDateBR(dumStr);
  if (!dum) return null;
  
  const today = new Date();
  const diffMs = today - dum;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return null;
  
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;
  
  return { weeks, days, totalDays: diffDays };
}

function parseDateBR(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month, day);
}

// ========================================
// AUTENTICAÇÃO
// ========================================
function getToken() {
  return localStorage.getItem('auth_token');
}

function setToken(token) {
  localStorage.setItem('auth_token', token);
}

function clearToken() {
  localStorage.removeItem('auth_token');
}

function isLoggedIn() {
  return !!getToken();
}

async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  
  try {
    const result = await apiCall({ action: 'login', username, password });
    
    if (result.ok) {
      setToken(result.token);
      hideLoginScreen();
      await loadAllGestantes();
      showToast('Login realizado com sucesso!', 'success');
    } else {
      errorEl.textContent = result.error;
      errorEl.classList.remove('hidden');
    }
  } catch (error) {
    errorEl.textContent = 'Erro ao fazer login. Tente novamente.';
    errorEl.classList.remove('hidden');
  }
}

function handleLogout() {
  clearToken();
  showLoginScreen();
  showToast('Logout realizado', 'info');
}

function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
}

function hideLoginScreen() {
  document.getElementById('login-screen').classList.add('hidden');
}

// ========================================
// API CALLS (URLSearchParams para evitar CORS preflight)
// ========================================
async function apiCall(params) {
  try {
    // Adicionar token em todas as requisições (exceto login e health)
    if (params.action !== 'login' && params.action !== 'health') {
      const token = getToken();
      if (token) {
        params.token = token;
      }
    }
    
    const urlParams = new URLSearchParams(params);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      body: urlParams
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Se retornar erro de autenticação, fazer logout
    if (data.needsAuth && params.action !== 'login') {
      clearToken();
      showLoginScreen();
    }
    
    return data;
    
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ========================================
// TABS
// ========================================
function switchTab(tabName) {
  const tabs = ['buscar', 'cadastrar', 'abertura', 'seguimento'];
  tabs.forEach(tab => {
    const btn = document.getElementById(`tab-${tab}`);
    const content = document.getElementById(`content-${tab}`);
    
    if (tab === tabName) {
      btn.className = 'px-6 py-3 tab-active whitespace-nowrap';
      content.classList.remove('hidden');
    } else {
      btn.className = 'px-6 py-3 tab-inactive whitespace-nowrap';
      content.classList.add('hidden');
    }
  });
  
  // Se mudou para consulta sem gestante selecionada, alertar
  if ((tabName === 'abertura' || tabName === 'seguimento') && !selectedGestante) {
    showToast('Selecione uma gestante na aba Buscar primeiro', 'error');
    switchTab('buscar');
  }
}

// ========================================
// BUSCAR GESTANTES
// ========================================
async function searchGestantes() {
  const term = document.getElementById('search-term').value.trim();
  
  if (!term) {
    showToast('Digite um termo para buscar', 'error');
    return;
  }
  
  showLoading();
  
  try {
    const result = await apiCall({
      action: 'searchGestantes',
      term: term
    });
    
    hideLoading();
    
    if (!result.ok) {
      showToast(result.error || 'Erro ao buscar', 'error');
      return;
    }
    
    displaySearchResults(result.data);
    
  } catch (error) {
    hideLoading();
    showToast('Erro de conexão com a API', 'error');
    console.error(error);
  }
}

function displaySearchResults(gestantes) {
  const container = document.getElementById('search-results');
  
  if (!gestantes || gestantes.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhuma gestante encontrada.</p>';
    return;
  }
  
  container.innerHTML = gestantes.map(g => {
    const riscoBadge = g.risco === 'ALTO RISCO' 
      ? '<span class="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">ALTO RISCO</span>'
      : '<span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">HABITUAL</span>';
    
    // Calcular IG
    let igInfo = '';
    if (g.dum) {
      const ig = calculateIGFromDUM(g.dum);
      if (ig) {
        igInfo = `<p class="text-sm font-medium">IG: ${ig.weeks} + ${ig.days} d</p>`;
      }
    }
    
    return `
      <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
        <div class="flex justify-between items-start mb-2">
          <div class="flex-1">
            <h3 class="font-semibold text-lg">${g.nome}</h3>
            <p class="text-sm text-gray-600">${g.id_gestante}</p>
            ${igInfo}
          </div>
          ${riscoBadge}
        </div>
        <div class="text-sm text-gray-700 space-y-1">
          ${g.dn ? `<p>DN: ${g.dn}</p>` : ''}
          ${g.dum ? `<p>DUM: ${g.dum}</p>` : ''}
          ${g.telefone ? `<p>Tel: ${g.telefone}</p>` : ''}
          ${g.observacoes ? `<p class="text-gray-500 italic">${g.observacoes}</p>` : ''}
        </div>
        <div class="mt-3 flex gap-2">
          <button onclick="selectGestante('${g.id_gestante}', 'abertura')" class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition">
            🆕 Abertura
          </button>
          <button onclick="selectGestante('${g.id_gestante}', 'seguimento')" class="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition">
            📋 Seguimento
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function selectGestante(idGestante, tipoConsulta = 'seguimento') {
  showLoading();
  
  try {
    const result = await apiCall({
      action: 'getGestante',
      id: idGestante
    });
    
    hideLoading();
    
    if (!result.ok) {
      showToast(result.error || 'Erro ao carregar gestante', 'error');
      return;
    }
    
    selectedGestante = result.data;
    
    // Calcular IG
    let ig = null;
    if (selectedGestante.dum) {
      ig = calculateIGFromDUM(selectedGestante.dum);
      if (ig) {
        currentIGWeeks = ig.weeks;
      }
    }
    
    // Preencher resumo
    const resumoDiv = document.getElementById(`resumo-gestante-${tipoConsulta}`);
    const resumoContent = document.getElementById(`resumo-content-${tipoConsulta}`);
    
    resumoContent.innerHTML = `
      <p><strong>Nome:</strong> ${selectedGestante.nome}</p>
      <p><strong>ID:</strong> ${selectedGestante.id_gestante}</p>
      ${selectedGestante.dn ? `<p><strong>DN:</strong> ${selectedGestante.dn}</p>` : ''}
      ${selectedGestante.dum ? `<p><strong>DUM:</strong> ${selectedGestante.dum}</p>` : ''}
      ${ig ? `<p><strong>IG:</strong> ${ig.weeks} + ${ig.days} d</p>` : ''}
      ${selectedGestante.risco ? `<p><strong>Risco:</strong> ${selectedGestante.risco}</p>` : ''}
    `;
    
    resumoDiv.classList.remove('hidden');
    
    // Preencher campo hidden
    document.getElementById(`${tipoConsulta}-id-gestante`).value = selectedGestante.id_gestante;
    
    // Preencher data da consulta com hoje
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    document.querySelector(`#form-${tipoConsulta} input[name="data_consulta"]`).value = todayStr;
    
    // Carregar orientações e pendências
    await loadOrientacoes(tipoConsulta);
    await loadPendencias(tipoConsulta);
    
    showToast('Gestante selecionada!', 'success');
    switchTab(tipoConsulta);
    
  } catch (error) {
    hideLoading();
    showToast('Erro de conexão com a API', 'error');
    console.error(error);
  }
}

// ========================================
// ORIENTAÇÕES POR IG
// ========================================
async function loadOrientacoes(tipoConsulta) {
  if (!selectedGestante || !currentIGWeeks) return;
  
  const tipoProfissional = document.querySelector(`#form-${tipoConsulta} select[name="tipo_profissional"]`)?.value || 'AMBOS';
  
  try {
    const result = await apiCall({
      action: 'getOrientacoesPorIG',
      ig_weeks: currentIGWeeks,
      tipo_consulta: tipoConsulta === 'abertura' ? 'ABERTURA' : 'SEGUIMENTO',
      profissional: tipoProfissional
    });
    
    if (result.ok && result.data) {
      displayOrientacoes(tipoConsulta, result.data);
    }
  } catch (error) {
    console.error('Erro ao carregar orientações:', error);
  }
}

function displayOrientacoes(tipoConsulta, orientacoes) {
  const container = document.getElementById(`checklist-content${tipoConsulta === 'abertura' ? '' : '-seguimento'}`);
  const divOrientacoes = document.getElementById(`orientacoes-${tipoConsulta}`);
  
  if (!container || !divOrientacoes) return;
  
  let html = '';
  
  // Checklist
  if (orientacoes.checklist && orientacoes.checklist.length > 0) {
    html += '<div class="mb-3"><strong class="text-yellow-900">Checklist:</strong><ul class="list-disc list-inside mt-1 space-y-1">';
    orientacoes.checklist.forEach(item => {
      html += `<li>${item.item}</li>`;
    });
    html += '</ul></div>';
  }
  
  // Orientações
  if (orientacoes.orientacoes && orientacoes.orientacoes.length > 0) {
    html += '<div><strong class="text-yellow-900">Orientações:</strong><ul class="list-disc list-inside mt-1 space-y-1">';
    orientacoes.orientacoes.forEach(orient => {
      html += `<li>${orient.texto}</li>`;
    });
    html += '</ul></div>';
  }
  
  if (html) {
    container.innerHTML = html;
    divOrientacoes.classList.remove('hidden');
  } else {
    divOrientacoes.classList.add('hidden');
  }
}

async function updateOrientacoes() {
  const activeTab = document.querySelector('.tab-active')?.id;
  if (activeTab === 'tab-abertura') {
    await loadOrientacoes('abertura');
  } else if (activeTab === 'tab-seguimento') {
    await loadOrientacoes('seguimento');
  }
}

// ========================================
// PENDÊNCIAS
// ========================================
async function loadPendencias(tipoConsulta) {
  if (!selectedGestante) return;
  
  try {
    const result = await apiCall({
      action: 'getPendencias',
      id: selectedGestante.id_gestante
    });
    
    if (result.ok && result.data) {
      displayPendencias(tipoConsulta, result.data);
    }
  } catch (error) {
    console.error('Erro ao carregar pendências:', error);
  }
}

function displayPendencias(tipoConsulta, pendencias) {
  const container = document.getElementById(`pendencias-content-${tipoConsulta}`);
  const divPendencias = document.getElementById(`pendencias-${tipoConsulta}`);
  
  if (!container || !divPendencias) return;
  
  if (!pendencias || pendencias.length === 0) {
    divPendencias.classList.add('hidden');
    return;
  }
  
  let html = '<ul class="list-disc list-inside space-y-1">';
  pendencias.forEach(pend => {
    const prioridadeBadge = pend.prioridade === 'ALTA' 
      ? '<span class="px-1 py-0.5 bg-red-200 text-red-800 text-xs rounded">ALTA</span>'
      : '<span class="px-1 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded">MÉDIA</span>';
    
    html += `<li class="flex items-center gap-2">${prioridadeBadge} <strong>${pend.tipo}:</strong> ${pend.item}</li>`;
  });
  html += '</ul>';
  
  container.innerHTML = html;
  divPendencias.classList.remove('hidden');
}

// ========================================
// CADASTRAR GESTANTE
// ========================================
document.getElementById('form-cadastro').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  
  // Validar datas
  if (!validateDateBR(data.dn)) {
    showToast('Data de nascimento inválida (use dd/MM/aaaa)', 'error');
    return;
  }
  
  if (!validateDateBR(data.dum)) {
    showToast('DUM inválida (use dd/MM/aaaa)', 'error');
    return;
  }
  
  if (data.dpp_usg && !validateDateBR(data.dpp_usg)) {
    showToast('DPP inválida (use dd/MM/aaaa)', 'error');
    return;
  }
  
  showLoading();
  
  try {
    const params = {
      action: 'createGestante',
      ...data
    };
    
    const result = await apiCall(params);
    
    hideLoading();
    
    if (!result.ok) {
      showToast(result.error || 'Erro ao cadastrar', 'error');
      return;
    }
    
    showToast(`Gestante cadastrada com sucesso! ID: ${result.data.id_gestante}`, 'success');
    e.target.reset();
    
  } catch (error) {
    hideLoading();
    showToast('Erro de conexão com a API', 'error');
    console.error(error);
  }
});

// ========================================
// SALVAR CONSULTA (ABERTURA E SEGUIMENTO)
// ========================================
function setupConsultaForm(formId, tipoConsulta) {
  document.getElementById(formId).addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Validar data
    if (!validateDateBR(data.data_consulta)) {
      showToast('Data da consulta inválida (use dd/MM/aaaa)', 'error');
      return;
    }
    
    if (!data.id_gestante) {
      showToast('Selecione uma gestante primeiro', 'error');
      switchTab('buscar');
      return;
    }
    
    // Processar sorologias (se houver)
    if (tipoConsulta === 'abertura') {
      const sorologias = {
        hiv: data.sorologia_hiv || '',
        hbsag: data.sorologia_hbsag || '',
        hcv: data.sorologia_hcv || '',
        vdrl: data.sorologia_vdrl || ''
      };
      data.sorologias = JSON.stringify(sorologias);
      
      // Processar vacinas
      const vacinas = {
        dtpa: data.vacina_dtpa || '',
        hepatiteB: data.vacina_hepatiteb || '',
        influenza: data.vacina_influenza || ''
      };
      data.vacinas = JSON.stringify(vacinas);
    }
    
    showLoading();
    
    try {
      const params = {
        action: 'saveConsulta',
        ...data
      };
      
      const result = await apiCall(params);
      
      hideLoading();
      
      if (!result.ok) {
        showToast(result.error || 'Erro ao salvar consulta', 'error');
        return;
      }
      
      showToast('Consulta salva com sucesso!', 'success');
      
      // Mostrar texto Celk
      const celkTextarea = document.getElementById(`celk-text-${tipoConsulta}`);
      const celkResult = document.getElementById(`celk-result-${tipoConsulta}`);
      
      if (celkTextarea && celkResult) {
        celkTextarea.value = result.data.note_gerada;
        celkResult.classList.remove('hidden');
        
        // Scroll para o texto
        celkResult.scrollIntoView({ behavior: 'smooth' });
      }
      
    } catch (error) {
      hideLoading();
      showToast('Erro de conexão com a API', 'error');
      console.error(error);
    }
  });
}

// Configurar ambos os formulários
setupConsultaForm('form-abertura', 'abertura');
setupConsultaForm('form-seguimento', 'seguimento');

// ========================================
// COPIAR TEXTO CELK
// ========================================
function copyCelk(tipoConsulta) {
  const textarea = document.getElementById(`celk-text-${tipoConsulta}`);
  if (!textarea) return;
  
  textarea.select();
  document.execCommand('copy');
  
  showToast('Texto copiado para a área de transferência!', 'success');
}

// ========================================
// INICIALIZAÇÃO
// ========================================
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Verificar se API está online
    const healthCheck = await apiCall({ action: 'health' });
    if (healthCheck.ok) {
      console.log('✅ API Online:', healthCheck.message);
    }
    
    // Verificar se está logado
    if (!isLoggedIn()) {
      showLoginScreen();
      return;
    }
    
    // Carregar lista de gestantes automaticamente
    await loadAllGestantes();
    
  } catch (error) {
    console.error('❌ Erro ao inicializar:', error);
    showToast('Atenção: API pode estar offline', 'error');
  }
});

// Variável global para armazenar gestantes
let allGestantes = [];

// Função para carregar todas as gestantes (formato tabela)
async function loadAllGestantes() {
  const tbody = document.getElementById('search-results');
  tbody.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-gray-500">Carregando gestantes...</td></tr>';
  
  try {
    const result = await apiCall({ action: 'listGestantes' });
    
    if (!result.ok) {
      if (result.needsAuth) {
        showLoginScreen();
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-gray-400">Faça login para continuar...</td></tr>';
        return;
      }
      throw new Error(result.error);
    }
    
    allGestantes = result.data || [];
    
    if (allGestantes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-8">
            <p class="text-gray-500 text-lg">Nenhuma gestante cadastrada</p>
            <p class="text-gray-400 text-sm mt-2">Clique em "Cadastrar" para adicionar</p>
          </td>
        </tr>
      `;
      return;
    }
    
    renderMonitoramentoTable();
    console.log(`✅ ${allGestantes.length} gestante(s) carregada(s)`);
    
  } catch (error) {
    console.error('Erro ao carregar gestantes:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-4">
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 inline-block">
            <p class="text-yellow-800">Erro ao carregar gestantes: ${error.message}</p>
          </div>
        </td>
      </tr>
    `;
  }
}

// Renderizar tabela de monitoramento
function renderMonitoramentoTable(gestantes = allGestantes) {
  const tbody = document.getElementById('search-results');
  
  if (!gestantes || gestantes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-gray-400">Nenhuma gestante encontrada</td></tr>';
    return;
  }
  
  tbody.innerHTML = gestantes.map(g => {
    const hoje = new Date();
    const retorno = g.retorno_em ? parseDateBR(g.retorno_em) : null;
    const atrasado = retorno && retorno < hoje;
    
    return `
      <tr class="hover:bg-gray-50 cursor-pointer ${atrasado ? 'bg-red-50' : ''}" onclick="openConsultaForGestante('${g.id_gestante}')">
        <td class="px-3 py-3">${g.ultima_consulta_em || '-'}</td>
        <td class="px-3 py-3 font-medium">${g.nome}</td>
        <td class="px-3 py-3">${g.idade || '-'}</td>
        <td class="px-3 py-3">${g.ig_formatada || '-'}</td>
        <td class="px-3 py-3">
          <span class="px-2 py-1 rounded text-xs ${
            g.trimestre === '1T' ? 'bg-blue-100 text-blue-700' :
            g.trimestre === '2T' ? 'bg-green-100 text-green-700' :
            g.trimestre === '3T' ? 'bg-purple-100 text-purple-700' : ''
          }">${g.trimestre || '-'}</span>
        </td>
        <td class="px-3 py-3">${g.dpp_usg || '-'}</td>
        <td class="px-3 py-3">
          <span class="px-2 py-1 rounded text-xs ${
            g.risco === 'ALTO RISCO' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }">${g.risco || 'Habitual'}</span>
        </td>
        <td class="px-3 py-3 ${atrasado ? 'text-red-600 font-semibold' : ''}">
          ${g.retorno_em || '-'}
          ${atrasado ? '<br><span class="text-xs">⚠️ ATRASADO</span>' : ''}
        </td>
        <td class="px-3 py-3">${g.ultimo_atendimento_por || '-'}</td>
        <td class="px-3 py-3">
          <div class="flex gap-1">
            <button 
              onclick="event.stopPropagation(); openConsultaForGestante('${g.id_gestante}')" 
              class="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
              title="Nova Consulta"
            >
              🩺
            </button>
            <button 
              onclick="event.stopPropagation(); editGestante('${g.id_gestante}')" 
              class="px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs"
              title="Editar Dados"
            >
              ✏️
            </button>
            <button 
              onclick="event.stopPropagation(); deleteGestanteConfirm('${g.id_gestante}', '${g.nome}')" 
              class="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
              title="Deletar"
            >
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Filtrar tabela
function filterMonitoramento() {
  const term = document.getElementById('search-term').value.toLowerCase();
  const filtered = allGestantes.filter(g => 
    g.nome.toLowerCase().includes(term) || 
    g.id_gestante.toLowerCase().includes(term)
  );
  renderMonitoramentoTable(filtered);
}

// Ordenar tabela
function sortMonitoramento() {
  const order = document.getElementById('sort-order').value;
  const sorted = [...allGestantes].sort((a, b) => {
    if (order === 'nome') return a.nome.localeCompare(b.nome);
    if (order === 'ig') return (b.ig_dum_num || 0) - (a.ig_dum_num || 0);
    if (order === 'ultima_consulta') {
      const dateA = a.ultima_consulta_em ? parseDateBR(a.ultima_consulta_em) : new Date(0);
      const dateB = b.ultima_consulta_em ? parseDateBR(b.ultima_consulta_em) : new Date(0);
      return dateB - dateA;
    }
    if (order === 'retorno') {
      const dateA = a.retorno_em ? parseDateBR(a.retorno_em) : new Date(9999, 11, 31);
      const dateB = b.retorno_em ? parseDateBR(b.retorno_em) : new Date(9999, 11, 31);
      return dateA - dateB;
    }
    return 0;
  });
  renderMonitoramentoTable(sorted);
}

// Abrir consulta para uma gestante específica
async function openConsultaForGestante(idGestante) {
  try {
    const result = await apiCall({ action: 'getGestante', id: idGestante });
    if (result.ok) {
      currentGestante = result.data;
      switchTab('seguimento');
      fillConsultaWithGestanteData();
    }
  } catch (error) {
    showToast('Erro ao carregar dados da gestante', 'error');
  }
}

// Editar gestante
async function editGestante(idGestante) {
  try {
    showLoading();
    const result = await apiCall({ action: 'getGestante', id: idGestante });
    hideLoading();
    
    if (result.ok) {
      const g = result.data;
      document.getElementById('edit-id-gestante').value = g.id_gestante;
      document.getElementById('edit-nome').value = g.nome || '';
      document.getElementById('edit-dn').value = g.dn || '';
      document.getElementById('edit-telefone').value = g.telefone || '';
      document.getElementById('edit-dum').value = g.dum || '';
      document.getElementById('edit-dpp-usg').value = g.dpp_usg || '';
      document.getElementById('edit-risco').value = g.risco || 'HABITUAL';
      document.getElementById('edit-observacoes').value = g.observacoes || '';
      
      document.getElementById('edit-modal').classList.remove('hidden');
    }
  } catch (error) {
    hideLoading();
    showToast('Erro ao carregar dados da gestante', 'error');
  }
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
}

async function submitEditGestante(event) {
  event.preventDefault();
  
  const id = document.getElementById('edit-id-gestante').value;
  const data = {
    action: 'updateGestante',
    id: id,
    nome: document.getElementById('edit-nome').value,
    dn: document.getElementById('edit-dn').value,
    telefone: document.getElementById('edit-telefone').value,
    dum: document.getElementById('edit-dum').value,
    dpp_usg: document.getElementById('edit-dpp-usg').value,
    risco: document.getElementById('edit-risco').value,
    observacoes: document.getElementById('edit-observacoes').value
  };
  
  try {
    showLoading();
    const result = await apiCall(data);
    hideLoading();
    
    if (result.ok) {
      showToast('Dados atualizados com sucesso!', 'success');
      closeEditModal();
      await loadAllGestantes(); // Recarregar lista
    } else {
      showToast(result.error || 'Erro ao atualizar', 'error');
    }
  } catch (error) {
    hideLoading();
    showToast('Erro ao atualizar dados', 'error');
  }
}

// Deletar gestante com confirmação
async function deleteGestanteConfirm(idGestante, nome) {
  if (!confirm(`⚠️ ATENÇÃO!\n\nTem certeza que deseja DELETAR a gestante:\n\n"${nome}" (${idGestante})?\n\nEsta ação irá:\n- Remover a gestante\n- Deletar TODAS as consultas\n- Remover do monitoramento\n\nEsta ação NÃO PODE ser desfeita!`)) {
    return;
  }
  
  try {
    showLoading();
    const result = await apiCall({ action: 'deleteGestante', id: idGestante });
    hideLoading();
    
    if (result.ok) {
      showToast('Gestante deletada com sucesso', 'success');
      await loadAllGestantes(); // Recarregar lista
    } else {
      showToast(result.error || 'Erro ao deletar', 'error');
    }
  } catch (error) {
    hideLoading();
    showToast('Erro ao deletar gestante', 'error');
  }
}
