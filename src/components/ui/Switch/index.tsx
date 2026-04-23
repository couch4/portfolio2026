import { FC } from 'react'
import { Switch } from 'radix-ui'
import './Switch.css'

interface SwitchProps {
  onSwitch: (checked: boolean) => void
  value?: boolean
}

const SwitchComponent: FC<SwitchProps> = ({ onSwitch, value }) => (
  <Switch.Root className="switch__wrapper" checked={value} onCheckedChange={onSwitch}>
    <Switch.Thumb className="switch__thumb" />
  </Switch.Root>
)

export default SwitchComponent
