'use client'
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react'
import { Baby, Camera, X } from 'lucide-react'
import AdaptiveDialog from '@/components/AdaptiveDialog'
export default function BabyAvatar({babyId}:{babyId:string}) {
  const [image,setImage]=useState<string|null>(null),[version,setVersion]=useState(''),[preview,setPreview]=useState('')
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('')
  const input=useRef<HTMLInputElement>(null)
  useEffect(()=>{
    setReady(false)
    const controller=new AbortController()
    fetch(`/api/babies/${babyId}/avatar`,{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(!controller.signal.aborted){setImage(data.image);setVersion(data.version);setReady(true)}}).catch(()=>{if(!controller.signal.aborted)setError('头像读取失败，请刷新后重试')})
    return ()=>controller.abort()
  },[babyId,open])
  async function select(file:File) {
    setError('');setBusy(true)
    let url=''
    try {
      if(file.size>20*1024*1024) throw Error('请选择小于20MB的照片')
      url=URL.createObjectURL(file)
      const photo=new Image();photo.src=url;await photo.decode()
      if(photo.naturalWidth*photo.naturalHeight>48000000)throw Error('照片分辨率过高，请选择较小的照片')
      const canvas=document.createElement('canvas');canvas.width=canvas.height=512
      const context=canvas.getContext('2d');if(!context)throw Error('当前浏览器无法处理照片')
      const side=Math.min(photo.naturalWidth,photo.naturalHeight)
      context.fillStyle='#fff';context.fillRect(0,0,512,512)
      context.drawImage(photo,(photo.naturalWidth-side)/2,(photo.naturalHeight-side)/2,side,side,0,0,512,512)
      setPreview(canvas.toDataURL('image/jpeg',0.82))
    } catch(e){setError(e instanceof Error&&e.message.includes('请选择')?e.message:'无法读取照片，请改选 JPG/PNG 照片（部分手机 HEIC 照片不受支持）')}
    finally {if(url)URL.revokeObjectURL(url);setBusy(false)}
  }
  async function save(){
    if(busy||!preview)return
    setBusy(true);setError('')
    try{
      const r=await fetch(`/api/babies/${babyId}/avatar`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:preview,version})});const data=await r.json()
      if(!r.ok)throw Error(data.error||'保存失败')
      setImage(data.image);setVersion(data.version);setPreview('');setOpen(false)
    }catch(e){setError(e instanceof Error?e.message:'保存失败，请重试')}finally{setBusy(false)}
  }
  return <>
    <button type="button" aria-label="更换宝宝头像" onClick={()=>{setError('');setPreview('');setOpen(true)}} className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-blue-100 sm:h-14 sm:w-14">
      {image?<img src={image} alt="宝宝头像" className="h-full w-full rounded-full object-cover"/>:<Baby size={28} className="text-blue-600"/>}
      <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-1 text-blue-600 shadow-sm"><Camera size={12}/></span>
    </button>
    {open&&<AdaptiveDialog labelledBy="avatar-title" onDismiss={()=>{if(!busy)setOpen(false)}} maxWidthClassName="sm:max-w-sm">
      <div className="space-y-4 p-5"><div className="flex items-center justify-between"><h2 id="avatar-title" className="font-bold">更换宝宝头像</h2><button aria-label="关闭头像面板" disabled={busy} onClick={()=>setOpen(false)} className="p-2"><X size={20}/></button></div>
      <p className="text-sm text-slate-500">选择一张照片，居中裁成方形并压缩。只保存头像，不归档原照片。</p>
      {(preview||image)&&<img src={preview||image||''} alt="头像预览" className="mx-auto h-32 w-32 rounded-full object-cover"/>}
      <input ref={input} type="file" accept="image/*" aria-label="选择头像照片" disabled={busy||!ready} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void select(file)}} className="block w-full text-sm"/>
      {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3"><button disabled={busy} onClick={()=>setOpen(false)} className="min-h-11 flex-1 rounded-xl border">取消</button><button disabled={busy||!preview||!ready} onClick={save} className="min-h-11 flex-1 rounded-xl bg-blue-600 text-white disabled:opacity-50">{busy?'处理中…':'保存头像'}</button></div></div>
    </AdaptiveDialog>}
  </>
}
