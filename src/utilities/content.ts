import twConfig from 'tailwind.config.mjs'

const breakpoints = (twConfig?.theme?.extend?.screens || {}) as Record<string, string>

const availBreakpoints = breakpoints
  ? Object.keys(breakpoints)
  : ['base', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']

const findLastNotGreater = (arr: number[], value: number) => {
  let lastNotGreater = -1

  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > value) {
      break
    }
    lastNotGreater = arr[i]
  }

  return lastNotGreater
}

export const getCurrentBreakpoint = (width: number) => {
  let currentBreakpoint = 'base'

  const breakpointNums: number[] = (Object.values(breakpoints) as string[])
    .filter((bp) => !bp.includes('%'))
    .map((bp) => parseInt(bp))
    .sort((a, b) => a - b)

  const breakpointValue = findLastNotGreater(breakpointNums, width)

  if (breakpointValue > -1) {
    currentBreakpoint = Object.keys(breakpoints).filter(
      (key) => breakpoints[key as any] === `${breakpointValue}px`,
    )[0]
  }

  return currentBreakpoint
}

export const getValueAtBreakpoint = (values: any, breakpoint: string, percentageOf?: number) => {
  let value = values
  if (typeof values === 'object') {
    value = Object.values(values)[0]
    for (let i = 0; i < availBreakpoints.length; i++) {
      const val = availBreakpoints[i]
      if (values[val] && breakpoint !== 'base') value = values[val]
      if (val === breakpoint) {
        break
      }
    }
  }

  if (percentageOf) {
    let percentOfVal = value
    if (typeof value === 'number') {
      percentOfVal = value / percentageOf
    }
    if (value.includes('%')) {
      const decimalise = parseInt(value.replace('%', '')) / 100
      percentOfVal = decimalise * percentageOf
    }
    return percentOfVal
  }

  return value
}
