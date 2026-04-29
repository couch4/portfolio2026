import { memo } from 'react'
import { Html } from '@react-three/drei'
import { Text } from '@/components/waywardUI'
import { getLeadingNumber, capitalise } from '@/utilities/formatting'
import clsx from 'clsx'
import { spring } from '@/styles/motion'
import '../Project.css'

const ProjectItemCopy = ({
  data,
  index = 0,
  isActive,
  ...props
}: {
  data: any
  isActive?: boolean
  index: number
}) => {
  const { accent, align, title, subTitle, description, preTitle } = data
  return (
    <Html center className="project-container" {...props}>
      <div data-align={align} className={clsx('project-wrapper')}>
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
        <Text variant="primary" textStyle="p-lg" className="project-description">
          {description}
        </Text>
        <Text
          variant="primaryBold"
          textStyle="label"
          className="project-index"
          animate={{ y: isActive ? 50 : 0, opacity: isActive ? 0 : 1 }}
          transition={spring}
        >
          {`${getLeadingNumber(index)} / ${title}`}
        </Text>
      </div>
    </Html>
  )
}

export default memo(ProjectItemCopy)
