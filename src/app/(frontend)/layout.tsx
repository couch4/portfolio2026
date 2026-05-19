import type { Metadata } from 'next'
import React from 'react'
import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { Scrollbars } from '@/components/waywardUI'
import { draftMode } from 'next/headers'
import ThreeClientWrapper from '@/components/Three/ClientWrapper'

import '@/styles/globals.css'
import { getServerSideURL } from '@/utilities/getURL'
import { fontImports } from '@/styles/fonts'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

  return (
    <html className={fontImports} lang="en" suppressHydrationWarning>
      <head>
        {/* <InitTheme /> */}
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <Providers>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />
          <Header />
          <ThreeClientWrapper />
          {children}
          <Scrollbars
            driveCamera
            wrapperClassName="!fixed !top-0 !right-0 !z-[10] !w-full"
            style={{ width: '12px', height: '100svh' }}
            noScrollX
          >
            <div style={{ width: 1, height: '500vh', pointerEvents: 'none' }} />
          </Scrollbars>
          {/* <Footer /> */}
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@payloadcms',
  },
}
