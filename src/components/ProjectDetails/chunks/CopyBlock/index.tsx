import { FC } from 'react'
import { Button, Motion, Scrollbars, Text } from '@/components/waywardUI'
import { capitalise } from '@/utilities/formatting'
import clsx from 'clsx'
import { preTitleVars, scrollboxVars, buttonVars } from './CopyBlock.motion'

interface CopyBlockProps {
  data: any
  index: number
  isActive?: boolean
  offset?: number
  onClick?: () => void
}

const copyClass = 'project-details__copyBlock'

const CopyBlock: FC<CopyBlockProps> = ({ data, isActive, onClick }) => {
  const { accent, align, title, subTitle, description, preTitle, standfirst } = data

  const handleClick = () => {
    console.log('button level click')
    onClick?.()
  }

  return (
    <Motion data-align={align} className={clsx(copyClass)}>
      <Text
        variant="primaryBold"
        textStyle="label"
        className={clsx(`${copyClass}__preTitle`, [`text-accent${capitalise(accent)}`])}
      >
        {preTitle}
      </Text>
      <Text variant="primaryBold" textStyle="display-lg" className={`${copyClass}__title`}>
        {title}
      </Text>
      <Text
        variant="secondary"
        textStyle="h4"
        className={`${copyClass}__subTitle`}
        {...preTitleVars}
      >
        {subTitle}
      </Text>
      <Motion className={`${copyClass}__scrollbox`} {...scrollboxVars}>
        <Scrollbars>
          <Text variant="primary" textStyle="p-lg" className={`${copyClass}__standfirst`}>
            {standfirst}
          </Text>
          {isActive && (
            <Text variant="primary" textStyle="p" className={`${copyClass}__description`}>
              {description}
            </Text>
          )}
        </Scrollbars>
      </Motion>
      <Button
        onClick={handleClick}
        variant={`${accent}Outline` as 'primaryOutline'}
        className={`${copyClass}__button`}
        {...buttonVars}
      >
        View Project
      </Button>
    </Motion>
  )
}

export default CopyBlock
