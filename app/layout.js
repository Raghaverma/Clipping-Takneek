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
        <script dangerouslySetInnerHTML={{ __html: `window.__CD_CONFIG__ = ${JSON.stringify({
          adminApi:        process.env.NEXT_PUBLIC_ADMIN_API        || '',
          takneekApi:      process.env.NEXT_PUBLIC_TAKNEEK_API      || '',
          googleClientId:  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
          r2MetadataUrl:   process.env.NEXT_PUBLIC_R2_METADATA_URL  || '',
          r2MetadataToken: process.env.NEXT_PUBLIC_R2_METADATA_TOKEN || '',
        })};` }} />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js"
          strategy="afterInteractive"
        />
        <Script src="/clipping.js?v=8" strategy="afterInteractive" />
      </body>
    </html>
  )
}
