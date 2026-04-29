import clsx from 'clsx'

export const buttonWrapper = (variant = 'primary', size, props) => ({
  ...props,
  className: clsx('btn', [`btn-${variant}`], [size ? `size-${size}` : ''], [props.className]),
})
