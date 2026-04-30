import { memo, useMemo } from 'react'
import { Html } from '@react-three/drei'
import { Button, Motion, Scrollbars, Text } from '@/components/waywardUI'
import { getLeadingNumber, capitalise } from '@/utilities/formatting'
import { motion } from 'r3f-motion'
import clsx from 'clsx'
import { spring } from '@/styles/motion'

const ProjectItemCopy = ({
  data,
  index = 0,
  isActive,
  onClick,
  ...props
}: {
  data: any
  isActive?: boolean
  index: number
  onClick?: () => void
}) => {
  const { accent, align, title, subTitle, description, preTitle, standfirst } = data

  const indexText = useMemo(
    () => `${getLeadingNumber(index)} / ${title.replaceAll(/<br\s*\/?>/gi, '')}`, // regex to match <br> or <br /> tags
    [index, title],
  )

  return (
    <motion.group
      position={[0, 0, 0.01]}
      animate={{ rotateY: isActive ? (align === 'left' ? -0.1 : 0.1) : 0, z: isActive ? -3.4 : 0 }}
      transition={spring}
    >
      <Html transform center distanceFactor={2.35} className="project-container" {...props}>
        <Motion data-align={align} className={clsx('project-wrapper')}>
          <Text
            variant="primaryBold"
            textStyle="label"
            className={clsx('project-preTitle', [`text-accent${capitalise(accent)}`])}
          >
            {preTitle}
          </Text>
          <Text variant="primaryBold" textStyle="display-lg" className="project-title">
            {title}
          </Text>
          <Text variant="secondary" textStyle="h4" className="project-subTitle">
            {subTitle}
          </Text>
          <Motion className="project-scrollbox" animate={{ height: isActive ? '12rem' : '5rem' }}>
            <Scrollbars>
              <Text variant="primary" textStyle="p-lg" className="project-standfirst">
                {standfirst}
              </Text>
              {isActive && (
                <Text variant="primary" textStyle="p" className="project-description">
                  {description}
                </Text>
              )}
            </Scrollbars>
          </Motion>

          <Button
            onClick={onClick}
            variant={`${accent}Outline`}
            animate={isActive ? 'active' : 'inactive'}
            variants={{
              inactive: {
                opacity: 1,
                transition: spring,
              },
              active: {
                opacity: 0,
                transition: spring,
              },
            }}
          >
            View Project
          </Button>
          <Text
            variant="primaryBold"
            textStyle="label"
            className="project-index"
            animate={isActive ? 'active' : 'inactive'}
            variants={{
              inactive: {
                y: 0,
                opacity: 1,
                transition: spring,
              },
              active: {
                y: 50,
                opacity: 0,
                transition: spring,
              },
            }}
          >
            {indexText}
          </Text>
        </Motion>
      </Html>
    </motion.group>
  )
}

export default memo(ProjectItemCopy)
