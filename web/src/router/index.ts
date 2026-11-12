import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** Pages reachable without logging in. */
    public?: boolean
  }
}

// Hash mode: works on any static host (deploy location not decided) without server rewrites.
export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  // Back / forward restores the previous position; any other navigation (new page, next page) starts at the top.
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: '登入', public: true },
    },
    {
      path: '/',
      component: () => import('@/components/AppLayout.vue'),
      children: [
        { path: '', redirect: '/clinic' },
        {
          path: 'clinic',
          name: 'clinic',
          component: () => import('@/views/ClinicView.vue'),
          meta: { title: '門診作業' },
        },
        {
          path: 'patients',
          name: 'patients',
          component: () => import('@/views/PatientsView.vue'),
          meta: { title: '病人' },
        },
        {
          path: 'patients/new',
          name: 'patient-new',
          component: () => import('@/views/PatientDetailView.vue'),
          meta: { title: '新增病人' },
        },
        {
          path: 'patients/:id(\\d+)',
          name: 'patient-detail',
          component: () => import('@/views/PatientDetailView.vue'),
          props: (route) => ({ id: Number(route.params.id) }),
          meta: { title: '病人資料' },
        },
        {
          path: 'doctors',
          name: 'doctors',
          component: () => import('@/views/DoctorsView.vue'),
          meta: { title: '醫師' },
        },
        {
          path: 'departments',
          name: 'departments',
          component: () => import('@/views/DepartmentsView.vue'),
          meta: { title: '科別' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/clinic' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.restore()
  if (to.meta.public) return auth.isLoggedIn && to.name === 'login' ? '/clinic' : true
  if (!auth.isLoggedIn) return { name: 'login', query: { redirect: to.fullPath } }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title}｜門診資訊系統` : '門診資訊系統'
})
