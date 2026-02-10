diff --git a/vite.config.js b/vite.config.js
--- a/vite.config.js
+++ b/vite.config.js
@@ -1,8 +1,10 @@
 import { defineConfig } from 'vite'
 import react from '@vitejs/plugin-react'
 import { VitePWA } from 'vite-plugin-pwa'

 export default defineConfig({
+  base: '/ECR_Overtime/',
   plugins: [
     react(),
     VitePWA({
       registerType: 'autoUpdate',
-      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
+      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
       manifest: {
         name: 'OvertimeHub',
         short_name: 'OvertimeHub',
@@ -13,8 +15,8 @@
         theme_color: '#0B1F3B',
         background_color: '#0B1F3B',
         display: 'standalone',
-        start_url: '/',
-        scope: '/',
+        start_url: '/ECR_Overtime/',
+        scope: '/ECR_Overtime/',
         orientation: 'portrait',
         icons: [
           {
-            src: '/icons/icon-192.png',
+            src: 'icons/icon-192.png',
             sizes: '192x192',
             type: 'image/png'
           },
           {
-            src: '/icons/icon-512.png',
+            src: 'icons/icon-512.png',
             sizes: '512x512',
             type: 'image/png'
           },
           {
-            src: '/icons/maskable-512.png',
+            src: 'icons/maskable-512.png',
             sizes: '512x512',
             type: 'image/png',
             purpose: 'maskable'
           }
         ]
       },
       workbox: {
-        navigateFallback: '/index.html',
+        navigateFallback: '/ECR_Overtime/index.html',
         globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
         runtimeCaching: [
           {
