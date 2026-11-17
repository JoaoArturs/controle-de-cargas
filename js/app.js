/**
 * app.js
 * Camada de apresentação: gerencia DOM, eventos, validação e renderização.
 * Depende de storage.js e utils.js (carregados antes no HTML).
 */

// ─────────────────────────────────────────────
// Referências ao DOM
// ─────────────────────────────────────────────

const form             = document.getElementById('record-form');
const inputExercise    = document.getElementById('exercise');
const inputWeight      = document.getElementById('weight');
const inputReps        = document.getElementById('reps');
const inputSets        = document.getElementById('sets');
const inputWarmup      = document.getElementById('warmup');
const datalistExercise = document.getElementById('exercise-suggestions');

const btnExport        = document.getElementById('btn-export');
const btnImport        = document.getElementById('btn-import');
const importFile       = document.getElementById('import-file');

const errorExercise    = document.getElementById('error-exercise');
const errorWeight      = document.getElementById('error-weight');
const errorReps        = document.getElementById('error-reps');
const errorSets        = document.getElementById('error-sets');

const statusMessage    = document.getElementById('status-message');

const lastRecordBox    = document.getElementById('last-record-box');
const lastRecordText   = document.getElementById('last-record-text');

const filterInput      = document.getElementById('filter-input');
const historyBody      = document.getElementById('history-body');
const emptyHistory     = document.getElementById('empty-history');
const emptyFilter      = document.getElementById('empty-filter');
const historyTable     = document.getElementById('history-table');

const btnCancelEdit    = document.getElementById('btn-cancel-edit');
const btnSave          = document.getElementById('btn-save');
const themeToggle      = document.getElementById('theme-toggle');

const progressSection  = document.getElementById('progress-section');
const progressEmpty    = document.getElementById('progress-empty');
const progressContent  = document.getElementById('progress-content');
const chartExercise    = document.getElementById('chart-exercise');
const chartProgression = document.getElementById('chart-progression');
const chartVolume      = document.getElementById('chart-volume');
const statVolume       = document.getElementById('stat-volume');
const statVolumeDelta  = document.getElementById('stat-volume-delta');
const statBest         = document.getElementById('stat-best');
const statBestDelta    = document.getElementById('stat-best-delta');
const statSets         = document.getElementById('stat-sets');

// ─────────────────────────────────────────────
// Estado da aplicação
// ─────────────────────────────────────────────

let statusTimer = null;   // Referência ao temporizador de mensagem de status.
let editingId   = null;   // id do registro em edição (null = criando novo).
const THEME_KEY = 'gymTheme';

// ─────────────────────────────────────────────
// Inicialização
// ─────────────────────────────────────────────

/**
 * Ponto de entrada — chamado quando o DOM estiver pronto.
 */
function init() {
  initTheme();
  renderHistory();
  updateExerciseSuggestions();
  renderProgress();
  attachEvents();
}

/**
 * Atualiza todas as visões dependentes dos dados após qualquer alteração.
 */
function refreshViews() {
  renderHistory();
  updateExerciseSuggestions();
  renderProgress();
}

// ─────────────────────────────────────────────
// Eventos
// ─────────────────────────────────────────────

function attachEvents() {
  form.addEventListener('submit', handleFormSubmit);

  // Atualiza último registro conforme o usuário digita o exercício.
  inputExercise.addEventListener('input', handleExerciseInput);

  // Atualiza último registro quando o usuário escolhe uma sugestão do datalist.
  inputExercise.addEventListener('change', handleExerciseInput);

  // Filtro de histórico em tempo real.
  filterInput.addEventListener('input', renderHistory);

  // Backup: exportar e importar.
  btnExport.addEventListener('click', handleExport);
  btnImport.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', handleImportFile);

  // Edição.
  btnCancelEdit.addEventListener('click', cancelEdit);

  // Tema claro/escuro.
  themeToggle.addEventListener('click', toggleTheme);

  // Troca de exercício nos gráficos.
  chartExercise.addEventListener('change', () => renderProgress(chartExercise.value));
}

// ─────────────────────────────────────────────
// Formulário — submissão e validação
// ─────────────────────────────────────────────

function handleFormSubmit(event) {
  event.preventDefault();
  clearFieldErrors();

  const exercise    = normalizeExerciseName(inputExercise.value);
  const weightRaw   = inputWeight.value;
  const repsRaw     = inputReps.value;
  const setsRaw     = inputSets.value.trim();

  const weight = parseWeight(weightRaw);
  const reps   = parseReps(repsRaw);
  // Campo vazio = 1 série (uso rápido de série única).
  const sets   = setsRaw === '' ? 1 : parseReps(setsRaw);

  let hasError = false;

  // Validação: exercício
  if (!exercise || exercise.length < 2) {
    showFieldError(errorExercise, 'Informe o nome do exercício (mínimo 2 caracteres).');
    hasError = true;
  } else if (exercise.length > 80) {
    showFieldError(errorExercise, 'O nome do exercício deve ter no máximo 80 caracteres.');
    hasError = true;
  }

  // Validação: carga
  if (weightRaw === '' || weightRaw === null) {
    showFieldError(errorWeight, 'Informe a carga.');
    hasError = true;
  } else if (isNaN(weight)) {
    showFieldError(errorWeight, 'Carga inválida. Use somente números.');
    hasError = true;
  } else if (weight < 0) {
    showFieldError(errorWeight, 'A carga não pode ser negativa.');
    hasError = true;
  }

  // Validação: repetições
  if (repsRaw === '' || repsRaw === null) {
    showFieldError(errorReps, 'Informe as repetições.');
    hasError = true;
  } else if (isNaN(reps)) {
    showFieldError(errorReps, 'Repetições inválidas. Use somente números inteiros.');
    hasError = true;
  } else if (!Number.isInteger(parseFloat(repsRaw.replace(',', '.')))) {
    showFieldError(errorReps, 'Repetições devem ser números inteiros, sem decimais.');
    hasError = true;
  } else if (reps < 1) {
    showFieldError(errorReps, 'As repetições devem ser pelo menos 1.');
    hasError = true;
  } else if (reps > 999) {
    showFieldError(errorReps, 'As repetições devem ser no máximo 999.');
    hasError = true;
  }

  // Validação: séries (opcional; vazio = 1)
  if (setsRaw !== '') {
    if (isNaN(sets) || !Number.isInteger(parseFloat(setsRaw.replace(',', '.')))) {
      showFieldError(errorSets, 'Séries devem ser um número inteiro.');
      hasError = true;
    } else if (sets < 1) {
      showFieldError(errorSets, 'Deve haver pelo menos 1 série.');
      hasError = true;
    } else if (sets > 99) {
      showFieldError(errorSets, 'Máximo de 99 séries.');
      hasError = true;
    }
  }

  if (hasError) return;

  const isEditing = editingId !== null;

  let persisted;
  if (isEditing) {
    // Atualiza preservando a data/horário original do registro.
    const existing = getRecords().find((r) => r.id === editingId);
    const record = {
      id:          editingId,
      exercise:    exercise,
      weight:      weight,
      repetitions: reps,
      sets:        sets,
      warmup:      inputWarmup.checked,
      createdAt:   existing ? existing.createdAt : new Date().toISOString(),
    };
    persisted = updateRecord(record);
  } else {
    const record = {
      id:          generateId(),
      exercise:    exercise,
      weight:      weight,
      repetitions: reps,
      sets:        sets,
      warmup:      inputWarmup.checked,
      createdAt:   new Date().toISOString(),
    };
    persisted = addRecord(record);
  }

  if (!persisted) {
    showStatus('Erro ao salvar o registro. Verifique o armazenamento do navegador.', 'error');
    return;
  }

  const warmup = inputWarmup.checked;

  if (isEditing) {
    exitEditMode();
    refreshViews();
    updateLastRecord(exercise);
    showStatus(`Registro de "${exercise}" atualizado.`, 'success');
    return;
  }

  // Modo criação: atualiza interface e prepara para a próxima série.
  refreshViews();
  updateLastRecord(exercise);

  // Limpa carga, repetições e aquecimento; mantém exercício.
  inputWeight.value   = '';
  inputReps.value     = '';
  inputWarmup.checked = false;

  const label = warmup ? 'Aquecimento' : 'Série';
  showStatus(`${label} de "${exercise}" salvo com sucesso!`, 'success');

  // Foco no campo de carga para facilitar nova série.
  inputWeight.focus();
}

// ─────────────────────────────────────────────
// Edição de registro
// ─────────────────────────────────────────────

/**
 * Preenche o formulário com um registro e entra em modo de edição.
 * @param {Object} record
 */
function handleEdit(record) {
  editingId = record.id;

  inputExercise.value = record.exercise;
  inputWeight.value   = String(record.weight).replace('.', ',');
  inputReps.value     = String(record.repetitions);
  inputSets.value     = String(getSets(record));
  inputWarmup.checked = isWarmup(record);

  clearFieldErrors();
  btnSave.textContent = 'Atualizar série';
  btnCancelEdit.classList.remove('hidden');

  updateLastRecord(normalizeExerciseName(record.exercise));
  renderHistory(); // destaca a linha em edição

  // Leva o usuário ao formulário (útil no celular).
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  inputWeight.focus();
}

/**
 * Cancela a edição em andamento e limpa o formulário.
 */
function cancelEdit() {
  exitEditMode();
  inputWeight.value   = '';
  inputReps.value     = '';
  inputSets.value     = '1';
  inputWarmup.checked = false;
  clearFieldErrors();
  renderHistory();
  showStatus('Edição cancelada.', 'info');
}

/**
 * Sai do modo de edição, restaurando o formulário ao estado de criação.
 */
function exitEditMode() {
  editingId = null;
  btnSave.textContent = 'Salvar série';
  btnCancelEdit.classList.add('hidden');
}

// ─────────────────────────────────────────────
// Último registro
// ─────────────────────────────────────────────

function handleExerciseInput() {
  const exercise = normalizeExerciseName(inputExercise.value);
  updateLastRecord(exercise);
}

/**
 * Exibe o último registro de um exercício na área dedicada.
 * @param {string} exercise
 */
function updateLastRecord(exercise) {
  if (!exercise || exercise.length < 2) {
    setTextContent(lastRecordText, '');
    lastRecordBox.classList.add('hidden');
    return;
  }

  const records = getRecords();
  // Ordena pelo mais recente e busca o registro que corresponde ao exercício.
  const sorted = records
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const matches = sorted.filter((r) => exercisesMatch(r.exercise, exercise));
  // Prioriza a última série de trabalho; se só houver aquecimentos, usa o mais recente.
  const last = matches.find((r) => !isWarmup(r)) || matches[0];

  lastRecordBox.classList.remove('hidden');

  if (!last) {
    setTextContent(lastRecordText, 'Nenhum registro anterior para este exercício.');
    lastRecordBox.setAttribute('data-state', 'empty');
  } else {
    const date = formatDate(last.createdAt);
    const time = formatTime(last.createdAt);
    const tag  = isWarmup(last) ? ' (aquecimento)' : '';
    const sets = getSets(last);
    const setsStr = sets > 1 ? `${sets} séries de ` : '';
    setTextContent(
      lastRecordText,
      `${setsStr}${formatWeight(last.weight)} × ${formatReps(last.repetitions)}${tag} em ${date} às ${time}`
    );
    lastRecordBox.setAttribute('data-state', 'found');
  }
}

// ─────────────────────────────────────────────
// Histórico
// ─────────────────────────────────────────────

/**
 * Renderiza o histórico completo, aplicando o filtro atual se houver.
 */
function renderHistory() {
  const records = getRecords();
  const query   = filterInput.value;

  // Ordena do mais recente para o mais antigo.
  const sorted = records
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Aplica filtro de exercício.
  const filtered = query
    ? sorted.filter((r) => exerciseContains(r.exercise, query))
    : sorted;

  // Limpa o corpo da tabela de forma segura.
  while (historyBody.firstChild) {
    historyBody.removeChild(historyBody.firstChild);
  }

  // Controla visibilidade das mensagens de estado vazio.
  const hasRecords  = records.length > 0;
  const hasFiltered = filtered.length > 0;

  emptyHistory.classList.toggle('hidden', hasRecords);
  emptyFilter.classList.toggle('hidden', !hasRecords || hasFiltered);
  historyTable.classList.toggle('hidden', !hasFiltered);

  // Renderiza agrupado por dia, com um cabeçalho por dia (dia da semana + data).
  let currentDay = null;
  filtered.forEach((record) => {
    const dk = dayKey(record.createdAt);
    if (dk !== currentDay) {
      currentDay = dk;
      historyBody.appendChild(buildDayHeaderRow(record.createdAt));
    }
    historyBody.appendChild(buildHistoryRow(record));
  });
}

/**
 * Cria a linha de cabeçalho de um dia: "Segunda-feira · 16/11/2026".
 * @param {string} iso
 * @returns {HTMLTableRowElement}
 */
function buildDayHeaderRow(iso) {
  const tr = document.createElement('tr');
  tr.className = 'day-header';

  const td = document.createElement('td');
  td.colSpan = 6;

  const weekday = formatWeekday(iso);
  const date    = formatDate(iso);
  setTextContent(td, weekday ? `${weekday} · ${date}` : date);

  tr.appendChild(td);
  return tr;
}

/**
 * Constrói uma linha de tabela para um registro.
 * Usa createElement + textContent — sem innerHTML.
 * @param {Object} record
 * @returns {HTMLTableRowElement}
 */
function buildHistoryRow(record) {
  const tr = document.createElement('tr');

  if (record.id === editingId) tr.classList.add('row-editing');

  const tdTime     = createTd(formatTime(record.createdAt), 'Horário');
  const tdExercise = createTd(record.exercise,              'Exercício');
  const tdWeight   = createTd(formatWeight(record.weight),  'Carga');
  const tdSets     = createTd(String(getSets(record)),      'Séries');
  const tdReps     = createTd(formatReps(record.repetitions), 'Repetições');

  // Selo visual para séries de aquecimento.
  if (isWarmup(record)) {
    tr.classList.add('row-warmup');
    const badge = document.createElement('span');
    badge.className = 'badge-warmup';
    badge.textContent = 'Aquecimento';
    tdExercise.appendChild(document.createTextNode(' '));
    tdExercise.appendChild(badge);
  }

  // Célula com botões de ação.
  const tdAction = document.createElement('td');
  tdAction.className = 'td-action';

  const btnEdit = document.createElement('button');
  btnEdit.className = 'btn-edit';
  btnEdit.setAttribute('type', 'button');
  btnEdit.setAttribute('aria-label', `Editar registro de ${record.exercise}`);
  btnEdit.textContent = 'Editar';
  btnEdit.addEventListener('click', () => handleEdit(record));

  const btn = document.createElement('button');
  btn.className = 'btn-delete';
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', `Excluir registro de ${record.exercise}`);
  btn.textContent = 'Excluir';
  btn.addEventListener('click', () => handleDelete(record));

  tdAction.appendChild(btnEdit);
  tdAction.appendChild(btn);

  tr.appendChild(tdTime);
  tr.appendChild(tdExercise);
  tr.appendChild(tdWeight);
  tr.appendChild(tdSets);
  tr.appendChild(tdReps);
  tr.appendChild(tdAction);

  return tr;
}

/**
 * Cria um elemento <td> com texto seguro.
 * O parâmetro label é usado pelo CSS de cartão no mobile via attr(data-label).
 * @param {string} text
 * @param {string} [label]
 * @returns {HTMLTableCellElement}
 */
function createTd(text, label) {
  const td = document.createElement('td');
  if (label) td.setAttribute('data-label', label);
  setTextContent(td, text);
  return td;
}

// ─────────────────────────────────────────────
// Exclusão
// ─────────────────────────────────────────────

/**
 * Solicita confirmação e remove o registro.
 * @param {Object} record
 */
function handleDelete(record) {
  const weightStr = formatWeight(record.weight);
  const repsStr   = formatReps(record.repetitions);
  const dateStr   = formatDate(record.createdAt);
  const timeStr   = formatTime(record.createdAt);

  const confirmed = window.confirm(
    `Deseja excluir este registro?\n\n` +
    `Exercício: ${record.exercise}\n` +
    `Carga: ${weightStr}\n` +
    `Repetições: ${repsStr}\n` +
    `Data: ${dateStr} às ${timeStr}\n\n` +
    `Esta ação não pode ser desfeita.`
  );

  if (!confirmed) return;

  const removed = removeRecord(record.id);

  if (!removed) {
    showStatus('Não foi possível excluir o registro.', 'error');
    return;
  }

  // Se o registro excluído estava em edição, sai do modo de edição.
  if (record.id === editingId) exitEditMode();

  refreshViews();
  // Atualiza último registro se o exercício ainda estiver no campo.
  const currentExercise = normalizeExerciseName(inputExercise.value);
  if (currentExercise) {
    updateLastRecord(currentExercise);
  }

  showStatus(`Registro de "${record.exercise}" excluído.`, 'info');
}

// ─────────────────────────────────────────────
// Sugestões de exercício (datalist)
// ─────────────────────────────────────────────

/**
 * Atualiza as opções do datalist com os exercícios únicos já registrados.
 */
function updateExerciseSuggestions() {
  const records = getRecords();

  // Coleta nomes únicos (case-insensitive). Os registros do usuário têm
  // prioridade (preservam a capitalização dele); a lista padrão completa o resto.
  const seen = new Map();
  records.forEach((r) => {
    const key = r.exercise.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, r.exercise);
    }
  });

  if (typeof DEFAULT_EXERCISES !== 'undefined') {
    DEFAULT_EXERCISES.forEach((name) => {
      const key = name.toLowerCase();
      if (!seen.has(key)) seen.set(key, name);
    });
  }

  // Limpa opções antigas.
  while (datalistExercise.firstChild) {
    datalistExercise.removeChild(datalistExercise.firstChild);
  }

  // Adiciona opções ordenadas alfabeticamente.
  const sorted = Array.from(seen.values()).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

  sorted.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    datalistExercise.appendChild(option);
  });
}

// ─────────────────────────────────────────────
// Backup — exportar / importar JSON
// ─────────────────────────────────────────────

/**
 * Exporta todos os registros para um arquivo .json baixável.
 */
function handleExport() {
  const records = getRecords();

  if (records.length === 0) {
    showStatus('Nenhum registro para exportar.', 'info');
    return;
  }

  const payload = {
    app:         'controle-de-cargas',
    version:     1,
    exportedAt:  new Date().toISOString(),
    records:     records,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const stamp = new Date().toISOString().slice(0, 10); // AAAA-MM-DD
  const link  = document.createElement('a');
  link.href      = url;
  link.download  = `controle-de-cargas-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showStatus(`Backup exportado (${records.length} registro(s)).`, 'success');
}

/**
 * Lê o arquivo escolhido, valida e mescla os registros com os existentes.
 * @param {Event} event
 */
function handleImportFile(event) {
  const file = event.target.files && event.target.files[0];
  // Permite reimportar o mesmo arquivo depois (limpa o valor do input).
  event.target.value = '';

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (err) {
      showStatus('Arquivo inválido: não é um JSON válido.', 'error');
      return;
    }

    // Aceita tanto o formato de backup { records: [...] } quanto um array puro.
    const incoming = Array.isArray(parsed)
      ? parsed
      : (parsed && Array.isArray(parsed.records) ? parsed.records : null);

    if (!incoming) {
      showStatus('Arquivo não reconhecido como backup do Controle de cargas.', 'error');
      return;
    }

    const valid = incoming.filter(isValidRecord);

    if (valid.length === 0) {
      showStatus('Nenhum registro válido encontrado no arquivo.', 'error');
      return;
    }

    const invalidCount = incoming.length - valid.length;
    const confirmed = window.confirm(
      `Importar backup?\n\n` +
      `Registros válidos no arquivo: ${valid.length}\n` +
      (invalidCount > 0 ? `Ignorados (inválidos): ${invalidCount}\n` : '') +
      `\nOs registros serão somados aos atuais (duplicatas são ignoradas). ` +
      `Nada do que você já tem será apagado.`
    );

    if (!confirmed) return;

    const result = mergeRecords(valid);

    if (!result.ok) {
      showStatus('Falha ao salvar os registros importados.', 'error');
      return;
    }

    refreshViews();
    const currentExercise = normalizeExerciseName(inputExercise.value);
    if (currentExercise) updateLastRecord(currentExercise);

    if (result.added === 0) {
      showStatus('Nenhum registro novo: todos já estavam no histórico.', 'info');
    } else {
      showStatus(`Importação concluída: ${result.added} novo(s) registro(s).`, 'success');
    }
  };

  reader.onerror = () => {
    showStatus('Não foi possível ler o arquivo.', 'error');
  };

  reader.readAsText(file);
}

// ─────────────────────────────────────────────
// Feedback de status
// ─────────────────────────────────────────────

/**
 * Exibe uma mensagem de status (sucesso, erro ou informação) por alguns segundos.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showStatus(message, type) {
  if (statusTimer) clearTimeout(statusTimer);

  setTextContent(statusMessage, message);
  statusMessage.className = `status-message status-${type}`;
  statusMessage.setAttribute('role', 'alert');
  statusMessage.classList.remove('hidden');

  statusTimer = setTimeout(() => {
    statusMessage.classList.add('hidden');
    setTextContent(statusMessage, '');
    statusMessage.removeAttribute('role');
  }, 4000);
}

// ─────────────────────────────────────────────
// Erros de campo
// ─────────────────────────────────────────────

/**
 * Exibe a mensagem de erro de um campo específico.
 * @param {HTMLElement} errorEl
 * @param {string} message
 */
function showFieldError(errorEl, message) {
  setTextContent(errorEl, message);
  errorEl.classList.remove('hidden');
  errorEl.setAttribute('role', 'alert');
}

/**
 * Limpa todas as mensagens de erro dos campos.
 */
function clearFieldErrors() {
  [errorExercise, errorWeight, errorReps, errorSets].forEach((el) => {
    setTextContent(el, '');
    el.classList.add('hidden');
    el.removeAttribute('role');
  });
}

// ─────────────────────────────────────────────
// Tema claro / escuro
// ─────────────────────────────────────────────

function initTheme() {
  updateThemeToggleState();
  // Acompanha mudanças do sistema enquanto o usuário não escolher manualmente.
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (!document.documentElement.getAttribute('data-theme')) {
        updateThemeToggleState();
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', listener);
    else if (mq.addListener) mq.addListener(listener);
  }
}

/**
 * Tema efetivo atual: preferência salva, ou a do sistema.
 * @returns {'dark'|'light'}
 */
function currentTheme() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  const prefersDark = window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignora */ }
  updateThemeToggleState();
}

function updateThemeToggleState() {
  themeToggle.setAttribute('aria-pressed', String(currentTheme() === 'dark'));
}

// ─────────────────────────────────────────────
// Progresso — seletor, comparação e gráficos
// ─────────────────────────────────────────────

/**
 * Renderiza a seção de progresso para o exercício escolhido (ou o padrão).
 * @param {string} [preferred]
 */
function renderProgress(preferred) {
  const records   = getRecords();
  const exercises = getChartExercises(records);

  // Sem nenhuma série de trabalho: esconde a seção inteira.
  if (exercises.length === 0) {
    progressSection.classList.add('hidden');
    return;
  }
  progressSection.classList.remove('hidden');

  const wanted = preferred || chartExercise.value;
  populateChartSelect(exercises, wanted);
  const selected = chartExercise.value;

  const progression = buildProgression(records, selected);
  const weekly      = buildWeeklyVolume(records, selected);
  const comparison  = buildComparison(records, selected);

  // Progressão em gráfico exige ao menos 2 dias de treino distintos.
  const enough = progression.length >= 2;
  progressEmpty.classList.toggle('hidden', enough);
  progressContent.classList.toggle('hidden', !enough);

  if (!enough) return;

  chartProgression.innerHTML = svgLineChart(progression, 'kg');
  chartVolume.innerHTML      = weekly.length ? svgBarChart(weekly) : '';
  renderComparison(comparison);
}

/**
 * Preenche o <select> de exercícios, preservando a seleção quando possível.
 */
function populateChartSelect(exercises, preferred) {
  const want = exercises.find((e) => exercisesMatch(e, preferred || '')) || exercises[0];

  while (chartExercise.firstChild) chartExercise.removeChild(chartExercise.firstChild);

  exercises.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (exercisesMatch(name, want)) opt.selected = true;
    chartExercise.appendChild(opt);
  });
}

/**
 * Preenche os cartões de comparação (semana atual vs anterior).
 */
function renderComparison(c) {
  setTextContent(statVolume, formatVolume(c.volCur));
  applyDelta(statVolumeDelta, c.volCur, c.volPrev, '%');

  setTextContent(statBest, c.bestCur > 0 ? formatWeight(Math.round(c.bestCur * 10) / 10) : '—');
  applyDelta(statBestDelta, c.bestCur, c.bestPrev, 'kg');

  setTextContent(statSets, String(c.setsCur));
}

/**
 * Formata e aplica a variação de um indicador num elemento, com seta e cor.
 * A seta (▲/▼) garante que a informação não dependa só da cor.
 * @param {HTMLElement} el
 * @param {number} cur
 * @param {number} prev
 * @param {'%'|'kg'} unit
 */
function applyDelta(el, cur, prev, unit) {
  el.classList.remove('stat-delta-up', 'stat-delta-down', 'stat-delta-muted');

  if (prev <= 0 && cur <= 0) {
    setTextContent(el, 'sem dados na semana anterior');
    el.classList.add('stat-delta-muted');
    return;
  }
  if (prev <= 0) {
    setTextContent(el, 'novidade nesta semana');
    el.classList.add('stat-delta-up');
    return;
  }

  const diff = cur - prev;
  const up   = diff > 0;

  let valueStr;
  if (unit === '%') {
    const pct = (diff / prev) * 100;
    if (Math.abs(pct) < 0.5) { setTextContent(el, 'igual à semana anterior'); el.classList.add('stat-delta-muted'); return; }
    valueStr = `${Math.abs(pct).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
  } else {
    const kg = Math.abs(diff);
    if (kg < 0.1) { setTextContent(el, 'igual à semana anterior'); el.classList.add('stat-delta-muted'); return; }
    valueStr = `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
  }

  setTextContent(el, `${up ? '▲' : '▼'} ${valueStr} vs. semana anterior`);
  el.classList.add(up ? 'stat-delta-up' : 'stat-delta-down');
}

// ─────────────────────────────────────────────
// Arranque
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
