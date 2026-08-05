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
const datalistExercise = document.getElementById('exercise-suggestions');

const errorExercise    = document.getElementById('error-exercise');
const errorWeight      = document.getElementById('error-weight');
const errorReps        = document.getElementById('error-reps');

const statusMessage    = document.getElementById('status-message');

const lastRecordBox    = document.getElementById('last-record-box');
const lastRecordText   = document.getElementById('last-record-text');

const filterInput      = document.getElementById('filter-input');
const historyBody      = document.getElementById('history-body');
const emptyHistory     = document.getElementById('empty-history');
const emptyFilter      = document.getElementById('empty-filter');
const historyTable     = document.getElementById('history-table');

// ─────────────────────────────────────────────
// Estado da aplicação
// ─────────────────────────────────────────────

let statusTimer = null; // Referência ao temporizador de mensagem de status.

// ─────────────────────────────────────────────
// Inicialização
// ─────────────────────────────────────────────

/**
 * Ponto de entrada — chamado quando o DOM estiver pronto.
 */
function init() {
  renderHistory();
  updateExerciseSuggestions();
  attachEvents();
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

  const weight = parseWeight(weightRaw);
  const reps   = parseReps(repsRaw);

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

  if (hasError) return;

  // Cria e persiste o registro.
  const record = {
    id:          generateId(),
    exercise:    exercise,
    weight:      weight,
    repetitions: reps,
    createdAt:   new Date().toISOString(),
  };

  const saved = addRecord(record);

  if (!saved) {
    showStatus('Erro ao salvar o registro. Verifique o armazenamento do navegador.', 'error');
    return;
  }

  // Atualiza interface.
  renderHistory();
  updateExerciseSuggestions();
  updateLastRecord(exercise);

  // Limpa carga e repetições, mantém exercício.
  inputWeight.value = '';
  inputReps.value   = '';

  showStatus(`Série de "${exercise}" salva com sucesso!`, 'success');

  // Foco no campo de carga para facilitar nova série.
  inputWeight.focus();
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
  // Ordena pelo mais recente e busca o primeiro que corresponde ao exercício.
  const sorted = records
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const last = sorted.find((r) => exercisesMatch(r.exercise, exercise));

  lastRecordBox.classList.remove('hidden');

  if (!last) {
    setTextContent(lastRecordText, 'Nenhum registro anterior para este exercício.');
    lastRecordBox.setAttribute('data-state', 'empty');
  } else {
    const date = formatDate(last.createdAt);
    const time = formatTime(last.createdAt);
    setTextContent(
      lastRecordText,
      `${formatWeight(last.weight)} × ${formatReps(last.repetitions)} em ${date} às ${time}`
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

  filtered.forEach((record) => {
    const row = buildHistoryRow(record);
    historyBody.appendChild(row);
  });
}

/**
 * Constrói uma linha de tabela para um registro.
 * Usa createElement + textContent — sem innerHTML.
 * @param {Object} record
 * @returns {HTMLTableRowElement}
 */
function buildHistoryRow(record) {
  const tr = document.createElement('tr');

  const tdDate     = createTd(formatDate(record.createdAt), 'Data');
  const tdTime     = createTd(formatTime(record.createdAt), 'Horário');
  const tdExercise = createTd(record.exercise,              'Exercício');
  const tdWeight   = createTd(formatWeight(record.weight),  'Carga');
  const tdReps     = createTd(formatReps(record.repetitions), 'Repetições');

  // Célula com botão de exclusão.
  const tdAction = document.createElement('td');
  tdAction.className = 'td-action';

  const btn = document.createElement('button');
  btn.className = 'btn-delete';
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', `Excluir registro de ${record.exercise}`);
  btn.textContent = 'Excluir';
  btn.addEventListener('click', () => handleDelete(record));

  tdAction.appendChild(btn);

  tr.appendChild(tdDate);
  tr.appendChild(tdTime);
  tr.appendChild(tdExercise);
  tr.appendChild(tdWeight);
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

  renderHistory();
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

  // Coleta nomes únicos (case-insensitive), preservando a capitalização do último registro.
  const seen = new Map();
  records.forEach((r) => {
    const key = r.exercise.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, r.exercise);
    }
  });

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
  [errorExercise, errorWeight, errorReps].forEach((el) => {
    setTextContent(el, '');
    el.classList.add('hidden');
    el.removeAttribute('role');
  });
}

// ─────────────────────────────────────────────
// Arranque
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
