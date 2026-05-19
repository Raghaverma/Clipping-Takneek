'use client'

import AppShell from '../components/AppShell'
import ClippingView from '../components/ClippingView'

export default function ClippingPage() {
  return (
    <AppShell activePage="clipping" showCatToggle>
      <ClippingView />
    </AppShell>
  )
}
