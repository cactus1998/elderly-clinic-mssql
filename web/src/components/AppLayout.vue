<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ToastMessage from '@/components/ToastMessage.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

function isCurrent(to: string): boolean {
  return route.path === to || route.path.startsWith(to + '/')
}

const main = useTemplateRef<HTMLElement>('main')
function focusMain() {
  main.value?.focus()
}

const navItems = [
  { to: '/clinic', label: '門診作業' },
  { to: '/patients', label: '病人' },
  { to: '/doctors', label: '醫師' },
  { to: '/departments', label: '科別' },
]

// Session ended (logout button, or any API returned 401): go to login.
// After an expiry, come back to the same page once logged in again.
watch(
  () => auth.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) return
    router.replace({ name: 'login', query: auth.expired ? { redirect: route.fullPath } : {} })
  },
)
</script>

<template>
  <div class="min-h-screen">
    <!-- Skip link: a button, because href="#main" would be taken as a route by the hash router. -->
    <button
      type="button"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      @click="focusMain"
    >
      跳到主要內容
    </button>

    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 px-4 sm:px-6">
        <RouterLink to="/clinic" class="flex h-14 items-center text-base font-semibold text-sky-800">
          門診資訊系統
        </RouterLink>

        <div class="flex items-center gap-3 lg:order-last">
          <span class="text-sm text-slate-600">{{ auth.user?.displayName }}</span>
          <button type="button" class="btn btn-secondary btn-sm" @click="auth.logout">登出</button>
        </div>

        <nav aria-label="主要功能" class="-mx-4 w-full overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:w-auto lg:flex-1 lg:px-0">
          <ul class="flex min-w-max gap-1">
            <li v-for="item in navItems" :key="item.to">
              <!-- /patients/:id is a sibling route, not a child, so match by path prefix to keep 病人 highlighted -->
              <RouterLink
                :to="item.to"
                class="flex h-12 items-center border-b-2 px-3 text-sm font-medium transition-colors lg:h-14"
                :class="
                  isCurrent(item.to)
                    ? 'border-sky-700 text-sky-800'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                "
                :aria-current="isCurrent(item.to) ? 'page' : undefined"
              >
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>

    <main ref="main" tabindex="-1" class="mx-auto max-w-7xl px-4 py-6 outline-none sm:px-6">
      <RouterView />
    </main>

    <ToastMessage />
    <ConfirmDialog />
  </div>
</template>
