/**
 * Clipboard item renderer
 */
import { el } from '../utils/dom.js';
import { timeAgo } from '../utils/date.js';
import { truncate } from '../utils/sanitize.js';

export function renderClipboardItem(item, { onPaste, onPasteText, onPin, onDelete }) {
    const container = el('div', {
        className: `clip-item ${item.is_pinned ? 'pinned' : ''} stagger-item`,
    });
    container.dataset.id = item.id;

    // Content preview
    const content = el('div', { className: 'clip-content' });

    switch (item.content_type) {
        case 'text':
        case 'rtf':
            content.classList.add('text-preview');
            content.textContent = truncate(item.text_content || '', 200);
            break;

        case 'html':
            content.classList.add('html-preview');
            content.textContent = truncate(item.text_content || '', 200);
            break;

        case 'image':
            content.classList.add('image-preview');
            if (item.image_thumb) {
                const img = el('img', {
                    src: `data:image/png;base64,${item.image_thumb}`,
                    alt: 'Clipboard image',
                });
                content.appendChild(img);
            } else {
                content.textContent = '[Image]';
            }
            break;

        case 'files':
            content.classList.add('files-preview');
            const paths = item.file_paths ? JSON.parse(item.file_paths) : [];
            for (const p of paths.slice(0, 3)) {
                const fileName = p.split(/[/\\]/).pop();
                const fileRow = el('div', { className: 'file-path' }, [
                    el('span', { className: 'file-icon', textContent: '📄' }),
                    el('span', { textContent: fileName }),
                ]);
                content.appendChild(fileRow);
            }
            if (paths.length > 3) {
                content.appendChild(
                    el('span', {
                        textContent: `+${paths.length - 3} more`,
                        className: 'text-muted',
                    })
                );
            }
            break;
    }

    container.appendChild(content);

    // Metadata row
    const meta = el('div', { className: 'clip-meta' });

    const metaLeft = el('div', { className: 'clip-meta-left' }, [
        el('span', {
            className: 'clip-type-badge',
            textContent: item.content_type,
        }),
        el('span', {
            className: 'clip-time',
            textContent: timeAgo(item.created_at),
        }),
    ]);

    if (item.source_app) {
        metaLeft.appendChild(
            el('span', {
                className: 'clip-source',
                textContent: item.source_app,
            })
        );
    }

    // Action buttons
    const actions = el('div', { className: 'clip-actions' });

    if (item.content_type !== 'image') {
        const pasteTextBtn = el('button', {
            className: 'clip-action-btn paste-text-btn',
            title: 'Paste as text',
            onClick: (e) => {
                e.stopPropagation();
                onPasteText(item);
            },
            textContent: 'T',
        });
        actions.appendChild(pasteTextBtn);
    }

    const pinBtn = el('button', {
        className: `clip-action-btn ${item.is_pinned ? 'pin-active' : ''}`,
        title: item.is_pinned ? 'Unpin' : 'Pin',
        onClick: (e) => {
            e.stopPropagation();
            onPin(item);
        },
        textContent: item.is_pinned ? '📌' : '📍',
    });
    actions.appendChild(pinBtn);

    const deleteBtn = el('button', {
        className: 'clip-action-btn delete',
        title: 'Delete',
        onClick: (e) => {
            e.stopPropagation();
            onDelete(item);
        },
        textContent: '✕',
    });
    actions.appendChild(deleteBtn);

    meta.appendChild(metaLeft);
    meta.appendChild(actions);
    container.appendChild(meta);

    // Click to paste
    container.addEventListener('click', () => onPaste(item));

    return container;
}
