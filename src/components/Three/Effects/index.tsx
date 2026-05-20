import { FC } from 'react'
import { EffectComposer, N8AO } from '@react-three/postprocessing'
import VHS from './VHS'

const vhsSettings = {
  debug: false,
  gap: 0.5,
  defaultValue: 0,
  postProcess: false,
  intensity: 1,
  noiseStrength: 0.1,
  scanlineIntensity: 0.9,
  chromaShift: 0.3,
  ghostStrength: 0.2,
  trackingError: 0.2,
  barrelDistortion: 0,
  handheldStrength: 0,
  tapeSpeed: 1,
}

const Effects: FC<{ ssao?: boolean }> = ({ ssao = false }) => {
  return (
    <EffectComposer>
      <VHS {...vhsSettings} />
      {ssao && (
        <N8AO
          aoRadius={8}
          intensity={6}
          distanceFalloff={1}
          aoSamples={32}
          denoiseSamples={8}
          // halfRes
          quality="performance"
        />
      )}
    </EffectComposer>
  )
}

export default Effects
