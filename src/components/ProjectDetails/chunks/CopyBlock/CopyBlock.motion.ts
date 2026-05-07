import { spring } from '@/styles/motion'

export const preTitleVars = {
  variants: {
    inactive: { opacity: 1 },
    active: {
      opacity: 0,
      height: 0,
      marginBottom: 0,
      transition: {
        ...spring,
        stiffness: 800,
        damping: 60,
      },
    },
  },
  transition: {
    ...spring,
    opacity: {
      delay: 0.5,
    },
  },
}

export const scrollboxVars = {
  variants: {
    inactive: {
      opacity: 0,
      height: 0,
      transition: {
        type: 'tween' as const,
        duration: 0.2,
      },
    },
    active: {
      opacity: 1,
      height: '100%',
      marginTop: '1rem',
      transition: {
        ...spring,
        stiffness: 200,
        delay: 0.5,
        marginTop: {
          delay: 0,
        },
      },
    },
  },
  transition: spring,
}

export const buttonVars = {
  variants: {
    inactive: {
      opacity: 1,
      height: '3rem',
      transition: {
        opacity: {
          delay: 0.5,
        },
      },
    },
    active: {
      opacity: 0,
      height: 0,
      marginTop: 0,
      transition: {
        duration: 0.2,
        height: {
          delay: 0.5,
        },
      },
    },
  },
  transition: spring,
}
