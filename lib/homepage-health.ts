interface Measurement {type:string;recordedAt:string;weight?:number|null;height?:number|null;temperature?:number|null}
/** Only today's measurements; overlapping sleep/history must not fill the health strip. */
export function todayHealthSummary(records:Measurement[],date:string) {
  const start=Date.parse(`${date}T00:00:00+08:00`),end=start+86400000
  const today=records.filter(record=>{const time=Date.parse(record.recordedAt);return time>=start&&time<end}).sort((a,b)=>Date.parse(b.recordedAt)-Date.parse(a.recordedAt))
  const result:{weight?:number;height?:number;temperature?:number}={}
  for(const [type,key] of [['WEIGHT','weight'],['HEIGHT','height'],['TEMPERATURE','temperature']] as const){const record=today.find(item=>item.type===type&&typeof item[key]==='number');if(record)result[key]=record[key] as number}
  return result
}
