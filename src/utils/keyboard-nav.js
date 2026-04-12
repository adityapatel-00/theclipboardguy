/**
 * Keyboard navigation state machine for the clipboard panel
 */

export class KeyboardNav {
    constructor() {
        this.items = [];
        this.selectedIndex = -1;
        this.onSelect = null;
        this.onActivate = null;
    }

    setItems(items) {
        this.items = items;
        this.selectedIndex = -1;
        this.clearHighlight();
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.moveDown();
                return true;
            case 'ArrowUp':
                e.preventDefault();
                this.moveUp();
                return true;
            case 'Enter':
                e.preventDefault();
                this.activate();
                return true;
            case 'Home':
                e.preventDefault();
                this.moveToStart();
                return true;
            case 'End':
                e.preventDefault();
                this.moveToEnd();
                return true;
            default:
                return false;
        }
    }

    moveDown() {
        if (this.items.length === 0) return;
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.items.length - 1);
        this.highlight();
    }

    moveUp() {
        if (this.items.length === 0) return;
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.highlight();
    }

    moveToStart() {
        if (this.items.length === 0) return;
        this.selectedIndex = 0;
        this.highlight();
    }

    moveToEnd() {
        if (this.items.length === 0) return;
        this.selectedIndex = this.items.length - 1;
        this.highlight();
    }

    highlight() {
        this.clearHighlight();
        if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
            const item = this.items[this.selectedIndex];
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            if (this.onSelect) this.onSelect(this.selectedIndex, item);
        }
    }

    clearHighlight() {
        for (const item of this.items) {
            item.classList.remove('selected');
        }
    }

    activate() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
            const item = this.items[this.selectedIndex];
            if (this.onActivate) this.onActivate(this.selectedIndex, item);
        }
    }

    reset() {
        this.selectedIndex = -1;
        this.clearHighlight();
    }
}
