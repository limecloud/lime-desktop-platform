<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps<{ code: string }>()

const id = computed(() => `mermaid-${Math.random().toString(36).slice(2)}`)
const rendered = ref('')
const error = ref('')

async function renderDiagram() {
  if (typeof window === 'undefined') return
  try {
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default' })
    const result = await mermaid.render(id.value, props.code)
    rendered.value = result.svg
    error.value = ''
  } catch (err) {
    rendered.value = ''
    error.value = err instanceof Error ? err.message : 'Mermaid render failed'
  }
}

onMounted(renderDiagram)
watch(() => props.code, renderDiagram)
</script>

<template>
  <div class="ldp-mermaid">
    <div v-if="rendered" class="ldp-mermaid__canvas" v-html="rendered" />
    <pre v-else class="ldp-mermaid__fallback">{{ code }}</pre>
    <div v-if="error" class="ldp-mermaid__error">{{ error }}</div>
  </div>
</template>

