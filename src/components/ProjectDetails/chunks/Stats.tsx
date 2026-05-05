import { FC } from 'react'
import { Motion, Text } from '@/components/waywardUI'
import { fadeInDelay, spring } from '@/styles/motion'

interface StatsProps {
  data: {
    label: string
    value: string
  }[]
  align?: 'left' | 'right'
}

const className = 'project-details__stats'

const Stats: FC<StatsProps> = ({ data, align = 'left' }) => {
  const renderStats = data.map(({ label, value }, index) => {
    return (
      <Motion
        key={label}
        className={`${className}__item`}
        data-align={align}
        {...fadeInDelay(1 + index * 0.15)}
        transition={spring}
      >
        <Text textStyle="label" className={`${className}__label`}>
          {label}
        </Text>
        <Text className={`${className}__value`}>{value}</Text>
      </Motion>
    )
  })

  return <div className={className}>{renderStats}</div>
}

export default Stats
