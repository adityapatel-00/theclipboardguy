/**
 * Window manager - show/hide popup, blur-to-dismiss
 */
let appWindow = null;
let isVisible = false;
let isDragging = false;
let blurTimeout = null;
let dragResetTimeout = null;

async function getWindow() {
  if (!appWindow) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    appWindow = getCurrentWindow();
  }
  return appWindow;
}

export async function initWindowManager() {
  const win = await getWindow();
  const { listen } = await import('@tauri-apps/api/event');

  console.log('[TCG] Window manager: registering listeners...');

  // Track popup-shown from Rust side
  await listen('popup-shown', () => {
    isVisible = true;
    document.dispatchEvent(new CustomEvent('popup-shown'));
  });

  await listen('popup-hidden', () => {
    isVisible = false;
    document.dispatchEvent(new CustomEvent('popup-hidden'));
  });

  // Track window drag — each move resets a short timer.
  // Once moves stop for 500ms, dragging is considered done.
  await listen('tauri://move', () => {
    isDragging = true;
    clearTimeout(blurTimeout);
    clearTimeout(dragResetTimeout);
    dragResetTimeout = setTimeout(() => {
      isDragging = false;
    }, 500);
  });

  // Dismiss on blur (click outside window)
  win.onFocusChanged(({ payload: focused }) => {
    if (!focused && isVisible) {
      // Delay to let drag settle
      blurTimeout = setTimeout(() => {
        if (!isDragging) {
          hidePopup();
        }
      }, 250);
    } else if (focused) {
      clearTimeout(blurTimeout);
    }
  });

  // Also detect clicks outside the popup container to close it
  // (in case blur listener doesn't fire reliably)
  document.addEventListener('mousedown', (e) => {
    if (!isVisible || isDragging) return;

    // If click is outside the popup container (but still on the window),
    // close the popup
    const mainContent = document.querySelector('#main-content');
    if (mainContent && !mainContent.contains(e.target)) {
      hidePopup();
    }
  });

  // Prevent double-click maximize on the drag region
  document.addEventListener(
    'dblclick',
    (e) => {
      if (e.target.closest('#tab-bar') && !e.target.closest('.tab-btn')) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  console.log('[TCG] Window manager ready');
}

export async function togglePopup() {
  if (isVisible) {
    await hidePopup();
  } else {
    await showPopup();
  }
}

export async function showPopup() {
  const win = await getWindow();
  await win.show();
  await win.setFocus();
  isVisible = true;
  isDragging = false;
  document.dispatchEvent(new CustomEvent('popup-shown'));
}

export async function hidePopup() {
  if (!isVisible) return;
  isVisible = false;
  clearTimeout(blurTimeout);
  clearTimeout(dragResetTimeout);
  isDragging = false;
  const win = await getWindow();
  await win.hide();
  document.dispatchEvent(new CustomEvent('popup-hidden'));
}

export function getIsVisible() {
  return isVisible;
}
