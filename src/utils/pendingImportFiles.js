// 智能导入的多图队列中转区：
// 同一轮要发多张截图时，第一张立刻识别，其余暂存这里，
// 每次导入确认/取消后由 ChatAgent 取走下一张
let pending = []

export function setPendingImportFiles(files) {
  pending = Array.isArray(files) ? files : []
}

export function takePendingImportFiles() {
  const files = pending
  pending = []
  return files
}
