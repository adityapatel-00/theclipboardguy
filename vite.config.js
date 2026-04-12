import { defineConfig } from 'vite';

export default defineConfig({
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        // Fix WebSocket connection for Tauri's WebView
        hmr: {
            protocol: 'ws',
            host: 'localhost',
        },
    },
    build: {
        target: 'esnext',
        outDir: 'dist',
    },
});
