// settings-ui.js - Manejo de la interfaz de usuario para configuraciones

// Esperar a que el DOM se cargue
document.addEventListener('DOMContentLoaded', function() {
  // Back link
  document.getElementById('backLink').addEventListener('click', function(e) {
    e.preventDefault();
    window.close();
  });
  
  // Input para agregar sitio con Enter
  document.getElementById('newSiteInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      addSite();
    }
  });
  
  // Botón agregar sitio
  document.getElementById('addSiteBtn').addEventListener('click', addSite);
  
  // Botones de datos y privacidad
  document.getElementById('exportDataBtn').addEventListener('click', exportData);
  document.getElementById('resetStatsBtn').addEventListener('click', resetStats);
  document.getElementById('clearAllDataBtn').addEventListener('click', clearAllData);
  
  // Botones principales
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('resetToDefaultsBtn').addEventListener('click', resetToDefaults);
  
  // Cargar y renderizar sitios bloqueados al cargar la página
  renderSitesList();
});

// Funciones que deben estar disponibles globalmente
function addSite() {
  if (window.settingsModule && typeof window.settingsModule.addSite === 'function') {
    window.settingsModule.addSite();
  } else {
    // Implementación básica si el módulo principal no está cargado
    const input = document.getElementById('newSiteInput');
    const site = input.value.trim().toLowerCase();
    
    if (site) {
      // Limpiar formato del sitio
      const cleanSite = site.replace(/^https?:\/\//, '').replace(/^www\./, '');
      
      // Obtener sitios existentes
      chrome.storage.local.get(['blockedSites'], function(result) {
        const blockedSites = result.blockedSites || [];
        
        if (!blockedSites.includes(cleanSite)) {
          blockedSites.push(cleanSite);
          
          chrome.storage.local.set({ blockedSites }, function() {
            console.log('Sitio agregado:', cleanSite);
            input.value = '';
            renderSitesList();
          });
        } else {
          alert('Este sitio ya está en la lista');
        }
      });
    }
  }
}

// Función para renderizar la lista de sitios sin eventos inline
function renderSitesList() {
  chrome.storage.local.get(['blockedSites'], function(result) {
    const sites = result.blockedSites || [];
    const container = document.getElementById('sitesList');
    
    container.innerHTML = '';
    
    sites.forEach((site, index) => {
      const siteItem = document.createElement('div');
      siteItem.className = 'site-item';
      siteItem.innerHTML = `
        <span class="site-domain">${site}</span>
        <button class="btn btn-danger" data-site="${site}" data-index="${index}">Eliminar</button>
      `;
      
      // Agregar event listener al botón eliminar SIN eventos inline
      const deleteBtn = siteItem.querySelector('.btn-danger');
      deleteBtn.addEventListener('click', function() {
        removeSite(site, index);
      });
      
      container.appendChild(siteItem);
    });
  });
}

// Función para eliminar sitios
function removeSite(site, index) {
  if (confirm(`¿Eliminar "${site}" de la lista de sitios bloqueados?`)) {
    chrome.storage.local.get(['blockedSites'], function(result) {
      const sites = result.blockedSites || [];
      sites.splice(index, 1);
      
      chrome.storage.local.set({ blockedSites: sites }, function() {
        console.log('Sitio eliminado:', site);
        renderSitesList(); // Volver a renderizar la lista
      });
    });
  }
}

function exportData() {
  if (window.settingsModule && typeof window.settingsModule.exportData === 'function') {
    window.settingsModule.exportData();
  } else {
    console.log('Función exportData no disponible aún');
  }
}

function resetStats() {
  if (window.settingsModule && typeof window.settingsModule.resetStats === 'function') {
    window.settingsModule.resetStats();
  } else {
    console.log('Función resetStats no disponible aún');
  }
}

function clearAllData() {
  if (window.settingsModule && typeof window.settingsModule.clearAllData === 'function') {
    window.settingsModule.clearAllData();
  } else {
    if (confirm('¿Estás seguro de que quieres borrar todos los datos?')) {
      console.log('Borrando datos...');
      // Lógica básica de limpieza
    }
  }
}

function saveSettings() {
  if (window.settingsModule && typeof window.settingsModule.saveSettings === 'function') {
    window.settingsModule.saveSettings();
  } else {
    // Implementación básica
    const workTime = document.getElementById('workTime').value;
    const breakTime = document.getElementById('breakTime').value;
    
    console.log('Guardando configuración básica:', { workTime, breakTime });
    
    // Mostrar mensaje de éxito
    const successMessage = document.getElementById('successMessage');
    successMessage.style.display = 'block';
    setTimeout(() => {
      successMessage.style.display = 'none';
    }, 3000);
  }
}

function resetToDefaults() {
  if (window.settingsModule && typeof window.settingsModule.resetToDefaults === 'function') {
    window.settingsModule.resetToDefaults();
  } else {
    if (confirm('¿Restaurar configuración por defecto?')) {
      document.getElementById('workTime').value = 25;
      document.getElementById('breakTime').value = 5;
      console.log('Configuración restaurada por defecto');
    }
  }
}