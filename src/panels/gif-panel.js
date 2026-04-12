/**
 * GIF panel - KLIPY API integration
 */
import { qs, el, clearChildren } from '../utils/dom.js';
import { searchGifs, getFeaturedGifs, hasApiKey } from '../services/tenor-api.js';
import { copyAndPaste } from '../services/paste.js';
import { showToast } from '../components/toast.js';
import { debounce } from '../utils/debounce.js';
import { switchTab } from '../components/tab-bar.js';

let panelEl = null;
let gridEl = null;
let currentPage = 1;
let hasNext = false;
let currentQuery = '';
let loading = false;

export function initGifPanel() {
    panelEl = qs('#gif-panel');
    render();
}

function render() {
    panelEl.textContent = '';
    gridEl = el('div', { className: 'gif-grid panel-scroll' });
    panelEl.appendChild(gridEl);
}

export async function show() {
    if (!hasApiKey()) {
        showApiKeyPrompt();
        return;
    }

    if (gridEl.children.length === 0) {
        await loadFeatured();
    }
}

function showApiKeyPrompt() {
    clearChildren(gridEl);
    gridEl.appendChild(
        el('div', { className: 'gif-api-prompt' }, [
            el('div', { className: 'empty-state-icon', textContent: '\u{1F3AC}' }),
            el('div', {
                className: 'empty-state-title',
                textContent: 'KLIPY API Key Required',
            }),
            el('div', {
                className: 'empty-state-desc',
                textContent: 'Get a free API key from partner.klipy.com and add it in Settings',
            }),
            el('button', {
                className: 'gif-api-prompt-btn',
                textContent: 'Open Settings',
                onClick: () => switchTab('settings'),
            }),
        ])
    );
}

async function loadFeatured() {
    if (loading) return;
    loading = true;
    currentQuery = '';
    currentPage = 1;

    try {
        const data = await getFeaturedGifs(1);
        if (!data) {
            showApiKeyPrompt();
            return;
        }
        clearChildren(gridEl);
        hasNext = data.hasNext;
        currentPage = data.page;
        appendGifs(data.results);
    } catch (err) {
        console.error('Failed to load featured GIFs:', err);
        showToast('Failed to load GIFs', 'error');
    } finally {
        loading = false;
    }
}

export async function search(query) {
    if (!hasApiKey()) {
        showApiKeyPrompt();
        return;
    }

    if (!query) {
        await loadFeatured();
        return;
    }

    if (loading) return;
    loading = true;
    currentQuery = query;
    currentPage = 1;

    try {
        const data = await searchGifs(query, 1);
        if (!data) return;
        clearChildren(gridEl);
        hasNext = data.hasNext;
        currentPage = data.page;
        appendGifs(data.results);

        if (data.results.length === 0) {
            gridEl.appendChild(
                el('div', { className: 'empty-state' }, [
                    el('div', { className: 'empty-state-icon', textContent: '\u{1F50D}' }),
                    el('div', {
                        className: 'empty-state-title',
                        textContent: 'No GIFs found',
                    }),
                ])
            );
        }
    } catch (err) {
        console.error('GIF search error:', err);
    } finally {
        loading = false;
    }
}

function appendGifs(gifs) {
    for (const gif of gifs) {
        const item = el('div', {
            className: 'gif-item',
            title: gif.title,
            onClick: () => handleGifClick(gif),
        });

        const img = el('img', {
            src: gif.tinyUrl,
            alt: gif.title,
            loading: 'lazy',
        });

        if (gif.tinyDims[0] && gif.tinyDims[1]) {
            img.style.aspectRatio = `${gif.tinyDims[0]} / ${gif.tinyDims[1]}`;
        }

        item.appendChild(img);
        gridEl.appendChild(item);
    }

    setupInfiniteScroll();
}

async function handleGifClick(gif) {
    await copyAndPaste(gif.fullUrl || gif.tinyUrl);
}

function setupInfiniteScroll() {
    const scrollParent = panelEl;
    const handler = debounce(async () => {
        if (loading || !hasNext) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollParent;
        if (scrollTop + clientHeight >= scrollHeight - 200) {
            loading = true;
            try {
                const nextPage = currentPage + 1;
                const data = currentQuery
                    ? await searchGifs(currentQuery, nextPage)
                    : await getFeaturedGifs(nextPage);
                if (data) {
                    hasNext = data.hasNext;
                    currentPage = data.page;
                    appendGifs(data.results);
                }
            } finally {
                loading = false;
            }
        }
    }, 150);

    scrollParent.removeEventListener('scroll', scrollParent._gifScrollHandler);
    scrollParent._gifScrollHandler = handler;
    scrollParent.addEventListener('scroll', handler);
}
