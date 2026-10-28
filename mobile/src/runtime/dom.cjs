// A data-only form/view adapter. React Native renders every visible control.
const { parseDocument, parseDOM } = require('htmlparser2');
const { selectAll, selectOne, is } = require('css-select');
const { getInnerHTML, textContent, removeElement, appendChild } = require('domutils');
const { Text } = require('domhandler');

function createDocument(markup) {
  const root = parseDocument(markup);
  const wrappers = new WeakMap(), listeners = new Map();
  const wrap = node => {
    if (!node) return null;
    if (!wrappers.has(node)) wrappers.set(node, new Element(node));
    return wrappers.get(node);
  };
  class Element {
    constructor(node) { this.raw = node; this.style = {}; this.files = []; this.scrollTop = 0; this.scrollHeight = 0; this.open = false; }
    get tagName() { return (this.raw.name || '').toUpperCase(); }
    get id() { return this.getAttribute('id') || ''; }
    get children() { return (this.raw.children || []).filter(n => n.type === 'tag').map(wrap); }
    get childNodes() { return (this.raw.children || []).map(wrap); }
    get parentElement() { return wrap(this.raw.parent); }
    get textContent() { return textContent(this.raw); }
    set textContent(value) { this.raw.children = [new Text(String(value ?? ''))]; this.raw.children[0].parent = this.raw; }
    get innerHTML() { return getInnerHTML(this.raw); }
    set innerHTML(value) { this.raw.children = parseDOM(String(value)); for (const n of this.raw.children) n.parent = this.raw; }
    get dataset() {
      return new Proxy({}, { get: (_, key) => this.getAttribute('data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase())), set: (_, key, value) => { this.setAttribute('data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase()), String(value)); return true; } });
    }
    get className() { return this.getAttribute('class') || ''; }
    get classList() {
      const list = () => this.className.split(/\s+/).filter(Boolean);
      const change = (name, on) => { const classes = new Set(list()); on ? classes.add(name) : classes.delete(name); this.setAttribute('class', [...classes].join(' ')); return on; };
      return { contains: name => list().includes(name), add: (...names) => names.forEach(n => change(n, true)), remove: (...names) => names.forEach(n => change(n, false)), toggle: (name, on) => change(name, on ?? !list().includes(name)) };
    }
    get value() {
      if (this.tagName === 'SELECT') { const options = this.querySelectorAll('option'); const option = options.find(o => o.hasAttribute('selected')) || options[0]; return option ? option.getAttribute('value') ?? option.textContent : ''; }
      if (this.tagName === 'TEXTAREA') return this.textContent;
      return this.getAttribute('value') ?? (this.getAttribute('type') === 'checkbox' ? 'on' : '');
    }
    set value(value) {
      if (this.tagName === 'SELECT') this.querySelectorAll('option').forEach(o => { o.toggleAttribute('selected', (o.getAttribute('value') ?? o.textContent) === String(value)); });
      else if (this.tagName === 'TEXTAREA') this.textContent = String(value);
      else this.setAttribute('value', String(value));
    }
    get checked() { return this.hasAttribute('checked'); }
    set checked(value) { this.toggleAttribute('checked', !!value); }
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(value) { this.toggleAttribute('disabled', !!value); }
    get hidden() { return this.hasAttribute('hidden'); }
    set hidden(value) { this.toggleAttribute('hidden', !!value); }
    get required() { return this.hasAttribute('required'); }
    set required(value) { this.toggleAttribute('required', !!value); }
    get form() { return this.closest('form'); }
    get elements() { return new Proxy({}, { get: (_, name) => this.querySelector(`[name="${String(name)}"]`) }); }
    getAttribute(name) { return this.raw.attribs?.[name] ?? null; }
    hasAttribute(name) { return Object.hasOwn(this.raw.attribs || {}, name); }
    setAttribute(name, value) { this.raw.attribs ||= {}; this.raw.attribs[name] = String(value); }
    removeAttribute(name) { if (this.raw.attribs) delete this.raw.attribs[name]; }
    toggleAttribute(name, on) { on ? this.setAttribute(name, '') : this.removeAttribute(name); }
    querySelector(selector) { return wrap(selectOne(selector, this.raw.children || [])); }
    querySelectorAll(selector) { return selectAll(selector, this.raw.children || []).map(wrap); }
    closest(selector) { let n = this.raw; while (n && n.type !== 'root') { if (is(n, selector)) return wrap(n); n = n.parent; } return null; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    showPopover() { this.open = true; }
    hidePopover() { this.open = false; }
    focus() { document.activeElement = this; }
    setSelectionRange() {}
    requestSubmit() { document.dispatch('submit', this); }
    click() { document.dispatch('click', this); }
    appendChild(node) { appendChild(this.raw, node.raw); }
    remove() { removeElement(this.raw); }
  }
  const document = {
    root, wrap, visibilityState: 'visible', activeElement: null, baseURI: 'https://troday.local/',
    querySelector: selector => wrap(selectOne(selector, root.children)),
    querySelectorAll: selector => selectAll(selector, root.children).map(wrap),
    createElement: tag => wrap(parseDOM(`<${tag}></${tag}>`)[0]),
    addEventListener(type, listener) { const callbacks = listeners.get(type) || []; callbacks.push(listener); listeners.set(type, callbacks); },
    dispatch(type, target) { for (const callback of listeners.get(type) || []) callback({ target, preventDefault() {} }); },
    hasFocus: () => true
  };
  document.body = document.querySelector('body');
  return document;
}

class NativeFormData {
  constructor(form) {
    this.entries = [];
    for (const input of form.querySelectorAll('input, select, textarea')) {
      const name = input.getAttribute('name'), type = input.getAttribute('type');
      if (!name || input.disabled || ['checkbox', 'radio'].includes(type) && !input.checked) continue;
      if (type === 'file') input.files.forEach(file => this.entries.push([name, file]));
      else this.entries.push([name, input.value]);
    }
  }
  get(key) { return this.entries.find(([name]) => name === key)?.[1] ?? null; }
  getAll(key) { return this.entries.filter(([name]) => name === key).map(([, value]) => value); }
}

module.exports = { createDocument, NativeFormData };
