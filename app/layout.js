import Script from 'next/script'
import './globals.css'

export const metadata = {
  title: 'Takneek Dashboard',
  icons: {
    icon: '/Takneek.svg',
  },
}

export default function RootLayout({ children }) {
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
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js"
          strategy="afterInteractive"
        />
        <Script src="/clipping.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
