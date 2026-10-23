import { redirect } from 'next/navigation'
export default async function SupplementSettingsPage({searchParams}: {searchParams: Promise<{babyId?:string}>}) {
  const query=await searchParams
  const params=new URLSearchParams({panel:'supplements'})
  if(typeof query.babyId==='string')params.set('babyId',query.babyId)
  redirect('/settings/homepage?'+params.toString())
}
