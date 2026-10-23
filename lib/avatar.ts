import sharp from 'sharp'
export async function normalizeAvatar(value: unknown): Promise<string> {
  if (typeof value !== 'string' || value.length > 550000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error('请选择有效的照片')
  const bytes = Buffer.from(value.slice(value.indexOf(',') + 1), 'base64')
  const image = sharp(bytes, { limitInputPixels: 16000000, animated: false })
  const metadata = await image.metadata()
  if (!['jpeg','png','webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) throw new Error('请选择静态照片')
  const output = await image.rotate().resize(512,512,{fit:'cover'}).flatten({background:'#ffffff'}).jpeg({quality:82}).toBuffer()
  return 'data:image/jpeg;base64,' + output.toString('base64')
}
export async function readAvatarBody(request: Request): Promise<{image?:unknown;version?:unknown}> {
  if (!request.body) throw new Error('没有图片')
  const reader = request.body.getReader(); const chunks: Uint8Array[]=[]; let length=0
  try {
    while (true) {
      const {done,value}=await reader.read(); if(done) break
      length+=value.byteLength
      if(length>600000) { await reader.cancel(); throw new Error('图片过大，请重新选择') }
      chunks.push(value)
    }
    const value=JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if(!value || typeof value!=='object' || Array.isArray(value)) throw new Error('格式不正确')
    return value
  } finally { reader.releaseLock() }
}
