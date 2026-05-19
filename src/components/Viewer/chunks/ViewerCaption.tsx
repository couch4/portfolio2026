import { FC } from 'react'
import { AnimatePresence } from 'motion/react'
import { Motion, Text } from '@/components/waywardUI'
import { fadeInDelay, motionDefaults, rollOut } from '@/styles/motion'

interface ViewerCaptionProps {
  data?: {
    title: string
    description: string
  }
}

const ViewerCaption: FC<ViewerCaptionProps> = ({ data, ...props }) => {
  const { title, description } = data || {}

  const hasDescription = title || description

  return (
    <AnimatePresence>
      {hasDescription && (
        <Motion className="viewer-caption__wrapper" {...props} {...motionDefaults} {...rollOut}>
          <Text className="viewer-caption__title" textStyle="h5" {...fadeInDelay(0.2)}>
            {title}
          </Text>
          <Text className="viewer-caption__description" {...fadeInDelay(0.4)}>
            {description}
          </Text>
        </Motion>
      )}
    </AnimatePresence>
  )
}

export default ViewerCaption
