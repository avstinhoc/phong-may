import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

// Dedicated learning preview entry; production app still starts from index.html.
// Do not mount preview in src/App.jsx before security review and explicit approval.
export default defineConfig({
 plugins:[react()],
 build:{rollupOptions:{input:{
  main:fileURLToPath(new URL('./index.html',import.meta.url)),
  learning:fileURLToPath(new URL('./learning-prototype.html',import.meta.url)),
  arcade:fileURLToPath(new URL('./san-sao.html',import.meta.url))
 }}}
});
