/**
 * Integración de Interfaz (Etapa 3): conecta Store + SimulationController + MapRenderer + ScenarioHistory
 * con las 5 vistas mejoradas de la UI.
 */
import { createAppStore, Actions } from '../modules/store.js';
import { SimulationController } from '../modules/simulationController.js';
import { ScenarioHistory } from '../modules/scenarioHistory.js';
import { MapRenderer } from '../modules/routeRenderer.js';
import { PRESET_CONFIGS, seedDemoHistory } from '../data/testData.js';
import { renderAppShell } from './views.js';

export class SupermarketApp {
  constructor(root, {
    store = createAppStore(),
    storage,
    history,
    controller,
    seedIfEmpty = true,
    initialLayoutMode = 'focused',
  } = {}) {
    this.root = root;
    this.store = store;
    const resolvedStorage = storage ?? (typeof window !== 'undefined' && window.localStorage ? window.localStorage : undefined);
    this.history = history ?? new ScenarioHistory({ storage: resolvedStorage });
    this.controller = controller ?? new SimulationController({ store: this.store, history: this.history, metricsEveryMs: 350 });
    this.layoutMode = initialLayoutMode;
    this.renderer = null;
    this._canvasRaf = null;
    this._unsubscribe = null;

    if (seedIfEmpty && this.history.list().length === 0) {
      seedDemoHistory(this.history, PRESET_CONFIGS.normal, [4, 6, 8]);
      this.controller.refreshHistory();
    }
  }

  mount() {
    this._bindEvents();
    this._unsubscribe = this.store.subscribe(() => this.render());
    this.render();
    this._startCanvasLoop();
    if (typeof window !== 'undefined') {
      this._onResize = () => { if (this.renderer) this.renderer.resize(); };
      window.addEventListener('resize', this._onResize);
    }
    return this;
  }

  unmount() {
    if (this._unsubscribe) this._unsubscribe();
    if (this._canvasRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._canvasRaf);
    if (this._onResize && typeof window !== 'undefined') window.removeEventListener('resize', this._onResize);
    this.controller.pause();
  }

  render() {
    if (!this.root) return;
    // Evitar destruir un input numérico si el usuario está escribiendo activamente en él
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (active && this.root.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'SELECT') && this.store.getState().status === 'running') {
      this._patchLiveCounters();
      return;
    }

    const state = this.store.getState();
    const snapshot = this.controller.getSnapshot();
    const comparison = this.history.compare();

    this.root.innerHTML = renderAppShell(state, {
      snapshot,
      comparison,
      layoutMode: this.layoutMode,
    });

    this._attachCanvas(snapshot);
  }

  _attachCanvas(snapshot) {
    if (!this.root || typeof HTMLCanvasElement === 'undefined') return;
    const canvas = this.root.querySelector('#supermarket-canvas');
    if (!canvas) {
      this.renderer = null;
      return;
    }
    const layout = this.controller.layout;
    if (!layout) return;
    this.renderer = new MapRenderer(canvas, layout);
    if (snapshot) this.renderer.draw(snapshot);
  }

  _startCanvasLoop() {
    if (typeof requestAnimationFrame !== 'function') return;
    const tick = () => {
      if (this.renderer && this.controller.sim) {
        const snap = this.controller.getSnapshot();
        if (snap) {
          this.renderer.draw(snap);
          this._patchLiveCounters(snap);
        }
      }
      this._canvasRaf = requestAnimationFrame(tick);
    };
    this._canvasRaf = requestAnimationFrame(tick);
  }

  _patchLiveCounters(snap = this.controller.getSnapshot()) {
    if (!this.root || !snap) return;
    const set = (sel, text) => {
      const el = this.root.querySelector(`[data-bind="${sel}"]`);
      if (el && el.textContent !== String(text)) el.textContent = String(text);
    };
    set('live-elapsed', snap.elapsed);
    set('live-dayclock', `(${snap.clock})`);
    const counts = { comprando: 0, en_fila: 0, pagando: 0 };
    for (const c of snap.customers) if (c.state in counts) counts[c.state]++;
    set('count-comprando', counts.comprando);
    set('count-en_fila', counts.en_fila);
    set('count-pagando', counts.pagando);
    set('count-total', snap.customers.length);
  }

  /** Despacha una acción de interfaz por nombre y dataset (también invocable en tests sin DOM). */
  handleAction(action, data = {}) {
    const state = this.store.getState();
    const cfg = state.config;

    switch (action) {
      case 'navigate':
        if (data.target) this.store.dispatch(Actions.navigate(data.target));
        break;

      case 'toggle-layout':
        this.layoutMode = this.layoutMode === 'dashboard' ? 'focused' : 'dashboard';
        this.render();
        break;

      case 'preset': {
        const p = PRESET_CONFIGS[data.preset];
        if (p) this.controller.updateLiveConfig(p);
        break;
      }

      case 'step-config': {
        const field = data.field;
        const delta = Number(data.delta) || 0;
        const current = Number(cfg[field]) || 0;
        const nextVal = Number((current + delta).toFixed(2));
        this.controller.updateLiveConfig({ [field]: nextVal });
        break;
      }

      case 'set-config': {
        const field = data.field;
        let val = data.value;
        if (field === 'openCashiers' || field === 'durationMin' || field === 'baseRate' || field === 'startHour') {
          val = Number(val);
        }
        this.controller.updateLiveConfig({ [field]: val });
        break;
      }

      case 'set-speed':
        this.controller.setSpeed(Number(data.speed));
        break;

      case 'start-sim':
        this.controller.start();
        break;

      case 'toggle-pause':
        if (state.status === 'idle' || state.status === 'finished') this.controller.start();
        else this.controller.toggle();
        break;

      case 'finish-now':
        if (!this.controller.sim) this.controller.start();
        this.controller.finishNow();
        break;

      case 'view-summary':
        if (this.controller.sim && !this.controller.sim.finished) {
          this.controller.finishNow();
        } else {
          this.store.dispatch(Actions.navigate('results'));
        }
        break;

      case 'save-scenario': {
        const input = this.root?.querySelector('#scenario-name-input');
        const name = data.name ?? input?.value?.trim() ?? undefined;
        if (this.controller.sim && !this.controller.sim.finished) {
          this.controller.finishNow();
        }
        this.controller.saveCurrentScenario(name);
        break;
      }

      case 'run-sweep': {
        const base = { ...state.config };
        this.history.clear();
        seedDemoHistory(this.history, base, [4, 6, 8]);
        this.controller.refreshHistory();
        this.store.dispatch(Actions.notice('Comparativa de 4, 6 y 8 cajas generada con la misma demanda.', 'success'));
        break;
      }

      case 'delete-scenario':
        if (data.id) {
          this.history.remove(data.id);
          this.controller.refreshHistory();
        }
        break;

      case 'clear-history':
        this.history.clear();
        this.controller.refreshHistory();
        this.store.dispatch(Actions.notice('Historial de escenarios reiniciado.', 'info'));
        break;

      case 'apply-recommended': {
        const cajas = Number(data.cajas);
        const fila = data.fila;
        const patch = {};
        if (Number.isFinite(cajas) && cajas >= 1) patch.openCashiers = cajas;
        if (fila) patch.queueType = fila;
        this.controller.start(patch);
        break;
      }

      case 'export-csv':
        this._downloadFile('escenarios-supermercado.csv', this.history.exportCSV(), 'text/csv;charset=utf-8');
        break;

      case 'export-json': {
        const payload = state.report ? JSON.stringify(state.report, null, 2) : this.history.exportJSON();
        this._downloadFile('reporte-supermercado.json', payload, 'application/json;charset=utf-8');
        break;
      }

      default:
        break;
    }
  }

  _bindEvents() {
    if (!this.root) return;

    this.root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.preventDefault();
      this.handleAction(btn.dataset.action, btn.dataset);
    });

    this.root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.matches('[data-config-input]')) {
        const field = t.dataset.configInput;
        this.controller.updateLiveConfig({ [field]: Number(t.value) });
      } else if (t.matches('[data-config-select]')) {
        const field = t.dataset.configSelect;
        const val = field === 'startHour' ? Number(t.value) : t.value;
        this.controller.updateLiveConfig({ [field]: val });
      } else if (t.matches('[data-config-check]')) {
        const field = t.dataset.configCheck;
        this.controller.updateLiveConfig({ [field]: Boolean(t.checked) });
      }
    });
  }

  _downloadFile(filename, content, mime) {
    if (!content) {
      this.store.dispatch(Actions.notice('No hay datos para exportar todavía.', 'warning'));
      return;
    }
    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
    this.store.dispatch(Actions.notice(`Archivo "${filename}" exportado.`, 'success'));
  }
}

// Auto-montaje en navegador
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('app');
    if (root) {
      window.supermarketApp = new SupermarketApp(root).mount();
    }
  });
}
