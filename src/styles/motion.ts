import { AnimationGeneratorType, Transition, Variants } from 'motion/react'
export const spring = { type: 'spring' as const, stiffness: 600, damping: 100, restDelta: 0.001 }
export const bounce = { type: 'spring' as const, stiffness: 400, damping: 20, restDelta: 0.001 }

export const fadeIn = {
  variants: {
    inactive: {
      opacity: 0,
    },
    active: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
    },
  },
}

export const fadeUp = (yStart = 50, transition = spring) =>
  ({
    variants: {
      inactive: {
        y: yStart,
        opacity: 0,
      },
      active: {
        y: 0,
        opacity: 1,
        transition,
      },
    },
  }) as const

export const scaleInDelay = (
  delay: number,
  initScale = 0,
  variant?: string,
): { variants: Variants } => {
  const selectedTransition = variant === 'bounce' ? bounce : spring

  return {
    variants: {
      inactive: {
        scale: initScale,
        opacity: 0,
        transition: {
          ...(variant === 'bounce' ? { duration: 0.05 } : spring),
        },
      },
      active: {
        scale: 1,
        opacity: 1,
        transition: {
          ...selectedTransition,
          delay,
        },
      },
      exit: {
        scale: initScale,
        opacity: 0,
        transition: {
          ...(variant === 'bounce' ? { duration: 0.05 } : { duration: 0.3 }),
        },
      },
    },
  }
}

export const fadeInDelay = (delay: number, duration: number = 1) => ({
  variants: {
    inactive: {
      opacity: 0,
    },
    active: {
      opacity: 1,
      transition: {
        duration,
        delay,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.2,
      },
    },
  },
})

export const swingInDelay = (delay: number, side = 'left', x = 0) => ({
  variants: {
    inactive: {
      rotateY: side === 'left' ? 1 : -1,
      x: side === 'left' ? -8 : 8,
    },
    active: {
      rotateY: 0,
      x,
      transition: {
        ...spring,
        stiffness: 120,
        damping: 20,
        mass: 1.5,
        delay,
      },
    },
  },
})

export const fadeUpDelay = (delay: number, yStart = 50) =>
  ({
    variants: {
      inactive: {
        y: yStart,
        opacity: 0,
      },
      active: {
        y: 0,
        opacity: 1,
        transition: {
          ...spring,
          stiffness: 100,
          delay,
        },
      },
    },
  }) as const

export const pulse = {
  animate: {
    opacity: [1, 0.2, 1],
  },
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: 'easeInOut',
  },
} as const

export const pulseScale = {
  animate: {
    scale: [1, 1.05, 1],
  },
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: 'easeInOut',
  },
} as const
