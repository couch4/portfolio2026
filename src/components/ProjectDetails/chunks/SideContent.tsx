import { FC, memo, useMemo } from 'react'
import { Button, Motion } from '@/components/waywardUI'
import { Text } from '@/components/waywardUI'
import { getLeadingNumber } from '@/utilities/formatting'
import { AnimatePresence } from 'motion/react'
import clsx from 'clsx'
import { fadeIn, spring } from '@/styles/motion'
import CopyBlock from './CopyBlock'
import Info from './Info'

interface SideContentProps {
  data: any
  index: number
  isActive?: boolean
  onClick?: () => void
  offset?: number
}

const SideContent: FC<SideContentProps> = ({
  data,
  index = 0,
  isActive,
  onClick,
  offset,
  ...props
}) => {
  const { align, title } = data

  const animate = isActive ? 'active' : 'inactive'
  const indexText = useMemo(
    () => `${getLeadingNumber(index)} / ${title.replaceAll(/<br\s*\/?>/gi, '')}`, // regex to match <br> or <br /> tags
    [index, title],
  )

  const handleClick = () => {
    console.log('html level click')
    onClick?.()
  }

  return (
    <Motion data-align={align} className="project-details__side-wrapper">
      <Motion
        className={clsx('project-details__side')}
        {...props}
        animate={animate}
        initial="inactive"
        variants={{ inactive: { x: offset }, active: { x: 0 } }}
        transition={spring}
      >
        <CopyBlock
          data={data}
          index={index}
          isActive={isActive}
          offset={offset}
          onClick={handleClick}
        />
        <AnimatePresence>{isActive && <Info data={data} />}</AnimatePresence>
        <Text
          variant="primaryBold"
          textStyle="label"
          className={`project-details__index`}
          animate={isActive ? 'inactive' : 'active'}
          {...fadeIn}
        >
          {indexText}
        </Text>
      </Motion>
    </Motion>
  )
}

export default memo(SideContent)
