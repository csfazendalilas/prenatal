// ========================================
// CONFIGURAÇÃO
// ========================================
const SPREADSHEET_ID = "1D4zN9rcF4-XO-5VT76D7IHjxXCe4x3Gmb2D_MCEuPp0";

// ========================================
// UTILITÁRIOS DE DATA
// ========================================
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

function formatDateBR(date) {
  if (!date || !(date instanceof Date)) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function calculateIG(dum) {
  if (!dum || !(dum instanceof Date)) return null;
  const today = new Date();
  const diffMs = today - dum;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return null;
  
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;
  
  return {
    weeks: weeks,
    days: days,
    formatted: `${weeks} + ${days} d`,
    totalDays: diffDays
  };
}

function calculateTrimester(igWeeks) {
  if (igWeeks < 14) return '1T';
  if (igWeeks <= 27) return '2T';
  return '3T';
}

function calculateRetorno(igWeeks, diasCustom = null) {
  if (diasCustom !== null && diasCustom !== '') {
    return { days: parseInt(diasCustom), description: 'CUSTOMIZADO' };
  }
  
  if (igWeeks < 28) {
    return { days: 28, description: 'MENSAL' };
  } else if (igWeeks < 36) {
    return { days: 14, description: 'QUINZENAL' };
  } else {
    return { days: 7, description: 'SEMANAL' };
  }
}

function calcularIdade(dnStr) {
  if (!dnStr) return '';
  const dn = typeof dnStr === 'string' ? parseDateBR(dnStr) : dnStr;
  if (!dn) return '';
  
  const hoje = new Date();
  let idade = hoje.getFullYear() - dn.getFullYear();
  const m = hoje.getMonth() - dn.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < dn.getDate())) {
    idade--;
  }
  return idade;
}

// ========================================
// ACESSO ÀS ABAS
// ========================================
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(sheetName);
}

// ========================================
// REGRASPN - TABELA DE CONHECIMENTO
// ========================================
function getRegrasPN() {
  const sheet = getSheet('RegrasPN');
  if (!sheet) return {};
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const regras = {};
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const tipo = row[0];
    const categoria = row[1];
    const igMin = row[2] || 0;
    const igMax = row[3] || 999;
    const conteudo = row[4] || '';
    const para = row[5] || 'AMBOS'; // MEDICO, ENFERMEIRA, AMBOS
    
    if (!regras[tipo]) regras[tipo] = {};
    if (!regras[tipo][categoria]) regras[tipo][categoria] = [];
    
    regras[tipo][categoria].push({
      igMin: igMin,
      igMax: igMax,
      conteudo: conteudo,
      para: para
    });
  }
  
  return regras;
}

function getOrientacoesPorIG(igWeeks, tipoConsulta, profissional) {
  const regras = getRegrasPN();
  const orientacoes = {
    checklist: [],
    orientacoes: [],
    pendencias: []
  };
  
  // Buscar orientações do tipo CHECKLIST
  if (regras.CHECKLIST) {
    Object.keys(regras.CHECKLIST).forEach(cat => {
      regras.CHECKLIST[cat].forEach(regra => {
        if (igWeeks >= regra.igMin && igWeeks <= regra.igMax) {
          if (regra.para === 'AMBOS' || regra.para === profissional) {
            orientacoes.checklist.push({
              categoria: cat,
              item: regra.conteudo
            });
          }
        }
      });
    });
  }
  
  // Buscar orientações do tipo ORIENTACAO
  if (regras.ORIENTACAO) {
    Object.keys(regras.ORIENTACAO).forEach(cat => {
      regras.ORIENTACAO[cat].forEach(regra => {
        if (igWeeks >= regra.igMin && igWeeks <= regra.igMax) {
          if (regra.para === 'AMBOS' || regra.para === profissional) {
            orientacoes.orientacoes.push({
              categoria: cat,
              texto: regra.conteudo
            });
          }
        }
      });
    });
  }
  
  return orientacoes;
}

// ========================================
// LOG
// ========================================
function logAction(acao, idGestante = '', idConsulta = '', detalhes = '') {
  try {
    const sheet = getSheet('LOG');
    if (!sheet) return;
    
    let usuario = '';
    try {
      usuario = Session.getActiveUser().getEmail();
    } catch (e) {
      usuario = 'Sistema';
    }
    
    sheet.appendRow([
      new Date(),
      acao,
      idGestante,
      idConsulta,
      usuario,
      detalhes
    ]);
  } catch (e) {
    console.error('Erro ao registrar log:', e);
  }
}

// ========================================
// GESTANTES
// ========================================
function generateNextGestanteId() {
  const sheet = getSheet('Gestantes');
  const data = sheet.getDataRange().getValues();
  
  let maxNum = 0;
  for (let i = 1; i < data.length; i++) {
    const id = data[i][0];
    if (id && typeof id === 'string' && id.startsWith('PN-')) {
      const num = parseInt(id.replace('PN-', ''));
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  
  const nextNum = maxNum + 1;
  return 'PN-' + String(nextNum).padStart(6, '0');
}

function searchGestantes(term) {
  const sheet = getSheet('Gestantes');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const results = [];
  const searchLower = term.toLowerCase();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const idGestante = row[0];
    const nome = row[1];
    
    if (!idGestante) continue;
    
    if (idGestante.toLowerCase().includes(searchLower) || 
        (nome && nome.toLowerCase().includes(searchLower))) {
      
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = row[idx];
      });
      
      // Formatar datas
      if (obj.dum instanceof Date) obj.dum = formatDateBR(obj.dum);
      if (obj.dpp_usg instanceof Date) obj.dpp_usg = formatDateBR(obj.dpp_usg);
      if (obj.created_at instanceof Date) obj.created_at = obj.created_at.toISOString();
      if (obj.updated_at instanceof Date) obj.updated_at = obj.updated_at.toISOString();
      
      results.push(obj);
    }
  }
  
  return results;
}

function getGestante(idGestante) {
  const sheet = getSheet('Gestantes');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === idGestante) {
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = row[idx];
      });
      
      // Formatar datas
      if (obj.dum instanceof Date) obj.dum = formatDateBR(obj.dum);
      if (obj.dpp_usg instanceof Date) obj.dpp_usg = formatDateBR(obj.dpp_usg);
      if (obj.created_at instanceof Date) obj.created_at = obj.created_at.toISOString();
      if (obj.updated_at instanceof Date) obj.updated_at = obj.updated_at.toISOString();
      
      return obj;
    }
  }
  
  return null;
}

function createGestante(payload) {
  const sheet = getSheet('Gestantes');
  
  const idGestante = generateNextGestanteId();
  const nome = payload.nome || '';
  const dn = parseDateBR(payload.dn);
  const telefone = payload.telefone || '';
  const dum = parseDateBR(payload.dum);
  const dppUsg = parseDateBR(payload.dpp_usg);
  const risco = payload.risco || 'HABITUAL';
  const observacoes = payload.observacoes || '';
  const now = new Date();
  
  sheet.appendRow([
    idGestante,
    nome,
    dn,
    telefone,
    dum,
    dppUsg,
    risco,
    observacoes,
    now,
    now
  ]);
  
  logAction('CREATE_GESTANTE', idGestante, '', `Nome: ${nome}`);
  
  return {
    id_gestante: idGestante,
    nome: nome,
    dn: formatDateBR(dn),
    telefone: telefone,
    dum: formatDateBR(dum),
    dpp_usg: formatDateBR(dppUsg),
    risco: risco,
    observacoes: observacoes
  };
}

// ========================================
// CONSULTAS
// ========================================
function generateConsultaId() {
  const sheet = getSheet('ConsultasPN');
  const lastRow = sheet.getLastRow();
  return 'C-' + String(lastRow).padStart(6, '0');
}

function getConsultasPorGestante(idGestante) {
  const sheet = getSheet('ConsultasPN');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const consultas = [];
  const idGestanteIdx = headers.indexOf('id_gestante');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idGestanteIdx] === idGestante) {
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = data[i][idx];
      });
      if (obj.data_consulta instanceof Date) {
        obj.data_consulta = formatDateBR(obj.data_consulta);
      }
      consultas.push(obj);
    }
  }
  
  return consultas;
}

function saveConsulta(payload) {
  const sheet = getSheet('ConsultasPN');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const idConsulta = generateConsultaId();
  const idGestante = payload.id_gestante;
  const tipoConsulta = payload.tipo_consulta || 'SEGUIMENTO'; // ABERTURA ou SEGUIMENTO
  const dataConsulta = parseDateBR(payload.data_consulta) || new Date();
  const profissional = payload.profissional || '';
  const tipoProfissional = payload.tipo_profissional || 'AMBOS'; // MEDICO ou ENFERMEIRA
  
  // Dados básicos
  const pa = payload.pa || '';
  const peso = payload.peso || '';
  const au = payload.au || '';
  const bcf = payload.bcf || '';
  const edema = payload.edema || '';
  const queixas = payload.queixas || '';
  const condutas = payload.condutas || '';
  const flags = payload.flags || '';
  
  // Dados específicos de ABERTURA
  const planejamentoGestacao = payload.planejamento_gestacao || '';
  const primigesta = payload.primigesta || '';
  const historicoObstetrico = payload.historico_obstetrico || '';
  const acidoFolico = payload.acido_folico || '';
  const sinaisAlerta = payload.sinais_alerta || '';
  const betaHCG = payload.beta_hcg || '';
  const primeiraUSG = payload.primeira_usg || '';
  
  // Sorologias (podem vir como JSON string ou objeto)
  let sorologias = {};
  if (payload.sorologias) {
    try {
      sorologias = typeof payload.sorologias === 'string' ? JSON.parse(payload.sorologias) : payload.sorologias;
    } catch (e) {
      sorologias = {};
    }
  }
  
  // Vacinas (podem vir como JSON string ou objeto)
  let vacinas = {};
  if (payload.vacinas) {
    try {
      vacinas = typeof payload.vacinas === 'string' ? JSON.parse(payload.vacinas) : payload.vacinas;
    } catch (e) {
      vacinas = {};
    }
  }
  
  // Construir linha baseada nos headers
  const rowData = new Array(headers.length).fill('');
  
  const headerMap = {
    'id_consulta': idConsulta,
    'id_gestante': idGestante,
    'tipo_consulta': tipoConsulta,
    'data_consulta': dataConsulta,
    'profissional': profissional,
    'tipo_profissional': tipoProfissional,
    'pa': pa,
    'peso': peso,
    'au': au,
    'bcf': bcf,
    'edema': edema,
    'queixas': queixas,
    'condutas': condutas,
    'flags': flags,
    'planejamento_gestacao': planejamentoGestacao,
    'primigesta': primigesta,
    'historico_obstetrico': historicoObstetrico,
    'acido_folico': acidoFolico,
    'sinais_alerta': sinaisAlerta,
    'beta_hcg': betaHCG,
    'primeira_usg': primeiraUSG,
    'sorologias': JSON.stringify(sorologias),
    'vacinas': JSON.stringify(vacinas)
  };
  
  headers.forEach((header, idx) => {
    if (headerMap.hasOwnProperty(header)) {
      rowData[idx] = headerMap[header];
    }
  });
  
  sheet.appendRow(rowData);
  
  // Gerar nota
  const gestante = getGestante(idGestante);
  const noteGerada = generateNoteCelk(gestante, payload, tipoConsulta);
  
  // Adicionar nota gerada se houver coluna
  const noteIdx = headers.indexOf('note_gerada');
  if (noteIdx >= 0) {
    sheet.getRange(sheet.getLastRow(), noteIdx + 1).setValue(noteGerada);
  }
  
  logAction('SAVE_CONSULTA', idGestante, idConsulta, `Tipo: ${tipoConsulta}, Prof: ${profissional}`);
  
  // Atualizar MonitoramentoPN
  updateMonitoramento(idGestante, dataConsulta, profissional, tipoProfissional);
  
  return {
    id_consulta: idConsulta,
    note_gerada: noteGerada
  };
}

function generateNoteCelk(gestante, consulta, tipoConsulta) {
  if (!gestante) return '';
  
  const nome = gestante.nome || '';
  const dn = gestante.dn || '';
  const idade = calcularIdade(gestante.dn);
  const dum = gestante.dum || '';
  const dppUsg = gestante.dpp_usg || '';
  
  let ig = '';
  let trimestre = '';
  if (gestante.dum) {
    const dumDate = parseDateBR(gestante.dum);
    const igObj = calculateIG(dumDate);
    if (igObj) {
      ig = igObj.formatted;
      trimestre = calculateTrimester(igObj.weeks);
    }
  }
  
  let texto = `PRÉ-NATAL - ${tipoConsulta === 'ABERTURA' ? 'ABERTURA' : 'SEGUIMENTO'}\n\n`;
  texto += `Gestante: ${nome}\n`;
  if (dn) texto += `DN: ${dn} (${idade} anos)\n`;
  if (dum) texto += `DUM: ${dum}\n`;
  if (dppUsg) texto += `DPP (USG): ${dppUsg}\n`;
  if (ig) texto += `IG: ${ig} (${trimestre})\n`;
  texto += `\n`;
  
  // Dados específicos de ABERTURA
  if (tipoConsulta === 'ABERTURA') {
    if (consulta.planejamento_gestacao) {
      texto += `Planejamento da gestação: ${consulta.planejamento_gestacao}\n`;
    }
    if (consulta.primigesta) {
      texto += `Primigesta: ${consulta.primigesta}\n`;
    }
    if (consulta.historico_obstetrico) {
      texto += `Histórico obstétrico: ${consulta.historico_obstetrico}\n`;
    }
    if (consulta.acido_folico) {
      texto += `Ácido fólico: ${consulta.acido_folico}\n`;
    }
    if (consulta.beta_hcg) {
      texto += `Beta-hCG: ${consulta.beta_hcg}\n`;
    }
    if (consulta.primeira_usg) {
      texto += `1ª USG: ${consulta.primeira_usg}\n`;
    }
    texto += `\n`;
  }
  
  // Exame físico
  texto += `EXAME FÍSICO:\n`;
  if (consulta.pa) texto += `PA: ${consulta.pa}\n`;
  if (consulta.peso) texto += `Peso: ${consulta.peso} kg\n`;
  if (consulta.au) texto += `AU: ${consulta.au} cm\n`;
  if (consulta.bcf) texto += `BCF: ${consulta.bcf} bpm\n`;
  if (consulta.edema) texto += `Edema: ${consulta.edema}\n`;
  texto += `\n`;
  
  // Queixas e sinais de alerta
  if (consulta.queixas) {
    texto += `QUEIXAS:\n${consulta.queixas}\n\n`;
  }
  if (consulta.sinais_alerta) {
    texto += `SINAIS DE ALERTA:\n${consulta.sinais_alerta}\n\n`;
  }
  
  // Condutas
  if (consulta.condutas) {
    texto += `CONDUTAS:\n${consulta.condutas}\n\n`;
  }
  
  // Sorologias (se houver)
  if (consulta.sorologias) {
    try {
      const sor = typeof consulta.sorologias === 'string' ? JSON.parse(consulta.sorologias) : consulta.sorologias;
      if (Object.keys(sor).length > 0) {
        texto += `SOROLOGIAS:\n`;
        if (sor.hiv) texto += `HIV: ${sor.hiv}\n`;
        if (sor.hbsag) texto += `HBsAg: ${sor.hbsag}\n`;
        if (sor.hcv) texto += `HCV: ${sor.hcv}\n`;
        if (sor.vdrl) texto += `VDRL: ${sor.vdrl}\n`;
        texto += `\n`;
      }
    } catch (e) {}
  }
  
  // Vacinas (se houver)
  if (consulta.vacinas) {
    try {
      const vac = typeof consulta.vacinas === 'string' ? JSON.parse(consulta.vacinas) : consulta.vacinas;
      if (Object.keys(vac).length > 0) {
        texto += `VACINAS:\n`;
        if (vac.dtpa) texto += `dTpa: ${vac.dtpa}\n`;
        if (vac.hepatiteB) texto += `Hepatite B: ${vac.hepatiteB}\n`;
        if (vac.influenza) texto += `Influenza: ${vac.influenza}\n`;
        texto += `\n`;
      }
    } catch (e) {}
  }
  
  // Flags/Alertas
  if (consulta.flags) {
    texto += `ALERTAS: ${consulta.flags}\n\n`;
  }
  
  return texto;
}

// ========================================
// PENDÊNCIAS INTELIGENTES
// ========================================
function getPendencias(idGestante) {
  const gestante = getGestante(idGestante);
  if (!gestante) return [];
  
  const consultas = getConsultasPorGestante(idGestante);
  const dumDate = parseDateBR(gestante.dum);
  const igObj = dumDate ? calculateIG(dumDate) : null;
  const igWeeks = igObj ? igObj.weeks : 0;
  const trimestre = igWeeks ? calculateTrimester(igWeeks) : '';
  
  const pendencias = [];
  
  // Verificar sorologias
  let temHIV = false, temHBsAg = false, temHCV = false, temVDRL = false;
  
  consultas.forEach(cons => {
    if (cons.sorologias) {
      try {
        const sor = typeof cons.sorologias === 'string' ? JSON.parse(cons.sorologias) : cons.sorologias;
        if (sor.hiv && sor.hiv !== 'PENDENTE') temHIV = true;
        if (sor.hbsag && sor.hbsag !== 'PENDENTE') temHBsAg = true;
        if (sor.hcv && sor.hcv !== 'PENDENTE') temHCV = true;
        if (sor.vdrl && sor.vdrl !== 'PENDENTE') temVDRL = true;
      } catch (e) {}
    }
  });
  
  if (!temHIV) pendencias.push({ tipo: 'SOROLOGIA', item: 'HIV', prioridade: 'ALTA' });
  if (!temHBsAg) pendencias.push({ tipo: 'SOROLOGIA', item: 'HBsAg', prioridade: 'ALTA' });
  if (!temHCV) pendencias.push({ tipo: 'SOROLOGIA', item: 'HCV', prioridade: 'MEDIA' });
  if (!temVDRL) pendencias.push({ tipo: 'SOROLOGIA', item: 'VDRL', prioridade: 'ALTA' });
  
  // Verificar vacinas
  let temDTpa = false, temHepB = false, temInfluenza = false;
  
  consultas.forEach(cons => {
    if (cons.vacinas) {
      try {
        const vac = typeof cons.vacinas === 'string' ? JSON.parse(cons.vacinas) : cons.vacinas;
        if (vac.dtpa && vac.dtpa !== 'PENDENTE') temDTpa = true;
        if (vac.hepatiteB && vac.hepatiteB !== 'PENDENTE') temHepB = true;
        if (vac.influenza && vac.influenza !== 'PENDENTE') temInfluenza = true;
      } catch (e) {}
    }
  });
  
  if (!temDTpa && igWeeks >= 20) pendencias.push({ tipo: 'VACINA', item: 'dTpa', prioridade: 'ALTA' });
  if (!temHepB) pendencias.push({ tipo: 'VACINA', item: 'Hepatite B', prioridade: 'ALTA' });
  if (!temInfluenza && igWeeks >= 12) pendencias.push({ tipo: 'VACINA', item: 'Influenza', prioridade: 'MEDIA' });
  
  // Verificar exames por trimestre (usar RegrasPN)
  const regras = getRegrasPN();
  if (regras.EXAME && regras.EXAME[trimestre]) {
    regras.EXAME[trimestre].forEach(regra => {
      if (igWeeks >= regra.igMin && igWeeks <= regra.igMax) {
        pendencias.push({
          tipo: 'EXAME',
          item: regra.conteudo,
          trimestre: trimestre,
          prioridade: 'MEDIA'
        });
      }
    });
  }
  
  return pendencias;
}

// ========================================
// MONITORAMENTO
// ========================================
function updateMonitoramento(idGestante, dataConsulta, profissional, tipoProfissional) {
  const sheet = getSheet('MonitoramentoPN');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Buscar linha existente
  let rowIndex = -1;
  const idGestanteIdx = headers.indexOf('id_gestante');
  for (let i = 1; i < data.length; i++) {
    if (data[i][idGestanteIdx] === idGestante) {
      rowIndex = i;
      break;
    }
  }
  
  const gestante = getGestante(idGestante);
  if (!gestante) return;
  
  // Contar consultas
  const consultas = getConsultasPorGestante(idGestante);
  const totalConsultas = consultas.length;
  let consultasMedico = 0;
  let consultasEnfermeira = 0;
  let ultimoProfissional = '';
  
  consultas.forEach(cons => {
    if (cons.tipo_profissional === 'MEDICO') {
      consultasMedico++;
      ultimoProfissional = cons.profissional || 'Médico';
    } else if (cons.tipo_profissional === 'ENFERMEIRA') {
      consultasEnfermeira++;
      if (!ultimoProfissional) ultimoProfissional = cons.profissional || 'Enfermeira';
    }
  });
  
  // Calcular IG e retorno
  let ig = null;
  let igWeeks = 0;
  let trimestre = '';
  let periodicidade = '';
  let retornoEm = null;
  
  if (gestante.dum) {
    const dumDate = parseDateBR(gestante.dum);
    ig = calculateIG(dumDate);
    if (ig) {
      igWeeks = ig.weeks;
      trimestre = calculateTrimester(igWeeks);
      const retorno = calculateRetorno(igWeeks);
      periodicidade = retorno.description;
      
      const consultaDate = dataConsulta instanceof Date ? dataConsulta : new Date();
      retornoEm = new Date(consultaDate);
      retornoEm.setDate(retornoEm.getDate() + retorno.days);
    }
  }
  
  // Verificar sorologias e vacinas
  const pendencias = getPendencias(idGestante);
  const pendenciasStr = pendencias.length > 0 
    ? pendencias.map(p => p.item).join(', ') 
    : '';
  
  let sorologiasOk = 'SIM';
  let vacinasOk = 'SIM';
  pendencias.forEach(p => {
    if (p.tipo === 'SOROLOGIA') sorologiasOk = 'NÃO';
    if (p.tipo === 'VACINA') vacinasOk = 'NÃO';
  });
  
  const idade = calcularIdade(gestante.dn);
  const now = new Date();
  
  // Construir linha baseada nos headers
  const rowData = new Array(headers.length).fill('');
  
  const headerMap = {
    'ultima_consulta_em': dataConsulta,
    'ultimo_atendimento_por': profissional,
    'ig_formatada': ig ? ig.formatted : '',
    'trimestre': trimestre,
    'periodicidade': periodicidade,
    'nome': gestante.nome,
    'dn': gestante.dn,
    'idade': idade,
    'observacoes': gestante.observacoes || '',
    'risco': gestante.risco || 'HABITUAL',
    'dum': gestante.dum,
    'ig_dum_num': ig ? ig.totalDays : '',
    'dpp_usg': gestante.dpp_usg,
    'exames_sorologicos_ok': sorologiasOk,
    'vacinas_em_dia': vacinasOk,
    'monitorada_em': now,
    'retorno_em': retornoEm,
    'com_a_profissional': profissional,
    'id_gestante': idGestante,
    'total_consultas': totalConsultas,
    'consultas_medico': consultasMedico,
    'consultas_enfermeira': consultasEnfermeira,
    'pendencias': pendenciasStr
  };
  
  headers.forEach((header, idx) => {
    if (headerMap.hasOwnProperty(header)) {
      rowData[idx] = headerMap[header];
    }
  });
  
  if (rowIndex === -1) {
    sheet.appendRow(rowData);
  } else {
    const range = sheet.getRange(rowIndex + 1, 1, 1, rowData.length);
    range.setValues([rowData]);
  }
}

// ========================================
// WEB APP ENDPOINTS
// ========================================
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const params = e.parameter || {};
    const action = params.action;
    
    if (action === 'health') {
      return jsonResponse({ ok: true, message: 'API Online' });
    }
    
    if (action === 'searchGestantes') {
      const term = params.term || '';
      const results = searchGestantes(term);
      return jsonResponse({ ok: true, data: results });
    }
    
    if (action === 'getGestante') {
      const id = params.id;
      if (!id) {
        return jsonResponse({ ok: false, error: 'ID obrigatório' });
      }
      const gestante = getGestante(id);
      if (!gestante) {
        return jsonResponse({ ok: false, error: 'Gestante não encontrada' });
      }
      
      // Adicionar pendências
      const pendencias = getPendencias(id);
      gestante.pendencias = pendencias;
      
      return jsonResponse({ ok: true, data: gestante });
    }
    
    if (action === 'getOrientacoesPorIG') {
      const igWeeks = parseInt(params.ig_weeks) || 0;
      const tipoConsulta = params.tipo_consulta || 'SEGUIMENTO';
      const profissional = params.profissional || 'AMBOS';
      const orientacoes = getOrientacoesPorIG(igWeeks, tipoConsulta, profissional);
      return jsonResponse({ ok: true, data: orientacoes });
    }
    
    if (action === 'getPendencias') {
      const id = params.id;
      if (!id) {
        return jsonResponse({ ok: false, error: 'ID obrigatório' });
      }
      const pendencias = getPendencias(id);
      return jsonResponse({ ok: true, data: pendencias });
    }
    
    if (action === 'createGestante') {
      const result = createGestante(params);
      return jsonResponse({ ok: true, data: result });
    }
    
    if (action === 'saveConsulta') {
      const result = saveConsulta(params);
      return jsonResponse({ ok: true, data: result });
    }
    
    return jsonResponse({ ok: false, error: 'Ação não reconhecida' });
    
  } catch (error) {
    return jsonResponse({ ok: false, error: error.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========================================
// SETUP AUTOMÁTICO DA PLANILHA
// ========================================

/**
 * Função principal de setup - Execute esta função UMA VEZ após configurar SPREADSHEET_ID
 * Cria todas as abas, cabeçalhos, formatações, validações e gatilhos
 */
function setupSpreadsheet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    console.log('🚀 Iniciando setup da planilha...');
    
    // 1. Criar abas se não existirem
    createSheetsIfNeeded(ss);
    
    // 2. Garantir cabeçalhos (idempotente)
    ensureHeaders(ss);
    
    // 3. Aplicar formatação
    applyFormatting(ss);
    
    // 4. Criar validações (dropdowns)
    createValidations(ss);
    
    // 5. Ocultar colunas técnicas
    hideTechnicalColumns(ss);
    
    // 6. Formatação condicional
    applyConditionalFormatting(ss);
    
    // 7. Preencher RegrasPN com dados iniciais
    populateRegrasPN(ss);
    
    // 8. Criar gatilhos
    setupTriggers();
    
    console.log('✅ Setup concluído com sucesso!');
    return 'Setup concluído com sucesso!';
    
  } catch (error) {
    console.error('❌ Erro no setup:', error);
    throw error;
  }
}

/**
 * Migração/atualização da planilha - Adiciona novas colunas se necessário
 */
function migrateSpreadsheetIfNeeded() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    console.log('🔄 Verificando migrações necessárias...');
    
    // Garantir cabeçalhos atualizados
    ensureHeaders(ss);
    
    // Aplicar formatações atualizadas
    applyFormatting(ss);
    createValidations(ss);
    hideTechnicalColumns(ss);
    applyConditionalFormatting(ss);
    
    console.log('✅ Migração concluída!');
    return 'Migração concluída!';
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// ========================================
// FUNÇÕES AUXILIARES DE SETUP
// ========================================

function createSheetsIfNeeded(ss) {
  const requiredSheets = ['Gestantes', 'ConsultasPN', 'MonitoramentoPN', 'LOG', 'RegrasPN'];
  
  requiredSheets.forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      console.log(`✅ Aba "${sheetName}" criada`);
    } else {
      console.log(`ℹ️ Aba "${sheetName}" já existe`);
    }
  });
}

function ensureHeaders(ss) {
  // Gestantes
  const gestantesHeaders = [
    'id_gestante', 'nome', 'dn', 'telefone', 'dum', 'dpp_usg', 
    'risco', 'observacoes', 'created_at', 'updated_at'
  ];
  ensureHeadersForSheet(ss, 'Gestantes', gestantesHeaders);
  
  // ConsultasPN
  const consultasHeaders = [
    'id_consulta', 'id_gestante', 'tipo_consulta', 'data_consulta', 
    'profissional', 'tipo_profissional', 'pa', 'peso', 'au', 'bcf', 
    'edema', 'queixas', 'condutas', 'flags', 'planejamento_gestacao', 
    'primigesta', 'historico_obstetrico', 'acido_folico', 'sinais_alerta', 
    'beta_hcg', 'primeira_usg', 'sorologias', 'vacinas', 'note_gerada'
  ];
  ensureHeadersForSheet(ss, 'ConsultasPN', consultasHeaders);
  
  // MonitoramentoPN
  const monitoramentoHeaders = [
    'ultima_consulta_em', 'ultimo_atendimento_por', 'ig_formatada', 
    'trimestre', 'periodicidade', 'nome', 'dn', 'idade', 'observacoes', 
    'risco', 'dum', 'ig_dum_num', 'dpp_usg', 'exames_sorologicos_ok', 
    'vacinas_em_dia', 'monitorada_em', 'retorno_em', 'com_a_profissional', 
    'id_gestante', 'total_consultas', 'consultas_medico', 'consultas_enfermeira', 'pendencias'
  ];
  ensureHeadersForSheet(ss, 'MonitoramentoPN', monitoramentoHeaders);
  
  // LOG
  const logHeaders = ['timestamp', 'acao', 'id_gestante', 'id_consulta', 'usuario', 'detalhes'];
  ensureHeadersForSheet(ss, 'LOG', logHeaders);
  
  // RegrasPN
  const regrasHeaders = ['tipo', 'categoria', 'ig_min', 'ig_max', 'conteudo', 'para'];
  ensureHeadersForSheet(ss, 'RegrasPN', regrasHeaders);
}

function ensureHeadersForSheet(ss, sheetName, expectedHeaders) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  
  const lastCol = sheet.getLastColumn();
  const currentHeaders = lastCol > 0 
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    : [];
  
  // Se não tem cabeçalhos, adiciona todos
  if (currentHeaders.length === 0 || currentHeaders[0] === '') {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    console.log(`✅ Cabeçalhos adicionados em "${sheetName}"`);
    return;
  }
  
  // Verifica e adiciona colunas faltantes
  let needsUpdate = false;
  expectedHeaders.forEach((header, idx) => {
    const colIdx = idx + 1;
    if (colIdx > currentHeaders.length || currentHeaders[idx] !== header) {
      if (colIdx <= currentHeaders.length) {
        // Atualiza cabeçalho existente
        sheet.getRange(1, colIdx).setValue(header);
      } else {
        // Adiciona nova coluna
        sheet.getRange(1, colIdx).setValue(header);
      }
      needsUpdate = true;
    }
  });
  
  if (needsUpdate) {
    console.log(`✅ Cabeçalhos atualizados em "${sheetName}"`);
  }
}

function applyFormatting(ss) {
  // Freeze row 1 e aplicar filtros em todas as abas principais
  const sheetsToFormat = ['Gestantes', 'ConsultasPN', 'MonitoramentoPN', 'LOG'];
  
  sheetsToFormat.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    
    // Freeze primeira linha
    sheet.setFrozenRows(1);
    
    // Aplicar filtros
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow > 1 && lastCol > 0) {
      sheet.getRange(1, 1, lastRow, lastCol).createFilter();
    }
    
    // Formatar colunas de data como dd/MM/yyyy
    if (lastRow > 1 && lastCol > 0) {
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      headers.forEach((header, idx) => {
        const col = idx + 1;
        if (header && (
          header.toString().toLowerCase().includes('data') ||
          header.toString().toLowerCase().includes('dn') ||
          header.toString().toLowerCase().includes('dum') ||
          header.toString().toLowerCase().includes('dpp') ||
          header.toString().toLowerCase().includes('timestamp') ||
          header.toString().toLowerCase().includes('created') ||
          header.toString().toLowerCase().includes('updated') ||
          header.toString().toLowerCase().includes('retorno') ||
          header.toString().toLowerCase().includes('monitorada')
        )) {
          const numDataRows = lastRow - 1; // Exclui cabeçalho
          if (numDataRows > 0) {
            const range = sheet.getRange(2, col, numDataRows, 1);
            range.setNumberFormat('dd/MM/yyyy');
          }
        }
      });
    }
    
    // Auto-resize colunas (apenas se houver colunas)
    if (lastCol > 0) {
      try {
        sheet.autoResizeColumns(1, lastCol);
      } catch (e) {
        // Ignora erro se não conseguir redimensionar
        console.log(`ℹ️ Não foi possível redimensionar colunas em "${sheetName}"`);
      }
    }
    
    console.log(`✅ Formatação aplicada em "${sheetName}"`);
  });
}

function createValidations(ss) {
  // Gestantes.risco
  const gestantesSheet = ss.getSheetByName('Gestantes');
  if (gestantesSheet) {
    const riscoCol = getColumnIndex(gestantesSheet, 'risco');
    if (riscoCol > 0) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['HABITUAL', 'ALTO RISCO'], true)
        .setAllowInvalid(false)
        .build();
      const range = gestantesSheet.getRange(2, riscoCol, gestantesSheet.getMaxRows() - 1, 1);
      range.setDataValidation(rule);
    }
  }
  
  // ConsultasPN.tipo_profissional
  const consultasSheet = ss.getSheetByName('ConsultasPN');
  if (consultasSheet) {
    const tipoProfCol = getColumnIndex(consultasSheet, 'tipo_profissional');
    if (tipoProfCol > 0) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['MEDICO', 'ENFERMEIRA'], true)
        .setAllowInvalid(false)
        .build();
      const range = consultasSheet.getRange(2, tipoProfCol, consultasSheet.getMaxRows() - 1, 1);
      range.setDataValidation(rule);
    }
  }
  
  // MonitoramentoPN.trimestre
  const monitoramentoSheet = ss.getSheetByName('MonitoramentoPN');
  if (monitoramentoSheet) {
    const trimestreCol = getColumnIndex(monitoramentoSheet, 'trimestre');
    if (trimestreCol > 0) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['1T', '2T', '3T'], true)
        .setAllowInvalid(false)
        .build();
      const range = monitoramentoSheet.getRange(2, trimestreCol, monitoramentoSheet.getMaxRows() - 1, 1);
      range.setDataValidation(rule);
    }
    
    // MonitoramentoPN.periodicidade
    const periodicidadeCol = getColumnIndex(monitoramentoSheet, 'periodicidade');
    if (periodicidadeCol > 0) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['MENSAL', 'QUINZENAL', 'SEMANAL'], true)
        .setAllowInvalid(false)
        .build();
      const range = monitoramentoSheet.getRange(2, periodicidadeCol, monitoramentoSheet.getMaxRows() - 1, 1);
      range.setDataValidation(rule);
    }
  }
  
  console.log('✅ Validações criadas');
}

function getColumnIndex(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const index = headers.findIndex(h => h && h.toString().toLowerCase() === headerName.toLowerCase());
  return index >= 0 ? index + 1 : 0;
}

function hideTechnicalColumns(ss) {
  const monitoramentoSheet = ss.getSheetByName('MonitoramentoPN');
  if (monitoramentoSheet) {
    // Ocultar ig_dum_num (coluna técnica)
    const igDumNumCol = getColumnIndex(monitoramentoSheet, 'ig_dum_num');
    if (igDumNumCol > 0) {
      monitoramentoSheet.hideColumns(igDumNumCol);
    }
    
    // Ocultar id_gestante se estiver duplicado (já está visível em outras abas)
    // Na verdade, vamos manter visível para referência, mas pode ocultar se necessário
  }
  
  console.log('✅ Colunas técnicas ocultadas');
}

function applyConditionalFormatting(ss) {
  // MonitoramentoPN: risco = ALTO RISCO destacado
  const monitoramentoSheet = ss.getSheetByName('MonitoramentoPN');
  if (monitoramentoSheet) {
    const riscoCol = getColumnIndex(monitoramentoSheet, 'risco');
    if (riscoCol > 0) {
      const range = monitoramentoSheet.getRange(2, riscoCol, monitoramentoSheet.getMaxRows() - 1, 1);
      const rule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('ALTO RISCO')
        .setBackground('#ffcccc')
        .setRanges([range])
        .build();
      monitoramentoSheet.setConditionalFormatRules([rule]);
    }
    
    // Pendências não vazias destacadas
    const pendenciasCol = getColumnIndex(monitoramentoSheet, 'pendencias');
    if (pendenciasCol > 0) {
      const range = monitoramentoSheet.getRange(2, pendenciasCol, monitoramentoSheet.getMaxRows() - 1, 1);
      const rule = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=LEN($' + String.fromCharCode(64 + pendenciasCol) + '2)>0')
        .setBackground('#fff4cc')
        .setRanges([range])
        .build();
      monitoramentoSheet.setConditionalFormatRules(monitoramentoSheet.getConditionalFormatRules().concat([rule]));
    }
    
    // Retorno vencido destacado
    const retornoCol = getColumnIndex(monitoramentoSheet, 'retorno_em');
    if (retornoCol > 0) {
      const range = monitoramentoSheet.getRange(2, retornoCol, monitoramentoSheet.getMaxRows() - 1, 1);
      const rule = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=$' + String.fromCharCode(64 + retornoCol) + '2<TODAY()')
        .setBackground('#ffcccc')
        .setRanges([range])
        .build();
      monitoramentoSheet.setConditionalFormatRules(monitoramentoSheet.getConditionalFormatRules().concat([rule]));
    }
  }
  
  // Gestantes: risco = ALTO RISCO destacado
  const gestantesSheet = ss.getSheetByName('Gestantes');
  if (gestantesSheet) {
    const riscoCol = getColumnIndex(gestantesSheet, 'risco');
    if (riscoCol > 0) {
      const range = gestantesSheet.getRange(2, riscoCol, gestantesSheet.getMaxRows() - 1, 1);
      const rule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('ALTO RISCO')
        .setBackground('#ffcccc')
        .setRanges([range])
        .build();
      gestantesSheet.setConditionalFormatRules([rule]);
    }
  }
  
  console.log('✅ Formatação condicional aplicada');
}

function populateRegrasPN(ss) {
  const sheet = ss.getSheetByName('RegrasPN');
  if (!sheet) return;
  
  // Verificar se já tem dados
  if (sheet.getLastRow() > 1) {
    console.log('ℹ️ RegrasPN já possui dados, pulando preenchimento inicial');
    return;
  }
  
  // Dados iniciais de exemplo
  const regrasIniciais = [
    // CHECKLIST - 1º Trimestre
    ['CHECKLIST', 'Anamnese', 0, 13, 'Verificar uso de ácido fólico', 'AMBOS'],
    ['CHECKLIST', 'Anamnese', 0, 13, 'Investigação de planejamento da gestação', 'MEDICO'],
    ['CHECKLIST', 'Anamnese', 0, 13, 'Histórico obstétrico completo', 'MEDICO'],
    ['CHECKLIST', 'Exame Físico', 0, 13, 'Avaliar pressão arterial', 'AMBOS'],
    ['CHECKLIST', 'Exame Físico', 0, 13, 'Avaliar peso inicial', 'AMBOS'],
    
    // ORIENTAÇÃO - 1º Trimestre
    ['ORIENTACAO', 'Alimentação', 0, 13, 'Orientar sobre alimentação saudável e ganho de peso adequado', 'AMBOS'],
    ['ORIENTACAO', 'Sinais de Alerta', 0, 40, 'Orientar sobre sinais de alerta: sangramento, perda de líquido, dor abdominal intensa, febre', 'AMBOS'],
    ['ORIENTACAO', 'Ácido Fólico', 0, 13, 'Orientar sobre importância do ácido fólico', 'ENFERMEIRA'],
    
    // CHECKLIST - 2º Trimestre
    ['CHECKLIST', 'Exame Físico', 14, 27, 'Avaliar altura uterina (AU)', 'AMBOS'],
    ['CHECKLIST', 'Exame Físico', 14, 27, 'Auscultar batimentos cardíacos fetais (BCF)', 'AMBOS'],
    ['CHECKLIST', 'Anamnese', 14, 27, 'Verificar movimentação fetal', 'AMBOS'],
    
    // ORIENTAÇÃO - 2º Trimestre
    ['ORIENTACAO', 'Alimentação', 14, 27, 'Orientar sobre ganho de peso no 2º trimestre', 'AMBOS'],
    ['ORIENTACAO', 'Atividade Física', 14, 27, 'Orientar sobre atividade física adequada', 'ENFERMEIRA'],
    
    // CHECKLIST - 3º Trimestre
    ['CHECKLIST', 'Exame Físico', 28, 40, 'Verificar presença de edema', 'AMBOS'],
    ['CHECKLIST', 'Exame Físico', 28, 40, 'Avaliar altura uterina e apresentação fetal', 'MEDICO'],
    ['CHECKLIST', 'Anamnese', 28, 40, 'Verificar contrações e sinais de trabalho de parto', 'AMBOS'],
    
    // ORIENTAÇÃO - 3º Trimestre
    ['ORIENTACAO', 'Preparo Parto', 32, 40, 'Orientar sobre preparo para parto e sinais de trabalho de parto', 'ENFERMEIRA'],
    ['ORIENTACAO', 'Preparo Parto', 32, 40, 'Orientar sobre plano de parto', 'MEDICO'],
    ['ORIENTACAO', 'Amamentação', 32, 40, 'Orientar sobre amamentação e cuidados com recém-nascido', 'ENFERMEIRA'],
    
    // EXAME - Por Trimestre
    ['EXAME', '1T', 0, 13, 'Hemograma completo', 'AMBOS'],
    ['EXAME', '1T', 0, 13, 'Glicemia de jejum', 'AMBOS'],
    ['EXAME', '1T', 0, 13, 'Sorologias (HIV, HBsAg, HCV, VDRL)', 'AMBOS'],
    ['EXAME', '1T', 0, 13, 'USG do 1º trimestre', 'AMBOS'],
    ['EXAME', '2T', 14, 27, 'USG morfológica', 'AMBOS'],
    ['EXAME', '2T', 14, 27, 'Teste oral de tolerância à glicose (TOTG)', 'AMBOS'],
    ['EXAME', '3T', 28, 40, 'USG do 3º trimestre', 'AMBOS'],
    ['EXAME', '3T', 28, 40, 'Hemograma completo', 'AMBOS']
  ];
  
  // Adicionar dados (pula linha 1 que é cabeçalho)
  if (regrasIniciais.length > 0) {
    sheet.getRange(2, 1, regrasIniciais.length, regrasIniciais[0].length).setValues(regrasIniciais);
    console.log(`✅ ${regrasIniciais.length} regras iniciais adicionadas em RegrasPN`);
  }
}

function setupTriggers() {
  // Limpar triggers existentes para evitar duplicatas
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'cleanupLogsWeekly' || 
        trigger.getHandlerFunction() === 'nightlyRecalcMonitoramento') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Criar trigger semanal para limpeza de logs (domingo às 2h)
  ScriptApp.newTrigger('cleanupLogsWeekly')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(2)
    .create();
  
  // Criar trigger diário para recalcular monitoramento (opcional, às 3h)
  ScriptApp.newTrigger('nightlyRecalcMonitoramento')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
  
  console.log('✅ Gatilhos criados');
}

// ========================================
// FUNÇÕES DE GATILHOS
// ========================================

/**
 * Limpeza semanal de logs - Remove logs com mais de 90 dias
 */
function cleanupLogsWeekly() {
  try {
    const sheet = getSheet('LOG');
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return; // Apenas cabeçalho
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    const headers = data[0];
    const timestampIdx = headers.indexOf('timestamp');
    
    if (timestampIdx < 0) return;
    
    let rowsToDelete = [];
    
    // Verificar linhas de baixo para cima para manter índices corretos
    for (let i = data.length - 1; i >= 1; i--) {
      const timestamp = data[i][timestampIdx];
      if (timestamp instanceof Date && timestamp < cutoffDate) {
        rowsToDelete.push(i + 1); // +1 porque getRange é 1-indexed
      }
    }
    
    // Deletar linhas (de baixo para cima)
    rowsToDelete.forEach(row => {
      sheet.deleteRow(row);
    });
    
    if (rowsToDelete.length > 0) {
      console.log(`✅ ${rowsToDelete.length} logs antigos removidos`);
      logAction('CLEANUP_LOGS', '', '', `${rowsToDelete.length} logs removidos`);
    }
    
  } catch (error) {
    console.error('❌ Erro na limpeza de logs:', error);
  }
}

/**
 * Recalcular monitoramento diariamente (atualiza IG, retornos, etc.)
 */
function nightlyRecalcMonitoramento() {
  try {
    const sheet = getSheet('MonitoramentoPN');
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;
    
    const headers = data[0];
    const idGestanteIdx = headers.indexOf('id_gestante');
    const dumIdx = headers.indexOf('dum');
    
    if (idGestanteIdx < 0 || dumIdx < 0) return;
    
    let updated = 0;
    
    for (let i = 1; i < data.length; i++) {
      const idGestante = data[i][idGestanteIdx];
      const dum = data[i][dumIdx];
      
      if (!idGestante || !dum) continue;
      
      // Recalcular IG e atualizar se necessário
      const gestante = getGestante(idGestante);
      if (gestante && gestante.dum) {
        const dumDate = parseDateBR(gestante.dum);
        if (dumDate) {
          const ig = calculateIG(dumDate);
          if (ig) {
            const igFormattedIdx = headers.indexOf('ig_formatada');
            const trimestreIdx = headers.indexOf('trimestre');
            const periodicidadeIdx = headers.indexOf('periodicidade');
            const retornoIdx = headers.indexOf('retorno_em');
            
            // Atualizar IG formatada
            if (igFormattedIdx >= 0) {
              sheet.getRange(i + 1, igFormattedIdx + 1).setValue(ig.formatted);
            }
            
            // Atualizar trimestre
            if (trimestreIdx >= 0) {
              const trimestre = calculateTrimester(ig.weeks);
              sheet.getRange(i + 1, trimestreIdx + 1).setValue(trimestre);
            }
            
            // Atualizar periodicidade e retorno
            if (periodicidadeIdx >= 0 && retornoIdx >= 0) {
              const retorno = calculateRetorno(ig.weeks);
              sheet.getRange(i + 1, periodicidadeIdx + 1).setValue(retorno.description);
              
              // Calcular nova data de retorno (baseado na última consulta)
              const ultimaConsultaIdx = headers.indexOf('ultima_consulta_em');
              if (ultimaConsultaIdx >= 0) {
                const ultimaConsulta = data[i][ultimaConsultaIdx];
                if (ultimaConsulta instanceof Date) {
                  const novoRetorno = new Date(ultimaConsulta);
                  novoRetorno.setDate(novoRetorno.getDate() + retorno.days);
                  sheet.getRange(i + 1, retornoIdx + 1).setValue(novoRetorno);
                }
              }
            }
            
            updated++;
          }
        }
      }
    }
    
    if (updated > 0) {
      console.log(`✅ ${updated} registros de monitoramento atualizados`);
    }
    
  } catch (error) {
    console.error('❌ Erro no recálculo de monitoramento:', error);
  }
}
