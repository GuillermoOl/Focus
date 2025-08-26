// Content Script para Focus Extension
// Este script se ejecuta en todas las páginas web

(function() {
  'use strict';
  
  // Verificar si ya se inicializó para evitar duplicados
  if (window.focusExtensionLoaded) {
    return;
  }
  window.focusExtensionLoaded = true;
  
  // Estado del content script
  let isBlocked = false;
  let focusMode = false;
  let originalTitle = document.title;
  
  // Inicialización
  init();
  
  function init() {
    // Verificar si esta página debería estar bloqueada
    checkIfShouldBeBlocked();
    
    // Escuchar mensajes del background script
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Monitorear cambios en el título de la página
    observePageChanges();
  }
  
  // Verificar si la página actual debería estar bloqueada
  async function checkIfShouldBeBlocked() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'checkIfBlocked',
        url: window.location.href
      });
      
      if (response && response.blocked) {
        blockPage();
      }
    } catch (error) {
      console.error('Focus Extension: Error checking block status:', error);
    }
  }
  
  // Manejar mensajes del background script
  function handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'blockPage':
        blockPage();
        break;
        
      case 'unblockPage':
        unblockPage();
        break;
        
      case 'updateFocusMode':
        focusMode = message.enabled;
        updatePageForFocusMode();
        break;
        
      case 'ping':
        sendResponse({ status: 'alive' });
        break;
    }
  }
  
  // Bloquear la página actual
  function blockPage() {
    if (isBlocked) return;
    
    isBlocked = true;
    
    // Crear overlay de bloqueo
    createBlockOverlay();
    
    // Pausar videos si los hay
    pauseMediaElements();
    
    // Cambiar el título
    document.title = '🎯 Sitio Bloqueado - Focus';
  }
  
  // Desbloquear la página
  function unblockPage() {
    if (!isBlocked) return;
    
    isBlocked = false;
    
    // Remover overlay
    removeBlockOverlay();
    
    // Restaurar título original
    document.title = originalTitle;
  }
  
  // Crear overlay de bloqueo
  function createBlockOverlay() {
    // Verificar si ya existe
    if (document.getElementById('focus-block-overlay')) {
      return;
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'focus-block-overlay';
    overlay.innerHTML = `
      <div class="focus-block-content">
        <div class="focus-block-icon">🎯</div>
        <h1>¡Mantente Enfocado!</h1>
        <p>Este sitio está bloqueado durante tu sesión de enfoque.</p>
        <div class="focus-block-actions">
          <button id="focus-back-btn" class="focus-btn focus-btn-primary">
            ← Ir Atrás
          </button>
          <button id="focus-close-btn" class="focus-btn focus-btn-secondary">
            Cerrar Pestaña
          </button>
        </div>
        <div class="focus-motivation">
          <p><strong>Recuerda:</strong> Cada momento de concentración te acerca más a tus objetivos.</p>
        </div>
      </div>
    `;
    
    // Estilos del overlay
    const styles = `
      #focus-block-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        color: white !important;
      }
      
      .focus-block-content {
        text-align: center !important;
        max-width: 500px !important;
        padding: 40px !important;
        background: rgba(255, 255, 255, 0.1) !important;
        backdrop-filter: blur(10px) !important;
        border-radius: 20px !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
      }
      
      .focus-block-icon {
        font-size: 64px !important;
        margin-bottom: 20px !important;
        animation: focus-pulse 2s infinite !important;
      }
      
      .focus-block-content h1 {
        font-size: 2.5em !important;
        margin-bottom: 15px !important;
        font-weight: 300 !important;
        color: white !important;
      }
      
      .focus-block-content p {
        font-size: 1.2em !important;
        margin-bottom: 30px !important;
        opacity: 0.9 !important;
        color: white !important;
      }
      
      .focus-block-actions {
        margin-bottom: 30px !important;
      }
      
      .focus-btn {
        padding: 12px 24px !important;
        border: none !important;
        border-radius: 25px !important;
        font-size: 1em !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        margin: 0 10px !important;
        transition: all 0.3s ease !important;
      }
      
      .focus-btn-primary {
        background: rgba(255, 255, 255, 0.9) !important;
        color: #333 !important;
      }
      
      .focus-btn-primary:hover {
        background: white !important;
        transform: translateY(-2px) !important;
      }
      
      .focus-btn-secondary {
        background: rgba(255, 255, 255, 0.2) !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
      }
      
      .focus-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.3) !important;
        transform: translateY(-2px) !important;
      }
      
      .focus-motivation {
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: 15px !important;
        padding: 20px !important;
        border-left: 4px solid rgba(255, 255, 255, 0.5) !important;
      }
      
      .focus-motivation p {
        margin: 0 !important;
        font-size: 1em !important;
        color: white !important;
      }
      
      @keyframes focus-pulse {
        0%, 100% { opacity: 0.9; }
        50% { opacity: 1; }
      }
    `;
    
    // Agregar estilos
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    
    // Agregar overlay
    document.body.appendChild(overlay);
    
    // Event listeners
    document.getElementById('focus-back-btn').addEventListener('click', () => {
      window.history.back();
    });
    
    document.getElementById('focus-close-btn').addEventListener('click', () => {
      window.close();
    });
    
    // Prevenir scroll
    document.body.style.overflow = 'hidden';
  }
  
  // Remover overlay de bloqueo
  function removeBlockOverlay() {
    const overlay = document.getElementById('focus-block-overlay');
    if (overlay) {
      overlay.remove();
      document.body.style.overflow = '';
    }
  }
  
  // Pausar elementos multimedia
  function pauseMediaElements() {
    // Pausar videos
    document.querySelectorAll('video').forEach(video => {
      if (!video.paused) {
        video.pause();
      }
    });
    
    // Pausar audios
    document.querySelectorAll('audio').forEach(audio => {
      if (!audio.paused) {
        audio.pause();
      }
    });
  }
  
  // Actualizar página para modo enfoque
  function updatePageForFocusMode() {
    if (focusMode) {
      // Agregar indicador de modo enfoque
      addFocusModeIndicator();
    } else {
      // Remover indicador
      removeFocusModeIndicator();
    }
  }
  
  // Agregar indicador de modo enfoque
  function addFocusModeIndicator() {
    if (document.getElementById('focus-mode-indicator')) {
      return;
    }
    
    const indicator = document.createElement('div');
    indicator.id = 'focus-mode-indicator';
    indicator.innerHTML = '🎯 Modo Enfoque Activo';
    
    const styles = `
      #focus-mode-indicator {
        position: fixed !important;
        top: 10px !important;
        right: 10px !important;
        background: #4a90e2 !important;
        color: white !important;
        padding: 8px 16px !important;
        border-radius: 20px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        z-index: 10000 !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
      }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    
    document.body.appendChild(indicator);
  }
  
  // Remover indicador de modo enfoque
  function removeFocusModeIndicator() {
    const indicator = document.getElementById('focus-mode-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
  
  // Observar cambios en la página
  function observePageChanges() {
    // Observar cambios en el título
    const titleObserver = new MutationObserver(() => {
      if (!isBlocked) {
        originalTitle = document.title;
      }
    });
    
    titleObserver.observe(document.querySelector('title'), {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
  
})();