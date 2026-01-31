import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Lego Master - FLL Simulator',
        short_name: 'LegoMaster',
        description: 'Simulador educativo para competidores de First Lego League',
        theme_color: '#FFCB05',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
    // Serve local LDraw parts library at /ldraw/
    {
      name: 'serve-ldraw',
      configureServer(server) {
        const ldrawRoot = path.resolve(__dirname, 'ldraw');

        // Cache of all files in the ldraw directory (recursive)
        // Key: relative path with forward slashes, lowercase (e.g. "parts/3001.dat")
        const fileCache = new Map<string, string>();
        // Key: filename lowercase (e.g. "3001.dat") -> Value: Array of full paths
        const fileNameCache = new Map<string, string[]>();

        function indexDir(dir: string, prefix: string = '') {
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);

              if (entry.isDirectory()) {
                indexDir(fullPath);
              } else {
                // Normalize path for cache key (relative to ldrawRoot, forward slashes, lowercase)
                const relPath = path.relative(ldrawRoot, fullPath).replace(/\\/g, '/').toLowerCase();
                fileCache.set(relPath, fullPath);

                // Add to filename cache
                const lowerName = entry.name.toLowerCase();
                if (!fileNameCache.has(lowerName)) {
                  fileNameCache.set(lowerName, []);
                }
                fileNameCache.get(lowerName)!.push(fullPath);
              }
            }
          } catch (e) {
            console.error('[serve-ldraw] Error indexing directory:', dir, e);
          }
        }

        // Initial indexing
        if (fs.existsSync(ldrawRoot)) {
          console.log('[serve-ldraw] Indexing LDraw library...');
          indexDir(ldrawRoot);
          console.log(`[serve-ldraw] Indexed ${fileCache.size} files.`);
        } else {
          console.warn('[serve-ldraw] WARNING: ldraw/ directory not found at project root');
        }

        server.middlewares.use('/ldraw', (req: any, res: any, next: any) => {
          // Remove query params and leading slash
          const url = (req.url || '').split('?')[0].replace(/^\//, '');
          const reqPath = decodeURIComponent(url);

          // 1. Try exact path match (normalized to lowercase forward slashes)
          const lowerRelPath = reqPath.replace(/\\/g, '/').toLowerCase();
          let filePath = fileCache.get(lowerRelPath);

          // 2. Fallbacks if not found by exact path
          if (!filePath) {
            const fileName = path.basename(reqPath).toLowerCase();
            const candidates = fileNameCache.get(fileName);

            if (candidates && candidates.length > 0) {
              // Heuristic: If we have multiple candidates, try to find one that matches the requested parent folder
              // e.g. if request was for "parts/s/123.dat", prefer a candidate containing "/parts/s/"

              if (candidates.length === 1) {
                // Easy case: only one match anywhere
                filePath = candidates[0];
              } else {
                // Try to match the requested folder structure
                const requestedDir = path.dirname(reqPath).replace(/\\/g, '/').toLowerCase();

                // Find a candidate whose path ends with the requested relative path structure
                // e.g. candidate ".../ldraw/parts/3001.dat" matches request "parts/3001.dat"
                filePath = candidates.find(c => {
                  const cRel = path.relative(ldrawRoot, c).replace(/\\/g, '/').toLowerCase();
                  return cRel.includes(requestedDir);
                });

                // If no folder match, just take the first one (often 'parts/...' or 'p/...')
                if (!filePath) {
                  filePath = candidates[0];
                }
              }
            }
          }

          if (filePath && fs.existsSync(filePath)) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=3600');

            // Set correct Content-Type
            const ext = path.extname(filePath).toLowerCase();
            if (ext === '.png') {
              res.setHeader('Content-Type', 'image/png');
            } else if (ext === '.jpg' || ext === '.jpeg') {
              res.setHeader('Content-Type', 'image/jpeg');
            } else {
              // Default to text/plain for .dat, .ldr, etc.
              res.setHeader('Content-Type', 'text/plain');
            }

            fs.createReadStream(filePath).pipe(res);
          } else {
            // "Soft 404": If it is an LDraw file request but not found, return empty placeholder
            // This prevents Three.js LDrawLoader from throwing "Subobject not found" errors
            if (/\.(dat|ldr|mpd)$/i.test(reqPath)) {
              // console.warn(`[serve-ldraw] Serving placeholder for missing part: ${reqPath}`);
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Content-Type', 'text/plain');
              res.end('0 // Missing part served as placeholder\n');
            } else {
              // Return 404 instead of next() to prevent Vite SPA fallback
              res.statusCode = 404;
              res.end('Not found');
            }
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/cannon',
      'cannon-es',
      'react',
      'react-dom',
      'react-hot-toast',
      'lucide-react',
      '@supabase/supabase-js',
      'zustand'
    ]
  }
});
