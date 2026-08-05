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
