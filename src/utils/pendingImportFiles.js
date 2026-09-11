// 移动端「点 + 直接选图」的文件中转区：
// File 对象无法通过路由参数传递，选完图后先暂存这里，录入页挂载时取走并直接开始识别
let pending = []

export function setPendingImportFiles(files) {
  pending = Array.isArray(files) ? files : []
}

export function takePendingImportFiles() {
  const files = pending
  pending = []
  return files
}
