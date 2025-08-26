// Estado global del background
let backgroundState = {
  focusMode: false,
  blockedSites: [
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'youtube.com',
    'tiktok.com',
    'reddit.com',
    'netflix.com'
  ],
  allowedSites: [],
  isTimerRunning: false
};

let timer = null;
let timerEnd = null;
let timerInterval = null;

// Inicialización
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Focus Extension instalada');
  await loadSettings();
  await setupDefaultBlockingRules();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadSettings();
  await updateBlockingRules();
});

// Cargar configuración
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['focusSettings', 'focusAppState']);
    
    if (result.focusSettings) {
      backgroundState = { ...backgroundState, ...result.focusSettings };
    }
    
    if (result.focusAppState) {
      backgroundState.focusMode = result.focusAppState.focusMode || false;
      backgroundState.isTimerRunning = result.focusAppState.timer?.isRunning || false;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Guardar configuración
async function saveSettings() {
  try {
    await chrome.storage.local.set({ focusSettings: backgroundState });
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Configurar reglas de bloqueo por defecto
async function setupDefaultBlockingRules() {
  const rules = backgroundState.blockedSites.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: 'redirect', redirect: { url: chrome.runtime.getURL('blocked.html') } },
    condition: {
      urlFilter: `*://*.${domain}/*`,
      resourceTypes: ['main_frame']
    }
  }));

  try {
    // Limpiar reglas existentes
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = existingRules.map(rule => rule.id);
    
    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
    }
  } catch (error) {
    console.error('Error clearing existing rules:', error);
  }
}

// Actualizar reglas de bloqueo
async function updateBlockingRules() {
  try {
    // Primero limpiar todas las reglas existentes
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = existingRules.map(rule => rule.id);
    
    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
    }

    // Si el modo enfoque no está activo, no agregar reglas
    if (!backgroundState.focusMode && !backgroundState.isTimerRunning) {
      console.log('Focus mode inactive - no blocking rules applied');
      return;
    }

    // Crear nuevas reglas de bloqueo
    const rules = [];
    backgroundState.blockedSites.forEach((domain, index) => {
      // Regla para el dominio exacto
      rules.push({
        id: (index * 2) + 1,
        priority: 1,
        action: { 
          type: 'redirect', 
          redirect: { url: chrome.runtime.getURL('blocked.html?domain=' + encodeURIComponent(domain)) }
        },
        condition: {
          urlFilter: `*://${domain}/*`,
          resourceTypes: ['main_frame']
        }
      });
      
      // Regla para subdominios
      rules.push({
        id: (index * 2) + 2,
        priority: 1,
        action: { 
          type: 'redirect', 
          redirect: { url: chrome.runtime.getURL('blocked.html?domain=' + encodeURIComponent(domain)) }
        },
        condition: {
          urlFilter: `*://*.${domain}/*`,
          resourceTypes: ['main_frame']
        }
      });
    });

    if (rules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules
      });
      console.log('Blocking rules updated:', rules.length, 'rules active');
    }
    
  } catch (error) {
    console.error('Error updating blocking rules:', error);
  }
}

// Manejar mensajes desde el popup y content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'toggleFocusMode':
      handleToggleFocusMode(message.enabled);
      break;
      
    case 'showNotification':
      showNotification(message.title, message.message);
      break;
      
    case 'updateTimerState':
      backgroundState.isTimerRunning = message.isRunning;
      updateBlockingRules();
      break;
      
    case 'getBlockedSites':
      sendResponse({ blockedSites: backgroundState.blockedSites });
      break;
      
    case 'updateBlockedSites':
      handleUpdateBlockedSites(message.sites);
      sendResponse({ success: true });
      break;
      
    case 'updateSettings':
      handleUpdateSettings(message.settings);
      sendResponse({ success: true });
      break;
      
    case 'checkIfBlocked':
      const isBlocked = isUrlBlocked(message.url);
      sendResponse({ blocked: isBlocked });
      break;
      
    case "startTimer":
      timerEnd = Date.now() + message.duration * 1000;
      chrome.storage.local.set({ timerEnd });
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((timerEnd - Date.now()) / 1000));
        chrome.storage.local.set({ timerRemaining: remaining });
        if (remaining <= 0) {
          clearInterval(timerInterval);
          chrome.storage.local.set({ timerRemaining: 0 });
        }
      }, 1000);
      sendResponse({ success: true });
      break;
      
    case "stopTimer":
      clearInterval(timerInterval);
      chrome.storage.local.remove(["timerEnd", "timerRemaining"]);
      sendResponse({ success: true });
      break;
  }
  
  return true; // Mantener el canal abierto para respuestas asíncronas
});

// Manejar actualización de sitios bloqueados
async function handleUpdateBlockedSites(sites) {
  backgroundState.blockedSites = sites;
  await saveSettings();
  await updateBlockingRules();
  console.log('Blocked sites updated:', sites);
}

// Manejar actualización de configuración completa
async function handleUpdateSettings(settings) {
  // Actualizar configuración
  backgroundState = { ...backgroundState, ...settings };
  await saveSettings();
  
  // Si se actualizaron los sitios bloqueados, actualizar reglas
  if (settings.blockedSites) {
    await updateBlockingRules();
  }
  
  console.log('Settings updated:', settings);
}

// Manejar cambio de modo enfoque
async function handleToggleFocusMode(enabled) {
  backgroundState.focusMode = enabled;
  await saveSettings();
  await updateBlockingRules();
  
  // Actualizar icono de la extensión
  updateExtensionIcon(enabled);
}

// Actualizar icono de la extensión
function updateExtensionIcon(active) {
  const iconPath = active ? 'icons/icon-active' : 'icons/icon';
  
  chrome.action.setIcon({
    path: {
      16: `${iconPath}16.png`,
      32: `${iconPath}32.png`,
      48: `${iconPath}48.png`,
      128: `${iconPath}128.png`
    }
  });
  
  const title = active ? 'Focus - Modo Enfoque Activo' : 'Focus - TDAH Assistant';
  chrome.action.setTitle({ title });
}

// Mostrar notificaciones
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: title,
    message: message,
    priority: 1
  });
}

// Verificar si una URL está bloqueada
function isUrlBlocked(url) {
  if (!backgroundState.focusMode && !backgroundState.isTimerRunning) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname.toLowerCase();
    
    // Remover www. si está presente
    domain = domain.replace(/^www\./, '');
    
    return backgroundState.blockedSites.some(blockedDomain => {
      blockedDomain = blockedDomain.toLowerCase();
      // Verificar coincidencia exacta o subdominio
      return domain === blockedDomain || 
             domain.endsWith('.' + blockedDomain) ||
             blockedDomain.endsWith('.' + domain);
    });
  } catch (error) {
    console.error('Error checking blocked URL:', error);
    return false;
  }
}

// Manejar clics en notificaciones
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.notifications.clear(notificationId);
});

// Monitorear cambios en las pestañas para estadísticas (opcional)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (backgroundState.focusMode || backgroundState.isTimerRunning) {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab.url && isUrlBlocked(tab.url)) {
        console.log('Attempted to visit blocked site:', tab.url);
      }
    } catch (error) {
      // Ignorar errores de permisos
    }
  }
});

// Inicializar al cargar
(async () => {
  await loadSettings();
  await updateBlockingRules();
  updateExtensionIcon(backgroundState.focusMode);
})();