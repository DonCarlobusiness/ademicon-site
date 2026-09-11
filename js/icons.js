/* SiteHunter AI — conjunto de ícones minimalistas (stroke, 24x24) */
(function (global) {
  'use strict';

  var P = {
    radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12L19 5"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    kanban: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M9 3v18M15 3v10"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9h18M9 21V9"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v13"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.36.44.63.81.78H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.1-4.1"/>',
    building: '<path d="M4 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15"/><path d="M14 10h4a2 2 0 0 1 2 2v9M2 21h20M8 8h2M8 12h2M8 16h2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
    globeOff: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 3.5 9"/><path d="M4 4l16 16"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2.5"/><path d="M2.5 6.5l9.5 6.5 9.5-6.5"/>',
    whatsapp: '<path d="M3 21l1.8-5A8.4 8.4 0 1 1 8 19.3z"/><path d="M8.6 9.2c.3 1.6 1.3 3.1 2.7 4.1.5.4 1.2.7 1.8.8.4 0 .8-.2 1-.5l.4-.6-1.6-1-.5.6a5.4 5.4 0 0 1-2-2l.7-.4-.9-1.7-.7.3c-.4.2-.6.6-.6 1z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/>',
    facebook: '<path d="M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V11H5.5v4H8v7h4v-7h3l.5-4H12V7.5a1 1 0 0 1 1-1h2z"/>',
    mapPin: '<path d="M20 10.5c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0z"/><circle cx="12" cy="10.5" r="3"/>',
    chart: '<path d="M3 3v17a1 1 0 0 0 1 1h17"/><path d="M7 15l3.5-4 3 2.5L19 7"/>',
    bars: '<path d="M7 20V10M12 20V4M17 20v-7"/>',
    money: '<rect x="2" y="5.5" width="20" height="13" rx="2.5"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
    users: '<path d="M16.5 21v-2a4 4 0 0 0-4-4h-5a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="3.6"/><path d="M21.5 21v-2a4 4 0 0 0-3-3.9M17 3.6a4 4 0 0 1 0 7"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.2l2.5 2.5 4.5-5"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5l-5 5M9.5 9.5l5 5"/>',
    alert: '<path d="M10.3 3.9L1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17.2h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4.5M12 8h.01"/>',
    sparkles: '<path d="M12 2.5l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8zM5 2.5l.6 1.7 1.7.6-1.7.6L5 7.1l-.6-1.7-1.7-.6 1.7-.6z"/>',
    bolt: '<path d="M13.5 2L4 14h7l-.5 8L20 10h-7z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5.5 15H4.5a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2H13a2 2 0 0 1 2 2v1"/>',
    external: '<path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/><path d="M15 3h6v6M10 14L21 3"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    edit: '<path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    arrowRight: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    arrowLeft: '<path d="M19 12H5M11 19l-7-7 7-7"/>',
    chevronRight: '<path d="M9 18l6-6-6-6"/>',
    chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    eye: '<path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3.2"/>',
    eyeOff: '<path d="M9.9 5.7A9.9 9.9 0 0 1 12 5.5c7 0 10.5 6.5 10.5 6.5a17 17 0 0 1-3.4 4.3M6.2 7.8A17 17 0 0 0 1.5 12S5 18.5 12 18.5c1.6 0 3-.3 4.2-.8"/><path d="M10 10a3 3 0 0 0 4 4M2 2l20 20"/>',
    lock: '<rect x="3.5" y="10.5" width="17" height="11" rx="2.5"/><path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"/>',
    fire: '<path d="M12 22a7 7 0 0 0 7-7c0-5-4-6-4-10 0 0-3 1.5-3 5 0-1-1.5-2.5-1.5-2.5S9 9 9 11c0-1.5-1-2.5-1-2.5A7.6 7.6 0 0 0 5 15a7 7 0 0 0 7 7z"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4.5a2.5 2.5 0 0 0 2.5 4M17 5h2.5a2.5 2.5 0 0 1-2.5 4M9.5 14h5l.5 3.5h-6zM7 21h10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.4 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M3 21v-5h5M21 3v5h-5"/>',
    shield: '<path d="M12 2.5l8 3.2V11c0 5-3.4 9.3-8 10.5C7.4 20.3 4 16 4 11V5.7z"/><path d="M9 12l2 2 4-4"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.5h13l3.5 6.5v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
    id: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5 16.2c.6-1.4 2-2.2 3.5-2.2s2.9.8 3.5 2.2M15 10h4M15 14h3"/>',
    layers: '<path d="M12 2.5L2.5 7.5 12 12.5l9.5-5z"/><path d="M2.5 12.5L12 17.5l9.5-5M2.5 17l9.5 5 9.5-5"/>',
    handshake: '<path d="M11 17l2 2a1.4 1.4 0 0 0 2-2l-.5-.5 1 1a1.4 1.4 0 0 0 2-2l-3.5-3.5"/><path d="M2 11l4-4.5h4l3 2.5-2.5 2.5a1.6 1.6 0 0 1-2.3 0L7 10"/><path d="M22 11l-4-4.5h-3.5M2 11l3 3.5M22 11l-3 3.5"/>',
    rocket: '<path d="M5 15c-1.5 1.5-2 6-2 6s4.5-.5 6-2a2.8 2.8 0 1 0-4-4z"/><path d="M15 11l-2-2 3-3a8 8 0 0 1 5-2 8 8 0 0 1-2 5z"/><path d="M9.5 14.5L7 12l2.5-4A11 11 0 0 1 16 4M9.5 14.5L12 17l4-2.5A11 11 0 0 0 20 8"/>'
  };

  function icon(name, size, extraClass) {
    var d = P[name];
    if (!d) d = P.info;
    var s = size || 18;
    return '<svg class="ico ' + (extraClass || '') + '" width="' + s + '" height="' + s +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }

  global.Icons = { get: icon, has: function (n) { return !!P[n]; } };
  global.ico = icon;
})(window);
