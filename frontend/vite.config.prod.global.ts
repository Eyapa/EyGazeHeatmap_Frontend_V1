import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(( { mode } ) => {
  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    server: {
      port: 3000,
      https: false,
      host: true,
    },
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    build: {
      // This is required to ensure that the built frontend can be served from
      // the root path (/) in production, which is necessary for the Nginx
      // configuration to work correctly. Do not change this.
      base: '/',
      outDir: 'dist',
      minify: 'esbuild',
      sourcemap: false,
    },
  }
})
