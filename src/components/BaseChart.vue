<template>
  <div ref="el" class="base-chart" :style="{ height, width }"></div>
</template>

<script setup>
// ECharts 通用封装：外部只传 option，内部负责初始化、数据更新与自适应容器尺寸
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import echarts from '../utils/echarts'

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '260px' },
  width: { type: String, default: '100%' },
})

const el = ref(null)
let chart = null
let resizeObserver = null

onMounted(() => {
  chart = echarts.init(el.value)
  chart.setOption(props.option)
  resizeObserver = new ResizeObserver(() => chart && chart.resize())
  resizeObserver.observe(el.value)
})

watch(
  () => props.option,
  (opt) => {
    if (chart) chart.setOption(opt)
  }
)

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

<style scoped>
.base-chart {
  width: 100%;
}
</style>
