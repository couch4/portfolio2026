export interface ButtonProps {
  asChild?: boolean
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'iconArrow' | 'icon'
  size?: 'sm' | 'lg'
  children?: React.ReactNode
  ref?: React.Ref<HTMLButtonElement>
  href?: string
  onClick?: () => void
  type?: HTMLButtonElement['type']
  disabled?: HTMLButtonElement['disabled']
  className?: string
  icons?: {
    icon?: React.ReactNode // If it's a sole icon Button
    iconBefore?: React.ReactNode
    iconAfter?: React.ReactNode
  }
}
