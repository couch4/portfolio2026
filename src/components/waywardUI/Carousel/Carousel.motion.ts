export const carouselAnimationDefault = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
}

export const carouselAnimationElegant = {
  type: 'spring',
  damping: 30,
  stiffness: 200,
  restDelta: 0.00001,
}

export const carouselAnimationBouncy = {
  type: 'spring',
  damping: 10,
  stiffness: 200,
}

export const carouselAnimationSlow = {
  type: 'spring',
  damping: 50,
  stiffness: 100,
}

export const carouselAnimationSuperSlow = {
  type: 'spring',
  damping: 100,
  stiffness: 100,
}

const transitionType = {
  default: carouselAnimationDefault,
  elegant: carouselAnimationElegant,
  bouncy: carouselAnimationBouncy,
  slow: carouselAnimationSlow,
  superSlow: carouselAnimationSuperSlow,
}

const disableCarouselX = {
  x: {
    duration: 0,
  },
}

export const carouselFocusAnimation = (
  animStyle: any,
  isActive: boolean,
  offset: number,
  loop?: boolean,
) => {
  let xOffset = {}
  if (loop)
    xOffset = {
      x: offset,
    }

  return {
    initial: 'inactive',
    animate: isActive ? 'active' : 'inactive',
    variants: {
      inactive: {
        ...xOffset,
        opacity: 0.5,
        scale: 0.5,
      },
      active: {
        ...xOffset,
        opacity: 1,
        scale: 1,
      },
    },
    transition: {
      // @ts-ignore
      ...transitionType[animStyle || 'default'],
      ...disableCarouselX,
    },
  }
}

export const carouselBookcaseAnimation = (
  animStyle: any,
  isActive: boolean,
  offset: number,
  loop?: boolean,
) => {
  let xOffset = {}
  if (loop)
    xOffset = {
      x: offset,
    }

  return {
    initial: 'inactive',
    animate: isActive ? 'active' : 'inactive',
    variants: {
      inactive: {
        ...xOffset,
        scale: 0.85,
        opacity: 1,
      },
      active: {
        ...xOffset,
        scale: 1,
        opacity: 1,
      },
    },
    transition: {
      // @ts-ignore
      ...transitionType[animStyle || 'default'],
      ...disableCarouselX,
    },
  }
}

export const carouselFadeAndScaleAnimation = (
  animStyle: any,
  isActive: boolean,
  offset: number,
  loop?: boolean,
) => {
  let xOffset = {}
  if (loop)
    xOffset = {
      x: offset,
    }

  return {
    initial: 'inactive',
    animate: isActive ? 'active' : 'inactive',
    variants: {
      inactive: {
        ...xOffset,
        scale: 0.15,
        opacity: 0,
      },
      active: {
        ...xOffset,
        scale: 1,
        opacity: 1,
      },
    },
    transition: {
      // @ts-ignore
      ...(transitionType[animStyle || 'default'] as any),
      ...disableCarouselX,
    },
  }
}
