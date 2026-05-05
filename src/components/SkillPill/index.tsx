import { FC, useRef, useEffect, useState } from 'react'
import { Icon, Motion, Text } from '@/components/waywardUI'
import { useDimensions } from '@/hooks'
import { spring } from '@/styles/motion'
import clsx from 'clsx'
import Dial from './Dial'
import './SkillPill.css'

interface SkillPillProps {
  data: {
    label: string
    experience: number
    level: number
    icon: string
  }
}

const SkillPill: FC<SkillPillProps> = ({ data }) => {
  const { experience, label, level, icon } = data
  const [isActive, setIsActive] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { width, height } = useDimensions(containerRef)

  useEffect(() => {
    if (isActive && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isActive])

  const handleActive = () => {
    setIsActive(!isActive)
  }

  const handlePointerLeave = () => {
    setIsActive(false)
  }

  const years = experience > 1 ? 'years' : 'year'

  return (
    <div className="skillpill__container" ref={containerRef} style={{ width, height }}>
      <Motion
        className={clsx('skillpill__wrapper', { active: isActive })}
        onClick={handleActive}
        onPointerLeave={handlePointerLeave}
        layout
        animate={isActive ? 'active' : 'inactive'}
        {...wrapperVars(isActive)}
      >
        <Icon layout data={{ svgSrc: icon }} />
        <Text layout textStyle="label" className="skillpill__label">
          {label}
        </Text>
        {isActive && (
          <>
            <Text
              textStyle="label"
              className="skillpill__years"
              animate={isActive ? 'active' : 'inactive'}
              {...experienceVars}
            >
              {`${experience} ${years}`}
            </Text>
            <Dial level={level} />
          </>
        )}
      </Motion>
    </div>
  )
}

export default SkillPill

const wrapperVars = (isActive = false) => ({
  initial: 'inactive',
  whileHover: {
    scale: isActive ? 1 : 0.95,
    transition: { ...spring, stiffness: 2000 },
  },
  variants: {
    inactive: {
      borderRadius: '9999px',
      transition: { ...spring, stiffness: 800 },
    },
    active: {
      borderRadius: '9999px',
      transition: { ...spring },
      top: '50%',
      left: '50%',
      x: '-50%',
      y: '-50%',
    },
  },
})

const experienceVars = {
  initial: 'inactive',
  variants: {
    inactive: {
      opacity: 0,
      y: -20,
    },
    active: {
      opacity: 1,
      y: 0,
      transition: {
        ...spring,
        damping: 30,
        delay: 0.5,
      },
    },
  },
}
