import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory('/bookmarks/'),
  routes: [
    {
      path: '/',
      name: 'display',
      component: () => import('@/views/DisplayPortal.vue'),
      meta: { title: 'Pomeloc Bookmarks' },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminDashboard.vue'),
      meta: { title: 'Pomeloc Admin', requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(to => {
  document.title = (to.meta.title as string) || 'Pomeloc Bookmarks'
  if (to.meta.requiresAuth) {
    const isAdmin = localStorage.getItem('linkhub_is_admin')
    if (!isAdmin) return { name: 'display' }
  }
})

export default router
