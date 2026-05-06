'use client'

import { useEffect, useMemo, useState } from 'react'
import {
    defaultWorkspacePreferences,
    loadWorkspacePreferences,
    saveWorkspacePreferences,
    type WorkspacePreferences,
} from '@/lib/workspace-preferences'

export function useWorkspacePreferences() {
    const [preferences, setPreferences] = useState<WorkspacePreferences>(defaultWorkspacePreferences)
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        setPreferences(loadWorkspacePreferences())
        setIsReady(true)
    }, [])

    useEffect(() => {
        if (!isReady) return
        saveWorkspacePreferences(preferences)
    }, [isReady, preferences])

    useEffect(() => {
        const handleStorage = () => setPreferences(loadWorkspacePreferences())
        window.addEventListener('storage', handleStorage)
        return () => {
            window.removeEventListener('storage', handleStorage)
        }
    }, [])

    const updatePreferences = (patch: Partial<WorkspacePreferences>) => {
        setPreferences((prev) => ({ ...prev, ...patch }))
    }

    const resetPreferences = () => setPreferences(defaultWorkspacePreferences)

    return useMemo(
        () => ({
            preferences,
            setPreferences,
            updatePreferences,
            resetPreferences,
        }),
        [preferences],
    )
}
