import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import http from 'node:http'
import https from 'node:https'

const blocked = new BlockList()
for (const [address, prefix] of [ ['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3] ] as const) blocked.addSubnet(address,prefix,'ipv4')
for (const [address,prefix] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]] as const) blocked.addSubnet(address,prefix,'ipv6')
export function isPublicWebhookAddress(address: string): boolean {
  if (isIP(address) === 4) return !blocked.check(address,'ipv4')
  // Only global unicast; exclude transition/special-purpose ranges.
  return isIP(address) === 6 && /^[23][0-9a-f]{3}:/i.test(address)
    && !blocked.check(address,'ipv6')
}

/** Resolve every attempt, reject mixed private/public answers and pin the socket
 * to the checked address. Never follow redirects or log target credentials. */
export async function postWebhook(urlText: string, body: string, headers: Record<string,string>): Promise<number> {
  const url = new URL(urlText)
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error('Invalid webhook target')
  const host = url.hostname.replace(/^\[|\]$/g,'')
  let dnsTimer: ReturnType<typeof setTimeout> | undefined
  const addresses = await Promise.race([
    isIP(host) ? Promise.resolve([{address:host,family:isIP(host)}]) : lookup(host,{all:true,verbatim:true}),
    new Promise<never>((_,reject)=>{dnsTimer=setTimeout(()=>reject(new Error('Webhook DNS timed out')),5_000)}),
  ]).catch(()=>{throw new Error('Webhook DNS failed')}).finally(()=>clearTimeout(dnsTimer))
  if (!addresses.length || addresses.some(item=>!isPublicWebhookAddress(item.address))) throw new Error('Webhook target must resolve only to public addresses')
  const address = addresses[0]
  return new Promise((resolve,reject)=>{
    const timer = setTimeout(()=>request.destroy(new Error('Webhook request timed out')),10_000)
    const request = (url.protocol==='https:' ? https : http).request(url,{
      method:'POST',headers:{...headers,'Content-Length':String(Buffer.byteLength(body))},
      lookup: (_host,options,callback)=>options.all ? callback(null,[address]) : callback(null,address.address,address.family),
    },response=>{const status=response.statusCode ?? 0;response.destroy();resolve(status)})
    request.once('error',()=>reject(new Error('Webhook connection failed')))
    request.once('close',()=>clearTimeout(timer))
    request.end(body)
  })
}
