// 极简事件总线（不引第三方依赖）。
// 用 window CustomEvent：同 tab 同步派发；若以后出现跨 tab 需求，
// 可在此处把 window 换成 BroadcastChannel，接口保持不变。

export const EVENT_CONTACTS_IMPORTED = 'customerweb:contacts-imported'

export function emitContactsImported(detail = {}) {
  window.dispatchEvent(new CustomEvent(EVENT_CONTACTS_IMPORTED, { detail }))
}

export function onContactsImported(handler) {
  const wrapped = (e) => handler(e.detail)
  window.addEventListener(EVENT_CONTACTS_IMPORTED, wrapped)
  return () => window.removeEventListener(EVENT_CONTACTS_IMPORTED, wrapped)
}