// DAO SRL - MANTENIMIENTO APP LOGIC (Flask API client)

// 1. API HELPER FUNCTIONS
const API = {
  // Login credentials check
  login(username, password) {
    return fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }).then(res => {
      if (!res.ok) throw new Error('Usuario o contraseña incorrectos');
      return res.json();
    });
  },

  // Users management
  getUsers() {
    return fetch('/api/users').then(res => res.json());
  },

  createUser(username, password, role, permissions) {
    return fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role, permissions })
    }).then(res => {
      if (!res.ok) return res.json().then(err => { throw new Error(err.error || 'Error al crear usuario'); });
      return res.json();
    });
  },

  updateUser(username, password, role, permissions) {
    return fetch(`/api/users/${username}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, role, permissions })
    }).then(res => {
      if (!res.ok) return res.json().then(err => { throw new Error(err.error || 'Error al actualizar usuario'); });
      return res.json();
    });
  },

  deleteUser(username) {
    return fetch(`/api/users/${username}`, {
      method: 'DELETE'
    }).then(res => {
      if (!res.ok) throw new Error('Error al eliminar usuario');
      return res.json();
    });
  },

  // Machines management
  getMachines() {
    return fetch('/api/machines').then(res => res.json());
  },

  saveMachine(machineData) {
    return fetch('/api/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(machineData)
    }).then(res => {
      if (!res.ok) throw new Error('Error al guardar la máquina');
      return res.json();
    });
  },

  deleteMachine(machineId) {
    return fetch(`/api/machines/${machineId}`, {
      method: 'DELETE'
    }).then(res => {
      if (!res.ok) throw new Error('Error al eliminar la máquina');
      return res.json();
    });
  },

  // History management
  getHistory() {
    return fetch('/api/history').then(res => res.json());
  },

  saveHistory(logData) {
    return fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    }).then(res => {
      if (!res.ok) throw new Error('Error al guardar el registro');
      return res.json();
    });
  },

  deleteHistoryLog(logId) {
    return fetch(`/api/history/${logId}`, {
      method: 'DELETE'
    }).then(res => {
      if (!res.ok) throw new Error('Error al eliminar el registro de historial');
      return res.json();
    });
  },

  // Image Upload helper
  uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    return fetch('/api/upload', {
      method: 'POST',
      body: formData
    }).then(res => {
      if (!res.ok) return res.json().then(err => { throw new Error(err.error || 'Error al subir imagen'); });
      return res.json();
    });
  },

  // App & Demo Info
  getAppInfo() {
    return fetch('/api/app-info').then(res => res.json()).catch(() => ({ is_demo: false }));
  },

  resetDemo() {
    return fetch('/api/reset-demo', { method: 'POST' }).then(res => res.json());
  },

  // Audit Tasks
  getAuditTasks() {
    return fetch('/api/audit-tasks').then(res => res.json());
  },

  saveAuditTask(task) {
    return fetch('/api/audit-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    }).then(res => {
      if (!res.ok) return res.json().then(err => { throw new Error(err.error || 'Error al guardar la tarea'); });
      return res.json();
    });
  },

  deleteAuditTask(taskId) {
    return fetch(`/api/audit-tasks/${taskId}`, {
      method: 'DELETE'
    }).then(res => {
      if (!res.ok) throw new Error('Error al eliminar la tarea');
      return res.json();
    });
  },

  // Quality Products & Blueprints
  getCalidadProductos() {
    return fetch('/api/calidad-productos').then(res => res.json());
  },

  saveCalidadProducto(prod) {
    return fetch('/api/calidad-productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prod)
    }).then(res => {
      if (!res.ok) return res.json().then(err => { throw new Error(err.error || 'Error al guardar el producto'); });
      return res.json();
    });
  },

  deleteCalidadProducto(prodId) {
    return fetch(`/api/calidad-productos/${prodId}`, {
      method: 'DELETE'
    }).then(res => {
      if (!res.ok) throw new Error('Error al eliminar el producto');
      return res.json();
    });
  }
};

// 2. STATE MANAGEMENT
const state = {
  currentUser: null,
  activeScreen: 'screen-menu-principal',
  machines: [],
  auditTasks: [],
  calidadProductos: [],
  selectedMachineIdForRealizar: null,
  currentRealizarCategory: 'control', // 'control' or 'preventive'
  activeHistoryCategory: 'mantenimiento', // 'mantenimiento', 'calidad', 'auditoria'
  pwaPromptEvent: null,
  correctivePhotoUrl: '',
  isDemo: false
};

// Heuristic IA Classifier for task descriptions
function analyzeTaskDescription(desc) {
  const clean = desc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Keywords representing numbers / values / units
  const numericKeywords = [
    'presion', 'temp', 'volt', 'corriente', 'nivel', 'medir', 'tension', 'voltaje',
    'amp', 'kgr', 'bar', 'psi', 'grados', 'celsius', 'farenheit', 'valor', 'consumo'
  ];

  // Keywords representing Ok / No Ok checkmarks
  const booleanKeywords = [
    'limpiar', 'cambiar', 'ajustar', 'ok', 'verificar', 'inspeccionar', 'estado',
    'perdida', 'fuga', 'ruido', 'vibracion', 'lubricar', 'engrasar', 'ajuste', 'filtro'
  ];

  for (const kw of numericKeywords) {
    if (clean.includes(kw)) {
      let unit = '';
      if (clean.includes('presion') || clean.includes('bar')) unit = ' bar';
      else if (clean.includes('psi')) unit = ' psi';
      else if (clean.includes('temp') || clean.includes('grados')) unit = ' °C';
      else if (clean.includes('volt') || clean.includes('tension')) unit = ' V';
      else if (clean.includes('amp') || clean.includes('corriente')) unit = ' A';
      else if (clean.includes('nivel') || clean.includes('aceite')) unit = ' %';
      
      return { type: 'numeric', label: 'Medición', unit, confidence: 'Alta (Heurística)' };
    }
  }

  for (const kw of booleanKeywords) {
    if (clean.includes(kw)) {
      return { type: 'boolean', label: 'Estado', unit: '', confidence: 'Alta (Heurística)' };
    }
  }

  // Default fallback
  return { type: 'text', label: 'Observaciones', unit: '', confidence: 'Baja (Predeterminado)' };
}

// Next Due Date Scheduler
function calculateNextDueDate(lastDateStr, frequencyStr) {
  const date = lastDateStr ? new Date(lastDateStr + 'T12:00:00') : new Date();
  const freq = frequencyStr.toLowerCase();

  if (freq.includes('diari')) {
    date.setDate(date.getDate() + 1);
  } else if (freq.includes('seman')) {
    date.setDate(date.getDate() + 7);
  } else if (freq.includes('quincen')) {
    date.setDate(date.getDate() + 14);
  } else if (freq.includes('mensu')) {
    date.setMonth(date.getMonth() + 1);
  } else if (freq.includes('bimestr')) {
    date.setMonth(date.getMonth() + 2);
  } else if (freq.includes('trimestr')) {
    date.setMonth(date.getMonth() + 3);
  } else if (freq.includes('semestr')) {
    date.setMonth(date.getMonth() + 6);
  } else if (freq.includes('anual') || freq.includes('ano')) {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    // Default fallback if frequency is hourly or irregular (e.g. "cada 1000 horas")
    if (freq.includes('hora')) {
      date.setMonth(date.getMonth() + 3); // Fallback: 3 meses para mantenimientos por horas
    } else {
      date.setDate(date.getDate() + 30); // 30 days default fallback
    }
  }

  return date.toISOString().split('T')[0];
}

// Check if a date is within the current week (Monday to Sunday)
function isDateInCurrentWeek(dateStr) {
  if (!dateStr) return false;
  
  const targetDate = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  
  // Calculate Monday of current week
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return targetDate >= monday && targetDate <= sunday;
}

// 3. UI CONTROLLER & EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
  setupPwaInstallation();
  initAppInfo();
  checkExistingSession();
  setupEventListeners();
});

function initAppInfo() {
  API.getAppInfo().then(info => {
    state.isDemo = !!info.is_demo;
    const banner = document.getElementById('demo-mode-banner');
    if (banner) {
      if (state.isDemo) {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }
  }).catch(() => {});
}

function checkExistingSession() {
  const session = sessionStorage.getItem('dao_user');
  if (session) {
    const user = JSON.parse(session);
    loginUser(user);
  } else {
    showScreen('screen-login');
  }
}

function toggleSidebarCategory(categoryName, forceState) {
  const catEl = document.querySelector(`.sidebar-category[data-category="${categoryName}"]`);
  if (!catEl) return;
  const isOpen = catEl.classList.contains('open');
  const shouldOpen = forceState !== undefined ? forceState : !isOpen;
  if (shouldOpen) {
    catEl.classList.add('open');
  } else {
    catEl.classList.remove('open');
  }
}
window.toggleSidebarCategory = toggleSidebarCategory;

function showScreen(screenId) {
  state.activeScreen = screenId;
  document.querySelectorAll('.screen, .content-screen').forEach(el => el.classList.remove('active'));
  
  const targetEl = document.getElementById(screenId);
  if (targetEl) {
    targetEl.classList.add('active');
  }

  // Toggle embedded-active class on main content container
  const mainContent = document.querySelector('.app-content');
  if (mainContent) {
    if (screenId === 'screen-produccion-view') {
      mainContent.classList.add('embedded-active');
    } else {
      mainContent.classList.remove('embedded-active');
    }
  }

  // Handle active class on nav links
  document.querySelectorAll('.nav-item').forEach(el => {
    const elScreen = el.getAttribute('data-screen');
    if (elScreen === screenId) {
      if (screenId === 'screen-historial-general') {
        const elCategory = el.getAttribute('data-history-category');
        if (elCategory === state.activeHistoryCategory) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      } else if (screenId === 'screen-produccion-view') {
        const elProdPath = el.getAttribute('data-prod-path');
        if (elProdPath === state.currentProduccionPath) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      } else {
        el.classList.add('active');
      }
    } else {
      el.classList.remove('active');
    }
  });

  // Abrir automáticamente el submenú que contiene la pantalla activa si corresponde
  const activeSubItem = document.querySelector('.sidebar-submenu .nav-item.active');
  if (activeSubItem) {
    const parentCat = activeSubItem.closest('.sidebar-category');
    if (parentCat) parentCat.classList.add('open');
  } else if (screenId === 'screen-menu-mantenimiento') {
    toggleSidebarCategory('mantenimiento', true);
  } else if (screenId === 'screen-menu-calidad') {
    toggleSidebarCategory('calidad', true);
  } else if (screenId === 'screen-menu-produccion') {
    toggleSidebarCategory('produccion', true);
  } else if (screenId === 'screen-menu-auditoria') {
    toggleSidebarCategory('auditoria', true);
  }

  // Toggle drawer off on screen change (mobile)
  document.getElementById('app-sidebar').classList.remove('drawer-open');
  document.getElementById('sidebar-backdrop').classList.remove('active');

  // Trigger loads for specific screens
  if (screenId === 'screen-esta-semana') {
    loadEstaSemanaScreen();
  } else if (screenId === 'screen-realizar') {
    loadRealizarScreen();
  } else if (screenId === 'screen-alta-maquina') {
    const form = document.getElementById('alta-maquina-form');
    if (!form.hasAttribute('data-edit-id')) {
      loadAltaMaquinaScreen();
    }
  } else if (screenId === 'screen-usuarios') {
    loadUsuariosScreen();
  } else if (screenId === 'screen-historial-general') {
    loadHistorialGeneralScreen();
  } else if (screenId === 'screen-menu-mantenimiento') {
    updateNavBadge();
  } else if (screenId === 'screen-registro-control-calidad') {
    resetCalidadScreen();
  } else if (screenId === 'screen-orden-limpieza') {
    resetAuditoriaScreen();
  } else if (screenId === 'screen-gestion-auditoria') {
    loadAuditTasksScreen();
  }
}

function loginUser(user) {
  state.currentUser = user;
  sessionStorage.setItem('dao_user', JSON.stringify(user));
  
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('app-shell').classList.remove('hidden');
  
  document.getElementById('header-username').textContent = user.username;
  document.getElementById('header-user-role').textContent = user.role === 'admin' ? 'Administrador' : 'Supervisor';
  
  // Show / Hide admin elements
  if (user.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  } else {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
  }

  // Control visibility of modules based on granular permissions
  const permissions = user.permissions || {
    mantenimiento: true,
    calidad: true,
    produccion: true,
    auditoria: true
  };

  const modules = ['mantenimiento', 'calidad', 'produccion', 'auditoria'];
  modules.forEach(mod => {
    const hasAccess = user.role === 'admin' || permissions[mod] !== false;
    document.querySelectorAll(`.module-${mod}`).forEach(el => {
      if (hasAccess) {
        if (el.classList.contains('admin-only') && user.role !== 'admin') {
          el.classList.add('hidden');
        } else {
          el.classList.remove('hidden');
        }
      } else {
        el.classList.add('hidden');
      }
    });
  });

  // Sincronizar sesión de Producción de fondo (SSO transparente)
  if (user && user.username) {
    fetch('/api/auth/sso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username })
    }).catch(err => console.warn('SSO Producción:', err));
  }

  showScreen('screen-menu-principal');
  updateNavBadge();
}

const PRODUCCION_TITLES = {
  '/operario': 'Trabajo en curso (Línea)',
  '/dashboard/ordenes': 'Órdenes de Trabajo',
  '/dashboard/gantt': 'Diagrama Gantt',
  '/dashboard/articulos': 'Catálogo de Artículos',
  '/dashboard/turnos': 'Turnos de Planta',
  '/dashboard/metricas': 'Dashboard de Métricas',
  '/tv': 'Pantalla de TV'
};

let currentProduccionPath = '/dashboard/ordenes';

// Navegación directa y embebida a las herramientas de Producción dentro de DAO PLANTA
async function openProduccion(targetPath, newTab = false) {
  if (targetPath === '/tv' || newTab) {
    if (state.currentUser && state.currentUser.username) {
      fetch('/api/auth/sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: state.currentUser.username })
      }).catch(() => {});
    }
    window.open(targetPath, '_blank');
    return;
  }

  // Sincronizar SSO en segundo plano
  if (state.currentUser && state.currentUser.username) {
    try {
      await fetch('/api/auth/sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: state.currentUser.username })
      });
    } catch (err) {
      console.warn('Error sincronizando sesión en Producción:', err);
    }
  }

  state.currentProduccionPath = targetPath;
  currentProduccionPath = targetPath;

  const titleEl = document.getElementById('produccion-tool-title');
  if (titleEl) {
    titleEl.textContent = PRODUCCION_TITLES[targetPath] || 'Herramienta';
  }

  const spinner = document.getElementById('produccion-loading-spinner');
  const iframe = document.getElementById('produccion-iframe');

  if (spinner) spinner.style.display = 'flex';

  if (iframe) {
    const urlWithEmbed = targetPath + (targetPath.includes('?') ? '&' : '?') + 'embed=true';
    iframe.onload = () => {
      if (spinner) spinner.style.display = 'none';
    };
    if (iframe.contentWindow && iframe.contentWindow.location && iframe.contentWindow.location.pathname === targetPath) {
      if (spinner) spinner.style.display = 'none';
    } else {
      iframe.src = urlWithEmbed;
    }
  }

  toggleSidebarCategory('produccion', true);
  showScreen('screen-produccion-view');
}
window.openProduccion = openProduccion;

function reloadProduccionFrame() {
  const iframe = document.getElementById('produccion-iframe');
  const spinner = document.getElementById('produccion-loading-spinner');
  if (iframe) {
    if (spinner) spinner.style.display = 'flex';
    try {
      iframe.contentWindow.location.reload();
    } catch (e) {
      iframe.src = iframe.src;
    }
  }
}
window.reloadProduccionFrame = reloadProduccionFrame;

function openCurrentToolExternal() {
  if (currentProduccionPath) {
    window.open(currentProduccionPath, '_blank');
  }
}
window.openCurrentToolExternal = openCurrentToolExternal;

function logoutUser() {
  fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  state.currentUser = null;
  sessionStorage.removeItem('dao_user');
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('screen-login').classList.add('active');
  
  // Clear forms
  document.getElementById('login-form').reset();
  document.getElementById('login-error').classList.add('hidden');
}

// Save dynamic history record on the server
function saveHistoryRecord(machineId, machineName, type, taskName, result, dateStr, photo = '') {
  const record = {
    machineId: (machineId === 'calidad' || machineId === 'auditoria') ? machineId : parseInt(machineId),
    machineName,
    type,
    taskName,
    result,
    date: dateStr || getLocalDateString(),
    user: state.currentUser.username,
    photo
  };

  return API.saveHistory(record);
}

// Toast alert notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'success-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Update the navigation pending tasks badge count
function updateNavBadge() {
  API.getMachines().then(maquinas => {
    API.getHistory().then(historial => {
      let pendingCount = 0;
      const todayStr = getLocalDateString();
      
      maquinas.forEach(mac => {
        const macHistory = historial.filter(h => h.machineId === mac.id);
        
        // Count Controls
        mac.periodicControls.forEach(c => {
          const taskHistory = macHistory.filter(h => h.taskName === c.name && h.type === 'control');
          const lastExec = taskHistory.length > 0 ? taskHistory.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : null;
          const nextDue = calculateNextDueDate(lastExec ? lastExec.date : null, c.frequency);
          
          const isOverdue = new Date(nextDue) < new Date().setHours(0,0,0,0);
          const isThisWeek = isDateInCurrentWeek(nextDue);
          const isExecutedToday = lastExec && lastExec.date === todayStr;
          
          if (!isExecutedToday && (isOverdue || isThisWeek)) pendingCount++;
        });

        // Count Preventives
        mac.preventiveMaintenances.forEach(pm => {
          const taskHistory = macHistory.filter(h => h.taskName === pm.name && h.type === 'preventive');
          const lastExec = taskHistory.length > 0 ? taskHistory.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : null;
          const nextDue = calculateNextDueDate(lastExec ? lastExec.date : null, pm.interval);
          
          const isOverdue = new Date(nextDue) < new Date().setHours(0,0,0,0);
          const isThisWeek = isDateInCurrentWeek(nextDue);
          const isExecutedToday = lastExec && lastExec.date === todayStr;

          if (!isExecutedToday && (isOverdue || isThisWeek)) pendingCount++;
        });
      });

      // Count general weekly Orden y Limpieza Auditoría
      const auditHistory = historial.filter(h => h.type === 'auditoria');
      const lastAuditExec = auditHistory.length > 0 ? auditHistory.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : null;
      const nextAuditDue = calculateNextDueDate(lastAuditExec ? lastAuditExec.date : null, 'semanal');

      const isAuditOverdue = new Date(nextAuditDue) < new Date().setHours(0,0,0,0);
      const isAuditThisWeek = isDateInCurrentWeek(nextAuditDue);
      const isAuditExecutedToday = lastAuditExec && lastAuditExec.date === todayStr;

      if (!isAuditExecutedToday && (isAuditOverdue || isAuditThisWeek)) pendingCount++;

      const badge = document.getElementById('nav-pending-badge');
      const menuBadge = document.getElementById('menu-pending-badge');
      const catBadge = document.getElementById('category-mantenimiento-badge');
      if (pendingCount > 0) {
        if (badge) {
          badge.textContent = pendingCount;
          badge.classList.remove('hidden');
        }
        if (catBadge) {
          catBadge.classList.remove('hidden');
        }
        if (menuBadge) {
          menuBadge.textContent = `${pendingCount} pendientes`;
          menuBadge.classList.remove('hidden');
        }
      } else {
        if (badge) badge.classList.add('hidden');
        if (catBadge) catBadge.classList.add('hidden');
        if (menuBadge) menuBadge.classList.add('hidden');
      }
    });
  });
}

// 4. SCREEN POPULATION LOGIC

// --- ESTA SEMANA SCREEN ---
function loadEstaSemanaScreen() {
  const tbody = document.getElementById('list-semanal-tbody');
  tbody.innerHTML = '';
  
  API.getMachines().then(maquinas => {
    API.getHistory().then(historial => {
      let tasks = [];
      const todayStr = getLocalDateString();
      
      maquinas.forEach(mac => {
        const macHistory = historial.filter(h => h.machineId === mac.id);

        // Analyze Periodic Controls
        mac.periodicControls.forEach(c => {
          const taskHistory = macHistory.filter(h => h.taskName === c.name && h.type === 'control');
          const lastExec = taskHistory.length > 0 ? taskHistory.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : null;
          const nextDue = calculateNextDueDate(lastExec ? lastExec.date : null, c.frequency);

          const isOverdue = new Date(nextDue) < new Date().setHours(0,0,0,0);
          const isThisWeek = isDateInCurrentWeek(nextDue);
          const isExecutedToday = lastExec && lastExec.date === todayStr;

          if (!isExecutedToday && (isOverdue || isThisWeek)) {
            tasks.push({
              machineId: mac.id,
              machineName: mac.name,
              machineCode: mac.code,
              type: 'Control Periódico',
              typeName: 'control',
              taskName: c.name,
              interval: c.frequency,
              nextDue,
              isOverdue
            });
          }
        });

        // Analyze Preventive Maintenances
        mac.preventiveMaintenances.forEach(pm => {
          const taskHistory = macHistory.filter(h => h.taskName === pm.name && h.type === 'preventive');
          const lastExec = taskHistory.length > 0 ? taskHistory.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : null;
          const nextDue = calculateNextDueDate(lastExec ? lastExec.date : null, pm.interval);

          const isOverdue = new Date(nextDue) < new Date().setHours(0,0,0,0);
          const isThisWeek = isDateInCurrentWeek(nextDue);
          const isExecutedToday = lastExec && lastExec.date === todayStr;

          if (!isExecutedToday && (isOverdue || isThisWeek)) {
            tasks.push({
              machineId: mac.id,
              machineName: mac.name,
              machineCode: mac.code,
              type: 'Mant. Preventivo',
              typeName: 'preventive',
              taskName: pm.name,
              interval: pm.interval,
              nextDue,
              isOverdue
            });
          }
        });
      });

      // Analyze general weekly Orden y Limpieza Auditoría
      const auditHistory = historial.filter(h => h.type === 'auditoria');
      const lastAuditExec = auditHistory.length > 0 ? auditHistory.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : null;
      const nextAuditDue = calculateNextDueDate(lastAuditExec ? lastAuditExec.date : null, 'semanal');

      const isAuditOverdue = new Date(nextAuditDue) < new Date().setHours(0,0,0,0);
      const isAuditThisWeek = isDateInCurrentWeek(nextAuditDue);
      const isAuditExecutedToday = lastAuditExec && lastAuditExec.date === todayStr;

      if (!isAuditExecutedToday && (isAuditOverdue || isAuditThisWeek)) {
        tasks.push({
          machineId: 'auditoria',
          machineName: 'Auditoría',
          machineCode: '5S',
          type: 'Auditoría 5S',
          typeName: 'auditoria',
          taskName: 'Orden y Limpieza General',
          interval: 'Semanal',
          nextDue: nextAuditDue,
          isOverdue: isAuditOverdue
        });
      }

      // Sort tasks by due date
      tasks.sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue));

      let overdueCount = 0;
      let pendingCount = 0;

      if (tasks.length === 0) {
        document.getElementById('semanal-empty-state').classList.remove('hidden');
        document.getElementById('table-semanal').classList.add('hidden');
      } else {
        document.getElementById('semanal-empty-state').classList.add('hidden');
        document.getElementById('table-semanal').classList.remove('hidden');

        tasks.forEach(t => {
          if (t.isOverdue) overdueCount++;
          else pendingCount++;

          const row = document.createElement('tr');
          
          const statusText = t.isOverdue ? 'Atrasado' : 'Esta Semana';
          const statusClass = t.isOverdue ? 'overdue' : 'pending';
          
          row.innerHTML = `
            <td data-label="Máquina">
              <strong>${t.machineName}</strong>
              <div class="machine-code-badge" style="margin-top: 4px;">Cód. ${t.machineCode}</div>
            </td>
            <td data-label="Tipo">${t.type}</td>
            <td data-label="Tarea"><strong>${t.taskName}</strong></td>
            <td data-label="Intervalo"><span class="text-muted">${t.interval}</span></td>
            <td data-label="Vencimiento">${formatDateDisplay(t.nextDue)}</td>
            <td data-label="Estado"><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td data-label="Acción">
              <button class="btn btn-primary btn-sm btn-action-realizar" data-machine-id="${t.machineId}" data-type="${t.typeName}" data-task-name="${t.taskName}">
                Realizar
              </button>
            </td>
          `;

          row.querySelector('.btn-action-realizar').addEventListener('click', (e) => {
            const mId = e.target.getAttribute('data-machine-id');
            const type = e.target.getAttribute('data-type');
            const taskName = e.target.getAttribute('data-task-name');
            if (mId === 'auditoria') {
              showScreen('screen-orden-limpieza');
            } else {
              state.selectedMachineIdForRealizar = parseInt(mId);
              state.currentRealizarCategory = type;
              state.selectedTaskNameForRealizar = taskName;
              showScreen('screen-realizar');
            }
          });

          tbody.appendChild(row);
        });
      }

      document.getElementById('stat-overdue').textContent = overdueCount;
      document.getElementById('stat-this-week').textContent = pendingCount;
      updateNavBadge();
    });
  });
}

// --- REALIZAR SCREEN ---
function loadRealizarScreen() {
  const select = document.getElementById('realizar-machine-select');
  select.innerHTML = '<option value="">-- Seleccione una máquina --</option>';
  
  API.getMachines().then(maquinas => {
    state.machines = maquinas;
    maquinas.sort((a, b) => a.name.localeCompare(b.name));
    
    maquinas.forEach(mac => {
      const opt = document.createElement('option');
      opt.value = mac.id;
      opt.textContent = `${mac.name} (Cód. ${mac.code})`;
      
      if (state.selectedMachineIdForRealizar === mac.id) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    if (state.selectedMachineIdForRealizar) {
      renderRealizarMachine(state.selectedMachineIdForRealizar);
    } else {
      document.getElementById('realizar-machine-card').classList.add('hidden');
      document.getElementById('realizar-execution-panel').classList.add('hidden');
    }
  });

  document.getElementById('realizar-date').value = getLocalDateString();
}

function renderRealizarMachine(id) {
  const machine = state.machines.find(m => m.id === id);
  if (!machine) return;

  // Render Info Card
  document.getElementById('realizar-machine-name').textContent = machine.name;
  document.getElementById('realizar-machine-code').textContent = `Cód. ${machine.code}`;
  document.getElementById('realizar-machine-brand').textContent = machine.brand;
  document.getElementById('realizar-machine-model').textContent = machine.model;
  document.getElementById('realizar-machine-supplier').textContent = machine.supplier;
  document.getElementById('realizar-machine-purchased').textContent = machine.purchaseDate;
  document.getElementById('realizar-machine-specs').textContent = machine.characteristics || 'Sin especificaciones cargadas.';
  
  const photoImg = document.getElementById('realizar-machine-photo');
  photoImg.src = machine.photo || 'logo.svg';

  // Render Spare Parts
  const repContainer = document.getElementById('realizar-repuestos-container');
  repContainer.innerHTML = '';
  if (machine.spareParts && machine.spareParts.length > 0) {
    machine.spareParts.forEach(r => {
      const div = document.createElement('div');
      div.className = 'repuesto-item-mini';
      
      const imgHtml = r.photo ? `<img src="${r.photo}" alt="${r.name}">` : `<div class="repuesto-item-mini-placeholder"><svg class="icon" viewBox="0 0 24 24" style="width: 20px; height: 20px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg></div>`;
      
      div.innerHTML = `
        ${imgHtml}
        <div class="repuesto-item-details">
          <h5>${r.name}</h5>
          <p>Cód: ${r.code || 'N/A'}</p>
        </div>
      `;

      div.addEventListener('click', () => {
        alert(`Repuesto: ${r.name}\nProveedor: ${r.supplier || 'N/A'}\nCaracterísticas/Código: ${r.code || 'N/A'}`);
      });

      repContainer.appendChild(div);
    });
  } else {
    repContainer.innerHTML = '<p class="text-muted" style="font-size:12.5px;">No hay repuestos asociados.</p>';
  }

  document.getElementById('realizar-machine-card').classList.remove('hidden');
  document.getElementById('realizar-execution-panel').classList.remove('hidden');

  const actionsBar = document.querySelector('.machine-details-actions');
  if (state.currentUser && state.currentUser.role === 'admin') {
    actionsBar.classList.remove('hidden');
  } else {
    actionsBar.classList.add('hidden');
  }

  renderRealizarTasks(machine);
}

function renderRealizarTasks(machine) {
  const isControl = state.currentRealizarCategory === 'control';
  document.getElementById('tab-control-periodico').classList.toggle('active', isControl);
  document.getElementById('tab-mantenimiento-preventivo').classList.toggle('active', !isControl);

  const container = document.getElementById('realizar-tasks-container');
  container.innerHTML = '';

  let tasksList = isControl ? machine.periodicControls : machine.preventiveMaintenances;

  if (state.selectedTaskNameForRealizar) {
    tasksList = tasksList.filter(t => t.name === state.selectedTaskNameForRealizar);
    
    const backBtn = document.createElement('div');
    backBtn.style.marginBottom = '15px';
    backBtn.innerHTML = `
      <button type="button" class="btn btn-secondary btn-sm" id="btn-realizar-show-all" style="display:flex; align-items:center; gap:5px;">
        ← Ver todas las pautas de esta máquina
      </button>
    `;
    backBtn.querySelector('#btn-realizar-show-all').addEventListener('click', () => {
      state.selectedTaskNameForRealizar = null;
      renderRealizarTasks(machine);
    });
    container.appendChild(backBtn);
  }

  API.getHistory().then(historial => {
    const macHistory = historial.filter(h => h.machineId === machine.id);

    if (!tasksList || tasksList.length === 0) {
      document.getElementById('realizar-empty-state').classList.remove('hidden');
      return;
    }
    document.getElementById('realizar-empty-state').classList.add('hidden');

    tasksList.forEach((t, index) => {
      const taskHistory = macHistory.filter(h => h.taskName === t.name && h.type === state.currentRealizarCategory);
      const lastExec = taskHistory.length > 0 ? taskHistory.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : null;
      const intervalStr = isControl ? t.frequency : t.interval;
      const nextDue = calculateNextDueDate(lastExec ? lastExec.date : null, intervalStr);

      const isOverdue = new Date(nextDue) < new Date().setHours(0,0,0,0);
      const isThisWeek = isDateInCurrentWeek(nextDue);

      let statusTag = '';
      if (isOverdue) statusTag = `<span class="status-badge overdue">Atrasado (Vencía ${formatDateDisplay(nextDue)})</span>`;
      else if (isThisWeek) statusTag = `<span class="status-badge pending">Pendiente esta semana (Vence ${formatDateDisplay(nextDue)})</span>`;
      else statusTag = `<span class="status-badge completed">Al día (Vence ${formatDateDisplay(nextDue)})</span>`;

      const iaSuggestion = analyzeTaskDescription(t.name);

      const card = document.createElement('div');
      card.className = 'task-log-card';
      
      card.innerHTML = `
        <div class="task-log-header">
          <div class="task-log-title">
            <h4>${t.name}</h4>
            <p>Frecuencia: <strong>${intervalStr}</strong> | Último: <span>${lastExec ? formatDateDisplay(lastExec.date) : 'Nunca'}</span></p>
          </div>
          ${statusTag}
        </div>

        <div class="dynamic-input-wrapper">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="ai-suggestion-tag">
              <svg class="icon" viewBox="0 0 24 24" style="width:12px; height:12px;"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C8.74 12.18 8 10.66 8 9c0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.66-.74 3.18-2.15 4.1z"/></svg>
              IA Sugiere: ${iaSuggestion.type === 'boolean' ? 'OK / NO OK' : iaSuggestion.type === 'numeric' ? 'Numérico' : 'Observación'}
            </div>
            
            <div class="input-type-override" style="display:flex; gap:5px;">
              <button type="button" class="btn-icon btn-override-type" data-type="boolean" title="Forzar OK / NO OK">👍</button>
              <button type="button" class="btn-icon btn-override-type" data-type="numeric" title="Forzar Numérico">🔢</button>
              <button type="button" class="btn-icon btn-override-type" data-type="text" title="Forzar Observación">📝</button>
            </div>
          </div>

          <div class="task-input-holder" id="task-input-holder-${index}"></div>
        </div>

        <div class="task-log-actions">
          <button type="button" class="btn btn-secondary btn-sm btn-view-task-history" data-task-name="${t.name}">
            Ver Historial
          </button>
          <button type="button" class="btn btn-primary btn-sm btn-save-single-task" data-task-name="${t.name}" data-index="${index}">
            Registrar Realización
          </button>
        </div>
      `;

      container.appendChild(card);

      const holder = document.getElementById(`task-input-holder-${index}`);
      renderDynamicInput(holder, iaSuggestion, index);

      card.querySelectorAll('.btn-override-type').forEach(btn => {
        btn.addEventListener('click', () => {
          const forcedType = btn.getAttribute('data-type');
          let suggestion = { type: forcedType, label: 'Medición', unit: '', confidence: 'Manual' };
          if (forcedType === 'numeric') suggestion.unit = ' unid.';
          renderDynamicInput(holder, suggestion, index);
        });
      });

      card.querySelector('.btn-view-task-history').addEventListener('click', (e) => {
        const taskName = e.target.getAttribute('data-task-name');
        openHistoryModal(machine.id, taskName, isControl ? 'control' : 'preventive');
      });

      card.querySelector('.btn-save-single-task').addEventListener('click', (e) => {
        const tName = e.target.getAttribute('data-task-name');
        const idx = e.target.getAttribute('data-index');
        submitTaskLog(machine, tName, isControl ? 'control' : 'preventive', idx);
      });
    });
  });
}

function renderDynamicInput(holder, iaSuggestion, index) {
  holder.innerHTML = '';
  holder.setAttribute('data-current-type', iaSuggestion.type);

  if (iaSuggestion.type === 'boolean') {
    const wrapper = document.createElement('div');
    wrapper.className = 'ok-no-ok-selector';
    wrapper.innerHTML = `
      <button type="button" class="ok-btn" id="ok-btn-${index}">OK / APTO</button>
      <button type="button" class="no-ok-btn" id="no-ok-btn-${index}">NO OK / DEFECTO</button>
    `;

    holder.appendChild(wrapper);

    const okBtn = wrapper.querySelector('.ok-btn');
    const noOkBtn = wrapper.querySelector('.no-ok-btn');
    
    okBtn.addEventListener('click', () => {
      okBtn.classList.add('active');
      noOkBtn.classList.remove('active');
      holder.setAttribute('data-value', 'OK');
    });

    noOkBtn.addEventListener('click', () => {
      noOkBtn.classList.add('active');
      okBtn.classList.remove('active');
      holder.setAttribute('data-value', 'NO OK');
    });

  } else if (iaSuggestion.type === 'numeric') {
    const div = document.createElement('div');
    div.className = 'form-group';
    div.style.marginBottom = '0';
    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <input type="number" step="any" class="form-control value-input" placeholder="Ingrese valor medido" style="flex:1;">
        <span class="text-muted" style="font-weight:700;">${iaSuggestion.unit}</span>
      </div>
    `;
    holder.appendChild(div);
  } else {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';
    wrapper.style.marginTop = '4px';
    
    wrapper.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <input type="text" class="form-control value-input" placeholder="Detalle observaciones o estado general" style="flex:1;">
        <button type="button" class="btn-icon btn-upload-task-photo" id="btn-upload-photo-${index}" title="Tomar / Subir Foto" style="font-size:18px;">📷</button>
        <input type="file" accept="image/*" class="hidden-input" id="task-file-${index}">
      </div>
      <div class="task-photo-preview hidden" id="task-photo-preview-${index}" style="position: relative; width: 60px; height: 60px; border-radius: 4px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
         <img src="" style="width: 100%; height: 100%; object-fit: cover;">
         <button type="button" class="btn-delete-img" id="btn-clear-task-photo-${index}" style="width: 18px; height: 18px; font-size: 11px; line-height: 14px; top: 2px; right: 2px; padding:0;">&times;</button>
      </div>
    `;
    
    holder.appendChild(wrapper);

    const fileInput = wrapper.querySelector(`#task-file-${index}`);
    const uploadBtn = wrapper.querySelector(`#btn-upload-photo-${index}`);
    const previewContainer = wrapper.querySelector(`#task-photo-preview-${index}`);
    const previewImg = previewContainer.querySelector('img');
    const clearBtn = wrapper.querySelector(`#btn-clear-task-photo-${index}`);

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        uploadBtn.disabled = true;
        uploadBtn.textContent = '⏳';
        
        API.uploadImage(fileInput.files[0]).then(res => {
          previewImg.src = res.url;
          previewContainer.classList.remove('hidden');
          holder.setAttribute('data-photo', res.url);
          uploadBtn.textContent = '📷';
          uploadBtn.disabled = false;
        }).catch(err => {
          alert('Error al subir la imagen: ' + err.message);
          uploadBtn.textContent = '📷';
          uploadBtn.disabled = false;
        });
      }
    });

    clearBtn.addEventListener('click', () => {
      fileInput.value = '';
      previewImg.src = '';
      previewContainer.classList.add('hidden');
      holder.removeAttribute('data-photo');
    });
  }
}

function submitTaskLog(machine, taskName, category, idx) {
  const holder = document.getElementById(`task-input-holder-${idx}`);
  const inputType = holder.getAttribute('data-current-type');
  const dateStr = document.getElementById('realizar-date').value;
  const photoUrl = holder.getAttribute('data-photo') || '';

  if (!dateStr) {
    alert('Por favor ingrese una fecha válida.');
    return;
  }

  let resultValue = '';
  if (inputType === 'boolean') {
    resultValue = holder.getAttribute('data-value');
    if (!resultValue) {
      alert('Por favor seleccione OK o NO OK.');
      return;
    }
  } else {
    const input = holder.querySelector('.value-input');
    resultValue = input.value.trim();
    if (!resultValue) {
      alert('Por favor ingrese un valor de medición u observaciones.');
      return;
    }
  }

  saveHistoryRecord(machine.id, machine.name, category, taskName, resultValue, dateStr, photoUrl).then(() => {
    showToast('Registro de mantenimiento guardado exitosamente.');
    if (state.selectedTaskNameForRealizar) {
      state.selectedTaskNameForRealizar = null;
      showScreen('screen-esta-semana');
    } else {
      renderRealizarTasks(machine);
    }
    updateNavBadge();
  });
}

function openHistoryModal(machineId, taskName, category) {
  const titleEl = document.getElementById('modal-history-title');
  titleEl.textContent = `Historial: ${taskName}`;

  const tbody = document.getElementById('modal-history-tbody');
  tbody.innerHTML = '';

  API.getHistory().then(historial => {
    const filtered = historial.filter(h => h.machineId === machineId && h.taskName === taskName && h.type === category);
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
      document.getElementById('modal-history-empty').classList.remove('hidden');
    } else {
      document.getElementById('modal-history-empty').classList.add('hidden');
      filtered.forEach(h => {
        const row = document.createElement('tr');
        
        const deleteBtnHtml = state.currentUser && state.currentUser.role === 'admin' 
          ? `<td data-label="Acción"><button type="button" class="btn-icon text-danger btn-delete-log" data-log-id="${h.id}" title="Eliminar registro">🗑️</button></td>`
          : '<td class="admin-only hidden"></td>';

        const photoHtml = h.photo 
          ? `<a href="${h.photo}" target="_blank" title="Ver foto adjunta" style="margin-left: 8px; display: inline-block; vertical-align: middle;">
               <img src="${h.photo}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
             </a>`
          : '';

        row.innerHTML = `
          <td data-label="Fecha"><strong>${formatDateDisplay(h.date)}</strong></td>
          <td data-label="Operario"><span class="badge" style="background-color:rgba(255,255,255,0.05); color:var(--text-muted);">${h.user}</span></td>
          <td data-label="Resultado">
            <strong class="${h.result === 'OK' ? 'text-success' : h.result === 'NO OK' ? 'text-danger' : 'text-main'}">${h.result}</strong>
            ${photoHtml}
          </td>
          ${deleteBtnHtml}
        `;
        
        const delBtn = row.querySelector('.btn-delete-log');
        if (delBtn) {
          delBtn.addEventListener('click', (e) => {
            const logId = parseInt(e.currentTarget.getAttribute('data-log-id'));
            if (confirm('¿Está seguro de que desea eliminar este registro de historial? Esta acción no se puede deshacer.')) {
              API.deleteHistoryLog(logId).then(() => {
                showToast('Registro de historial eliminado correctamente.');
                openHistoryModal(machineId, taskName, category);
                if (state.activeScreen === 'screen-esta-semana') {
                  loadEstaSemanaScreen();
                } else if (state.activeScreen === 'screen-realizar') {
                  const machine = state.machines.find(m => m.id === machineId);
                  if (machine) renderRealizarTasks(machine);
                }
                updateNavBadge();
              }).catch(err => alert(err.message));
            }
          });
        }

        tbody.appendChild(row);
      });
    }

    document.getElementById('modal-history').classList.add('active');
  });
}

// --- ALTA DE MAQUINA SCREEN ---
function loadAltaMaquinaScreen() {
  const form = document.getElementById('alta-maquina-form');
  form.reset();
  form.removeAttribute('data-edit-id');
  
  document.getElementById('alta-screen-title').textContent = 'Alta de Nueva Máquina';
  document.getElementById('alta-screen-desc').textContent = 'Registre una nueva máquina en el sistema junto a su pauta de control, mantenimiento y repuestos';
  document.getElementById('btn-save-machine').textContent = 'Guardar Máquina';
  document.getElementById('alta-codigo').disabled = true;

  document.getElementById('photo-preview-container').classList.add('hidden');
  document.getElementById('photo-upload-zone').querySelector('.upload-zone-prompt').classList.remove('hidden');
  document.getElementById('photo-upload-zone').removeAttribute('data-image');
  document.getElementById('controles-dinamicos').innerHTML = '';
  document.getElementById('mantenimiento-dinamico').innerHTML = '';
  document.getElementById('repuestos-dinamicos').innerHTML = '';

  API.getMachines().then(maquinas => {
    let nextCode = 100;
    if (maquinas.length > 0) {
      const maxCode = Math.max(...maquinas.map(m => parseInt(m.code) || 99));
      nextCode = maxCode + 1;
    }
    document.getElementById('alta-codigo').value = nextCode;
  });
}

function populateEditMachineForm(machine) {
  const form = document.getElementById('alta-maquina-form');
  form.reset();
  form.setAttribute('data-edit-id', machine.id);

  document.getElementById('alta-screen-title').textContent = 'Editar Máquina';
  document.getElementById('alta-screen-desc').textContent = 'Modifique los detalles de la máquina y sus pautas de mantenimiento';
  document.getElementById('btn-save-machine').textContent = 'Guardar Cambios';
  
  document.getElementById('alta-nombre').value = machine.name;
  document.getElementById('alta-codigo').value = machine.code;
  document.getElementById('alta-codigo').disabled = true;
  document.getElementById('alta-marca').value = machine.brand;
  document.getElementById('alta-modelo').value = machine.model;
  document.getElementById('alta-fecha-compra').value = machine.purchaseDate;
  document.getElementById('alta-proveedor').value = machine.supplier;
  document.getElementById('alta-caracteristicas').value = machine.characteristics || '';

  const photoZone = document.getElementById('photo-upload-zone');
  const photoPreviewContainer = document.getElementById('photo-preview-container');
  const photoPreview = document.getElementById('photo-preview');
  const photoPrompt = photoZone.querySelector('.upload-zone-prompt');

  if (machine.photo) {
    photoPreview.src = machine.photo;
    photoPreviewContainer.classList.remove('hidden');
    photoPrompt.classList.add('hidden');
    photoZone.setAttribute('data-image', machine.photo);
  } else {
    photoPreviewContainer.classList.add('hidden');
    photoPrompt.classList.remove('hidden');
    photoZone.removeAttribute('data-image');
  }

  const controlsContainer = document.getElementById('controles-dinamicos');
  controlsContainer.innerHTML = '';
  if (machine.periodicControls && machine.periodicControls.length > 0) {
    machine.periodicControls.forEach(c => addControlRow(c.name, c.frequency));
  }

  const maintContainer = document.getElementById('mantenimiento-dinamico');
  maintContainer.innerHTML = '';
  if (machine.preventiveMaintenances && machine.preventiveMaintenances.length > 0) {
    machine.preventiveMaintenances.forEach(pm => addMantenimientoRow(pm.name, pm.interval));
  }

  const repContainer = document.getElementById('repuestos-dinamicos');
  repContainer.innerHTML = '';
  if (machine.spareParts && machine.spareParts.length > 0) {
    machine.spareParts.forEach(r => {
      addRepuestoCard();
      const index = repContainer.children.length - 1;
      const card = repContainer.children[index];
      
      card.querySelector('.repuesto-name').value = r.name;
      card.querySelector('.repuesto-supplier').value = r.supplier || '';
      card.querySelector('.repuesto-code').value = r.code || '';
      
      if (r.photo) {
        card.querySelector(`#rep-preview-${index}`).src = r.photo;
        card.querySelector(`#rep-preview-${index}`).classList.remove('hidden');
        card.querySelector(`#rep-placeholder-${index}`).classList.add('hidden');
        card.querySelector('.repuesto-card-photo').setAttribute('data-image', r.photo);
      }
    });
  }
  
  showScreen('screen-alta-maquina');
}

function addControlRow(name = '', frequency = 'Mensual') {
  const container = document.getElementById('controles-dinamicos');
  const div = document.createElement('div');
  div.className = 'dyn-row';
  div.innerHTML = `
    <input type="text" class="form-control control-name" required value="${name}" placeholder="Descripción del control (Ej: Tensión de correas)" maxlength="50">
    <select class="form-control control-frequency">
      <option value="Diario" ${frequency === 'Diario' ? 'selected' : ''}>Diario</option>
      <option value="Semanal" ${frequency === 'Semanal' ? 'selected' : ''}>Semanal</option>
      <option value="Quincenal" ${frequency === 'Quincenal' ? 'selected' : ''}>Quincenal</option>
      <option value="Mensual" ${frequency === 'Mensual' ? 'selected' : ''}>Mensual</option>
      <option value="Bimestral" ${frequency === 'Bimestral' ? 'selected' : ''}>Bimestral</option>
      <option value="Trimestral" ${frequency === 'Trimestral' ? 'selected' : ''}>Trimestral</option>
      <option value="Semestral" ${frequency === 'Semestral' ? 'selected' : ''}>Semestral</option>
      <option value="Anual" ${frequency === 'Anual' ? 'selected' : ''}>Anual</option>
    </select>
    <button type="button" class="btn-icon text-danger btn-delete-row" title="Eliminar control">
      <svg class="icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
    </button>
  `;

  div.querySelector('.btn-delete-row').addEventListener('click', () => {
    div.style.animation = 'fadeIn 0.2s ease-out reverse';
    setTimeout(() => div.remove(), 200);
  });

  container.appendChild(div);
}

function addMantenimientoRow(name = '', interval = 'Cada 6 meses') {
  const container = document.getElementById('mantenimiento-dinamico');
  const div = document.createElement('div');
  div.className = 'dyn-row';
  div.innerHTML = `
    <input type="text" class="form-control maint-name" required value="${name}" placeholder="Descripción del mantenimiento (Ej: Cambio de aceite)" maxlength="50">
    <input type="text" class="form-control maint-interval" required value="${interval}" placeholder="Frecuencia (Ej: Cada 1000 horas, Anual)" maxlength="30">
    <button type="button" class="btn-icon text-danger btn-delete-row" title="Eliminar pauta">
      <svg class="icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
    </button>
  `;

  div.querySelector('.btn-delete-row').addEventListener('click', () => {
    div.style.animation = 'fadeIn 0.2s ease-out reverse';
    setTimeout(() => div.remove(), 200);
  });

  container.appendChild(div);
}

function addRepuestoCard() {
  const container = document.getElementById('repuestos-dinamicos');
  const index = container.children.length;
  
  const div = document.createElement('div');
  div.className = 'repuesto-card';
  
  div.innerHTML = `
    <div class="repuesto-card-photo" id="rep-photo-zone-${index}">
      <input type="file" accept="image/*" class="hidden-input" id="rep-file-${index}">
      <div class="photo-placeholder" id="rep-placeholder-${index}">
        <svg class="icon" viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>
      </div>
      <img id="rep-preview-${index}" class="hidden" style="width:100%; height:100%; object-fit:cover;">
    </div>
    <div class="repuesto-card-details">
      <input type="text" class="repuesto-name" required placeholder="Nombre del repuesto *" maxlength="30">
      <input type="text" class="repuesto-supplier" placeholder="Proveedor" maxlength="30">
      <input type="text" class="repuesto-code" placeholder="Código / Características" maxlength="30">
    </div>
    <button type="button" class="btn-icon text-danger btn-delete-rep" title="Eliminar repuesto">
      <svg class="icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
    </button>
  `;

  const fileInput = div.querySelector(`#rep-file-${index}`);
  const photoZone = div.querySelector(`#rep-photo-zone-${index}`);
  const preview = div.querySelector(`#rep-preview-${index}`);
  const placeholder = div.querySelector(`#rep-placeholder-${index}`);

  photoZone.addEventListener('click', (e) => {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      // Upload image to backend
      API.uploadImage(fileInput.files[0]).then(res => {
        preview.src = res.url;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        photoZone.setAttribute('data-image', res.url);
      }).catch(err => alert(err.message));
    }
  });

  div.querySelector('.btn-delete-rep').addEventListener('click', () => {
    div.style.animation = 'fadeIn 0.2s ease-out reverse';
    setTimeout(() => div.remove(), 200);
  });

  container.appendChild(div);
}

function handleSaveMachine(e) {
  e.preventDefault();

  const name = document.getElementById('alta-nombre').value.trim();
  const code = document.getElementById('alta-codigo').value;
  const brand = document.getElementById('alta-marca').value.trim();
  const model = document.getElementById('alta-modelo').value.trim();
  const purchaseDate = document.getElementById('alta-fecha-compra').value.trim();
  const supplier = document.getElementById('alta-proveedor').value.trim();
  const characteristics = document.getElementById('alta-caracteristicas').value.trim();
  
  const photoZone = document.getElementById('photo-upload-zone');
  const photo = photoZone.getAttribute('data-image') || '';

  const periodicControls = [];
  document.querySelectorAll('#controles-dinamicos .dyn-row').forEach(row => {
    const cName = row.querySelector('.control-name').value.trim();
    const cFreq = row.querySelector('.control-frequency').value;
    if (cName) {
      periodicControls.push({ name: cName, frequency: cFreq });
    }
  });

  const preventiveMaintenances = [];
  document.querySelectorAll('#mantenimiento-dinamico .dyn-row').forEach(row => {
    const mName = row.querySelector('.maint-name').value.trim();
    const mInt = row.querySelector('.maint-interval').value.trim();
    if (mName && mInt) {
      preventiveMaintenances.push({ name: mName, interval: mInt });
    }
  });

  const spareParts = [];
  document.querySelectorAll('#repuestos-dinamicos .repuesto-card').forEach(card => {
    const rName = card.querySelector('.repuesto-name').value.trim();
    const rSupplier = card.querySelector('.repuesto-supplier').value.trim();
    const rCode = card.querySelector('.repuesto-code').value.trim();
    const rPhoto = card.querySelector('.repuesto-card-photo').getAttribute('data-image') || '';

    if (rName) {
      spareParts.push({ name: rName, supplier: rSupplier, code: rCode, photo: rPhoto });
    }
  });

  const form = document.getElementById('alta-maquina-form');
  const editId = form.getAttribute('data-edit-id');

  const machineData = {
    name,
    code,
    brand,
    model,
    purchaseDate,
    supplier,
    characteristics,
    photo,
    periodicControls,
    preventiveMaintenances,
    spareParts
  };

  if (editId) {
    machineData.id = parseInt(editId);
  }

  API.saveMachine(machineData).then(() => {
    showToast(editId ? 'Máquina modificada correctamente.' : 'Nueva máquina registrada correctamente.');
    form.removeAttribute('data-edit-id');
    showScreen('screen-menu-mantenimiento');
  }).catch(err => {
    console.error('Error saving machine:', err);
    alert('Error al guardar la máquina. Intente nuevamente.');
  });
}

// --- GESTION USUARIOS SCREEN ---
function loadUsuariosScreen() {
  const tbody = document.getElementById('user-list-tbody');
  tbody.innerHTML = '';

  API.getUsers().then(usuarios => {
    usuarios.forEach(u => {
      const row = document.createElement('tr');
      const isSelf = u.username === state.currentUser.username;
      
      const perms = u.permissions || { mantenimiento: true, calidad: true, produccion: true, auditoria: true };
      const permBadges = [];
      if (perms.mantenimiento !== false) permBadges.push('<span class="badge" style="background:rgba(241,193,3,0.15);color:#f1c103;font-size:11px;">Mantenimiento</span>');
      if (perms.calidad !== false) permBadges.push('<span class="badge" style="background:rgba(39,174,96,0.15);color:#27ae60;font-size:11px;">Calidad</span>');
      if (perms.produccion !== false) permBadges.push('<span class="badge" style="background:rgba(41,128,185,0.15);color:#2980b9;font-size:11px;">Producción</span>');
      if (perms.auditoria !== false) permBadges.push('<span class="badge" style="background:rgba(155,89,182,0.15);color:#9b59b2;font-size:11px;">Auditoría</span>');

      row.innerHTML = `
        <td data-label="Usuario"><strong>${u.username}</strong></td>
        <td data-label="Rol"><span class="badge" style="background-color:${u.role === 'admin' ? 'rgba(241,193,3,0.1)' : 'rgba(255,255,255,0.05)'}; color:${u.role === 'admin' ? 'var(--primary-color)' : 'var(--text-muted)'}">${u.role === 'admin' ? 'Administrador' : 'Supervisor'}</span></td>
        <td data-label="Permisos de Acceso" style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">${permBadges.length > 0 ? permBadges.join(' ') : '<span style="color:var(--text-muted);font-size:12px;">Sin accesos</span>'}</td>
        <td data-label="Acción" style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-secondary btn-sm btn-edit-user" data-username="${u.username}">
            Editar
          </button>
          <button type="button" class="btn btn-danger btn-sm btn-delete-user" data-username="${u.username}" ${isSelf ? 'disabled' : ''}>
            Eliminar
          </button>
        </td>
      `;

      row.querySelector('.btn-edit-user').addEventListener('click', () => {
        openEditUser(u);
      });

      if (!isSelf) {
        row.querySelector('.btn-delete-user').addEventListener('click', () => {
          if (confirm(`¿Está seguro de que desea eliminar al usuario "${u.username}"?`)) {
            API.deleteUser(u.username).then(() => {
              showToast(`Usuario ${u.username} eliminado.`);
              loadUsuariosScreen();
            }).catch(err => alert(err.message));
          }
        });
      }

      tbody.appendChild(row);
    });
  });
}

function handleCreateUser(e) {
  e.preventDefault();
  const username = document.getElementById('new-username').value.trim().toLowerCase();
  const password = document.getElementById('new-password').value;
  const role = document.getElementById('new-role').value;
  
  const permissions = {
    mantenimiento: document.getElementById('new-perm-mantenimiento').checked,
    calidad: document.getElementById('new-perm-calidad').checked,
    produccion: document.getElementById('new-perm-produccion').checked,
    auditoria: document.getElementById('new-perm-auditoria').checked
  };

  if (!username || !password) return;

  API.createUser(username, password, role, permissions).then(() => {
    showToast(`Usuario "${username}" creado exitosamente.`);
    document.getElementById('create-user-form').reset();
    loadUsuariosScreen();
  }).catch(err => {
    alert(err.message);
  });
}

function openEditUser(user) {
  document.getElementById('card-create-user').classList.add('hidden');
  document.getElementById('card-edit-user').classList.remove('hidden');
  
  document.getElementById('edit-username').value = user.username;
  document.getElementById('edit-user-title').textContent = user.username;
  document.getElementById('edit-role').value = user.role;
  document.getElementById('edit-password').value = '';
  
  const perms = user.permissions || {
    mantenimiento: true,
    calidad: true,
    produccion: true,
    auditoria: true
  };
  
  document.getElementById('edit-perm-mantenimiento').checked = perms.mantenimiento !== false;
  document.getElementById('edit-perm-calidad').checked = perms.calidad !== false;
  document.getElementById('edit-perm-produccion').checked = perms.produccion !== false;
  document.getElementById('edit-perm-auditoria').checked = perms.auditoria !== false;
}

function cancelEditUser() {
  document.getElementById('card-edit-user').classList.add('hidden');
  document.getElementById('card-create-user').classList.remove('hidden');
  document.getElementById('edit-user-form').reset();
}

function handleEditUser(e) {
  e.preventDefault();
  const username = document.getElementById('edit-username').value;
  const password = document.getElementById('edit-password').value;
  const role = document.getElementById('edit-role').value;
  
  const permissions = {
    mantenimiento: document.getElementById('edit-perm-mantenimiento').checked,
    calidad: document.getElementById('edit-perm-calidad').checked,
    produccion: document.getElementById('edit-perm-produccion').checked,
    auditoria: document.getElementById('edit-perm-auditoria').checked
  };
  
  API.updateUser(username, password, role, permissions).then(() => {
    showToast(`Usuario "${username}" actualizado exitosamente.`);
    cancelEditUser();
    loadUsuariosScreen();
    
    // Si el usuario editado es el mismo que está logueado, actualizamos su sesión y recargamos permisos
    if (state.currentUser && state.currentUser.username === username) {
      const updatedUser = { username, role, permissions };
      loginUser(updatedUser);
    }
  }).catch(err => {
    alert(err.message);
  });
}

function handleDownloadBackup() {
  fetch('/api/backup')
    .then(res => {
      if (!res.ok) throw new Error('Error al descargar copia de seguridad');
      return res.json();
    })
    .then(data => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `DAO_PLANTA_Backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Copia de seguridad descargada.');
    })
    .catch(err => {
      console.error(err);
      alert('Error al descargar la copia de seguridad.');
    });
}

function handleRestoreBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const backupData = JSON.parse(evt.target.result);
      
      if (!backupData.usuarios || !backupData.maquinas || !backupData.historial) {
        alert('El archivo no tiene el formato válido de copia de seguridad (debe contener usuarios, máquinas e historial).');
        return;
      }
      
      if (confirm('¿Está seguro de que desea restaurar esta copia de seguridad? Se reemplazarán todas las máquinas, usuarios e historiales actuales.')) {
        fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupData)
        })
        .then(res => {
          if (!res.ok) return res.json().then(err => { throw new Error(err.error || 'Error al restaurar'); });
          return res.json();
        })
        .then(() => {
          alert('Copia de seguridad restaurada con éxito. La página se recargará.');
          window.location.reload();
        })
        .catch(err => {
          alert('Error al restaurar la copia de seguridad: ' + err.message);
        });
      }
    } catch(err) {
      alert('Error al leer el archivo de respaldo: El archivo no es un JSON válido.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// --- HISTORIAL GENERAL SCREEN ---
function loadHistorialGeneralScreen() {
  const selectMachine = document.getElementById('history-machine-filter');
  selectMachine.innerHTML = '<option value="">-- Todas las máquinas --</option>';

  API.getMachines().then(maquinas => {
    maquinas.sort((a, b) => a.name.localeCompare(b.name));
    maquinas.forEach(mac => {
      const opt = document.createElement('option');
      opt.value = mac.id;
      opt.textContent = `${mac.name} (Cód. ${mac.code})`;
      selectMachine.appendChild(opt);
    });

    renderHistorialGeneral();
  });
}

function renderHistorialGeneral() {
  const tbody = document.getElementById('history-general-tbody');
  tbody.innerHTML = '';

  const searchValue = document.getElementById('history-search').value.toLowerCase().trim();
  const machineFilterValue = document.getElementById('history-machine-filter').value;
  const typeFilterValue = document.getElementById('history-type-filter').value;
  const sortValue = document.getElementById('history-sort').value;

  // Dynamically update Title, Description, and Filter fields visibility
  const titleEl = document.querySelector('#screen-historial-general .screen-header h2');
  const descEl = document.querySelector('#screen-historial-general .screen-header p');
  const filterGroupMachine = document.getElementById('filter-group-machine');
  const filterGroupType = document.getElementById('filter-group-type');

  if (state.activeHistoryCategory === 'calidad') {
    if (titleEl) titleEl.textContent = 'Historial de Calidad';
    if (descEl) descEl.textContent = 'Consulte y filtre el registro histórico de controles de calidad';
    if (filterGroupMachine) filterGroupMachine.classList.add('hidden');
    if (filterGroupType) filterGroupType.classList.add('hidden');
  } else if (state.activeHistoryCategory === 'auditoria') {
    if (titleEl) titleEl.textContent = 'Historial de Auditoría';
    if (descEl) descEl.textContent = 'Consulte y busque el registro histórico de auditorías 5S realizadas';
    if (filterGroupMachine) filterGroupMachine.classList.add('hidden');
    if (filterGroupType) filterGroupType.classList.add('hidden');
  } else {
    if (titleEl) titleEl.textContent = 'Historial de Mantenimiento';
    if (descEl) descEl.textContent = 'Consulte, filtre y busque los registros históricos de mantenimiento de maquinaria';
    if (filterGroupMachine) filterGroupMachine.classList.remove('hidden');
    if (filterGroupType) filterGroupType.classList.remove('hidden');
  }

  API.getHistory().then(historial => {
    let filtered = [...historial];

    // Filter by module category first
    if (state.activeHistoryCategory === 'calidad') {
      filtered = filtered.filter(h => h.type === 'calidad');
    } else if (state.activeHistoryCategory === 'auditoria') {
      filtered = filtered.filter(h => h.type === 'auditoria');
    } else {
      filtered = filtered.filter(h => h.type === 'control' || h.type === 'preventive' || h.type === 'corrective');
    }

    // Filter by machine (if visible and set)
    if (state.activeHistoryCategory === 'mantenimiento' && machineFilterValue) {
      filtered = filtered.filter(h => h.machineId === parseInt(machineFilterValue));
    }

    // Filter by type (if visible and set)
    if (state.activeHistoryCategory === 'mantenimiento' && typeFilterValue) {
      filtered = filtered.filter(h => h.type === typeFilterValue);
    }

    // Search by text (machine name or task name)
    if (searchValue) {
      filtered = filtered.filter(h => 
        h.machineName.toLowerCase().includes(searchValue) || 
        h.taskName.toLowerCase().includes(searchValue)
      );
    }

    // Sort
    if (sortValue === 'date-desc') {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortValue === 'date-asc') {
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortValue === 'machine-asc') {
      filtered.sort((a, b) => a.machineName.localeCompare(b.machineName));
    } else if (sortValue === 'task-asc') {
      filtered.sort((a, b) => a.taskName.localeCompare(b.taskName));
    }

    if (filtered.length === 0) {
      document.getElementById('history-general-empty-state').classList.remove('hidden');
      document.getElementById('table-history-general').classList.add('hidden');
    } else {
      document.getElementById('history-general-empty-state').classList.add('hidden');
      document.getElementById('table-history-general').classList.remove('hidden');

      filtered.forEach(h => {
        const row = document.createElement('tr');

        const deleteBtnHtml = state.currentUser && state.currentUser.role === 'admin' 
          ? `<td data-label="Acción"><button type="button" class="btn-icon text-danger btn-delete-log-general" data-log-id="${h.id}" title="Eliminar registro">🗑️</button></td>`
          : '<td class="admin-only hidden"></td>';

        const photoHtml = h.photo 
          ? `<a href="${h.photo}" target="_blank" title="Ver foto adjunta" style="margin-left: 8px; display: inline-block; vertical-align: middle;">
               <img src="${h.photo}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
             </a>`
          : '';

        row.innerHTML = `
          <td data-label="Fecha"><strong>${formatDateDisplay(h.date)}</strong></td>
          <td data-label="Máquina">
            <strong>${h.machineName}</strong>
          </td>
          <td data-label="Tipo">${
            h.type === 'control' ? 'Control Periódico' :
            h.type === 'preventive' ? 'Mant. Preventivo' :
            h.type === 'corrective' ? 'Mant. Correctivo' :
            h.type === 'calidad' ? 'Ctrl. Calidad' :
            h.type === 'auditoria' ? 'Auditoría 5S' : h.type
          }</td>
          <td data-label="Actividad"><strong>${h.taskName}</strong></td>
          <td data-label="Resultado">
            <strong class="${h.result === 'OK' ? 'text-success' : h.result === 'NO OK' ? 'text-danger' : 'text-main'}">${h.result}</strong>
            ${photoHtml}
          </td>
          <td data-label="Operario"><span class="badge" style="background-color:rgba(255,255,255,0.05); color:var(--text-muted);">${h.user}</span></td>
          ${deleteBtnHtml}
        `;

        const delBtn = row.querySelector('.btn-delete-log-general');
        if (delBtn) {
          delBtn.addEventListener('click', (e) => {
            const logId = parseInt(e.currentTarget.getAttribute('data-log-id'));
            if (confirm('¿Está seguro de que desea eliminar este registro de historial? Esta acción no se puede deshacer.')) {
              API.deleteHistoryLog(logId).then(() => {
                showToast('Registro de historial eliminado correctamente.');
                renderHistorialGeneral();
                updateNavBadge();
              }).catch(err => alert(err.message));
            }
          });
        }

        tbody.appendChild(row);
      });
    }
  });
}

// --- MANTENIMIENTO CORRECTIVO LOGIC ---
function setupCorrectiveMaintenance() {
  const btnOpen = document.getElementById('btn-realizar-corrective');
  const modal = document.getElementById('modal-corrective');
  const btnClose = document.getElementById('btn-close-modal-corrective');
  const btnCancel = document.getElementById('btn-cancel-corrective');
  const form = document.getElementById('corrective-maintenance-form');
  
  const problemInput = document.getElementById('corrective-problem');
  const solutionInput = document.getElementById('corrective-solution');
  const problemCharCount = document.getElementById('problem-char-count');
  const solutionCharCount = document.getElementById('solution-char-count');

  const photoInput = document.getElementById('corrective-photo-input');
  const btnUpload = document.getElementById('btn-corrective-upload-photo');
  const photoPreview = document.getElementById('corrective-photo-preview');
  const previewImg = photoPreview.querySelector('img');
  const btnClearPhoto = document.getElementById('btn-clear-corrective-photo');

  // Open modal
  btnOpen.addEventListener('click', () => {
    if (!state.selectedMachineIdForRealizar) {
      alert('Por favor seleccione una máquina primero.');
      return;
    }
    document.getElementById('corrective-date').value = getLocalDateString();
    form.reset();
    state.correctivePhotoUrl = '';
    photoPreview.classList.add('hidden');
    previewImg.src = '';
    problemCharCount.textContent = '0';
    solutionCharCount.textContent = '0';
    modal.classList.add('active');
  });

  // Close modal
  const closeModal = () => {
    modal.classList.remove('active');
  };
  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  // Character counters
  problemInput.addEventListener('input', () => {
    problemCharCount.textContent = problemInput.value.length;
  });

  solutionInput.addEventListener('input', () => {
    solutionCharCount.textContent = solutionInput.value.length;
  });

  // Photo uploads
  btnUpload.addEventListener('click', () => {
    photoInput.click();
  });

  photoInput.addEventListener('change', () => {
    if (photoInput.files && photoInput.files[0]) {
      btnUpload.disabled = true;
      btnUpload.textContent = '⏳';

      API.uploadImage(photoInput.files[0]).then(res => {
        previewImg.src = res.url;
        photoPreview.classList.remove('hidden');
        state.correctivePhotoUrl = res.url;
        btnUpload.textContent = '📷 Subir Foto';
        btnUpload.disabled = false;
      }).catch(err => {
        alert('Error al subir la imagen: ' + err.message);
        btnUpload.textContent = '📷 Subir Foto';
        btnUpload.disabled = false;
      });
    }
  });

  btnClearPhoto.addEventListener('click', () => {
    photoInput.value = '';
    previewImg.src = '';
    photoPreview.classList.add('hidden');
    state.correctivePhotoUrl = '';
  });

  // Submit corrective maintenance
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const dateStr = document.getElementById('corrective-date').value;
    const problem = problemInput.value.trim();
    const solution = solutionInput.value.trim();

    if (!dateStr) {
      alert('Por favor seleccione una fecha.');
      return;
    }
    if (!problem || !solution) {
      alert('Por favor complete el problema y la solución.');
      return;
    }

    const machine = state.machines.find(m => m.id === state.selectedMachineIdForRealizar);
    if (!machine) return;

    const resultValue = `Problema: ${problem} | Solución: ${solution}`;

    saveHistoryRecord(
      machine.id, 
      machine.name, 
      'corrective', 
      'Mantenimiento Correctivo', 
      resultValue, 
      dateStr, 
      state.correctivePhotoUrl
    ).then(() => {
      showToast('Mantenimiento correctivo registrado exitosamente.');
      closeModal();
      renderRealizarTasks(machine);
      updateNavBadge();
    }).catch(err => {
      alert('Error al registrar mantenimiento correctivo: ' + err.message);
    });
  });
}

// --- CALIDAD LOGIC ---
let calidadSelectedType = 'boolean';
let calidadActiveBlueprintUrl = '';
let calidadNewBlueprintUrl = '';

function resetCalidadScreen() {
  const startForm = document.getElementById('calidad-start-form');
  const execForm = document.getElementById('calidad-execution-form');
  if (startForm) startForm.reset();
  if (execForm) execForm.reset();
  
  const startCard = document.getElementById('calidad-start-card');
  const execCard = document.getElementById('calidad-execution-card');
  if (startCard) startCard.classList.remove('hidden');
  if (execCard) execCard.classList.add('hidden');
  
  const photoPreview = document.getElementById('calidad-photo-preview');
  if (photoPreview) {
    photoPreview.classList.add('hidden');
    const img = photoPreview.querySelector('img');
    if (img) img.src = '';
  }
  state.calidadPhotoUrl = '';
  calidadActiveBlueprintUrl = '';
  calidadNewBlueprintUrl = '';
  
  const newPreview = document.getElementById('calidad-new-blueprint-preview');
  if (newPreview) {
    newPreview.classList.add('hidden');
    const img = newPreview.querySelector('img');
    if (img) img.src = '';
  }

  const activeDisplay = document.getElementById('calidad-active-blueprint-display');
  if (activeDisplay) activeDisplay.classList.add('hidden');

  loadCalidadCatalog();
}

function loadCalidadCatalog() {
  const select = document.getElementById('calidad-producto-select');
  if (!select) return;

  API.getCalidadProductos().then(prods => {
    state.calidadProductos = prods || [];
    select.innerHTML = '<option value="__new__">➕ Crear / Cargar Nuevo Producto...</option>';
    state.calidadProductos.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name}`;
      select.appendChild(opt);
    });
  }).catch(() => {});
}

function setupCalidadLogic() {
  const startForm = document.getElementById('calidad-start-form');
  const executionForm = document.getElementById('calidad-execution-form');
  const btnCancel = document.getElementById('btn-calidad-cancel');
  
  const selectProduct = document.getElementById('calidad-producto-select');
  const productInput = document.getElementById('calidad-producto');
  const requirementInput = document.getElementById('calidad-requerimiento');
  const saveCheckboxGroup = document.getElementById('calidad-save-checkbox-group');
  const saveCheckbox = document.getElementById('calidad-guardar-producto');

  const activeDisplay = document.getElementById('calidad-active-blueprint-display');
  const activeImg = document.getElementById('calidad-active-blueprint-img');
  const btnChangeBlueprint = document.getElementById('btn-change-product-blueprint');
  
  const newUploader = document.getElementById('calidad-new-blueprint-uploader');
  const blueprintInput = document.getElementById('calidad-product-photo-input');
  const btnUploadBlueprint = document.getElementById('btn-upload-product-blueprint');
  const newBlueprintPreview = document.getElementById('calidad-new-blueprint-preview');
  const btnClearNewBlueprint = document.getElementById('btn-clear-product-blueprint');

  const activeProduct = document.getElementById('calidad-active-product');
  const activeRequirement = document.getElementById('calidad-active-requirement');
  
  const aiSuggestionLabel = document.getElementById('calidad-ai-suggestion-label');
  const inputHolder = document.getElementById('calidad-input-holder');
  
  const photoInput = document.getElementById('calidad-photo-input');
  const btnUploadPhoto = document.getElementById('btn-calidad-upload-photo');
  const photoPreview = document.getElementById('calidad-photo-preview');
  const previewImg = photoPreview ? photoPreview.querySelector('img') : null;
  const btnClearPhoto = document.getElementById('btn-clear-calidad-photo');

  if (!startForm) return;

  // Catalog Select Change
  if (selectProduct) {
    selectProduct.addEventListener('change', () => {
      const val = selectProduct.value;
      if (val === '__new__') {
        productInput.value = '';
        requirementInput.value = '';
        productInput.readOnly = false;
        requirementInput.readOnly = false;
        if (saveCheckboxGroup) saveCheckboxGroup.classList.remove('hidden');
        if (activeDisplay) activeDisplay.classList.add('hidden');
        if (newUploader) newUploader.classList.remove('hidden');
        calidadActiveBlueprintUrl = '';
      } else {
        const prod = state.calidadProductos.find(p => p.id == val);
        if (prod) {
          productInput.value = prod.name || '';
          requirementInput.value = prod.specification || '';
          productInput.readOnly = true;
          requirementInput.readOnly = true;
          if (saveCheckboxGroup) saveCheckboxGroup.classList.add('hidden');
          
          if (prod.image) {
            calidadActiveBlueprintUrl = prod.image;
            if (activeImg) activeImg.src = prod.image;
            if (activeDisplay) activeDisplay.classList.remove('hidden');
            if (newUploader) newUploader.classList.add('hidden');
          } else {
            calidadActiveBlueprintUrl = '';
            if (activeDisplay) activeDisplay.classList.add('hidden');
            if (newUploader) newUploader.classList.remove('hidden');
          }
        }
      }
    });
  }

  // Change blueprint button
  if (btnChangeBlueprint) {
    btnChangeBlueprint.addEventListener('click', () => {
      if (newUploader) newUploader.classList.remove('hidden');
      if (activeDisplay) activeDisplay.classList.add('hidden');
    });
  }

  // Blueprint Uploading
  if (btnUploadBlueprint) {
    btnUploadBlueprint.addEventListener('click', () => blueprintInput.click());
  }

  if (blueprintInput) {
    blueprintInput.addEventListener('change', () => {
      if (blueprintInput.files && blueprintInput.files[0]) {
        btnUploadBlueprint.disabled = true;
        btnUploadBlueprint.textContent = '⏳ Subiendo...';
        
        API.uploadImage(blueprintInput.files[0]).then(res => {
          calidadNewBlueprintUrl = res.url;
          calidadActiveBlueprintUrl = res.url;
          if (newBlueprintPreview) {
            const img = newBlueprintPreview.querySelector('img');
            if (img) img.src = res.url;
            newBlueprintPreview.classList.remove('hidden');
          }
          btnUploadBlueprint.textContent = '📐 Plano Subido';
          btnUploadBlueprint.disabled = false;
        }).catch(err => {
          alert('Error al subir plano: ' + err.message);
          btnUploadBlueprint.textContent = '📐 Subir Foto o Plano';
          btnUploadBlueprint.disabled = false;
        });
      }
    });
  }

  if (btnClearNewBlueprint) {
    btnClearNewBlueprint.addEventListener('click', () => {
      if (blueprintInput) blueprintInput.value = '';
      if (newBlueprintPreview) {
        newBlueprintPreview.classList.add('hidden');
        const img = newBlueprintPreview.querySelector('img');
        if (img) img.src = '';
      }
      calidadNewBlueprintUrl = '';
      calidadActiveBlueprintUrl = '';
      btnUploadBlueprint.textContent = '📐 Subir Foto o Plano';
    });
  }

  // Form 1: Start Control
  startForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const product = productInput.value.trim();
    const requirement = requirementInput.value.trim();
    
    if (!product || !requirement) return;

    // Check if we should save product to catalog
    const isNew = selectProduct.value === '__new__';
    const shouldSave = saveCheckbox && saveCheckbox.checked;

    if (isNew && shouldSave) {
      API.saveCalidadProducto({
        name: product,
        specification: requirement,
        image: calidadActiveBlueprintUrl || calidadNewBlueprintUrl || ''
      }).catch(err => console.error('Error saving product to catalog:', err));
    }
    
    activeProduct.textContent = product;
    activeRequirement.textContent = requirement;
    document.getElementById('calidad-date').value = getLocalDateString();
    
    // Analyze requirement
    const iaSuggestion = analyzeTaskDescription(requirement);
    aiSuggestionLabel.textContent = iaSuggestion.type === 'boolean' ? 'OK / NO OK' : iaSuggestion.type === 'numeric' ? 'Numérico' : 'Observación';
    
    calidadSelectedType = iaSuggestion.type;
    renderCalidadDynamicInput(iaSuggestion);
    
    // Transition card
    document.getElementById('calidad-start-card').classList.add('hidden');
    document.getElementById('calidad-execution-card').classList.remove('hidden');
  });

  // Override Buttons
  document.querySelectorAll('.btn-override-type-calidad').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      calidadSelectedType = type;
      renderCalidadDynamicInput({ type, label: 'Medición', unit: type === 'numeric' ? ' unid.' : '' });
    });
  });

  function renderCalidadDynamicInput(suggestion) {
    if (!inputHolder) return;
    inputHolder.innerHTML = '';
    inputHolder.setAttribute('data-current-type', suggestion.type);
    inputHolder.removeAttribute('data-value');
    
    if (suggestion.type === 'boolean') {
      const wrapper = document.createElement('div');
      wrapper.className = 'ok-no-ok-selector';
      wrapper.innerHTML = `
        <button type="button" class="ok-btn" id="calidad-ok-btn">OK / APTO</button>
        <button type="button" class="no-ok-btn" id="calidad-no-ok-btn">NO OK / DEFECTO</button>
      `;
      inputHolder.appendChild(wrapper);
      
      const okBtn = wrapper.querySelector('.ok-btn');
      const noOkBtn = wrapper.querySelector('.no-ok-btn');
      
      okBtn.addEventListener('click', () => {
        okBtn.classList.add('active');
        noOkBtn.classList.remove('active');
        inputHolder.setAttribute('data-value', 'OK');
      });
      
      noOkBtn.addEventListener('click', () => {
        noOkBtn.classList.add('active');
        okBtn.classList.remove('active');
        inputHolder.setAttribute('data-value', 'NO OK');
      });
    } else if (suggestion.type === 'numeric') {
      const div = document.createElement('div');
      div.className = 'form-group';
      div.style.marginBottom = '0';
      div.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <input type="number" step="any" class="form-control value-input" id="calidad-val-input" placeholder="Ingrese valor medido" style="flex:1;" required>
          <span class="text-muted" style="font-weight:700;">${suggestion.unit || ''}</span>
        </div>
      `;
      inputHolder.appendChild(div);
    } else {
      const div = document.createElement('div');
      div.className = 'form-group';
      div.style.marginBottom = '0';
      div.innerHTML = `
        <input type="text" class="form-control value-input" id="calidad-val-input" placeholder="Detalle observaciones o estado general" required>
      `;
      inputHolder.appendChild(div);
    }
  }

  // Photo uploads
  if (btnUploadPhoto) {
    btnUploadPhoto.addEventListener('click', () => photoInput.click());
  }
  
  if (photoInput) {
    photoInput.addEventListener('change', () => {
      if (photoInput.files && photoInput.files[0]) {
        btnUploadPhoto.disabled = true;
        btnUploadPhoto.textContent = '⏳';
        
        API.uploadImage(photoInput.files[0]).then(res => {
          if (previewImg) previewImg.src = res.url;
          if (photoPreview) photoPreview.classList.remove('hidden');
          state.calidadPhotoUrl = res.url;
          btnUploadPhoto.textContent = '📷 Subir Foto';
          btnUploadPhoto.disabled = false;
        }).catch(err => {
          alert('Error al subir la imagen: ' + err.message);
          btnUploadPhoto.textContent = '📷 Subir Foto';
          btnUploadPhoto.disabled = false;
        });
      }
    });
  }

  if (btnClearPhoto) {
    btnClearPhoto.addEventListener('click', () => {
      if (photoInput) photoInput.value = '';
      if (previewImg) previewImg.src = '';
      if (photoPreview) photoPreview.classList.add('hidden');
      state.calidadPhotoUrl = '';
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', resetCalidadScreen);
  }

  // Form 2: Execution Save
  executionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const product = activeProduct.textContent;
    const requirement = activeRequirement.textContent;
    const dateStr = document.getElementById('calidad-date').value;
    
    let resultVal = '';
    if (calidadSelectedType === 'boolean') {
      resultVal = inputHolder.getAttribute('data-value');
      if (!resultVal) {
        alert('Por favor seleccione si el producto está OK o NO OK.');
        return;
      }
    } else {
      const inputEl = document.getElementById('calidad-val-input');
      resultVal = inputEl ? inputEl.value.trim() : '';
      if (!resultVal) {
        alert('Por favor ingrese el resultado del control.');
        return;
      }
    }

    saveHistoryRecord(
      'calidad',
      product,
      'calidad',
      requirement,
      resultVal,
      dateStr,
      state.calidadPhotoUrl
    ).then(() => {
      showToast('Control de calidad registrado correctamente.');
      resetCalidadScreen();
      showScreen('screen-menu-calidad');
    }).catch(err => {
      alert('Error al registrar control: ' + err.message);
    });
  });
}

// --- AUDITORIA LOGIC ---
function resetAuditoriaScreen() {
  const dateEl = document.getElementById('auditoria-date');
  if (dateEl) dateEl.value = getLocalDateString();
  loadAuditoriaScreen();
}

function loadAuditoriaScreen() {
  const container = document.getElementById('auditoria-items-container');
  if (!container) return;

  const dateStr = document.getElementById('auditoria-date').value || getLocalDateString();

  Promise.all([API.getAuditTasks(), API.getHistory()]).then(([tasks, history]) => {
    state.auditTasks = tasks || [];
    container.innerHTML = '';

    if (state.auditTasks.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 25px; color: var(--text-muted);">
          <p>No hay puestos de auditoría configurados.</p>
          <button type="button" class="btn btn-primary btn-sm" style="margin-top: 10px;" onclick="showScreen('screen-gestion-auditoria')">
            ⚙️ Gestionar Puestos de Auditoría
          </button>
        </div>
      `;
      return;
    }

    // Filter history for this date & type auditoria
    const auditLogsForDate = (history || []).filter(h => h.type === 'auditoria' && h.date === dateStr);

    state.auditTasks.forEach(task => {
      const existingLog = auditLogsForDate.find(h => h.taskName === task.name);
      
      let ordenVal = null;
      let limpiezaVal = null;
      let photoUrl = '';
      let isSaved = false;

      if (existingLog) {
        isSaved = true;
        photoUrl = existingLog.photo || '';
        // Parse result "Orden: ORDENADO | Limpieza: LIMPIO"
        const parts = (existingLog.result || '').split('|');
        parts.forEach(p => {
          if (p.includes('Orden:')) {
            ordenVal = p.replace('Orden:', '').trim();
          }
          if (p.includes('Limpieza:')) {
            limpiezaVal = p.replace('Limpieza:', '').trim();
          }
        });
      }

      const card = document.createElement('div');
      card.className = 'auditoria-item-card';
      card.setAttribute('data-item', task.name);
      card.style.cssText = 'border: 1px solid var(--panel-border); padding: 15px; border-radius: var(--border-radius); background: rgba(255,255,255,0.01); margin-bottom: 10px;';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="margin: 0; color: var(--text-main); font-size: 15px; font-weight: 600;">${task.name}</h4>
          <span class="audit-status-badge badge" style="${isSaved ? 'background: var(--success); color: #fff;' : 'background: rgba(255,255,255,0.1); color: var(--text-muted);'}">
            ${isSaved ? '✅ Guardada' : 'Pendiente'}
          </span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center;">
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <span style="font-size: 11px; font-weight: bold; color: var(--text-muted); letter-spacing: 0.5px;">ORDEN:</span>
            <div class="toggle-group" style="display: flex; gap: 5px;">
              <button type="button" class="btn btn-secondary btn-sm toggle-btn btn-orden ${ordenVal === 'ORDENADO' ? 'active-success' : ''}" data-val="ORDENADO">Ordenado</button>
              <button type="button" class="btn btn-secondary btn-sm toggle-btn btn-orden ${ordenVal === 'DESORDENADO' ? 'active-danger' : ''}" data-val="DESORDENADO">Desordenado</button>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <span style="font-size: 11px; font-weight: bold; color: var(--text-muted); letter-spacing: 0.5px;">LIMPIEZA:</span>
            <div class="toggle-group" style="display: flex; gap: 5px;">
              <button type="button" class="btn btn-secondary btn-sm toggle-btn btn-limpieza ${limpiezaVal === 'LIMPIO' ? 'active-success' : ''}" data-val="LIMPIO">Limpio</button>
              <button type="button" class="btn btn-secondary btn-sm toggle-btn btn-limpieza ${limpiezaVal === 'SUCIO' ? 'active-danger' : ''}" data-val="SUCIO">Sucio</button>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 160px;">
            <span style="font-size: 11px; font-weight: bold; color: var(--text-muted); letter-spacing: 0.5px;">EVIDENCIA:</span>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="file" class="hidden audit-photo-input" accept="image/*">
              <button type="button" class="btn btn-secondary btn-sm btn-upload-audit-photo" style="display: flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px;">
                📷 ${photoUrl ? 'Cambiar Foto' : 'Foto'}
              </button>
              <div class="audit-photo-preview ${photoUrl ? '' : 'hidden'}" data-photo="${photoUrl}" style="position: relative; display: inline-block;">
                <img src="${photoUrl}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
                <button type="button" class="btn-clear-audit-photo" style="position: absolute; top: -5px; right: -5px; background: var(--danger); border: none; border-radius: 50%; width: 14px; height: 14px; color: white; font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;">&times;</button>
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: flex-end; margin-left: auto;">
            <button type="button" class="btn btn-primary btn-sm btn-save-individual-task" style="font-weight: bold; min-width: 120px; padding: 6px 12px;">
              ${isSaved ? '💾 Actualizar' : '💾 Guardar'}
            </button>
          </div>
        </div>
      `;

      // Photo logic for this card
      const fileInput = card.querySelector('.audit-photo-input');
      const uploadBtn = card.querySelector('.btn-upload-audit-photo');
      const previewContainer = card.querySelector('.audit-photo-preview');
      const previewImg = previewContainer.querySelector('img');
      const clearBtn = card.querySelector('.btn-clear-audit-photo');
      const saveBtn = card.querySelector('.btn-save-individual-task');
      const badge = card.querySelector('.audit-status-badge');

      uploadBtn.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          uploadBtn.disabled = true;
          uploadBtn.textContent = '⏳';
          API.uploadImage(fileInput.files[0]).then(res => {
            previewImg.src = res.url;
            previewContainer.classList.remove('hidden');
            previewContainer.setAttribute('data-photo', res.url);
            uploadBtn.textContent = '📷 Cambiar Foto';
            uploadBtn.disabled = false;
          }).catch(err => {
            alert('Error al subir imagen: ' + err.message);
            uploadBtn.textContent = '📷 Foto';
            uploadBtn.disabled = false;
          });
        }
      });

      clearBtn.addEventListener('click', () => {
        fileInput.value = '';
        previewImg.src = '';
        previewContainer.classList.add('hidden');
        previewContainer.removeAttribute('data-photo');
        uploadBtn.textContent = '📷 Foto';
      });

      // Individual Save Click
      saveBtn.addEventListener('click', () => {
        const currentDate = document.getElementById('auditoria-date').value;
        if (!currentDate) {
          alert('Seleccione una fecha.');
          return;
        }

        const activeOrden = card.querySelector('.btn-orden.active-success, .btn-orden.active-danger');
        const activeLimpieza = card.querySelector('.btn-limpieza.active-success, .btn-limpieza.active-danger');

        if (!activeOrden) {
          alert(`Defina si "${task.name}" está ORDENADO o DESORDENADO.`);
          return;
        }
        if (!activeLimpieza) {
          alert(`Defina si "${task.name}" está LIMPIO o SUCIO.`);
          return;
        }

        const oVal = activeOrden.getAttribute('data-val');
        const lVal = activeLimpieza.getAttribute('data-val');
        const photo = previewContainer.getAttribute('data-photo') || '';
        const resultString = `Orden: ${oVal} | Limpieza: ${lVal}`;

        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Guardando...';

        saveHistoryRecord(
          'auditoria',
          'Auditoría',
          'auditoria',
          task.name,
          resultString,
          currentDate,
          photo
        ).then(() => {
          showToast(`Tarea "${task.name}" guardada correctamente.`);
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 Actualizar';
          badge.textContent = '✅ Guardada';
          badge.style.background = 'var(--success)';
          badge.style.color = '#fff';
        }).catch(err => {
          alert('Error al guardar tarea: ' + err.message);
          saveBtn.disabled = false;
          saveBtn.textContent = isSaved ? '💾 Actualizar' : '💾 Guardar';
        });
      });

      container.appendChild(card);
    });
  }).catch(() => {});
}

function setupAuditoriaLogic() {
  const container = document.getElementById('auditoria-items-container');
  const dateInput = document.getElementById('auditoria-date');

  if (dateInput) {
    dateInput.addEventListener('change', loadAuditoriaScreen);
  }

  if (container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.toggle-btn');
      if (!btn) return;
      
      const parentGroup = btn.parentElement;
      parentGroup.querySelectorAll('.toggle-btn').forEach(b => {
        b.classList.remove('active-success', 'active-danger');
      });

      const isOrden = btn.classList.contains('btn-orden');
      const isLimpieza = btn.classList.contains('btn-limpieza');
      const val = btn.getAttribute('data-val');

      if (isOrden) {
        btn.classList.add(val === 'ORDENADO' ? 'active-success' : 'active-danger');
      } else if (isLimpieza) {
        btn.classList.add(val === 'LIMPIO' ? 'active-success' : 'active-danger');
      }
    });
  }

  // Setup Audit Tasks CRUD screen
  const formAuditTask = document.getElementById('form-audit-task');
  const btnCancelEditTask = document.getElementById('btn-cancel-edit-audit-task');
  const taskTitle = document.getElementById('form-audit-task-title');
  const taskIdInput = document.getElementById('audit-task-id');
  const taskNameInput = document.getElementById('audit-task-name');
  const submitTaskBtn = document.getElementById('btn-submit-audit-task');

  if (formAuditTask) {
    formAuditTask.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = taskNameInput.value.trim();
      const id = taskIdInput.value ? parseInt(taskIdInput.value) : null;

      if (!name) return;

      submitTaskBtn.disabled = true;
      API.saveAuditTask({ id, name }).then(() => {
        showToast(id ? 'Tarea actualizada correctamente.' : 'Nueva tarea creada exitosamente.');
        formAuditTask.reset();
        taskIdInput.value = '';
        taskTitle.textContent = 'Agregar Nueva Tarea / Puesto';
        submitTaskBtn.textContent = '➕ Agregar Tarea';
        btnCancelEditTask.classList.add('hidden');
        submitTaskBtn.disabled = false;
        loadAuditTasksScreen();
      }).catch(err => {
        alert('Error al guardar tarea: ' + err.message);
        submitTaskBtn.disabled = false;
      });
    });
  }

  if (btnCancelEditTask) {
    btnCancelEditTask.addEventListener('click', () => {
      formAuditTask.reset();
      taskIdInput.value = '';
      taskTitle.textContent = 'Agregar Nueva Tarea / Puesto';
      submitTaskBtn.textContent = '➕ Agregar Tarea';
      btnCancelEditTask.classList.add('hidden');
    });
  }
}

function loadAuditTasksScreen() {
  const tbody = document.getElementById('audit-tasks-table-body');
  const countBadge = document.getElementById('audit-tasks-count');
  if (!tbody) return;

  API.getAuditTasks().then(tasks => {
    state.auditTasks = tasks || [];
    if (countBadge) countBadge.textContent = `${state.auditTasks.length} tareas`;
    tbody.innerHTML = '';

    if (state.auditTasks.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color: var(--text-muted); padding: 15px;">No hay tareas configuradas.</td></tr>';
      return;
    }

    state.auditTasks.forEach(task => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 500;">${task.name}</td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-secondary btn-sm btn-edit-task" data-id="${task.id}" style="padding: 3px 8px; font-size: 12px; margin-right: 5px;">✏️</button>
          <button type="button" class="btn btn-danger btn-sm btn-delete-task" data-id="${task.id}" style="padding: 3px 8px; font-size: 12px;">🗑️</button>
        </td>
      `;

      tr.querySelector('.btn-edit-task').addEventListener('click', () => {
        document.getElementById('audit-task-id').value = task.id;
        document.getElementById('audit-task-name').value = task.name;
        document.getElementById('form-audit-task-title').textContent = 'Editar Tarea / Puesto';
        document.getElementById('btn-submit-audit-task').textContent = '💾 Actualizar Tarea';
        document.getElementById('btn-cancel-edit-audit-task').classList.remove('hidden');
        document.getElementById('audit-task-name').focus();
      });

      tr.querySelector('.btn-delete-task').addEventListener('click', () => {
        if (confirm(`¿Eliminar la tarea "${task.name}"?`)) {
          API.deleteAuditTask(task.id).then(() => {
            showToast('Tarea eliminada.');
            loadAuditTasksScreen();
          }).catch(err => alert('Error al eliminar: ' + err.message));
        }
      });

      tbody.appendChild(tr);
    });
  }).catch(() => {});
}

// --- UTILITIES ---
function formatDateDisplay(dateStr) {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function getLocalDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Password toggle helper for press and hold
function setupPasswordToggle(btnId, inputId, iconPathId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconPathId);
  if (!btn || !input || !icon) return;

  const eyeOpenPath = "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z";
  const eyeClosedPath = "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.2 2.7-2.78 3.44-4.74-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z";

  const showPassword = (e) => {
    e.preventDefault();
    input.type = 'text';
    icon.setAttribute('d', eyeClosedPath);
  };

  const hidePassword = (e) => {
    e.preventDefault();
    input.type = 'password';
    icon.setAttribute('d', eyeOpenPath);
  };

  // Mouse events
  btn.addEventListener('mousedown', showPassword);
  btn.addEventListener('mouseup', hidePassword);
  btn.addEventListener('mouseleave', hidePassword);

  // Touch events for mobile
  btn.addEventListener('touchstart', showPassword, { passive: false });
  btn.addEventListener('touchend', hidePassword, { passive: false });
  btn.addEventListener('touchcancel', hidePassword, { passive: false });
}

// 5. ATTACH ALL DOM EVENTS
function setupEventListeners() {
  // Toggle password visibility for all fields (press and hold)
  setupPasswordToggle('toggle-password', 'login-password', 'eye-icon-path');
  setupPasswordToggle('toggle-new-password', 'new-password', 'eye-icon-path-new');
  setupPasswordToggle('toggle-edit-password', 'edit-password', 'eye-icon-path-edit');

  // Login Submit
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    
    API.login(username, password).then(user => {
      loginUser(user);
    }).catch(err => {
      document.getElementById('login-error').classList.remove('hidden');
    });
  });

  // Logout Trigger
  document.getElementById('btn-logout').addEventListener('click', logoutUser);

  // Sidebar Menu Clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const screenId = item.getAttribute('data-screen');
      const historyCategory = item.getAttribute('data-history-category');
      
      if (screenId === 'screen-realizar') {
        state.selectedTaskNameForRealizar = null;
        state.selectedMachineIdForRealizar = null;
      }
      
      if (historyCategory) {
        state.activeHistoryCategory = historyCategory;
        // Reset search inputs
        const searchInput = document.getElementById('history-search');
        const machineFilter = document.getElementById('history-machine-filter');
        const typeFilter = document.getElementById('history-type-filter');
        if (searchInput) searchInput.value = '';
        if (machineFilter) machineFilter.value = '';
        if (typeFilter) typeFilter.value = '';
        renderHistorialGeneral();
      }
      
      showScreen(screenId);
    });
  });

  // Mobile Menu Button Toggle
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('app-sidebar').classList.add('drawer-open');
    document.getElementById('sidebar-backdrop').classList.add('active');
  });

  document.getElementById('sidebar-backdrop').addEventListener('click', () => {
    document.getElementById('app-sidebar').classList.remove('drawer-open');
    document.getElementById('sidebar-backdrop').classList.remove('active');
  });

  // Alta de Maquina Photo Selector triggers
  const photoInput = document.getElementById('alta-foto');
  const photoZone = document.getElementById('photo-upload-zone');
  const photoPreview = document.getElementById('photo-preview');
  const photoPreviewContainer = document.getElementById('photo-preview-container');
  const photoPrompt = photoZone.querySelector('.upload-zone-prompt');

  photoZone.addEventListener('click', (e) => {
    if (e.target !== photoInput && e.target !== document.getElementById('btn-clear-photo')) {
      photoInput.click();
    }
  });

  photoInput.addEventListener('change', () => {
    if (photoInput.files && photoInput.files[0]) {
      // Upload image to backend
      API.uploadImage(photoInput.files[0]).then(res => {
        photoPreview.src = res.url;
        photoPreviewContainer.classList.remove('hidden');
        photoPrompt.classList.add('hidden');
        photoZone.setAttribute('data-image', res.url);
      }).catch(err => alert(err.message));
    }
  });

  document.getElementById('btn-clear-photo').addEventListener('click', (e) => {
    e.stopPropagation();
    photoInput.value = '';
    photoPreview.src = '';
    photoPreviewContainer.classList.add('hidden');
    photoPrompt.classList.remove('hidden');
    photoZone.removeAttribute('data-image');
  });

  // Alta de Máquina Dynamism (Rows ADD)
  document.getElementById('btn-add-control').addEventListener('click', () => addControlRow());
  document.getElementById('btn-add-mantenimiento').addEventListener('click', () => addMantenimientoRow());
  document.getElementById('btn-add-repuesto').addEventListener('click', addRepuestoCard);

  // Submit Alta Maquina
  document.getElementById('alta-maquina-form').addEventListener('submit', handleSaveMachine);

  // Edit / Delete Machine buttons
  document.getElementById('btn-edit-machine').addEventListener('click', () => {
    if (state.selectedMachineIdForRealizar) {
      const machine = state.machines.find(m => m.id === state.selectedMachineIdForRealizar);
      if (machine) {
        populateEditMachineForm(machine);
      }
    }
  });

  document.getElementById('btn-delete-machine').addEventListener('click', () => {
    if (state.selectedMachineIdForRealizar) {
      const machine = state.machines.find(m => m.id === state.selectedMachineIdForRealizar);
      if (machine) {
        if (confirm(`¿Está seguro de que desea eliminar la máquina "${machine.name}"? Se borrará todo su historial asociado.`)) {
          API.deleteMachine(machine.id).then(() => {
            showToast('Máquina eliminada correctamente.');
            state.selectedMachineIdForRealizar = null;
            document.getElementById('realizar-machine-card').classList.add('hidden');
            document.getElementById('realizar-execution-panel').classList.add('hidden');
            
            // Reload selection list and dashboard
            loadRealizarScreen();
            loadEstaSemanaScreen();
          }).catch(err => alert(err.message));
        }
      }
    }
  });

  // Realizar Screen selection change
  document.getElementById('realizar-machine-select').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) {
      state.selectedMachineIdForRealizar = parseInt(val);
      renderRealizarMachine(state.selectedMachineIdForRealizar);
    } else {
      state.selectedMachineIdForRealizar = null;
      document.getElementById('realizar-machine-card').classList.add('hidden');
      document.getElementById('realizar-execution-panel').classList.add('hidden');
    }
  });

  // Realizar Category tabs
  document.getElementById('tab-control-periodico').addEventListener('click', () => {
    state.currentRealizarCategory = 'control';
    state.selectedTaskNameForRealizar = null;
    if (state.selectedMachineIdForRealizar) {
      const machine = state.machines.find(m => m.id === state.selectedMachineIdForRealizar);
      renderRealizarTasks(machine);
    }
  });

  document.getElementById('tab-mantenimiento-preventivo').addEventListener('click', () => {
    state.currentRealizarCategory = 'preventive';
    state.selectedTaskNameForRealizar = null;
    if (state.selectedMachineIdForRealizar) {
      const machine = state.machines.find(m => m.id === state.selectedMachineIdForRealizar);
      renderRealizarTasks(machine);
    }
  });

  // Users Create submit
  document.getElementById('create-user-form').addEventListener('submit', handleCreateUser);

  // Users Edit submit & Cancel
  document.getElementById('edit-user-form').addEventListener('submit', handleEditUser);
  document.getElementById('btn-cancel-edit-user').addEventListener('click', cancelEditUser);

  // Backup & Restore
  document.getElementById('btn-download-backup').addEventListener('click', handleDownloadBackup);
  document.getElementById('input-restore-backup').addEventListener('change', handleRestoreBackup);

  // Close modal history
  document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('modal-history').classList.remove('active');
  });

  // General History Filters and Search
  document.getElementById('history-search').addEventListener('input', renderHistorialGeneral);
  document.getElementById('history-machine-filter').addEventListener('change', renderHistorialGeneral);
  document.getElementById('history-type-filter').addEventListener('change', renderHistorialGeneral);
  document.getElementById('history-sort').addEventListener('change', renderHistorialGeneral);

  // Link button from stats card to general history
  document.getElementById('btn-show-general-history').addEventListener('click', () => {
    showScreen('screen-historial-general');
  });

  // Corrective Maintenance logic setup
  setupCorrectiveMaintenance();

  // Calidad and Auditoría logic setup
  setupCalidadLogic();
  setupAuditoriaLogic();

  // Dashboard card clicks for history redirection
  const cardHistMantenimiento = document.getElementById('menu-card-historial-mantenimiento');
  if (cardHistMantenimiento) {
    cardHistMantenimiento.addEventListener('click', () => {
      state.activeHistoryCategory = 'mantenimiento';
      document.getElementById('history-search').value = '';
      document.getElementById('history-machine-filter').value = '';
      document.getElementById('history-type-filter').value = '';
      renderHistorialGeneral();
      showScreen('screen-historial-general');
    });
  }

  const cardHistCalidad = document.getElementById('menu-card-historial-calidad');
  if (cardHistCalidad) {
    cardHistCalidad.addEventListener('click', () => {
      state.activeHistoryCategory = 'calidad';
      document.getElementById('history-search').value = '';
      document.getElementById('history-machine-filter').value = '';
      document.getElementById('history-type-filter').value = '';
      renderHistorialGeneral();
      showScreen('screen-historial-general');
    });
  }

  const cardHistAuditoria = document.getElementById('menu-card-historial-auditoria');
  if (cardHistAuditoria) {
    cardHistAuditoria.addEventListener('click', () => {
      state.activeHistoryCategory = 'auditoria';
      document.getElementById('history-search').value = '';
      document.getElementById('history-machine-filter').value = '';
      document.getElementById('history-type-filter').value = '';
      renderHistorialGeneral();
      showScreen('screen-historial-general');
    });
  }

  // History back button
  const btnHistoryBack = document.getElementById('btn-history-back');
  if (btnHistoryBack) {
    btnHistoryBack.addEventListener('click', () => {
      if (state.activeHistoryCategory === 'calidad') {
        showScreen('screen-menu-calidad');
      } else if (state.activeHistoryCategory === 'auditoria') {
        showScreen('screen-menu-auditoria');
      } else {
        showScreen('screen-menu-mantenimiento');
      }
    });
  }

  // Reset Demo Data button
  const btnResetDemo = document.getElementById('btn-reset-demo');
  if (btnResetDemo) {
    btnResetDemo.addEventListener('click', () => {
      if (confirm('¿Deseas reiniciar la base de datos demo a sus valores de fábrica?')) {
        API.resetDemo().then(() => {
          showToast('Base de datos demo restablecida.');
          setTimeout(() => location.reload(), 800);
        }).catch(err => alert('Error al reiniciar demo: ' + err.message));
      }
    });
  }
}

// 6. PROGRESSIVE WEB APP INSTALLATION HANDLING
function setupPwaInstallation() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        console.log('Service Worker registered successfully:', reg.scope);
        reg.update();
      })
      .catch(err => console.error('Service Worker registration failed:', err));
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.pwaPromptEvent = e;
    
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.classList.remove('hidden');
    }
  });

  document.getElementById('pwa-btn-install').addEventListener('click', () => {
    const banner = document.getElementById('pwa-install-banner');
    if (state.pwaPromptEvent) {
      state.pwaPromptEvent.prompt();
      state.pwaPromptEvent.userChoice.then((choiceResult) => {
        state.pwaPromptEvent = null;
        banner.classList.add('hidden');
      });
    }
  });

  document.getElementById('pwa-btn-dismiss').addEventListener('click', () => {
    const banner = document.getElementById('pwa-install-banner');
    banner.classList.add('hidden');
  });
}
