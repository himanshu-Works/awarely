/**
 * Awarely Image Optimizer
 *
 * Client-side image compression and resizing utility for contextual safety reports:
 * - Downscales high-resolution camera captures (e.g. 12MP/48MP) to maximum 1280px dimensions.
 * - Compresses JPEG/PNG/WebP to quality-optimized JPEG (0.82 quality factor).
 * - Drastically reduces mobile payload (typically 80–90% reduction, e.g. 5MB -> 250KB).
 * - Preserves user bandwidth, accelerates upload speed, and reduces storage costs.
 * - Graceful fallback: returns original file if canvas/DOM is unavailable.
 */

export interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  outputFormat?: 'image/jpeg' | 'image/webp'
}

export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {},
): Promise<File> {
  // If not running in a browser environment with canvas support, return original
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof HTMLCanvasElement === 'undefined'
  ) {
    return file
  }

  // Only optimize image MIME types
  if (!file.type.startsWith('image/')) {
    return file
  }

  // If already under 200KB and reasonable format, avoid redundant re-encoding
  if (file.size <= 200 * 1024) {
    return file
  }

  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.82,
    outputFormat = 'image/jpeg',
  } = options

  return new Promise<File>((resolve) => {
    let objectUrl: string | null = null

    try {
      objectUrl = URL.createObjectURL(file)
      const img = new Image()

      img.onload = () => {
        try {
          let { width, height } = img

          // Calculate aspect ratio preserving constrained dimensions
          if (width > maxWidth || height > maxHeight) {
            const widthRatio = maxWidth / width
            const heightRatio = maxHeight / height
            const ratio = Math.min(widthRatio, heightRatio)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            if (objectUrl) URL.revokeObjectURL(objectUrl)
            resolve(file)
            return
          }

          // Smooth resampling
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (objectUrl) URL.revokeObjectURL(objectUrl)

              if (!blob || blob.size >= file.size) {
                // If optimization did not reduce size, keep original
                resolve(file)
                return
              }

              const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg'
              const optimizedFile = new File([blob], newFileName, {
                type: outputFormat,
                lastModified: Date.now(),
              })

              resolve(optimizedFile)
            },
            outputFormat,
            quality,
          )
        } catch (err) {
          if (objectUrl) URL.revokeObjectURL(objectUrl)
          console.warn('[ImageOptimizer] Compression failed, using original:', err)
          resolve(file)
        }
      }

      img.onerror = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        resolve(file)
      }

      img.src = objectUrl
    } catch {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      resolve(file)
    }
  })
}
