export type TextProps = {
  asChild?: boolean
  text?: string | string[]
  textStyle?:
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'p-sm'
    | 'p'
    | 'p-lg'
    | 'span'
    | 'a'
    | 'animatedSpan'
    | 'label'
    | 'display-lg'
    | 'display-sm'
    | 'button'
  href?: string
  ref?: React.Ref<any>
  variant?: any
  className?: any | any[]
  onClick?: () => void
  children?: React.ReactNode
  icons?: {
    iconBefore?: React.ReactNode
    iconAfter?: React.ReactNode
  }
  initial?: string
  animate?: string
  variants?: Record<string, any>
  layoutId?: string
  layout?: boolean
  layoutDependency?: any
}

export const usePTag = ['button', 'p-sm', 'p', 'p-lg', 'label', 'display-sm', 'display-lg']
export type TextTag = Omit<TextProps['textStyle'], (typeof usePTag)[number]>
