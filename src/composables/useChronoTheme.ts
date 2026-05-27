import { ref, onMounted, onUnmounted } from 'vue'

export function useChronoTheme() {
  const color = ref('oklch(0.75 0.08 65)')

  function update() {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) {
      color.value = 'oklch(0.80 0.12 85)'
    } else if (hour >= 12 && hour < 18) {
      color.value = 'oklch(0.75 0.08 65)'
    } else if (hour >= 18 && hour < 22) {
      color.value = 'oklch(0.65 0.15 35)'
    } else {
      color.value = 'oklch(0.55 0.05 260)'
    }
  }

  let timer: number
  onMounted(() => {
    update()
    timer = window.setInterval(update, 60_000)
  })
  onUnmounted(() => clearInterval(timer))

  return { color }
}
