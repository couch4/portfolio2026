'use client'

import { FC, useRef, useEffect, useState } from 'react'
import { Scrollbar } from 'react-scrollbars-custom'
import clsx from 'clsx'
import { Motion } from '@/components/waywardUI'

type ScrollbarsProps = {
  children: React.ReactNode
  className?: string
  noScrollX?: boolean
  noScrollY?: boolean
  onLoad?: (scrollbars: Scrollbar | null) => void
}

const Scrollbars: FC<ScrollbarsProps> = ({
  children,
  noScrollX = false,
  noScrollY = false,
  onLoad,
  ...rest
}) => {
  const [scrollUnderTop, setScrollUnderTop] = useState(false)
  const [scrollUnderBottom, setScrollUnderBottom] = useState(false)
  const [hasScrollY, setHasScrollY] = useState(false)
  const { className = 'scrollbars', ...globalRestProps } = rest
  const scrollRef = useRef<Scrollbar>(null)

  useEffect(() => {
    if (scrollRef.current) {
      onLoad?.(scrollRef.current)
    }
  }, [onLoad, scrollRef.current])

  const renderer = (props) => {
    const { elementRef, key, ...restProps } = props

    return (
      <Motion
        key={key}
        {...restProps}
        ref={elementRef}
        className={clsx(restProps.className, className, {
          'ScrollbarsCustom__under-top': scrollUnderTop,
          'ScrollbarsCustom__under-bottom': scrollUnderBottom,
          'scrollbars--no-scroll-y': !hasScrollY,
        })}
      />
    )
  }

  const wrapperProps = {
    renderer: (props) => {
      const { elementRef, key, ...restProps } = props
      return (
        <div
          key={key}
          {...restProps}
          ref={elementRef}
          className={clsx(restProps.className, `${className}__wrapper`)}
        />
      )
    },
  }

  const scrollerProps = {
    renderer: (props) => {
      const { elementRef, key, ...restProps } = props
      return (
        <div
          key={key}
          {...restProps}
          ref={elementRef}
          className={clsx(restProps.className, `${className}__scroller`)}
        />
      )
    },
  }

  const contentProps = {
    renderer: (props) => {
      const { elementRef, key, ...restProps } = props
      return (
        <div
          key={key}
          {...restProps}
          ref={elementRef}
          className={clsx(restProps.className, `${className}__content`)}
        />
      )
    },
  }

  const handleScroll = (scrollValues) => {
    const overflows = scrollValues.scrollHeight > scrollValues.clientHeight
    setHasScrollY(overflows)
    setScrollUnderTop(scrollValues.scrollTop > 0)
    setScrollUnderBottom(
      scrollValues.scrollTop + scrollValues.clientHeight < scrollValues.scrollHeight,
    )
  }

  return (
    <Scrollbar
      // @ts-ignore
      ref={scrollRef}
      renderer={renderer}
      wrapperProps={wrapperProps}
      scrollerProps={scrollerProps}
      contentProps={contentProps}
      noScrollX={noScrollX}
      noScrollY={noScrollY}
      {...globalRestProps}
      onUpdate={handleScroll}
    >
      {children}
    </Scrollbar>
  )
}

export default Scrollbars
