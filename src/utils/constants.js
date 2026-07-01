export const AVATAR_COLORS = [
  { bg: 'rgba(0, 122, 255, 0.1)', color: '#007AFF' },
  { bg: 'rgba(255, 149, 0, 0.1)', color: '#FF9500' },
  { bg: 'rgba(175, 82, 222, 0.1)', color: '#AF52DE' },
  { bg: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30' },
  { bg: 'rgba(52, 199, 89, 0.1)', color: '#34C759' },
]

export function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0]
  const index = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

export function calcVisitStatus(lastVisitDate) {
  if (!lastVisitDate) return { text: '未回訪', class: 'danger' }
  const now = new Date()
  const last = new Date(lastVisitDate)
  const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24))
  if (diffDays <= 7) return { text: `${diffDays}天前`, class: 'success' }
  if (diffDays <= 30) return { text: `${diffDays}天前`, class: 'warning' }
  return { text: `${diffDays}天前`, class: 'danger' }
}
