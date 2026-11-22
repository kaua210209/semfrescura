import { supabase } from './supabase.js'

// Reduz a imagem no navegador (máx. 1600px) e converte para WebP antes do envio.
async function resize(file, maxSize = 1600) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, maxSize / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.85))
    return blob || file
  } catch {
    return file
  }
}

export async function uploadImage(file, folder = 'misc') {
  const body = await resize(file)
  const ext = body.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('media')
    .upload(path, body, { cacheControl: '31536000', contentType: body.type || file.type })
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
