import { wrapEffect } from '@react-three/postprocessing'
import { VHSEffect } from './VHSEffect'

/**
 * VHS postprocessing effect.
 *
 * Models the VHS signal chain bottom-up:
 *   optics → YIQ encoding → chroma bleed → tape ghosting → playback ringing → CRT output
 *
 * Drop inside an <EffectComposer> — after Bloom, before Tonemapping.
 *
 * @example
 * <EffectComposer>
 *   <Bloom … />
 *   <VHS intensity={0.9} chromaShift={0.7} trackingError={0.4} />
 *   <ToneMapping … />
 * </EffectComposer>
 */
const VHS = wrapEffect(VHSEffect)
export default VHS
