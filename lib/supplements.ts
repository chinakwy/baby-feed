export interface SupplementDefinition { id: string; name: string; unit: string; enabled: boolean }
export interface SupplementEntry { id: string; name: string; amount?: string; unit?: string }
export type SupplementSnapshot = SupplementEntry
export const DEFAULT_SUPPLEMENTS: SupplementDefinition[] = [
  { id: 'AD', name: 'AD', unit: '', enabled: true },
  { id: 'VITAMIN_D', name: '维D', unit: '', enabled: true },
  { id: 'DHA', name: 'DHA', unit: '', enabled: true },
]
const validId = (id: unknown): id is string => typeof id === 'string' && (/^(AD|VITAMIN_D|DHA)$/.test(id) || /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
function text(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim()) || /[\u0000-\u001f]/.test(value)) throw new Error('营养补充项目格式不正确')
  return value.trim()
}
function list(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length > 30) throw new Error('最多支持30个营养补充项目')
  const ids = new Set()
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || !validId(entry.id) || ids.has(entry.id)) throw new Error('营养补充项目标识无效或重复')
    ids.add(entry.id)
  }
  return value
}
export function validateSupplementDefinitions(value: unknown): SupplementDefinition[] {
  return list(value).map(x => {
    if (typeof x.enabled !== 'boolean') throw new Error('项目启用状态无效')
    return {id: x.id as string, name: text(x.name, 40, true), unit: text(x.unit, 12), enabled: x.enabled}
  })
}
export function validateSupplementEntries(value: unknown): SupplementEntry[] {
  return list(value).map(x => {
    const name = text(x.name, 40, true)
    const amount = x.amount == null || x.amount === '' ? '' : text(x.amount, 16)
    const unit = x.unit == null ? '' : text(x.unit, 12)
    if (amount && (!/^\d+(\.\d{1,4})?$/.test(amount) || Number(amount) <= 0 || Number(amount) > 100000 || !unit)) throw new Error('数量需为正数，并填写单位')
    return {id: x.id as string, name, ...(amount ? {amount} : {}), ...(unit ? {unit} : {})}
  })
}
export function readSupplementSettings(raw?: string | null): SupplementDefinition[] {
  try { if (raw) return validateSupplementDefinitions(JSON.parse(raw)) } catch { /* Old/invalid stored settings fall back safely. */ }
  return DEFAULT_SUPPLEMENTS.map(x => ({...x}))
}
export function readRecordSupplements(record: {supplements?: string | SupplementEntry[] | null; adGiven?: boolean | null; vitaminDGiven?: boolean | null}): SupplementEntry[] {
  let entries: SupplementEntry[] = []
  try { if (record.supplements) entries = validateSupplementEntries(typeof record.supplements === 'string' ? JSON.parse(record.supplements) : record.supplements) } catch { /* Preserve legacy markers if stored JSON is invalid. */ }
  for (const [id, given] of [['AD',record.adGiven], ['VITAMIN_D',record.vitaminDGiven]] as const) {
    if (given && !entries.some(x => x.id === id)) entries.push({id,name: DEFAULT_SUPPLEMENTS.find(x => x.id === id)!.name})
  }
  return entries
}
export function formatSupplement(entry: SupplementEntry): string { return `${entry.name}${entry.amount ? ` ${entry.amount}${entry.unit || ''}` : ''}` }
export function getVisibleSupplements(definitions: SupplementDefinition[], entries: SupplementEntry[]): SupplementDefinition[] {
  return [...definitions.filter(x => x.enabled && !entries.some(e => e.id === x.id)), ...entries.map(x => ({id:x.id,name:x.name,unit:x.unit || '',enabled:true}))]
}

// Drafts can contain an unfinished decimal or a missing unit while the user types.
// Submission uses validateSupplementEntries; draft recovery only checks bounded structure.
export function readSupplementDraftEntries(value: unknown): SupplementEntry[] {
  return list(value).map(x => ({
    id: x.id as string,
    name: text(x.name, 40, true),
    ...(x.amount != null ? {amount: text(x.amount, 16)} : {}),
    ...(x.unit != null ? {unit: text(x.unit, 12)} : {}),
  }))
}
