// 全局只注册项目实际用到的图表类型与组件，控制打包体积
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, AxisPointerComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, AxisPointerComponent, TitleComponent, CanvasRenderer])

export default echarts
