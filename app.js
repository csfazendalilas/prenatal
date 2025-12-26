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
// API CALLS (URLSearchParams para evitar CORS preflight)
// ========================================
async function apiCall(params) {
  try {
    const urlParams = new URLSearchParams(params);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      body: urlParams
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
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
// AUTENTICAÇÃO
// ========================================
function showAuthModal(errorMessage) {
  const modal = document.getElementById('auth-modal');
  const errorEl = document.getElementById('auth-error-message');
  if (errorMessage) {
    errorEl.textContent = errorMessage;
  }
  modal.classList.remove('hidden');
}

function hideAuthModal() {
  const modal = document.getElementById('auth-modal');
  modal.classList.add('hidden');
}

function openApiInNewTab() {
  // Abre a API em nova aba para forçar login do Google
  window.open(API_URL + '?action=health', '_blank');
  showToast('Faça login na nova aba e depois clique em "Tentar Novamente"', 'info');
}

function retryAuth() {
  hideAuthModal();
  window.location.reload();
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
    
    // Carregar lista de gestantes automaticamente
    await loadAllGestantes();
    
  } catch (error) {
    console.error('❌ Erro ao inicializar:', error);
    showToast('Atenção: API pode estar offline', 'error');
  }
});

// Função para carregar todas as gestantes
async function loadAllGestantes() {
  const searchResults = document.getElementById('search-results');
  searchResults.innerHTML = '<div class="text-center py-8 text-gray-500">Carregando gestantes...</div>';
  
  try {
    const result = await apiCall({ action: 'listGestantes' });
    
    if (!result.ok) {
      if (result.needsAuth) {
        showAuthModal(result.error);
        searchResults.innerHTML = '<div class="text-center py-8 text-gray-400">Aguardando autenticação...</div>';
        return;
      }
      throw new Error(result.error);
    }
    
    const gestantes = result.data || [];
    
    if (gestantes.length === 0) {
      searchResults.innerHTML = `
        <div class="text-center py-8">
          <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          <p class="text-gray-500 text-lg">Nenhuma gestante cadastrada</p>
          <p class="text-gray-400 text-sm mt-2">Clique em "Cadastrar" para adicionar a primeira gestante</p>
        </div>
      `;
      return;
    }
    
    searchResults.innerHTML = gestantes.map(g => `
      <div class="bg-white border rounded-lg p-4 hover:shadow-md transition cursor-pointer" 
           onclick="selectGestante('${g.id_gestante}')">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-semibold text-lg">${g.nome}</h3>
          <span class="px-2 py-1 text-xs rounded ${
            g.risco === 'ALTO RISCO' 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'
          }">
            ${g.risco || 'Habitual'}
          </span>
        </div>
        <div class="text-sm text-gray-600 space-y-1">
          <p><strong>ID:</strong> ${g.id_gestante}</p>
          ${g.idade ? `<p><strong>Idade:</strong> ${g.idade} anos</p>` : ''}
          ${g.ig_formatada ? `<p><strong>IG:</strong> ${g.ig_formatada}</p>` : ''}
          ${g.trimestre ? `<p><strong>Trimestre:</strong> ${g.trimestre}</p>` : ''}
          ${g.dpp_usg ? `<p><strong>DPP:</strong> ${g.dpp_usg}</p>` : ''}
          ${g.retorno_em ? `<p><strong>Retorno:</strong> ${g.retorno_em}</p>` : ''}
        </div>
      </div>
    `).join('');
    
    console.log(`✅ ${gestantes.length} gestante(s) carregada(s)`);
    
  } catch (error) {
    console.error('Erro ao carregar gestantes:', error);
    searchResults.innerHTML = `
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p class="text-yellow-800">Erro ao carregar gestantes: ${error.message}</p>
      </div>
    `;
  }
}
