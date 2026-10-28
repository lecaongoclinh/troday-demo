const { createDocument, NativeFormData } = require('./dom.cjs');
const bootCore = require('../generated/core.cjs');
const shell = `<html><body><aside id="sidebar-role"></aside><nav id="sidebar-nav"></nav><nav id="mobile-nav"></nav><div id="sidebar-account"></div><button id="business-guide-tab"></button><div id="topbar-role-switch"></div><div id="topbar-title"></div><button data-action="notifications"></button><span id="notification-count"></span><main id="app-main"></main><dialog id="app-dialog"><div id="dialog-body"></div></dialog><div id="toast"></div><div id="notification-popups"></div></body></html>`;

function createRuntime(options = {}) {
  const document = createDocument(shell), timers = new Set();
  let onChange = () => {}, disposed = false;
  const emit = () => { if (!disposed) onChange(); };
  const timer = (fn, delay) => {
    const id = setTimeout(() => { timers.delete(id); fn(); emit(); }, delay);
    id.unref?.(); timers.add(id); return id;
  };
  const storage = new Map(options.savedState ? [['troday-wireframe-v5-20261023', options.savedState]] : []);
  const objects = new Map(); let objectId = 0;
  const NativeURL = class extends URL {};
  NativeURL.createObjectURL = blob => {
    if (blob?.uri) return blob.uri;
    const key = `native-blob:${++objectId}`; objects.set(key, blob); return key;
  };
  NativeURL.revokeObjectURL = key => objects.delete(key);
  const originalCreate = document.createElement;
  document.createElement = tag => {
    const node = originalCreate(tag);
    if (tag === 'a') node.click = () => options.onExport?.(objects.get(node.href), node.download);
    return node;
  };
  const window = { scrollTo() {}, matchMedia: () => ({ matches: true }), addEventListener() {}, houseProofStore: options.proofStore };
  class NativeBlob { constructor(parts, options) { this.parts = parts; this.type = options?.type; } async text() { return this.parts.join(''); } }
  const core = bootCore({ document, window, location: { search: '', origin: 'https://troday.local' },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => { storage.set(key, value); options.onPersist?.(value); } },
    FormData: NativeFormData, URL: NativeURL, Blob: NativeBlob,
    setTimeout: timer, clearTimeout: id => { timers.delete(id); clearTimeout(id); }
  });
  if (core.getState().role === 'admin') core.action('switch-role', 'tenant');
  const run = (fn) => {
    const result = fn(); emit();
    if (result?.then) return result.finally(emit);
    return result;
  };
  function validate(form) {
    for (const field of form.querySelectorAll('input, textarea, select')) {
      if (field.disabled || field.getAttribute('type') === 'hidden' || field.closest('[hidden]')) continue;
      const type = field.getAttribute('type');
      const label = field.closest('label')?.textContent.trim().split('\n')[0].slice(0, 50) || field.getAttribute('name');
      const value = field.value.trim();
      if (field.required && (type === 'file' ? !field.files.length : ['checkbox', 'radio'].includes(type) ? !field.checked : !value)) return `Vui lòng nhập hoặc chọn ${label}.`;
      if (!value || type === 'file') continue;
      if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email chưa đúng định dạng.';
      if (type === 'number' && (!Number.isFinite(Number(value)) || field.hasAttribute('min') && Number(value) < Number(field.getAttribute('min')) || field.hasAttribute('max') && Number(value) > Number(field.getAttribute('max')))) return `${label}: giá trị ngoài khoảng cho phép.`;
      if (type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || field.hasAttribute('min') && value < field.getAttribute('min') || field.hasAttribute('max') && value > field.getAttribute('max'))) return `${label}: nhập ngày hợp lệ theo dạng YYYY-MM-DD.`;
      if (type === 'time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return `${label}: nhập giờ theo dạng HH:mm.`;
    }
    return '';
  }
  return {
    core, document,
    subscribe(listener) { onChange = listener; return () => { onChange = () => {}; }; },
    state: () => core.getState(),
    action: (action, id = '') => run(() => core.action(action, id)),
    change(field, value) { field.getAttribute('type') === 'checkbox' ? field.checked = !!value : field.value = value; document.dispatch('input', field); document.dispatch('change', field); emit(); },
    attach(field, files) { field.files = files; emit(); },
    submit(form) { return run(() => { const error = validate(form); if (error) { core.notify(error); return false; } return core.submit(form); }); },
    submitValues(name, values) {
      const form = document.querySelector(`form[data-form="${name}"]`);
      if (!form) throw new Error(`Form not available: ${name}`);
      for (const field of form.querySelectorAll('input, select, textarea')) {
        const key = field.getAttribute('name');
        if (!Object.hasOwn(values, key)) continue;
        if (field.getAttribute('type') === 'checkbox') field.checked = Array.isArray(values[key]) ? values[key].includes(field.value) : !!values[key];
        else field.value = String(values[key]);
      }
      return this.submit(form);
    },
    close() { core.closeDialog(); emit(); },
    refresh: () => run(() => core.render()),
    reset: () => run(() => core.reset()),
    snapshot() {
      const dialog = document.querySelector('#app-dialog'), toast = document.querySelector('#toast');
      return { main: document.querySelector('#app-main'), dialog: dialog.open ? document.querySelector('#dialog-body') : null, toast: toast.classList.contains('show') ? toast.textContent : '' };
    },
    dispose() { disposed = true; for (const id of timers) clearTimeout(id); timers.clear(); objects.clear(); onChange = () => {}; }
  };
}
module.exports = { createRuntime };
