export const HOME_SECTION_KEYS = ['BABY', 'SUMMARY', 'MEMOS', 'HEALTH', 'QUICK_RECORDS', 'TODAY_RECORDS'] as const
export const HOME_CARD_KEYS = ['FEEDING', 'AD_VITAMIN', 'DIAPER', 'SLEEP'] as const
export const HOME_FEEDING_KEYS = ['BREAST_MILK', 'BREAST_MILK_BOTTLE', 'FORMULA', 'SOLID_FOOD'] as const
export type HomeFeedingKey = typeof HOME_FEEDING_KEYS[number]
export const HOME_FEEDING_LABELS: Record<HomeFeedingKey,string> = {BREAST_MILK:'母乳亲喂',BREAST_MILK_BOTTLE:'母乳瓶喂',FORMULA:'奶粉',SOLID_FOOD:'辅食'}
export type HomeSectionKey = typeof HOME_SECTION_KEYS[number]
export type HomeCardKey = typeof HOME_CARD_KEYS[number]
export interface HomepageSettings { sections: HomeSectionKey[]; cards: HomeCardKey[]; feedingTypes: HomeFeedingKey[] }
export const HOME_SECTION_LABELS: Record<HomeSectionKey, string> = {
  BABY: '宝宝信息', SUMMARY: '统计卡片', HEALTH: '今日健康数据', MEMOS: '近期备忘', QUICK_RECORDS: '快捷记录', TODAY_RECORDS: '今日记录',
}
export const HOME_CARD_LABELS: Record<HomeCardKey, string> = {
  FEEDING: '喂养', SLEEP: '睡眠', AD_VITAMIN: '营养补充', DIAPER: '大小便',
}
export function defaultHomepageSettings(): HomepageSettings {
  return { sections: [...HOME_SECTION_KEYS], cards: [...HOME_CARD_KEYS], feedingTypes: [...HOME_FEEDING_KEYS] }
}
export function validateHomepageSettings(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '首页设置格式不正确'
  const settings = value as Record<string, unknown>
  for (const [field, allowed] of [['sections', HOME_SECTION_KEYS], ['cards', HOME_CARD_KEYS]] as const) {
    const items = settings[field]
    if (!Array.isArray(items) || items.length > allowed.length) return '首页项目格式或数量不正确'
    if (items.some(item => typeof item !== 'string' || !(allowed as readonly string[]).includes(item))) return '首页设置包含不支持的项目'
    if (new Set(items).size !== items.length) return '首页设置包含重复项目'
  }
  if (settings.feedingTypes !== undefined) {
    const types = settings.feedingTypes
    if (!Array.isArray(types) || types.length > HOME_FEEDING_KEYS.length || types.some(key => !(HOME_FEEDING_KEYS as readonly unknown[]).includes(key)) || new Set(types).size !== types.length) return '喂养项目格式不正确'
  }
  return null
}
export function parseHomepageSettings(value: string | null | undefined): HomepageSettings {
  try {
    const settings = JSON.parse(value || 'null')
    if (settings && Array.isArray(settings.cards)) settings.cards = settings.cards.map((key: string) => key === 'BREAST_MILK' ? 'FEEDING' : key === 'FORMULA' ? 'SLEEP' : key)
    return validateHomepageSettings(settings) === null
      ? { sections: [...HOME_SECTION_KEYS], cards: HOME_CARD_KEYS.filter(key => settings.cards.includes(key)), feedingTypes: [...(settings.feedingTypes ?? HOME_FEEDING_KEYS)] }
      : defaultHomepageSettings()
  } catch { return defaultHomepageSettings() }
}
