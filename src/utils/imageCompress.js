// 客户头像图片压缩工具
// 默认参数对齐后端 MAX_AVATAR_SIZE = 2MB，统一输出 jpeg
// 算法：canvas 等比缩放 + toBlob 质量阶梯降级，最多 6 轮

const DEFAULT_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1024,
  mimeType: 'image/jpeg',
}

// 4 次质量降级（1024 尺寸下）+ 2 次尺寸降级兜底
const ATTEMPTS = [
  { dim: 1024, quality: 0.9 },
  { dim: 1024, quality: 0.8 },
  { dim: 1024, quality: 0.7 },
  { dim: 1024, quality: 0.6 },
  { dim: 800,  quality: 0.7 },
  { dim: 600,  quality: 0.6 },
]

/**
 * 把图片压缩到 ≤ maxSizeMB。
 * @param {File|Blob} file
 * @param {{ maxSizeMB?: number, maxWidthOrHeight?: number, mimeType?: string }} [options]
 * @returns {Promise<{ blob: Blob, file: File, compressed: boolean, originalSize: number, finalSize: number }>}
 */
export async function compressImage(file, options = {}) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const maxBytes = opts.maxSizeMB * 1024 * 1024

  // 已经在限制内且已是目标格式 → 直接返回，避免无谓的 canvas 编码
  if (file.size <= maxBytes && file.type === opts.mimeType) {
    const wrapped = file instanceof File ? file : new File([file], 'avatar.jpg', { type: opts.mimeType })
    return { blob: file, file: wrapped, compressed: false, originalSize: file.size, finalSize: file.size }
  }

  const img = await fileToImage(file)
  try {
    for (const { dim, quality } of ATTEMPTS) {
      const { width, height } = scaleSize(img.naturalWidth, img.naturalHeight, dim)
      const blob = await canvasToBlob(width, height, img, opts.mimeType, quality)
      if (blob.size <= maxBytes) {
        return makeResult(blob, file, opts.mimeType)
      }
    }
  } finally {
    // img 不需要手动释放，fileToImage 里的 objectURL 已 revoke
  }
  throw new Error('图片压缩失败，请尝试更小的图片')
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片读取失败'))
    }
    img.src = url
  })
}

function scaleSize(naturalW, naturalH, maxDim) {
  const longest = Math.max(naturalW, naturalH)
  if (longest <= maxDim) return { width: naturalW, height: naturalH }
  const scale = maxDim / longest
  return {
    width: Math.max(1, Math.round(naturalW * scale)),
    height: Math.max(1, Math.round(naturalH * scale)),
  }
}

function canvasToBlob(width, height, img, mimeType, quality) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('当前浏览器不支持图片压缩'))
      return
    }
    ctx.drawImage(img, 0, 0, width, height)
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('图片转换失败'))
      },
      mimeType,
      quality,
    )
  })
}

function makeResult(blob, originalFile, mimeType) {
  const ext = mimeType === 'image/jpeg' ? '.jpg' : '.webp'
  const baseName = (originalFile.name || 'avatar').replace(/\.[^.]+$/, '')
  const newFile = new File([blob], `${baseName}${ext}`, { type: mimeType, lastModified: Date.now() })
  return { blob, file: newFile, compressed: true, originalSize: originalFile.size, finalSize: blob.size }
}
