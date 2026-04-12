/**
 * Settings panel
 */
import { qs, el, clearChildren } from '../utils/dom.js';
import * as settings from '../services/settings.js';
import { registerShortcut } from '../services/shortcut.js';
import { clearUnpinnedHistory, clearAllHistory } from '../services/database.js';
import { showToast } from '../components/toast.js';
import { isEnabled, enable, disable } from '@tauri-apps/plugin-autostart';
import { invoke } from '@tauri-apps/api/core';

let panelEl = null;

export async function initSettingsPanel() {
  panelEl = qs('#settings-panel');
  try {
    await render();
  } catch (err) {
    console.error('Settings panel render error:', err);
    panelEl.textContent = '';
    panelEl.appendChild(
      el(
        'div',
        {
          className: 'empty-state',
        },
        [
          el('div', {
            className: 'empty-state-title',
            textContent: 'Settings failed to load',
          }),
          el('div', {
            className: 'empty-state-desc',
            textContent: String(err),
          }),
        ],
      ),
    );
  }
}

async function render() {
  panelEl.textContent = '';

  // ── General ──
  panelEl.appendChild(createGroupTitle('General'));

  panelEl.appendChild(
    createNumberRow('Max history items', 'max_items', 1, 100),
  );

  panelEl.appendChild(await createShortcutRow());

  panelEl.appendChild(
    createSelectRow('Theme', 'theme', [
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
    ]),
  );

  panelEl.appendChild(await createAutostartRow());

  panelEl.appendChild(createToggleRow('Close after paste', 'paste_and_close'));

  panelEl.appendChild(createToggleRow('Show timestamps', 'show_timestamps'));

  // ── Content Monitoring ──
  panelEl.appendChild(createGroupTitle('Monitor Content Types'));
  panelEl.appendChild(createToggleRow('Text', 'monitor_text'));
  panelEl.appendChild(createToggleRow('Images', 'monitor_images'));
  panelEl.appendChild(createToggleRow('HTML', 'monitor_html'));
  panelEl.appendChild(createToggleRow('Files', 'monitor_files'));
  panelEl.appendChild(createToggleRow('Rich Text (RTF)', 'monitor_rtf'));

  // ── GIF ──
  panelEl.appendChild(createGroupTitle('GIF (KLIPY API)'));
  panelEl.appendChild(createTextRow('KLIPY API Key', 'gif_api_key'));

  // ── Danger Zone ──
  const dangerZone = el('div', { className: 'danger-zone' }, [
    createGroupTitle('Danger Zone'),
    el('div', { className: 'setting-row' }, [
      el('div', {}, [
        el('div', {
          className: 'setting-label',
          textContent: 'Clear unpinned history',
        }),
        el('div', {
          className: 'setting-desc',
          textContent: 'Pinned items will be kept',
        }),
      ]),
      el('button', {
        className: 'danger-btn',
        textContent: 'Clear',
        onClick: async () => {
          await clearUnpinnedHistory();
          showToast('Unpinned history cleared');
        },
      }),
    ]),
    el('div', { className: 'setting-row' }, [
      el('div', {}, [
        el('div', {
          className: 'setting-label',
          textContent: 'Clear all history',
        }),
        el('div', {
          className: 'setting-desc',
          textContent: 'Removes everything including pinned items',
        }),
      ]),
      el('button', {
        className: 'danger-btn',
        textContent: 'Clear All',
        onClick: async () => {
          await clearAllHistory();
          showToast('All history cleared');
        },
      }),
    ]),
  ]);
  panelEl.appendChild(dangerZone);

  // Footer
  panelEl.appendChild(
    el('div', {
      className: 'settings-footer',
      textContent: 'The Clipboard Guy v0.1.0',
    }),
  );
}

// ── Helper builders ──

function createGroupTitle(title) {
  return el('div', { className: 'settings-group-title', textContent: title });
}

function createToggleRow(label, key) {
  const row = el('div', { className: 'setting-row' });
  row.appendChild(
    el('span', { className: 'setting-label', textContent: label }),
  );

  const toggle = el('label', { className: 'toggle' });
  const input = el('input', { type: 'checkbox' });
  input.checked = settings.getBool(key);
  input.addEventListener('change', async () => {
    await settings.set(key, input.checked ? 'true' : 'false');
  });
  toggle.appendChild(input);
  toggle.appendChild(el('span', { className: 'toggle-slider' }));
  row.appendChild(toggle);

  return row;
}

function createNumberRow(label, key, min, max) {
  const row = el('div', { className: 'setting-row' });
  row.appendChild(
    el('span', { className: 'setting-label', textContent: label }),
  );

  const input = el('input', {
    className: 'setting-number',
    type: 'number',
  });
  input.min = min;
  input.max = max;
  input.value = settings.getInt(key);
  input.addEventListener('change', async () => {
    const val = Math.max(min, Math.min(max, parseInt(input.value, 10) || min));
    input.value = val;
    await settings.set(key, val);
  });
  row.appendChild(input);

  return row;
}

function createTextRow(label, key) {
  const row = el('div', { className: 'setting-row' });
  row.appendChild(
    el('span', { className: 'setting-label', textContent: label }),
  );

  const input = el('input', {
    className: 'setting-text',
    type: 'text',
    placeholder: 'Enter value...',
  });
  input.value = settings.get(key) || '';
  input.addEventListener('change', async () => {
    await settings.set(key, input.value.trim());
    showToast('Saved');
  });
  row.appendChild(input);

  return row;
}

function createSelectRow(label, key, options) {
  const row = el('div', { className: 'setting-row' });
  row.appendChild(
    el('span', { className: 'setting-label', textContent: label }),
  );

  const select = el('select', { className: 'setting-select' });
  for (const opt of options) {
    const option = el('option', { textContent: opt.label });
    option.value = opt.value;
    if (settings.get(key) === opt.value) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener('change', async () => {
    await settings.set(key, select.value);
    if (key === 'theme') {
      document.documentElement.setAttribute('data-theme', select.value);
    }
  });
  row.appendChild(select);

  return row;
}

async function createShortcutRow() {
  const row = el('div', { className: 'setting-row' });
  row.appendChild(
    el('span', { className: 'setting-label', textContent: 'Global shortcut' }),
  );

  const recorder = el('div', { className: 'shortcut-recorder' });
  const display = el('span', {
    className: 'shortcut-display',
    textContent: settings.get('shortcut') || 'Not set',
  });

  let recording = false;
  const recordBtn = el('button', {
    className: 'shortcut-record-btn',
    textContent: 'Change',
    onClick: () => {
      if (recording) return;
      recording = true;
      display.classList.add('recording');
      display.textContent = 'Press keys...';

      const handler = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const parts = [];
        if (e.ctrlKey) parts.push('Control');
        if (e.shiftKey) parts.push('Shift');
        if (e.altKey) parts.push('Alt');
        if (e.metaKey) parts.push('Super');

        if (e.key && !['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
          parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
        }

        if (parts.length >= 2) {
          const shortcut = parts.join('+');
          display.textContent = shortcut;
          display.classList.remove('recording');
          recording = false;
          document.removeEventListener('keydown', handler, true);

          const success = await registerShortcut(shortcut);
          if (success) {
            await settings.set('shortcut', shortcut);
            showToast('Shortcut updated');
          } else {
            display.textContent = settings.get('shortcut') || 'Not set';
            showToast('Failed to register shortcut', 'error');
          }
        }
      };

      document.addEventListener('keydown', handler, true);
    },
  });

  recorder.appendChild(display);
  recorder.appendChild(recordBtn);
  row.appendChild(recorder);

  // Add warning for Wayland
  if (
    navigator.platform.toLowerCase().includes('linux') &&
    (await invoke('is_wayland'))
  ) {
    const desc = el('div', {
      className: 'setting-desc',
      textContent:
        'Global shortcuts do not work on Wayland. Please use X11 or XWayland.',
    });
    row.appendChild(desc);
  }

  return row;
}

async function createAutostartRow() {
  const row = el('div', { className: 'setting-row' });
  row.appendChild(
    el('span', { className: 'setting-label', textContent: 'Start on login' }),
  );

  const toggle = el('label', { className: 'toggle' });
  const input = el('input', { type: 'checkbox' });

  try {
    input.checked = await isEnabled();
  } catch {
    input.checked = false;
  }

  input.addEventListener('change', async () => {
    try {
      if (input.checked) {
        await enable();
      } else {
        await disable();
      }
      await settings.set('autostart', input.checked ? 'true' : 'false');
    } catch (err) {
      console.error('Autostart toggle failed:', err);
      input.checked = !input.checked;
      showToast('Failed to update autostart', 'error');
    }
  });

  toggle.appendChild(input);
  toggle.appendChild(el('span', { className: 'toggle-slider' }));
  row.appendChild(toggle);

  return row;
}
