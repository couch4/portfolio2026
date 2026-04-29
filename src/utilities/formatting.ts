export const capitalise = (str?: string) => {
  if (!str) return null
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const camelToHyphen = (str: string) => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

export const camelToSpace = (str: string) => {
  return str.replaceAll(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
}

export const curlyToEm = (str: string) => {
  return str.replaceAll('{', '<em>').replaceAll('}', '</em>')
}

export const breakIntoArray = (str?: string) => {
  if (typeof str !== 'string') return undefined
  return str.split(' ')
}

export const getLeadingNumber = (num: number) => {
  return num < 10 ? `0${num}` : num.toString()
}
