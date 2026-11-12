<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { safeRedirect } from '@/composables/routeQuery'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')

async function submit() {
  await auth.login(username.value.trim(), password.value)
  // Never keep the password in memory longer than needed.
  password.value = ''
  if (auth.isLoggedIn) router.replace(safeRedirect(route.query.redirect))
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
    <div class="w-full max-w-sm">
      <div class="mb-6 text-center">
        <p class="text-lg font-semibold text-sky-800">門診資訊系統</p>
        <h1 class="mt-1 text-2xl font-semibold text-slate-900">登入</h1>
      </div>

      <form class="card space-y-4 p-6" @submit.prevent="submit">
        <div>
          <label for="login-username" class="form-label">帳號</label>
          <input
            id="login-username"
            v-model="username"
            autocomplete="username"
            required
            maxlength="50"
            class="form-control h-10"
          />
        </div>
        <div>
          <label for="login-password" class="form-label">密碼</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            maxlength="100"
            class="form-control h-10"
          />
        </div>

        <p v-if="auth.error" class="alert-error" role="alert">{{ auth.error }}</p>

        <button type="submit" :disabled="auth.loggingIn" class="btn btn-primary h-10 w-full">
          {{ auth.loggingIn ? '登入中…' : '登入' }}
        </button>
      </form>
    </div>
  </main>
</template>
