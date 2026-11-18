/**
 * Vistas 1 a 5 de la Interfaz de Usuario (Etapa 3).
 * Funciones puras que reciben el estado del store / snapshot / comparación y generan el HTML estructurado.
 * Toma como referencia estructural las 5 vistas del prototipo y las mejora con diseño moderno y responsivo.
 */
import { icon } from './icons.js';
import {
  renderDemandPreviewSVG, renderCashierQueueBarsSVG, renderWaitEvolutionSVG,
  renderGaugeSVG, renderUtilizationBarsSVG, renderDurationPieSVG,
  renderScenarioComparisonSVG, SERIES_COLORS,
} from './charts.js';
import { formatDuration } from '../utils/format.js';
import { LEGEND, STATE_COLORS } from '../modules/routeRenderer.js';
import { MAX_CASHIERS, SPEED_OPTIONS } from '../engine/config.js';
import { expectedArrivals } from '../engine/demand.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const VIEW_META = Object.freeze([
  { id: 'config', step: 1, title: 'CONF. INICIAL', short: 'Configuración', icon: 'sliders' },
  { id: 'live', step: 2, title: 'VISTA EN VIVO', short: 'En Vivo 2D', icon: 'map' },
  { id: 'metrics', step: 3, title: 'MÉTRICAS (TIEMPO REAL)', short: 'Métricas', icon: 'activity' },
  { id: 'results', step: 4, title: 'RESULTADOS FINALES', short: 'Resultados', icon: 'checkCircle' },
  { id: 'optimizer', step: 5, title: 'OPTIMIZADOR DE ESCENARIOS', short: 'Optimizador', icon: 'sparkles' },
]);

/** Clasifica el tiempo de espera promedio en BAJO / MEDIO / ALTO */
export function classifyWaitLevel(waitSec, targetSec = 120, maxSec = 480) {
  if (waitSec <= targetSec) return { label: 'BAJO', badgeClass: 'badge-low', dotColor: '#16a34a' };
  if (waitSec <= (targetSec + maxSec) / 2) return { label: 'MEDIO', badgeClass: 'badge-med', dotColor: '#f59e0b' };
  return { label: 'ALTO', badgeClass: 'badge-high', dotColor: '#ef4444' };
}

/** Barra inferior de progreso 1/5 … 5/5 idéntica al prototipo */
export function renderStepFooter(stepNumber) {
  const pct = (stepNumber / 5) * 100;
  return `<footer class="step-footer" aria-label="Progreso de vistas ${stepNumber} de 5">
    <div class="step-track"><div class="step-fill" style="width:${pct}%"></div></div>
    <span class="step-count">${stepNumber}/5</span>
  </footer>`;
}

/** Alertas de validación o avisos en vivo */
export function renderIssuesBanner(issues, notice) {
  const blocks = [];
  if (issues?.errors?.length) {
    blocks.push(`<div class="alert alert-error" role="alert">
      ${icon('alertTriangle', { size: 16 })}
      <div>${issues.errors.map((e) => `<div>${esc(e.message)}</div>`).join('')}</div>
    </div>`);
  }
  if (issues?.warnings?.length) {
    blocks.push(`<div class="alert alert-warn" role="status">
      ${icon('alertTriangle', { size: 16 })}
      <div>${issues.warnings.map((w) => `<div>${esc(w.message)}</div>`).join('')}</div>
    </div>`);
  }
  if (notice?.message) {
    blocks.push(`<div class="alert alert-${esc(notice.kind || 'info')}" role="status">
      <span>${esc(notice.message)}</span>
    </div>`);
  }
  return blocks.join('');
}

/* ============================================================================
 * VISTA 1: CONFIGURACIÓN INICIAL
 * ============================================================================ */
export function renderConfigView(state) {
  const cfg = state.config;
  const expected = Math.round(expectedArrivals(cfg));
  const isRunning = state.status === 'running' || state.status === 'paused';

  return `<section class="view-card" data-view="config" aria-label="Vista 1: Configuración Inicial">
    <header class="view-header">
      <span class="header-icon">${icon('sliders', { size: 18 })}</span>
      <h2 class="view-title">CONF. INICIAL</h2>
      <span class="header-tag">1/5</span>
    </header>

    <div class="view-body">
      <div class="section-subtitle">PARÁMETROS DE SIMULACIÓN</div>

      <!-- Presets rápidos -->
      <div class="preset-bar" role="group" aria-label="Perfiles predefinidos">
        <button type="button" class="chip-btn" data-action="preset" data-preset="tranquilo">Valle (2.5/m · 4 cajas)</button>
        <button type="button" class="chip-btn" data-action="preset" data-preset="normal">Estándar (4.5/m · 6 cajas)</button>
        <button type="button" class="chip-btn" data-action="preset" data-preset="horaPico">Hora Pico (Viernes 17h)</button>
      </div>

      <!-- Duración (minutos) -->
      <div class="param-card">
        <div class="param-label">
          <span>DURACIÓN (minutos):</span>
          <span class="param-hint">${(cfg.durationMin / 60).toFixed(1)} h simuladas</span>
        </div>
        <div class="stepper-row">
          <button type="button" class="step-btn" data-action="step-config" data-field="durationMin" data-delta="-15" aria-label="Disminuir duración">${icon('chevronLeft', { size: 18 })}</button>
          <div class="bracket-value">
            <span class="bracket">[</span>
            <input type="number" class="param-input" data-config-input="durationMin" min="1" max="720" step="15" value="${cfg.durationMin}" aria-label="Duración en minutos"/>
            <span class="bracket">]</span>
          </div>
          <button type="button" class="step-btn" data-action="step-config" data-field="durationMin" data-delta="15" aria-label="Aumentar duración">${icon('chevronRight', { size: 18 })}</button>
        </div>
      </div>

      <!-- Tasa de llegada base (clientes/min) -->
      <div class="param-card">
        <div class="param-label">
          <span>TASA LLEGADA BASE (clientes/min):</span>
          <span class="param-hint">E[N] ≈ ${expected} clientes</span>
        </div>
        <div class="stepper-row">
          <button type="button" class="step-btn" data-action="step-config" data-field="baseRate" data-delta="-0.5" aria-label="Disminuir tasa">${icon('chevronLeft', { size: 18 })}</button>
          <div class="bracket-value">
            <span class="bracket">[</span>
            <input type="number" class="param-input" data-config-input="baseRate" min="0.1" max="30" step="0.5" value="${Number(cfg.baseRate).toFixed(1)}" aria-label="Tasa base de llegada"/>
            <span class="bracket">]</span>
          </div>
          <button type="button" class="step-btn" data-action="step-config" data-field="baseRate" data-delta="0.5" aria-label="Aumentar tasa">${icon('chevronRight', { size: 18 })}</button>
        </div>
      </div>

      <!-- N° Cajeros Abiertos -->
      <div class="param-card">
        <div class="param-label">
          <span>N° CAJEROS ABIERTOS:</span>
          <span class="param-hint">Máx. ${MAX_CASHIERS} cajas</span>
        </div>
        <div class="stepper-row">
          <button type="button" class="step-btn" data-action="step-config" data-field="openCashiers" data-delta="-1" aria-label="Menos cajeros">${icon('chevronLeft', { size: 18 })}</button>
          <div class="bracket-value">
            <span class="bracket">[</span>
            <input type="number" class="param-input" data-config-input="openCashiers" min="1" max="${MAX_CASHIERS}" step="1" value="${cfg.openCashiers}" aria-label="Número de cajeros abiertos"/>
            <span class="bracket">]</span>
          </div>
          <button type="button" class="step-btn" data-action="step-config" data-field="openCashiers" data-delta="1" aria-label="Más cajeros">${icon('chevronRight', { size: 18 })}</button>
        </div>
      </div>

      <!-- Perfil Poisson No Homogéneo -->
      <div class="param-card">
        <div class="param-label">
          <span>PERFIL DE DEMANDA λ(t) (Poisson No Homogéneo):</span>
        </div>
        <div class="grid-3">
          <label class="mini-field">
            <span>Curva horaria</span>
            <select data-config-select="demandProfile" aria-label="Perfil de demanda">
              <option value="normal" ${cfg.demandProfile === 'normal' ? 'selected' : ''}>Pico tarde (Normal)</option>
              <option value="doble-pico" ${cfg.demandProfile === 'doble-pico' ? 'selected' : ''}>Doble pico (13h y 18h)</option>
              <option value="plano" ${cfg.demandProfile === 'plano' ? 'selected' : ''}>Homogéneo (Plano)</option>
            </select>
          </label>
          <label class="mini-field">
            <span>Hora inicio</span>
            <select data-config-select="startHour" aria-label="Hora de inicio">
              ${[8, 10, 12, 14, 16, 17, 18, 20].map((h) => `<option value="${h}" ${Math.floor(cfg.startHour) === h ? 'selected' : ''}>${String(h).padStart(2, '0')}:00 h</option>`).join('')}
            </select>
          </label>
          <label class="mini-field">
            <span>Tipo de día</span>
            <select data-config-select="dayType" aria-label="Tipo de día">
              <option value="laboral" ${cfg.dayType === 'laboral' ? 'selected' : ''}>Laboral (×0.9)</option>
              <option value="viernes" ${cfg.dayType === 'viernes' ? 'selected' : ''}>Viernes (×1.15)</option>
              <option value="sabado" ${cfg.dayType === 'sabado' ? 'selected' : ''}>Sábado (×1.30)</option>
              <option value="domingo" ${cfg.dayType === 'domingo' ? 'selected' : ''}>Domingo (×1.10)</option>
            </select>
          </label>
        </div>
        <div class="demand-preview">
          ${renderDemandPreviewSVG(cfg)}
        </div>
      </div>

      <!-- Tipo de fila: ÚNICA vs POR CAJA -->
      <div class="param-card">
        <div class="param-label"><span>TIPO DE FILA:</span></div>
        <div class="segmented" role="radiogroup" aria-label="Tipo de fila">
          <button type="button" class="seg-btn ${cfg.queueType === 'unica' ? 'active' : ''}" data-action="set-config" data-field="queueType" data-value="unica">ÚNICA</button>
          <button type="button" class="seg-btn ${cfg.queueType === 'por-caja' ? 'active' : ''}" data-action="set-config" data-field="queueType" data-value="por-caja">POR CAJA</button>
        </div>
      </div>

      <!-- Velocidad: x1, x5, x10 -->
      <div class="param-card">
        <div class="param-label"><span>VELOCIDAD:</span></div>
        <div class="segmented" role="radiogroup" aria-label="Velocidad de simulación">
          ${SPEED_OPTIONS.map((s) => `<button type="button" class="seg-btn ${cfg.speed === s ? 'active' : ''}" data-action="set-speed" data-speed="${s}">x${s}</button>`).join('')}
        </div>
      </div>

      <!-- Parámetros avanzados de decisión en cajas -->
      <details class="advanced-box">
        <summary>Reglas avanzadas de decisión, retrasos y abandono</summary>
        <div class="grid-2">
          <label class="mini-field">
            <span>Prob. retraso cajera (precio)</span>
            <input type="number" data-config-input="delayProbability" min="0" max="1" step="0.02" value="${cfg.delayProbability}"/>
          </label>
          <label class="mini-field">
            <span>Umbral máx. espera (seg)</span>
            <input type="number" data-config-input="maxWaitSec" min="60" max="1800" step="30" value="${cfg.maxWaitSec}"/>
          </label>
          <label class="mini-field check-field">
            <input type="checkbox" data-config-check="abandonEnabled" ${cfg.abandonEnabled ? 'checked' : ''}/>
            <span>Permitir abandono por fila larga</span>
          </label>
          <label class="mini-field check-field">
            <input type="checkbox" data-config-check="jockeying" ${cfg.jockeying ? 'checked' : ''}/>
            <span>Cambio dinámico de fila (Jockeying)</span>
          </label>
        </div>
      </details>

      <div class="cta-stack">
        <button type="button" class="primary-btn" data-action="start-sim">
          ${icon('play', { size: 18 })}
          <span>${isRunning ? 'REINICIAR CON ESTOS PARÁMETROS' : 'INICIAR SIMULACIÓN'}</span>
        </button>
      </div>
    </div>

    ${renderStepFooter(1)}
  </section>`;
}

/* ============================================================================
 * VISTA 2: VISTA EN VIVO 2D
 * ============================================================================ */
export function renderLiveView(state, snapshot) {
  const cfg = state.config;
  const elapsed = snapshot?.elapsed ?? '00:00';
  const dayClock = snapshot?.clock ?? '14:00';
  const inStore = snapshot?.customers?.length ?? 0;
  const isRunning = state.status === 'running';
  const isPaused = state.status === 'paused';

  const counts = { comprando: 0, en_fila: 0, pagando: 0 };
  for (const c of snapshot?.customers ?? []) {
    if (c.state in counts) counts[c.state]++;
  }

  return `<section class="view-card" data-view="live" aria-label="Vista 2: Vista en Vivo 2D">
    <header class="view-header">
      <button type="button" class="icon-btn" data-action="navigate" data-target="config" title="Volver a Configuración">${icon('sliders', { size: 17 })}</button>
      <h2 class="view-title">VISTA EN VIVO</h2>
      <button type="button" class="icon-btn" data-action="step-config" data-field="openCashiers" data-delta="1" title="Abrir una caja en vivo">${icon('plus', { size: 18 })}</button>
    </header>

    <div class="view-body">
      <!-- Barra superior de reloj y velocidad -->
      <div class="live-toolbar">
        <div class="clock-pill">
          ${icon('clock', { size: 15 })}
          <span>RELOJ: <strong data-bind="live-elapsed">${esc(elapsed)}</strong></span>
          <span class="clock-day" data-bind="live-dayclock">(${esc(dayClock)})</span>
        </div>

        <div class="speed-controls">
          <button type="button" class="play-pause-btn" data-action="toggle-pause" title="${isRunning ? 'Pausar' : 'Reanudar'}">
            ${icon(isRunning ? 'pause' : 'play', { size: 15 })}
            <span>${isRunning ? 'Pausa' : isPaused ? 'Reanudar' : 'Iniciar'}</span>
          </button>
          <div class="speed-pills" role="group" aria-label="Velocidad en vivo">
            ${SPEED_OPTIONS.map((s) => `<button type="button" class="speed-pill ${state.speed === s ? 'active' : ''}" data-action="set-speed" data-speed="${s}">x${s}</button>`).join('')}
          </div>
        </div>
      </div>

      <!-- Contenedor del Lienzo (Canvas) con botones flotantes +/- cajas -->
      <div class="canvas-stage">
        <canvas id="supermarket-canvas" class="sim-canvas" width="600" height="500" aria-label="Mapa 2D animado del supermercado">
          Mapa 2D del supermercado: Entrada, Pasillos de productos unidireccionales y Zona de cajas 1 a ${cfg.openCashiers}.
        </canvas>

        <!-- Controles flotantes +/- cajas en vivo como en el prototipo -->
        <div class="floating-cashier-controls" role="group" aria-label="Control de cajas abiertas en vivo">
          <div class="floating-badge" data-bind="live-cashier-label">CAJAS 1-${cfg.openCashiers}</div>
          <button type="button" class="fab-btn" data-action="step-config" data-field="openCashiers" data-delta="1" title="Abrir caja (+1)" aria-label="Abrir caja">${icon('plus', { size: 18 })}</button>
          <button type="button" class="fab-btn" data-action="step-config" data-field="openCashiers" data-delta="-1" title="Cerrar caja (-1)" aria-label="Cerrar caja">${icon('minus', { size: 18 })}</button>
        </div>
      </div>

      <!-- Leyenda de estado de los clientes -->
      <div class="legend-bar" aria-label="Leyenda de estados de clientes">
        ${LEGEND.map((item) => `<div class="legend-item">
          <span class="legend-dot" style="background:${item.color}"></span>
          <span>${esc(item.label)}: <strong data-bind="count-${item.state}">${counts[item.state] ?? 0}</strong></span>
        </div>`).join('')}
        <div class="legend-item">
          <span class="legend-dot" style="background:${STATE_COLORS.saliendo}"></span>
          <span>En tienda: <strong data-bind="count-total">${inStore}</strong></span>
        </div>
      </div>

      <!-- Controles rápidos en vivo (Fila Única / Por Caja y Tasa) -->
      <div class="live-quick-bar">
        <div class="quick-toggle">
          <span>Fila en vivo:</span>
          <button type="button" class="mini-seg ${cfg.queueType === 'unica' ? 'active' : ''}" data-action="set-config" data-field="queueType" data-value="unica">Única</button>
          <button type="button" class="mini-seg ${cfg.queueType === 'por-caja' ? 'active' : ''}" data-action="set-config" data-field="queueType" data-value="por-caja">Por Caja</button>
        </div>
        <button type="button" class="ghost-btn" data-action="finish-now" title="Adelantar hasta el final">
          ${icon('fastForward', { size: 15 })}
          <span>Completar corrida</span>
        </button>
      </div>

      <div class="cta-stack">
        <button type="button" class="primary-btn" data-action="navigate" data-target="metrics">
          ${icon('activity', { size: 18 })}
          <span>VER MÉTRICAS</span>
        </button>
      </div>
    </div>

    ${renderStepFooter(2)}
  </section>`;
}

/* ============================================================================
 * VISTA 3: PANEL DE MÉTRICAS EN TIEMPO REAL
 * ============================================================================ */
export function renderMetricsView(state) {
  const m = state.metrics;
  const cfg = state.config;
  const avgWaitSec = m?.avgWaitSec ?? 0;
  const level = classifyWaitLevel(avgWaitSec, cfg.satisfactionTargetSec, cfg.maxWaitSec);
  const served = m?.served ?? 0;
  const satPct = m?.satisfactionPct ?? 100;
  const utilPct = m?.avgUtilizationPct ?? 0;
  const abandoned = m?.abandoned ?? 0;
  const openCount = m?.openCashiers ?? cfg.openCashiers;

  return `<section class="view-card" data-view="metrics" aria-label="Vista 3: Panel de Métricas en Tiempo Real">
    <header class="view-header">
      <button type="button" class="icon-btn" data-action="navigate" data-target="live" title="Volver a Vista en Vivo">${icon('chevronLeft', { size: 18 })}</button>
      <h2 class="view-title">MÉTRICAS <small>(TIEMPO REAL)</small></h2>
      <span class="header-tag">${esc(m?.clock ?? '14:00')}</span>
    </header>

    <div class="view-body">
      <!-- Indicador principal: Tiempo de Espera Promedio -->
      <div class="kpi-hero ${level.badgeClass}">
        <div class="kpi-hero-label">TIEMPO ESPERA PROM:</div>
        <div class="kpi-hero-row">
          <span class="kpi-hero-value" data-bind="metric-avg-wait">${formatDuration(avgWaitSec)}</span>
          <span class="status-pill">
            <span class="status-dot" style="background:${level.dotColor}"></span>
            <strong data-bind="metric-wait-level">${level.label}</strong>
          </span>
        </div>
      </div>

      <!-- Gráfico de barras: Filas Cajas 1-N -->
      <div class="chart-card">
        <div class="chart-title">
          <span>FILAS CAJAS 1-${openCount}</span>
          <span class="chart-meta">En cola: <strong>${m?.inQueue ?? 0}</strong> · Pico: <strong>${m?.peakQueue ?? 0}</strong></span>
        </div>
        <div data-bind="chart-cashier-bars">
          ${renderCashierQueueBarsSVG(m?.cashiers ?? [])}
        </div>
      </div>

      <!-- KPIs duales: Clientes atendidos y Satisfacción -->
      <div class="kpi-grid-2">
        <div class="stat-box">
          <div class="stat-label">CLIENTES ATENDIDOS:</div>
          <div class="stat-value" data-bind="metric-served">${served}</div>
          <div class="stat-sub">Llegadas: ${m?.arrivals ?? 0} · Abandonos: ${abandoned}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">SATISFACCIÓN:</div>
          <div class="stat-value" data-bind="metric-satisfaction">${satPct.toFixed(0)}%</div>
          <div class="stat-sub">Meta ≤ ${formatDuration(cfg.satisfactionTargetSec)}</div>
        </div>
      </div>

      <!-- Gráfico de línea: Evolución Espera -->
      <div class="chart-card">
        <div class="chart-title">
          <span>EVOLUCIÓN ESPERA</span>
          <span class="chart-meta">P95: ${formatDuration(m?.p95WaitSec ?? 0)}</span>
        </div>
        <div data-bind="chart-wait-evolution">
          ${renderWaitEvolutionSVG(m?.series ?? [])}
        </div>
      </div>

      <!-- Ocupación Cajeros (Gauges semicirculares) -->
      <div class="chart-card">
        <div class="chart-title">
          <span>OCUPACIÓN CAJEROS: <strong data-bind="metric-utilization">${utilPct.toFixed(0)}%</strong></span>
          <span class="chart-meta">Cambios de fila: ${m?.jockeyCount ?? 0}</span>
        </div>
        <div class="gauges-row">
          ${renderGaugeSVG(utilPct, 'Ocupación Cajeros')}
          ${renderGaugeSVG(satPct, 'Índice Satisfacción')}
        </div>
      </div>

      <div class="cta-stack">
        <button type="button" class="primary-btn" data-action="view-summary">
          ${icon('checkCircle', { size: 18 })}
          <span>VER RESUMEN</span>
        </button>
      </div>
    </div>

    ${renderStepFooter(3)}
  </section>`;
}

/* ============================================================================
 * VISTA 4: RESULTADOS FINALES
 * ============================================================================ */
export function renderResultsView(state) {
  const rep = state.report;
  const m = rep?.summary ?? state.metrics;
  const cashiers = rep?.cashiers ?? state.metrics?.cashiers?.filter((k) => k.openSec > 0) ?? [];
  const avgWait = m?.avgWaitSec ?? 0;
  const maxWait = m?.maxWaitSec ?? 0;
  const served = m?.served ?? 0;
  const totalDelaySec = cashiers.reduce((s, k) => s + (k.delaySec || 0), 0);
  const scenarioDefaultName = rep?.label ?? `${state.config.openCashiers} Cajas (${state.config.queueType === 'unica' ? 'Fila Única' : 'Por Caja'})`;

  return `<section class="view-card" data-view="results" aria-label="Vista 4: Resultados Finales">
    <header class="view-header">
      <button type="button" class="icon-btn" data-action="navigate" data-target="metrics" title="Ver Métricas">${icon('chevronLeft', { size: 18 })}</button>
      <h2 class="view-title">RESULTADOS FINALES</h2>
      <span class="header-tag">${rep ? 'Completado' : 'Parcial'}</span>
    </header>

    <div class="view-body">
      ${!rep ? `<div class="alert alert-info">
        <span>La simulación sigue en curso o no ha concluido. Puedes finalizarla ahora para consolidar el reporte final.</span>
        <button type="button" class="chip-btn" data-action="finish-now">Terminar ahora</button>
      </div>` : ''}

      <div class="result-kpi-card">
        <div class="result-kpi-label">TIEMPO ESPERA PROM:</div>
        <div class="result-kpi-big" data-bind="res-avg-wait">${formatDuration(avgWait)}</div>
        <div class="result-kpi-sub">P95: ${formatDuration(m?.p95WaitSec ?? 0)} · Tiempo en tienda prom: ${formatDuration(m?.avgSystemTimeSec ?? 0)}</div>
      </div>

      <div class="result-kpi-card">
        <div class="result-kpi-label">ESPERA MÁXIMA:</div>
        <div class="result-kpi-big" data-bind="res-max-wait">${formatDuration(maxWait)}</div>
        <div class="result-kpi-sub">Pico máximo en fila: ${m?.peakQueue ?? 0} clientes</div>
      </div>

      <div class="result-kpi-card">
        <div class="result-kpi-label">CLIENTES TOTALES ATENDIDOS:</div>
        <div class="result-kpi-big" data-bind="res-served">${served}</div>
        <div class="result-kpi-sub">Llegadas: ${m?.arrivals ?? 0} · Abandonos: ${m?.abandoned ?? 0} (${(m?.abandonRatePct ?? 0).toFixed(1)}%) · Satisfacción: ${(m?.satisfactionPct ?? 100).toFixed(0)}%</div>
      </div>

      <!-- Utilización Cajas (%) -->
      <div class="chart-card">
        <div class="chart-title">
          <span>UTILIZACIÓN CAJAS (%)</span>
          <span class="chart-meta">Promedio: ${(m?.avgUtilizationPct ?? 0).toFixed(0)}%</span>
        </div>
        ${renderUtilizationBarsSVG(cashiers)}
      </div>

      <!-- Duración Cajas (Inactiva / Ocupada / Verificando) -->
      <div class="chart-card pie-card">
        <div class="pie-info">
          <div class="chart-title"><span>DURACIÓN CAJAS</span></div>
          <p class="pie-sub">(Inactiva / Ocupada / Retrasos)</p>
          <ul class="pie-legend">
            <li><span class="dot" style="background:#16a34a"></span>Atendiendo: ${formatDuration(Math.max(0, (m?.busySecTotal ?? 0) - totalDelaySec))}</li>
            <li><span class="dot" style="background:#f59e0b"></span>Verificando precio: ${formatDuration(totalDelaySec)}</li>
            <li><span class="dot" style="background:#cbd5e1"></span>Inactiva: ${formatDuration(m?.idleSecTotal ?? 0)}</li>
          </ul>
        </div>
        <div class="pie-wrap">
          ${renderDurationPieSVG({ busySec: m?.busySecTotal ?? 0, idleSec: m?.idleSecTotal ?? 0, delaySec: totalDelaySec })}
        </div>
      </div>

      <!-- Guardar escenario en el historial -->
      <div class="save-scenario-bar">
        <input type="text" class="scenario-name-input" id="scenario-name-input" value="${esc(scenarioDefaultName)}" placeholder="Nombre del escenario (ej. 6 Cajas)" aria-label="Nombre del escenario"/>
        <button type="button" class="secondary-btn" data-action="save-scenario">
          ${icon('save', { size: 16 })}
          <span>GUARDAR ESCENARIO</span>
        </button>
      </div>

      <div class="cta-stack">
        <div class="btn-row-2">
          <button type="button" class="secondary-btn" data-action="export-csv">
            ${icon('download', { size: 16 })}
            <span>EXPORTAR CSV</span>
          </button>
          <button type="button" class="secondary-btn" data-action="export-json">
            ${icon('download', { size: 16 })}
            <span>EXPORTAR JSON</span>
          </button>
        </div>
        <button type="button" class="primary-btn" data-action="navigate" data-target="optimizer">
          ${icon('sparkles', { size: 18 })}
          <span>COMPARAR ESCENARIOS</span>
        </button>
      </div>
    </div>

    ${renderStepFooter(4)}
  </section>`;
}

/* ============================================================================
 * VISTA 5: COMPARADOR Y OPTIMIZADOR DE ESCENARIOS
 * ============================================================================ */
export function renderOptimizerView(state, comparison) {
  const rows = comparison?.rows ?? [];
  const chart = comparison?.chart ?? [];
  const rec = comparison?.recommendation ?? state.recommendation;
  const warnings = comparison?.warnings ?? [];
  const recommendedRow = rows.find((r) => r.id === rec?.recommendedId) ?? rows[0];

  return `<section class="view-card" data-view="optimizer" aria-label="Vista 5: Comparador y Optimizador de Escenarios">
    <header class="view-header">
      <button type="button" class="icon-btn" data-action="navigate" data-target="results" title="Volver a Resultados">${icon('chevronLeft', { size: 18 })}</button>
      <h2 class="view-title">OPTIMIZADOR DE ESCENARIOS</h2>
      <button type="button" class="icon-btn" data-action="clear-history" title="Limpiar historial">${icon('trash', { size: 16 })}</button>
    </header>

    <div class="view-body">
      <div class="optimizer-top">
        <div class="section-subtitle">OPTIMIZADOR DE ESCENARIOS</div>
        <button type="button" class="chip-btn accent" data-action="run-sweep" title="Simular 4, 6 y 8 cajas con la misma semilla">
          ${icon('sparkles', { size: 14 })}
          <span>Generar comparativa 4 vs 6 vs 8 Cajas</span>
        </button>
      </div>

      <!-- Píldoras RUN 1 (4 Cajas), RUN 2 (6 Cajas), RUN 3 (8 Cajas) -->
      <div class="run-pills" role="list" aria-label="Escenarios guardados">
        ${rows.length ? rows.map((r, idx) => {
          const isRec = r.id === rec?.recommendedId;
          const color = SERIES_COLORS[idx % SERIES_COLORS.length];
          return `<div class="run-pill ${isRec ? 'recommended' : ''}" role="listitem" style="border-color:${color}">
            <div class="run-pill-top">
              <span class="run-dot" style="background:${color}"></span>
              <strong>RUN ${idx + 1}</strong>
              <button type="button" class="run-del" data-action="delete-scenario" data-id="${esc(r.id)}" title="Eliminar escenario" aria-label="Eliminar ${esc(r.name)}">×</button>
            </div>
            <div class="run-pill-sub">(${r.cajas} Cajas · ${r.fila === 'unica' ? 'Única' : 'Por caja'})</div>
          </div>`;
        }).join('') : `<div class="empty-hint">No hay escenarios guardados. Pulsa "Generar comparativa 4 vs 6 vs 8 Cajas" o guarda tu corrida actual.</div>`}
      </div>

      <!-- Gráfica comparativa multi-línea -->
      <div class="chart-card">
        <div class="chart-title">
          <span>COMPARACIÓN DE ESPERA (seg por tramo)</span>
        </div>
        ${renderScenarioComparisonSVG(chart)}
      </div>

      <!-- Recomendación Óptima Automática -->
      <div class="recommendation-box ${rec?.viable === false ? 'warn' : ''}" role="region" aria-label="Recomendación automática del punto de equilibrio">
        <div class="rec-icon">${icon('lightbulb', { size: 24 })}</div>
        <div class="rec-content">
          <div class="rec-title">
            RECOMENDACIÓN ÓPTIMA:
            ${recommendedRow ? `<strong>${esc(recommendedRow.name)} (${recommendedRow.cajas} Cajas), EQUILIBRIO</strong>` : ''}
          </div>
          <p class="rec-reason" data-bind="optimizer-recommendation">${esc(rec?.reason ?? 'Ejecuta o guarda escenarios para calcular el punto de equilibrio.')}</p>
        </div>
      </div>

      ${warnings.length ? `<div class="alert alert-warn">
        ${icon('alertTriangle', { size: 15 })}
        <div>${warnings.map((w) => `<div>${esc(w)}</div>`).join('')}</div>
      </div>` : ''}

      <!-- Tabla comparativa de escenarios -->
      <div class="table-card">
        <div class="chart-title"><span>DATOS COMPARATIVOS DE ESCENARIOS</span></div>
        <div class="table-scroll">
          <table class="scenario-table" aria-label="Tabla comparativa de escenarios">
            <thead>
              <tr>
                <th>ESCENARIO</th>
                <th>PROMEDIO</th>
                <th>MÁX.</th>
                <th>ATENDIDOS</th>
                <th>SATISF.</th>
                <th>UTILIZ.</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map((r, idx) => {
                const isRec = r.id === rec?.recommendedId;
                return `<tr class="${isRec ? 'row-recommended' : ''}" data-scenario-id="${esc(r.id)}">
                  <td>
                    <span class="row-dot" style="background:${SERIES_COLORS[idx % SERIES_COLORS.length]}"></span>
                    <strong>${esc(r.name)}</strong>
                    ${isRec ? '<span class="opt-tag">ÓPTIMO</span>' : ''}
                  </td>
                  <td>${formatDuration(r.esperaPromSec)}</td>
                  <td>${formatDuration(r.esperaMaxSec)}</td>
                  <td>${r.atendidos}</td>
                  <td>${r.satisfaccionPct.toFixed(0)}%</td>
                  <td>${r.utilizacionPct.toFixed(0)}%</td>
                </tr>`;
              }).join('') : `<tr><td colspan="6" class="empty-cell">Sin datos para mostrar</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="cta-stack">
        <button type="button" class="secondary-btn" data-action="export-csv">
          ${icon('save', { size: 16 })}
          <span>GUARDAR / EXPORTAR COMPARATIVA (CSV)</span>
        </button>
        <button type="button" class="primary-btn" data-action="apply-recommended" ${recommendedRow ? `data-cajas="${recommendedRow.cajas}" data-fila="${recommendedRow.fila}"` : ''}>
          ${icon('checkCircle', { size: 18 })}
          <span>APLICAR CONFIG. ÓPTIMA Y SIMULAR</span>
        </button>
      </div>
    </div>

    ${renderStepFooter(5)}
  </section>`;
}

/**
 * Renderiza el contenedor completo de la aplicación:
 * - Modo pestaña enfocada (Mobile / Prototipo 1 a 5)
 * - Modo Dashboard simultáneo (Escritorio panorámico)
 */
export function renderAppShell(state, { snapshot = null, comparison = null, layoutMode = 'focused' } = {}) {
  const activeMeta = VIEW_META.find((v) => v.id === state.view) ?? VIEW_META[0];
  const statusLabels = { idle: 'Listo', running: 'Simulando en vivo', paused: 'En pausa', finished: 'Finalizado' };

  const navTabs = VIEW_META.map((v) => {
    const isActive = state.view === v.id;
    return `<button type="button" class="nav-tab ${isActive ? 'active' : ''}" data-action="navigate" data-target="${v.id}" aria-current="${isActive ? 'page' : 'false'}">
      <span class="nav-step">${v.step}</span>
      ${icon(v.icon, { size: 16 })}
      <span class="nav-label">${esc(v.short)}</span>
    </button>`;
  }).join('');

  let mainContent = '';
  if (layoutMode === 'dashboard') {
    mainContent = `<div class="dashboard-grid">
      <div class="dash-col">${renderConfigView(state)}</div>
      <div class="dash-col">${renderLiveView(state, snapshot)}</div>
      <div class="dash-col">${renderMetricsView(state)}</div>
      <div class="dash-col">${renderResultsView(state)}</div>
      <div class="dash-col dash-wide">${renderOptimizerView(state, comparison)}</div>
    </div>`;
  } else {
    switch (state.view) {
      case 'config': mainContent = renderConfigView(state); break;
      case 'live': mainContent = renderLiveView(state, snapshot); break;
      case 'metrics': mainContent = renderMetricsView(state); break;
      case 'results': mainContent = renderResultsView(state); break;
      case 'optimizer': mainContent = renderOptimizerView(state, comparison); break;
      default: mainContent = renderConfigView(state);
    }
  }

  return `<div class="app-wrapper" data-layout="${esc(layoutMode)}" data-status="${esc(state.status)}">
    <header class="top-navbar">
      <div class="brand">
        <div class="brand-logo">${icon('shoppingCart', { size: 20 })}</div>
        <div>
          <h1 class="brand-title">Simulador de Flujo de Supermercado</h1>
          <p class="brand-sub">Eventos Discretos · Poisson No Homogéneo · Rutas Fijas 2D</p>
        </div>
      </div>

      <nav class="view-nav" aria-label="Vistas del simulador">
        ${navTabs}
      </nav>

      <div class="top-actions">
        <span class="sim-status-badge status-${esc(state.status)}">${esc(statusLabels[state.status] ?? state.status)}</span>
        <button type="button" class="mode-toggle-btn" data-action="toggle-layout" title="Alternar entre Vista Prototipo (1-5) y Dashboard Multipanel">
          ${icon(layoutMode === 'dashboard' ? 'smartphone' : 'layoutGrid', { size: 16 })}
          <span>${layoutMode === 'dashboard' ? 'Modo Paso a Paso' : 'Modo Dashboard'}</span>
        </button>
      </div>
    </header>

    <div class="banners-area">
      ${renderIssuesBanner(state.issues, state.notice)}
    </div>

    <main class="main-stage" aria-label="${esc(activeMeta.title)}">
      ${mainContent}
    </main>
  </div>`;
}
