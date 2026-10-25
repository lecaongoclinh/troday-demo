// Local Lucide-compatible icon subset for offline use.
const LUCIDE_PATHS = {
  'arrow-right': '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  'git-branch': '<circle cx="6" cy="5" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="19" r="3"/><path d="M6 8v8M18 9a9 9 0 0 1-9 9"/>',
  'refresh-cw': '<path d="M3 11a9 9 0 0 1 15-6l3 3M21 3v5h-5M21 13A9 9 0 0 1 6 19l-3-3M3 21v-5h5"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0"/>',
  'shield-check': '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  'external-link': '<path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>',
  'heart-handshake': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>',
  'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  'calendar-days': '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  'calendar-plus': '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v6M9 17h6"/>',
  'calendar-check': '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18m6 6 2 2 4-4"/>',
  'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  receipt: '<path d="M4 2v20l4-2 4 2 4-2 4 2V2l-4 2-4-2-4 2Z"/><path d="M8 10h8M8 14h8"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  'user-round': '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  'layout-dashboard': '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  'building-2': '<rect x="3" y="7" width="11" height="15" rx="1"/><path d="M14 12h7v10H3M7 11h.01M11 11h.01M7 15h.01M11 15h.01M7 19h.01M11 19h.01M17 16h.01M17 19h.01M7 7V3h7v4"/>',
  'plug-zap': '<path d="M13 2 9 10h4l-2 6 6-9h-4l2-5M6 12v3a5 5 0 0 0 10 0v-3M4 12h14M7 18v4M15 18v4"/>',
  'panel-top': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
  'contact-round': '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0M3 3h18v18H3z"/>',
  'badge-check': '<path d="m12 2 2.1 1.3 2.4-.2 1.1 2.2 2.2 1.1-.2 2.4L21 11l-1.4 2.2.2 2.4-2.2 1.1-1.1 2.2-2.4-.2L12 20l-2.1-1.3-2.4.2-1.1-2.2-2.2-1.1.2-2.4L3 11l1.4-2.2-.2-2.4 2.2-1.1 1.1-2.2 2.4.2Z"/><path d="m9 11 2 2 4-4"/>',
  flag: '<path d="M4 22V4M4 4c3-2 5 2 8 0s5 2 8 0v12c-3 2-5-2-8 0s-5-2-8 0"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  'arrow-left': '<path d="m12 19-7-7 7-7M19 12H5"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  'key-round': '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3M18 5l3 3"/>',
  'repeat-2': '<path d="m2 9 3-3 3 3M5 6v10a2 2 0 0 0 2 2h5M22 15l-3 3-3-3M19 18V8a2 2 0 0 0-2-2h-5"/>',
  pencil: '<path d="m16 5 3 3M4 20l4.5-1 11-11a2.12 2.12 0 0 0-3-3l-11 11Z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  'map-pin': '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  'rotate-ccw': '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
  inbox: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 14h5l2 3h4l2-3h5"/>',
  'sliders-horizontal': '<path d="M3 7h6m4 0h8M3 17h10m4 0h4"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01Z"/>',
  save: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v7h10V3M7 21v-7h10v7"/>',
  'scroll-text': '<path d="M8 21h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 4 0V5M10 9h8M10 13h8M10 17h6"/>'
};

window.lucide = {
  createIcons() {
    document.querySelectorAll("i[data-lucide]").forEach((placeholder) => {
      const path = LUCIDE_PATHS[placeholder.dataset.lucide] || LUCIDE_PATHS.inbox;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("width", "17");
      svg.setAttribute("height", "17");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.setAttribute("aria-hidden", "true");
      svg.innerHTML = path;
      placeholder.replaceWith(svg);
    });
  }
};
