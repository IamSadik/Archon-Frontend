'use client'

import { useEffect } from 'react'
import { wakeBackend } from '@/lib/backend-health'

export function BackendWarmup() {
  useEffect(() => {
    void wakeBackend()
  }, [])

  return null
}
