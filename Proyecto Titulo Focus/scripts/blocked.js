// blocked.js - Lógica para la página de sitio bloqueado

// Esperar a que el DOM se cargue
document.addEventListener('DOMContentLoaded', function() {
  // Configurar event listeners
  document.getElementById('openFocusBtn').addEventListener('click', openFocusApp);
  document.getElementById('goToProductiveBtn').addEventListener('click', goToProductiveSite);
  
  // Inicializar la página
  initializePage();
});

function initializePage() {
  // Obtener el dominio bloqueado de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const domain = urlParams.get('domain');
  
  if (domain) {
    document.getElementById('blockedDomain').textContent = domain;
  }
  
  // Mensajes motivacionales aleatorios
  const motivationalMessages = [
    "Cada momento de concentración te acerca más a tus objetivos. ¡Tú puedes hacerlo!",
    "Tu futuro yo te agradecerá por mantenerte enfocado ahora.",
    "La disciplina es elegir entre lo que quieres ahora y lo que más quieres.",
    "Los grandes logros requieren gran concentración. ¡Sigue adelante!",
    "Tu capacidad de concentrarte es tu superpoder. ¡Úsalo sabiamente!",
    "Cada 'no' a las distracciones es un 'sí' a tus sueños.",
    "El enfoque es la clave que abre la puerta al éxito."
  ];
  
  // Mostrar mensaje motivacional aleatorio
  const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  document.getElementById('motivationText').textContent = randomMessage;
  
  // Cargar estadísticas
  loadStats();
  
  // Configurar eventos de teclado
  setupKeyboardEvents();
}

// Funciones de interacción
function openFocusApp() {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  } else {
    console.log('Chrome API no disponible - abriendo popup alternativo');
    // Fallback para desarrollo o testing
    alert('Abriendo Focus App...');
  }
}

function goToProductiveSite() {
  const productiveSites = [
    'https://www.google.com',
    'https://docs.google.com',
    'https://calendar.google.com',
    'https://github.com',
    'https://stackoverflow.com'
  ];
  
  const randomSite = productiveSites[Math.floor(Math.random() * productiveSites.length)];
  window.location.href = randomSite;
}

// Cargar estadísticas
async function loadStats() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['focusStats']);
      if (result.focusStats) {
        document.getElementById('blockedCount').textContent = result.focusStats.blockedToday || 0;
        document.getElementById('focusTime').textContent = `${Math.round((result.focusStats.focusTimeToday || 0) / 60)}m`;
      }
      
      // Incrementar contador de sitios bloqueados
      const stats = result.focusStats || { blockedToday: 0, focusTimeToday: 0 };
      stats.blockedToday = (stats.blockedToday || 0) + 1;
      
      await chrome.storage.local.set({ focusStats: stats });
      document.getElementById('blockedCount').textContent = stats.blockedToday;
      
    } else {
      console.log('Chrome storage API no disponible - usando valores por defecto');
      // Valores por defecto para desarrollo/testing
      document.getElementById('blockedCount').textContent = '1';
      document.getElementById('focusTime').textContent = '0m';
    }
  } catch (error) {
    console.error('Error loading stats:', error);
    // Fallback en caso de error
    document.getElementById('blockedCount').textContent = '0';
    document.getElementById('focusTime').textContent = '0m';
  }
}

// Configurar eventos de teclado
function setupKeyboardEvents() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      window.history.back();
    }
    if (e.key === 'Enter') {
      openFocusApp();
    }
  });
}