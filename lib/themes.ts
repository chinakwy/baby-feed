import type { CSSProperties } from 'react'

export const THEMES = [
  {
    "id": "blue",
    "name": "晴空蓝",
    "color": "#2563eb",
    "gradientEnd": "#06b6d4",
    "shades": {
      "50": "239 246 255",
      "100": "219 234 254",
      "200": "191 219 254",
      "300": "147 197 253",
      "400": "96 165 250",
      "500": "59 130 246",
      "600": "37 99 235",
      "700": "29 78 216",
      "800": "30 64 175",
      "900": "30 58 138",
      "950": "23 37 84"
    }
  },
  {
    "id": "pink",
    "name": "西米粉",
    "color": "#db2777",
    "gradientEnd": "#f43f5e",
    "shades": {
      "50": "253 242 248",
      "100": "252 231 243",
      "200": "251 207 232",
      "300": "249 168 212",
      "400": "244 114 182",
      "500": "236 72 153",
      "600": "219 39 119",
      "700": "190 24 93",
      "800": "157 23 77",
      "900": "131 24 67",
      "950": "80 7 36"
    }
  },
  {
    "id": "purple",
    "name": "薰衣紫",
    "color": "#7c3aed",
    "gradientEnd": "#a855f7",
    "shades": {
      "50": "245 243 255",
      "100": "237 233 254",
      "200": "221 214 254",
      "300": "196 181 253",
      "400": "167 139 250",
      "500": "139 92 246",
      "600": "124 58 237",
      "700": "109 40 217",
      "800": "91 33 182",
      "900": "76 29 149",
      "950": "46 16 101"
    }
  },
  {
    "id": "mint",
    "name": "薄荷绿",
    "color": "#059669",
    "gradientEnd": "#14b8a6",
    "shades": {
      "50": "236 253 245",
      "100": "209 250 229",
      "200": "167 243 208",
      "300": "110 231 183",
      "400": "52 211 153",
      "500": "16 185 129",
      "600": "5 150 105",
      "700": "4 120 87",
      "800": "6 95 70",
      "900": "6 78 59",
      "950": "2 44 34"
    }
  }
] as const
export type ThemeColor = typeof THEMES[number]['id']
export function isThemeColor(value: unknown): value is ThemeColor {
  return typeof value === 'string' && THEMES.some(theme => theme.id === value)
}
export function getTheme(value: unknown) {
  return THEMES.find(theme => theme.id === value) ?? THEMES[0]
}
export function themeStyle(value: unknown): CSSProperties {
  const theme = getTheme(value)
  return {
    ...Object.fromEntries(Object.entries(theme.shades).map(([shade,rgb]) => [`--theme-${shade}`,rgb])),
    '--background': `rgb(${theme.shades[50]})`,
    '--theme-gradient-end': theme.gradientEnd,
  } as CSSProperties
}
