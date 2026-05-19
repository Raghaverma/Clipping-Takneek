import Script from 'next/script'
import './globals.css'
import { getPublicRuntimeConfig } from '../lib/env'

export const metadata = {
  title: 'Takneek Dashboard',
  icons: {
    icon: '/Takneek.svg',
  },
}

export default function RootLayout({ children }) {
  const runtimeConfig = getPublicRuntimeConfig()

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css"
        />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `window.__CD_CONFIG__ = ${JSON.stringify(runtimeConfig)};` }} />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js"
          strategy="afterInteractive"
        />
        <Script src="/clipping.js?v=8" strategy="afterInteractive" />
      </body>
    </html>
  )
}
