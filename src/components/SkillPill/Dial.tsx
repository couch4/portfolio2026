import { FC, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate as motionAnimate } from 'motion/react'
import { Motion } from '@/components/waywardUI'
import { spring, fadeInDelay } from '@/styles/motion'

interface DialProps {
  level: number
}

interface DialSVGProps {
  className?: string
  level?: number
}

const DialSVG: FC<DialSVGProps> = ({ className, level }) => {
  const pathLengthMV = useMotionValue(0)
  const strokeColor = useTransform(
    pathLengthMV,
    [0.25, 0.5, 0.7],
    [
      'rgb(222 46 80)', // error
      'rgb(243 200 83)', // warning
      'rgb(52 211 153)', // success
    ],
  )

  useEffect(() => {
    if (!level) return
    const controls = motionAnimate(pathLengthMV, level / 100, {
      ...spring,
      delay: 0.4,
    })
    return () => controls.stop()
  }, [level])

  return (
    <motion.svg
      width="110"
      height="86"
      viewBox="0 0 110 86"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <motion.path
        key={level}
        d="M11.1745 83C5.99997 74.9176 3 65.3091 3 55C3 26.2812 26.2812 3 55 3C83.7188 3 107 26.2812 107 55C107 65.3091 104 74.9176 98.8255 83"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        initial={{ pathLength: level ? 0.001 : 1 }}
        strokeOpacity={level ? 1 : 0.12}
        transition={{
          pathLength: level ? { ...spring, stiffness: 150 } : {},
          delay: 0,
        }}
        style={
          level
            ? {
                pathLength: pathLengthMV,
                stroke: strokeColor,
              }
            : undefined
        }
      />
    </motion.svg>
  )
}

const Dial: FC<DialProps> = ({ level }) => {
  return (
    <Motion
      layout="preserve-aspect"
      className="dial__wrapper"
      initial="inactive"
      animate="active"
      {...fadeInDelay(0.3)}
    >
      <DialSVG className="dial__base" />
      <DialSVG className="dial__progress" level={level} />
      <DialSVG className="dial__progress-blur" level={level} />
    </Motion>
  )
}

export default Dial
