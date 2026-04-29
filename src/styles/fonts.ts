import { Barlow, Barlow_Condensed, Instrument_Serif, JetBrains_Mono } from 'next/font/google'

const barlow = Barlow({
  weight: ['200', '300', '400', '500', '600', '700', '900'],
  subsets: ['latin'],
  variable: '--font-barlow',
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  weight: ['200', '300', '400', '500', '600', '700', '900'],
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

const instrument = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
})

const jetBrains = JetBrains_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export { barlow, barlowCondensed, instrument, jetBrains }

export const fontImports = `${barlow.variable} ${barlowCondensed.variable} ${instrument.variable} ${jetBrains.variable}`
