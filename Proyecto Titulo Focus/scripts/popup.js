// Estado global de la aplicación
let appState = {
  focusMode: false,
  timer: {
    minutes: 25,
    seconds: 0,
    isRunning: false,
    isPaused: false,
    isBreak: false,
    workMinutes: 25,
    breakMinutes: 5
  },
  tasks: []
};

// Elementos DOM
const elements = {
  focusModeToggle: document.getElementById('focusModeToggle'),
  statusText: document.getElementById('statusText'),
  statusIndicator: document.getElementById('statusIndicator'),
  timerDisplay: document.getElementById('timerDisplay'),
  timerMode: document.getElementById('timerMode'),
  startTimer: document.getElementById('startTimer'),
  pauseTimer: document.getElementById('pauseTimer'),
  resetTimer: document.getElementById('resetTimer'),
  addTaskBtn: document.getElementById('addTaskBtn'),
  taskInput: document.getElementById('taskInput'),
  newTaskText: document.getElementById('newTaskText'),
  saveTask: document.getElementById('saveTask'),
  cancelTask: document.getElementById('cancelTask'),
  tasksList: document.getElementById('tasksList'),
  settingsBtn: document.getElementById('settingsBtn')
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  await loadAppState();
  await loadCurrentSettings(); // Forzar carga de settings actuales
  setupStorageListener();
  initializeEventListeners();
  updateUI();
  startTimerTick();
});

// Cargar estado desde storage - CORREGIDO
async function loadAppState() {
  try {
    // Cargar configuración de settings
    const settingsResult = await chrome.storage.local.get(['focusSettings']);
    const settings = settingsResult.focusSettings || {
      workTime: 25,
      breakTime: 5
    };
    
    // Cargar estado de la app
    const stateResult = await chrome.storage.local.get(['focusAppState']);
    if (stateResult.focusAppState) {
      appState = { ...appState, ...stateResult.focusAppState };
    }
    
    // Actualizar los tiempos desde la configuración
    appState.timer.workMinutes = settings.workTime || 25;
    appState.timer.breakMinutes = settings.breakTime || 5;
    
    // Si el timer está parado, actualizar los minutos mostrados
    if (!appState.timer.isRunning && !appState.timer.isPaused) {
      appState.timer.minutes = appState.timer.isBreak ? 
        appState.timer.breakMinutes : 
        appState.timer.workMinutes;
    }
    
  } catch (error) {
    console.error('Error loading app state:', error);
  }
}

// Función para forzar la carga de configuración actual
async function loadCurrentSettings() {
  try {
    const settingsResult = await chrome.storage.local.get(['focusSettings']);
    const settings = settingsResult.focusSettings;
    
    if (settings && (settings.workTime || settings.breakTime)) {
      // Actualizar tiempos con la configuración más reciente
      appState.timer.workMinutes = settings.workTime || 25;
      appState.timer.breakMinutes = settings.breakTime || 5;
      
      // Si el timer no está corriendo, actualizar la pantalla
      if (!appState.timer.isRunning && !appState.timer.isPaused) {
        appState.timer.minutes = appState.timer.isBreak ? 
          appState.timer.breakMinutes : 
          appState.timer.workMinutes;
      }
      
      console.log('Current settings loaded:', {
        workTime: settings.workTime,
        breakTime: settings.breakTime
      });
    }
  } catch (error) {
    console.error('Error loading current settings:', error);
  }
}
function setupStorageListener() {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.focusSettings) {
      const newSettings = changes.focusSettings.newValue;
      
      if (newSettings && (newSettings.workTime || newSettings.breakTime)) {
        // Actualizar los tiempos en el estado
        appState.timer.workMinutes = newSettings.workTime || 25;
        appState.timer.breakMinutes = newSettings.breakTime || 5;
        
        // Si el timer está parado y no está en pausa, actualizar la pantalla
        if (!appState.timer.isRunning && !appState.timer.isPaused) {
          appState.timer.minutes = appState.timer.isBreak ? 
            appState.timer.breakMinutes : 
            appState.timer.workMinutes;
          updateTimerDisplay();
        }
        
        console.log('Timer settings updated:', {
          workTime: newSettings.workTime,
          breakTime: newSettings.breakTime
        });
      }
    }
  });
}

// Guardar estado en storage
async function saveAppState() {
  try {
    await chrome.storage.local.set({ focusAppState: appState });
  } catch (error) {
    console.error('Error saving app state:', error);
  }
}

// Configurar event listeners
function initializeEventListeners() {
  // Modo enfoque
  elements.focusModeToggle.addEventListener('change', toggleFocusMode);
  
  // Temporizador
  elements.startTimer.addEventListener('click', startTimer);
  elements.pauseTimer.addEventListener('click', pauseTimer);
  elements.resetTimer.addEventListener('click', resetTimer);
  
  // Tareas
  elements.addTaskBtn.addEventListener('click', showTaskInput);
  elements.saveTask.addEventListener('click', saveNewTask);
  elements.cancelTask.addEventListener('click', hideTaskInput);
  elements.newTaskText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveNewTask();
    if (e.key === 'Escape') hideTaskInput();
  });
  
  // Configuración
  elements.settingsBtn.addEventListener('click', openSettings);
}

// Funciones del modo enfoque
async function toggleFocusMode() {
  appState.focusMode = elements.focusModeToggle.checked;
  await saveAppState();
  
  // Comunicar cambio al background script
  chrome.runtime.sendMessage({
    action: 'toggleFocusMode',
    enabled: appState.focusMode
  });
  
  updateStatusIndicator();
}

// Funciones del temporizador
function startTimer() {
  if (appState.timer.isPaused) {
    appState.timer.isPaused = false;
  } else {
    // Si está en 0, reiniciar
    if (appState.timer.minutes === 0 && appState.timer.seconds === 0) {
      resetTimer();
    }
  }
  
  appState.timer.isRunning = true;
  elements.startTimer.disabled = true;
  elements.pauseTimer.disabled = false;
  
  // Activar modo enfoque automáticamente durante trabajo
  if (!appState.timer.isBreak && !appState.focusMode) {
    elements.focusModeToggle.checked = true;
    toggleFocusMode();
  }
  
  // Notificar al background que el timer está corriendo
  chrome.runtime.sendMessage({
    action: 'updateTimerState',
    isRunning: true
  });
  
  updateTimerDisplay();
  saveAppState();
}

function pauseTimer() {
  appState.timer.isRunning = false;
  appState.timer.isPaused = true;
  elements.startTimer.disabled = false;
  elements.pauseTimer.disabled = true;
  
  // Notificar al background que el timer se pausó
  chrome.runtime.sendMessage({
    action: 'updateTimerState',
    isRunning: false
  });
  
  updateTimerDisplay();
  saveAppState();
}

function resetTimer() {
  appState.timer.isRunning = false;
  appState.timer.isPaused = false;
  appState.timer.minutes = appState.timer.isBreak ? appState.timer.breakMinutes : appState.timer.workMinutes;
  appState.timer.seconds = 0;
  
  elements.startTimer.disabled = false;
  elements.pauseTimer.disabled = true;
  
  // Notificar al background que el timer se reinició
  chrome.runtime.sendMessage({
    action: 'updateTimerState',
    isRunning: false
  });
  
  updateTimerDisplay();
  saveAppState();
}

function startTimerTick() {
  setInterval(() => {
    if (appState.timer.isRunning) {
      if (appState.timer.seconds > 0) {
        appState.timer.seconds--;
      } else if (appState.timer.minutes > 0) {
        appState.timer.minutes--;
        appState.timer.seconds = 59;
      } else {
        // Timer completado
        timerCompleted();
      }
      updateTimerDisplay();
      saveAppState();
    }
  }, 1000);
}

function timerCompleted() {
  appState.timer.isRunning = false;
  
  // Alternar entre trabajo y descanso
  appState.timer.isBreak = !appState.timer.isBreak;
  appState.timer.minutes = appState.timer.isBreak ? appState.timer.breakMinutes : appState.timer.workMinutes;
  appState.timer.seconds = 0;
  
  elements.startTimer.disabled = false;
  elements.pauseTimer.disabled = true;
  
  // Mostrar notificación
  chrome.runtime.sendMessage({
    action: 'showNotification',
    title: appState.timer.isBreak ? '¡Hora del descanso!' : '¡Hora de trabajar!',
    message: appState.timer.isBreak ? 
      `Tómate un descanso de ${appState.timer.breakMinutes} minutos` : 
      `Tiempo de enfocarse por ${appState.timer.workMinutes} minutos`
  });
  
  updateTimerDisplay();
  saveAppState();
}

// Funciones de tareas
function showTaskInput() {
  elements.taskInput.style.display = 'block';
  elements.newTaskText.focus();
}

function hideTaskInput() {
  elements.taskInput.style.display = 'none';
  elements.newTaskText.value = '';
}

async function saveNewTask() {
  const taskText = elements.newTaskText.value.trim();
  if (!taskText) return;
  
  const newTask = {
    id: Date.now(),
    text: taskText,
    completed: false,
    createdAt: new Date().toISOString()
  };
  
  appState.tasks.unshift(newTask);
  await saveAppState();
  
  hideTaskInput();
  renderTasks();
}

async function toggleTask(taskId) {
  const task = appState.tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    await saveAppState();
    renderTasks();
  }
}

async function deleteTask(taskId) {
  appState.tasks = appState.tasks.filter(t => t.id !== taskId);
  await saveAppState();
  renderTasks();
}

// Renderizar tareas - CORREGIDO (sin onclick inline)
function renderTasks() {
  elements.tasksList.innerHTML = '';
  
  appState.tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
      <span class="task-text">${escapeHtml(task.text)}</span>
      <button class="task-delete">×</button>
    `;
    
    // Event listeners sin onclick inline
    const checkbox = li.querySelector('.task-checkbox');
    const deleteBtn = li.querySelector('.task-delete');
    
    checkbox.addEventListener('change', () => toggleTask(task.id));
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    elements.tasksList.appendChild(li);
  });
}

// Funciones de UI
function updateUI() {
  elements.focusModeToggle.checked = appState.focusMode;
  updateStatusIndicator();
  updateTimerDisplay();
  renderTasks();
}

function updateStatusIndicator() {
  const isActive = appState.focusMode || appState.timer.isRunning;
  elements.statusText.textContent = isActive ? 'Activo' : 'Desactivado';
  elements.statusIndicator.style.color = isActive ? '#28a745' : '#666';
}

function updateTimerDisplay() {
  const minutes = String(appState.timer.minutes).padStart(2, '0');
  const seconds = String(appState.timer.seconds).padStart(2, '0');
  elements.timerDisplay.textContent = `${minutes}:${seconds}`;
  
  // Actualizar modo
  elements.timerMode.textContent = appState.timer.isBreak ? 'Descanso' : 'Trabajo';
  
  // Actualizar clase CSS del temporizador
  const timerDisplay = document.querySelector('.timer-display');
  if (timerDisplay) {
    timerDisplay.classList.remove('working', 'break', 'paused');
    
    if (appState.timer.isPaused) {
      timerDisplay.classList.add('paused');
    } else if (appState.timer.isBreak) {
      timerDisplay.classList.add('break');
    } else {
      timerDisplay.classList.add('working');
    }
  }
}

// Funciones auxiliares
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openSettings() {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
}