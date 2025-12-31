import { resolve } from 'path'
import { defineConfig } from 'vite'

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
        about: resolve(__dirname, 'about.html'),
        howitworks: resolve(__dirname, 'how-it-works.html'),
        safety: resolve(__dirname, 'safety.html'),
        faq: resolve(__dirname, 'faq.html'),
        blog: resolve(__dirname, 'blog.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
      },
    },
  },
})
