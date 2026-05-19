'use client'

import { useParams } from 'next/navigation'
import AppShell from '../../components/AppShell'
import ClippingView from '../../components/ClippingView'

export default function ClippingVideoPage() {
  const params = useParams()
  return (
    <AppShell activePage="clipping" showCatToggle>
      <ClippingView videoId={params?.id} />
    </AppShell>
  )
}
