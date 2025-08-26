// Estado de configuración
let settings = {
  workTime: 25,
  breakTime: 5,
  blockedSites: [
    'facebook.com',
    'twitter.com', 
    'instagram.com',
    'youtube.com',
    'tiktok.com',
    'reddit.com',
    'netflix.com'
  ],
  enableNotifications: true,
  enableSounds: true
};

// Elementos DOM
const elements = {
  workTime: document.getElementById('workTime'),
  breakTime: document.getElementById('breakTime'),
  newSiteInput: document.getElementById('newSiteInput'),
  sitesList: document.getElementById('sitesList'),
  enableNotifications: document.getElementById('enableNotifications'),
  enableSounds: document.getElementById('enableSounds'),
  successMessage: document.getElementById('successMessage')
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  updateUI();
});

// Cargar configuración desde storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['focusSettings']);
    if (result.focusSettings) {
      settings = { ...settings, ...result.focusSettings };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Guardar configuración
async function saveSettings() {
  try {
    // Obtener valores del formulario
    settings.workTime = parseInt(elements.workTime.value) || 25;
    settings.breakTime = parseInt(elements.breakTime.value) || 5;
    settings.enableNotifications = elements.enableNotifications.checked;
    settings.enableSounds = elements.enableSounds.checked;
    
    // Validaciones
    if (settings.workTime < 5 || settings.workTime > 120) {
      alert('El tiempo de trabajo debe estar entre 5 y 120 minutos');
      return;
    }
    
    if (settings.breakTime < 1 || settings.breakTime > 30) {
      alert('El tiempo de descanso debe estar entre 1 y 30 minutos');
      return;
    }
    
    // Guardar en storage
    await chrome.storage.local.set({ focusSettings: settings });
    
    // Notificar al background script
    const response = await chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: settings
    });
    
    if (response && response.success) {
      console.log('Settings saved successfully');
    }
    
    // Mostrar mensaje de éxito
    showSuccessMessage();
    
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Error al guardar la configuración');
  }
}

// Actualizar interfaz
function updateUI() {
  elements.workTime.value = settings.workTime;
  elements.breakTime.value = settings.breakTime;
  elements.enableNotifications.checked = settings.enableNotifications;
  elements.enableSounds.checked = settings.enableSounds;
  
  renderSitesList();
}

// Renderizar lista de sitios - SOLO corrección del onclick
function renderSitesList() {
  elements.sitesList.innerHTML = '';
  
  settings.blockedSites.forEach((site, index) => {
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';
    siteItem.innerHTML = `
      <span class="site-domain">${escapeHtml(site)}</span>
      <button class="btn btn-danger">
        Eliminar
      </button>
    `;
    
    // ✅ Agregar event listener al botón después de crearlo
    const removeButton = siteItem.querySelector('.btn-danger');
    removeButton.addEventListener('click', () => removeSite(index));
    
    elements.sitesList.appendChild(siteItem);
  });
  
  if (settings.blockedSites.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.style.textAlign = 'center';
    emptyMessage.style.color = '#666';
    emptyMessage.style.padding = '20px';
    emptyMessage.textContent = 'No hay sitios bloqueados. Agrega algunos sitios que te distraen.';
    elements.sitesList.appendChild(emptyMessage);
  }
}

// Agregar nuevo sitio
async function addSite() {
  const newSite = elements.newSiteInput.value.trim().toLowerCase();
  
  if (!newSite) {
    alert('Por favor ingresa un dominio válido');
    return;
  }
  
  // Limpiar el dominio (remover http/https, www, etc.)
  const cleanDomain = cleanDomainName(newSite);
  
  // Validar formato básico del dominio
  if (!isValidDomain(cleanDomain)) {
    alert('Por favor ingresa un dominio válido (ejemplo: google.com)');
    return;
  }
  
  // Verificar si ya existe
  if (settings.blockedSites.includes(cleanDomain)) {
    alert('Este sitio ya está en la lista');
    return;
  }
  
  // Agregar a la lista
  settings.blockedSites.push(cleanDomain);
  elements.newSiteInput.value = '';
  
  // Guardar inmediatamente
  await saveBlockedSites();
  
  renderSitesList();
}

// Eliminar sitio
async function removeSite(index) {
  if (confirm('¿Estás seguro de que quieres eliminar este sitio de la lista?')) {
    settings.blockedSites.splice(index, 1);
    
    // Guardar inmediatamente
    await saveBlockedSites();
    
    renderSitesList();
  }
}

// Guardar solo la lista de sitios bloqueados
async function saveBlockedSites() {
  try {
    // Actualizar en storage local
    await chrome.storage.local.set({ focusSettings: settings });
    
    // Notificar al background script
    const response = await chrome.runtime.sendMessage({
      action: 'updateBlockedSites',
      sites: settings.blockedSites
    });
    
    if (response && response.success) {
      console.log('Blocked sites updated successfully');
    }
    
  } catch (error) {
    console.error('Error saving blocked sites:', error);
    alert('Error al guardar los sitios bloqueados');
  }
}

// Limpiar nombre del dominio
function cleanDomainName(domain) {
  // Remover protocolo
  domain = domain.replace(/^https?:\/\//, '');
  
  // Remover www.
  domain = domain.replace(/^www\./, '');
  
  // Remover paths, queries, etc.
  domain = domain.split('/')[0];
  domain = domain.split('?')[0];
  domain = domain.split('#')[0];
  
  return domain.toLowerCase();
}

// Validar dominio
function isValidDomain(domain) {
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

// Mostrar mensaje de éxito
function showSuccessMessage() {
  elements.successMessage.style.display = 'block';
  setTimeout(() => {
    elements.successMessage.style.display = 'none';
  }, 3000);
}

// Restaurar configuración por defecto
async function resetToDefaults() {
  if (!confirm('¿Estás seguro de que quieres restaurar toda la configuración por defecto?')) {
    return;
  }
  
  settings = {
    workTime: 25,
    breakTime: 5,
    blockedSites: [
      'facebook.com',
      'twitter.com', 
      'instagram.com',
      'youtube.com',
      'tiktok.com',
      'reddit.com',
      'netflix.com'
    ],
    enableNotifications: true,
    enableSounds: true
  };
  
  updateUI();
  await saveSettings();
}

// Exportar datos
async function exportData() {
  try {
    const result = await chrome.storage.local.get(null);
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `focus-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('Datos exportados exitosamente');
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Error al exportar los datos');
  }
}

// Reiniciar estadísticas
async function resetStats() {
  if (!confirm('¿Estás seguro de que quieres reiniciar todas las estadísticas?')) {
    return;
  }
  
  try {
    await chrome.storage.local.remove(['focusStats']);
    alert('Estadísticas reiniciadas exitosamente');
  } catch (error) {
    console.error('Error resetting stats:', error);
    alert('Error al reiniciar las estadísticas');
  }
}

// Borrar todos los datos
async function clearAllData() {
  const confirmation = prompt(
    'Esta acción eliminará TODOS tus datos de Focus (configuración, tareas, estadísticas).\n\n' +
    'Escribe "BORRAR TODO" para confirmar:'
  );
  
  if (confirmation !== 'BORRAR TODO') {
    return;
  }
  
  try {
    await chrome.storage.local.clear();
    alert('Todos los datos han sido eliminados. La extensión se reiniciará.');
    window.location.reload();
  } catch (error) {
    console.error('Error clearing all data:', error);
    alert('Error al borrar los datos');
  }
}

// Función auxiliar para escapar HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Funciones globales para los event handlers
window.addSite = addSite;
window.removeSite = removeSite;
window.saveSettings = saveSettings;
window.resetToDefaults = resetToDefaults;
window.exportData = exportData;
window.resetStats = resetStats;
window.clearAllData = clearAllData;