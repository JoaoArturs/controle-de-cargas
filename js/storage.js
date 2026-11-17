/**
 * storage.js
 * Camada de acesso ao localStorage.
 * Toda leitura e escrita de dados passa por este módulo.
 */

const STORAGE_KEY = 'gymLoadRecords';

/**
 * Busca todos os registros do localStorage.
 * Retorna array vazio em caso de dado ausente ou corrompido.
 * @returns {Array<Object>}
 */
function getRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filtra registros que possuem os campos mínimos esperados.
    return parsed.filter(isValidRecord);
  } catch (err) {
    console.warn('[storage] Falha ao ler localStorage:', err);
    return [];
  }
}

/**
 * Salva o array de registros no localStorage.
 * @param {Array<Object>} records
 * @returns {boolean} true se gravou com sucesso.
 */
function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (err) {
    console.warn('[storage] Falha ao salvar no localStorage:', err);
    return false;
  }
}

/**
 * Adiciona um novo registro e persiste.
 * @param {Object} record
 * @returns {boolean} true se adicionado com sucesso.
 */
function addRecord(record) {
  const records = getRecords();
  records.push(record);
  return saveRecords(records);
}

/**
 * Atualiza (substitui) um registro existente pelo id e persiste.
 * @param {Object} updated Registro completo, com o mesmo id do original.
 * @returns {boolean} true se atualizado com sucesso.
 */
function updateRecord(updated) {
  const records = getRecords();
  const index = records.findIndex((r) => r.id === updated.id);
  if (index === -1) return false;
  records[index] = updated;
  return saveRecords(records);
}

/**
 * Remove um registro pelo id e persiste.
 * @param {string} id
 * @returns {boolean} true se removido com sucesso.
 */
function removeRecord(id) {
  const records = getRecords();
  const filtered = records.filter((r) => r.id !== id);
  if (filtered.length === records.length) {
    // Nenhum registro foi removido (id não encontrado).
    return false;
  }
  return saveRecords(filtered);
}

/**
 * Valida a estrutura mínima de um registro.
 * Protege contra dados corrompidos ou inválidos persistidos anteriormente.
 * @param {*} record
 * @returns {boolean}
 */
function isValidRecord(record) {
  if (!record || typeof record !== 'object') return false;
  if (typeof record.id !== 'string' || !record.id) return false;
  if (typeof record.exercise !== 'string' || !record.exercise.trim()) return false;
  if (typeof record.weight !== 'number' || !Number.isFinite(record.weight) || record.weight < 0) return false;
  if (typeof record.repetitions !== 'number' || !Number.isInteger(record.repetitions) || record.repetitions < 1) return false;
  if (typeof record.createdAt !== 'string' || isNaN(new Date(record.createdAt).getTime())) return false;
  // Campos opcionais (retrocompatíveis): se presentes, devem ser válidos.
  if ('warmup' in record && typeof record.warmup !== 'boolean') return false;
  if ('sets' in record && (!Number.isInteger(record.sets) || record.sets < 1)) return false;
  return true;
}

/**
 * Mescla registros importados com os existentes, evitando duplicatas por id.
 * Registros antigos sem o campo `warmup` são normalizados para `false`.
 * @param {Array<Object>} incoming
 * @returns {{ok: boolean, added: number, skipped: number, total: number}}
 */
function mergeRecords(incoming) {
  const current = getRecords();
  const existingIds = new Set(current.map((r) => r.id));

  let added = 0;
  let skipped = 0;

  incoming.forEach((record) => {
    if (existingIds.has(record.id)) {
      skipped++;
      return;
    }
    existingIds.add(record.id);
    current.push(normalizeRecord(record));
    added++;
  });

  const ok = added === 0 ? true : saveRecords(current);
  return { ok, added, skipped, total: current.length };
}

/**
 * Garante que um registro tenha o campo `warmup` como booleano.
 * @param {Object} record
 * @returns {Object}
 */
function normalizeRecord(record) {
  const sets = Number.isInteger(record.sets) && record.sets >= 1 ? record.sets : 1;
  return { ...record, warmup: record.warmup === true, sets };
}
