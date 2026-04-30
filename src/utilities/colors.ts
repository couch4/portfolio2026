export const getCssVarName = (value: string): string | null => {
  if (!value) return null
  const match = value.match(/var\(--([^)]+)\)/)
  return match ? `--${match[1]}` : null
}

export const getRgbTriplet = (color: string): [number, number, number] | null => {
  const varName = getCssVarName(color)
  if (!varName) return null
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  const parts = raw.split(/\s+/).map(Number)
  if (parts.length === 3 && parts.every((n) => !isNaN(n))) return parts as [number, number, number]
  return null
}

export const rgbToHex = ([r, g, b]: [number, number, number]) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
