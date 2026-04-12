/**
 * Settings service - in-memory cache backed by SQLite
 */
import { getAllSettings, setSetting as dbSetSetting } from './database.js';

let settings = {};
const listeners = new Set();

export async function loadSettings() {
    settings = await getAllSettings();
    return settings;
}

export function get(key) {
    return settings[key];
}

export function getBool(key) {
    return settings[key] === 'true';
}

export function getInt(key) {
    return parseInt(settings[key], 10) || 0;
}

export async function set(key, value) {
    settings[key] = String(value);
    await dbSetSetting(key, value);
    notifyListeners(key, settings[key]);
}

export function onChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

function notifyListeners(key, value) {
    for (const fn of listeners) {
        fn(key, value);
    }
}

export function getAll() {
    return { ...settings };
}
