import { FC } from 'react'
import { Switch } from 'radix-ui'
import './Switch.css'

interface SwitchProps {
  onSwitch: (checked: boolean) => void
}

const SwitchComponent: FC<SwitchProps> = ({ onSwitch }) => (
  <Switch.Root className="switch__wrapper" onCheckedChange={onSwitch}>
    <Switch.Thumb className="switch__thumb" />
  </Switch.Root>
)

export default SwitchComponent
