/**
 * KLIPY GIF API client (free Tenor/Giphy replacement)
 * Docs: https://docs.klipy.com/gifs-api
 */
import * as settings from './settings.js';

const BASE_URL = 'https://api.klipy.com/api/v1';

async function fetchKlipy(endpoint, params = {}) {
    const apiKey = settings.get('gif_api_key');
    if (!apiKey) return null;

    const url = new URL(`${BASE_URL}/${apiKey}/gifs/${endpoint}`);
    url.searchParams.set('per_page', '30');
    url.searchParams.set('content_filter', 'medium');
    url.searchParams.set('customer_id', 'theclipboardguy-user');

    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`KLIPY API error: ${response.status}`);
    return response.json();
}

export async function searchGifs(query, page = 1) {
    const params = { q: query, page: String(page) };
    const data = await fetchKlipy('search', params);
    if (!data || !data.result) return { results: [], hasNext: false, page: 1 };

    return {
        results: (data.data?.data || []).map(formatGif).filter(g => g.tinyUrl),
        hasNext: data.data?.has_next || false,
        page: data.data?.current_page || 1,
    };
}

export async function getFeaturedGifs(page = 1) {
    const params = { page: String(page) };
    const data = await fetchKlipy('trending', params);
    if (!data || !data.result) return { results: [], hasNext: false, page: 1 };

    return {
        results: (data.data?.data || []).map(formatGif).filter(g => g.tinyUrl),
        hasNext: data.data?.has_next || false,
        page: data.data?.current_page || 1,
    };
}

function getFile(file, size) {
    if (!file || !file[size]) return null;
    const bucket = file[size];
    // Try gif, then webp, then mp4, then any available format
    return bucket.gif || bucket.webp || bucket.mp4 || Object.values(bucket)[0] || null;
}

function formatGif(item) {
    const sm = getFile(item.file, 'sm') || getFile(item.file, 'xs') || getFile(item.file, 'md') || {};
    const full = getFile(item.file, 'md') || getFile(item.file, 'hd') || getFile(item.file, 'sm') || {};
    return {
        id: item.id,
        title: item.title || '',
        tinyUrl: sm.url || '',
        tinyDims: [sm.width || 0, sm.height || 0],
        fullUrl: full.url || '',
        fullDims: [full.width || 0, full.height || 0],
    };
}

export function hasApiKey() {
    const key = settings.get('gif_api_key');
    return key && key.length > 0;
}
