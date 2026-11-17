/**
 * charts.js
 * Agregação dos dados e desenho dos gráficos em SVG puro (sem dependências).
 * Considera apenas séries de trabalho (ignora aquecimentos).
 * Depende de utils.js (carregado antes).
 */

// ─────────────────────────────────────────────
// Agregação
// ─────────────────────────────────────────────

/**
 * Lista de exercícios que possuem ao menos uma série de trabalho,
 * ordenada pelos mais frequentes primeiro.
 * @param {Array<Object>} records
 * @returns {Array<string>}
 */
function getChartExercises(records) {
  const counts = new Map(); // chave minúscula -> { name, count }
  records.forEach((r) => {
    if (isWarmup(r)) return;
    const key = r.exercise.toLowerCase();
    const entry = counts.get(key) || { name: r.exercise, count: 0 };
    entry.count++;
    counts.set(key, entry);
  });
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'))
    .map((e) => e.name);
}

/**
 * Séries de trabalho de um exercício, ordenadas por data.
 */
function workingSetsOf(records, exercise) {
  return records
    .filter((r) => !isWarmup(r) && exercisesMatch(r.exercise, exercise))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * Progressão do 1RM estimado: um ponto por dia de treino (o melhor do dia).
 * @returns {Array<{ms:number,label:string,value:number}>}
 */
function buildProgression(records, exercise) {
  const byDay = new Map(); // dia -> melhor 1RM
  workingSetsOf(records, exercise).forEach((r) => {
    const key = dayKey(r.createdAt);
    const oneRM = estimate1RM(r.weight, r.repetitions);
    if (!Number.isFinite(oneRM)) return;
    const prev = byDay.get(key);
    if (!prev || oneRM > prev.value) {
      byDay.set(key, { ms: new Date(r.createdAt).getTime(), label: formatDate(r.createdAt).slice(0, 5), value: oneRM });
    }
  });
  return Array.from(byDay.values()).sort((a, b) => a.ms - b.ms);
}

/**
 * Volume (carga × reps) somado por semana ISO, limitado às últimas N semanas com dados.
 * @returns {Array<{key:string,startMs:number,label:string,value:number}>}
 */
function buildWeeklyVolume(records, exercise, maxWeeks = 12) {
  const byWeek = new Map();
  workingSetsOf(records, exercise).forEach((r) => {
    const key = isoWeekKey(r.createdAt);
    const entry = byWeek.get(key) || { key, startMs: isoWeekStart(r.createdAt).getTime(), label: formatWeekLabel(r.createdAt), value: 0 };
    entry.value += r.weight * r.repetitions * getSets(r);
    byWeek.set(key, entry);
  });
  const all = Array.from(byWeek.values()).sort((a, b) => a.startMs - b.startMs);
  return all.slice(-maxWeeks);
}

/**
 * Comparação entre a semana atual e a anterior.
 * @returns {{volCur:number,volPrev:number,bestCur:number,bestPrev:number,setsCur:number}}
 */
function buildComparison(records, exercise) {
  const now = Date.now();
  const curKey  = isoWeekKey(now);
  const prevKey = isoWeekKey(now - 7 * 24 * 60 * 60 * 1000);

  const acc = {
    volCur: 0, volPrev: 0,
    bestCur: 0, bestPrev: 0,
    setsCur: 0,
  };

  workingSetsOf(records, exercise).forEach((r) => {
    const key = isoWeekKey(r.createdAt);
    const oneRM = estimate1RM(r.weight, r.repetitions);
    const sets  = getSets(r);
    if (key === curKey) {
      acc.volCur += r.weight * r.repetitions * sets;
      acc.setsCur += sets;
      if (oneRM > acc.bestCur) acc.bestCur = oneRM;
    } else if (key === prevKey) {
      acc.volPrev += r.weight * r.repetitions * sets;
      if (oneRM > acc.bestPrev) acc.bestPrev = oneRM;
    }
  });

  return acc;
}

// ─────────────────────────────────────────────
// Desenho — SVG (coordenadas internas fixas, escala via CSS)
// ─────────────────────────────────────────────

const CHART_W = 680;
const CHART_H = 260;
const M = { top: 16, right: 16, bottom: 30, left: 46 };
const PLOT_W = CHART_W - M.left - M.right;
const PLOT_H = CHART_H - M.top - M.bottom;

/**
 * Calcula marcações "redondas" para um eixo.
 * @returns {{min:number,max:number,ticks:number[]}}
 */
function niceScale(min, max, count = 4) {
  if (min === max) { min = Math.min(0, min); max = max + 1; }
  const range = max - min;
  const rawStep = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const niceNorm = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  const step = niceNorm * mag;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min: niceMin, max: niceMax, ticks };
}

function fmtAxisNumber(n) {
  if (Math.abs(n) >= 1000) return (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function svgOpen() {
  return `<svg class="chart" viewBox="0 0 ${CHART_W} ${CHART_H}" role="img" preserveAspectRatio="xMidYMid meet">`;
}

/**
 * Gráfico de linha (progressão de 1RM).
 * @param {Array<{label:string,value:number}>} points
 * @param {string} unit
 * @returns {string} SVG
 */
function svgLineChart(points, unit = 'kg') {
  const values = points.map((p) => p.value);
  const scale = niceScale(Math.min(...values), Math.max(...values), 4);
  const y = (v) => M.top + PLOT_H - ((v - scale.min) / (scale.max - scale.min)) * PLOT_H;
  const x = (i) => points.length === 1
    ? M.left + PLOT_W / 2
    : M.left + (i / (points.length - 1)) * PLOT_W;

  let svg = svgOpen();

  // Linhas de grade + rótulos do eixo Y
  scale.ticks.forEach((t) => {
    const yy = y(t);
    svg += `<line class="chart-grid" x1="${M.left}" y1="${yy.toFixed(1)}" x2="${M.left + PLOT_W}" y2="${yy.toFixed(1)}" />`;
    svg += `<text class="chart-axis" x="${M.left - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${fmtAxisNumber(t)}</text>`;
  });

  // Rótulos do eixo X (amostrados para não poluir)
  const stepX = Math.ceil(points.length / 7);
  points.forEach((p, i) => {
    if (i % stepX !== 0 && i !== points.length - 1) return;
    svg += `<text class="chart-axis" x="${x(i).toFixed(1)}" y="${CHART_H - 10}" text-anchor="middle">${p.label}</text>`;
  });

  // Linha
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  svg += `<path class="chart-line" d="${d}" fill="none" />`;

  // Pontos + tooltip nativo
  points.forEach((p, i) => {
    const cx = x(i).toFixed(1);
    const cy = y(p.value).toFixed(1);
    const val = p.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    svg += `<circle class="chart-dot" cx="${cx}" cy="${cy}" r="4"><title>${p.label} · ${val} ${unit}</title></circle>`;
  });

  svg += `</svg>`;
  return svg;
}

/**
 * Gráfico de barras (volume semanal). Base sempre em zero.
 * @param {Array<{label:string,value:number}>} bars
 * @returns {string} SVG
 */
function svgBarChart(bars) {
  const scale = niceScale(0, Math.max(...bars.map((b) => b.value)), 4);
  scale.min = 0;
  const y = (v) => M.top + PLOT_H - ((v - scale.min) / (scale.max - scale.min)) * PLOT_H;
  const band = PLOT_W / bars.length;
  const barW = Math.min(band * 0.6, 48);

  let svg = svgOpen();

  scale.ticks.forEach((t) => {
    const yy = y(t);
    svg += `<line class="chart-grid" x1="${M.left}" y1="${yy.toFixed(1)}" x2="${M.left + PLOT_W}" y2="${yy.toFixed(1)}" />`;
    svg += `<text class="chart-axis" x="${M.left - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${fmtAxisNumber(t)}</text>`;
  });

  const stepX = Math.ceil(bars.length / 8);
  bars.forEach((b, i) => {
    const cx = M.left + band * i + band / 2;
    const bx = cx - barW / 2;
    const by = y(b.value);
    const h = M.top + PLOT_H - by;
    const vol = formatVolume(b.value);
    svg += `<rect class="chart-bar" x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="4" ry="4"><title>Semana ${b.label} · ${vol}</title></rect>`;
    if (i % stepX === 0 || i === bars.length - 1) {
      svg += `<text class="chart-axis" x="${cx.toFixed(1)}" y="${CHART_H - 10}" text-anchor="middle">${b.label}</text>`;
    }
  });

  svg += `</svg>`;
  return svg;
}
