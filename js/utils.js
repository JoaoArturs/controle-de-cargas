/**
 * utils.js
 * Funções auxiliares puras — sem acesso ao DOM ou ao localStorage.
 */

/**
 * Formata uma string ISO 8601 para data no padrão brasileiro.
 * @param {string} isoString
 * @returns {string} Ex.: "05/08/2026"
 */
function formatDate(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  const day   = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year  = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Retorna o dia da semana por extenso, capitalizado (pt-BR).
 * @param {string} isoString
 * @returns {string} Ex.: "Segunda-feira"
 */
function formatWeekday(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const wd = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

/**
 * Formata uma string ISO 8601 para horário no padrão HH:MM.
 * @param {string} isoString
 * @returns {string} Ex.: "18:05"
 */
function formatTime(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  const hours   = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formata um número de carga para o padrão brasileiro.
 * @param {number} weight
 * @returns {string} Ex.: "22,5 kg"
 */
function formatWeight(weight) {
  const formatted = Number(weight).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} kg`;
}

/**
 * Formata a quantidade de repetições com plural correto.
 * @param {number} reps
 * @returns {string} Ex.: "8 repetições" ou "1 repetição"
 */
function formatReps(reps) {
  return reps === 1 ? '1 repetição' : `${reps} repetições`;
}

/**
 * Normaliza o nome de um exercício: trim e capitaliza a primeira letra.
 * Não força capitalização do restante para preservar siglas e nomes compostos.
 * @param {string} name
 * @returns {string}
 */
function normalizeExerciseName(name) {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Compara dois nomes de exercício sem diferenciar maiúsculas/minúsculas.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function exercisesMatch(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Verifica se um nome de exercício contém a string de busca (case-insensitive).
 * @param {string} exerciseName
 * @param {string} query
 * @returns {boolean}
 */
function exerciseContains(exerciseName, query) {
  return exerciseName.toLowerCase().includes(query.trim().toLowerCase());
}

/**
 * Converte de forma segura uma string para número de ponto flutuante.
 * Aceita vírgula ou ponto como separador decimal.
 * @param {string|number} value
 * @returns {number} NaN se inválido.
 */
function parseWeight(value) {
  if (typeof value === 'number') return value;
  const normalized = String(value).trim().replace(',', '.');
  return parseFloat(normalized);
}

/**
 * Converte de forma segura uma string para número inteiro.
 * @param {string|number} value
 * @returns {number} NaN se inválido.
 */
function parseReps(value) {
  if (typeof value === 'number') return Math.trunc(value);
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? Math.trunc(parsed) : NaN;
}

/**
 * Indica se um registro é uma série de aquecimento.
 * Retrocompatível: registros antigos sem o campo contam como série de trabalho.
 * @param {Object} record
 * @returns {boolean}
 */
function isWarmup(record) {
  return record && record.warmup === true;
}

/**
 * Número de séries iguais de um registro.
 * Retrocompatível: registros antigos sem o campo contam como 1 série.
 * @param {Object} record
 * @returns {number}
 */
function getSets(record) {
  const n = record && record.sets;
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/**
 * Estima a carga máxima para 1 repetição (1RM) pela fórmula de Epley.
 * Permite comparar séries de faixas de repetição diferentes numa escala só.
 * @param {number} weight
 * @param {number} reps
 * @returns {number} 1RM estimado em kg (NaN se entrada inválida).
 */
function estimate1RM(weight, reps) {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || reps < 1) return NaN;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Retorna a data (00:00) da segunda-feira da semana ISO de uma data.
 * @param {Date|string|number} value
 * @returns {Date}
 */
function isoWeekStart(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  // getDay: 0=domingo … 6=sábado. Queremos segunda como início.
  const day = (d.getDay() + 6) % 7; // 0=segunda … 6=domingo
  d.setDate(d.getDate() - day);
  return d;
}

/**
 * Chave ordenável da semana ISO (baseada na segunda-feira): "AAAA-MM-DD".
 * @param {Date|string|number} value
 * @returns {string}
 */
function isoWeekKey(value) {
  const start = isoWeekStart(value);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Rótulo curto de uma semana a partir da data de início: "dd/mm".
 * @param {Date|string|number} weekStart
 * @returns {string}
 */
function formatWeekLabel(weekStart) {
  const d = new Date(weekStart);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Chave de dia (AAAA-MM-DD) no fuso local, para agrupar séries por sessão.
 * @param {Date|string|number} value
 * @returns {string}
 */
function dayKey(value) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formata um número grande de volume de forma compacta (ex.: 12.500 → "12,5 mil kg").
 * @param {number} value
 * @returns {string}
 */
function formatVolume(value) {
  const n = Number(value) || 0;
  if (n >= 1000) {
    const k = n / 1000;
    return `${k.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil kg`;
  }
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;
}

/**
 * Cria um nó de texto seguro — evita XSS ao inserir conteúdo do usuário.
 * @param {string} text
 * @returns {Text}
 */
function safeText(text) {
  return document.createTextNode(String(text));
}

/**
 * Define o textContent de um elemento de forma segura.
 * @param {HTMLElement} element
 * @param {string} text
 */
function setTextContent(element, text) {
  element.textContent = String(text);
}

/**
 * Gera um identificador único baseado em timestamp e número aleatório.
 * @returns {string}
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
