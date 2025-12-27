import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        lookingroom: resolve(__dirname, 'lookingroom.html'),
        lookingroommate: resolve(__dirname, 'lookingroommate.html'),
        match: resolve(__dirname, 'match.html'),
        preference: resolve(__dirname, 'preference.html'),
        profile: resolve(__dirname, 'profile.html'),
        ques: resolve(__dirname, 'ques.html'),
        regimob: resolve(__dirname, 'regimob.html'),
        register: resolve(__dirname, 'register.html'),
        test_upload: resolve(__dirname, 'test_upload.html'),
        veri: resolve(__dirname, 'veri.html'),
        why: resolve(__dirname, 'why.html'),
      },
    },
  },
})
