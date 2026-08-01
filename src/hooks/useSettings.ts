import { useCallback, useEffect, useState } from 'react'
import type { AppSettings } from '@shared/index'

const EMPTY_SETTINGS: AppSettings = {
  activeProvider: 'openai',
  providers: {}
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(EMPTY_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!window.api) return
    window.api.getSettings().then((loadedSettings) => {
      setSettings(loadedSettings)
      setLoaded(true)
    })
  }, [])

  const save = useCallback(async (next: AppSettings) => {
    const saved = await window.api.saveSettings(next)
    setSettings(saved)
    return saved
  }, [])

  const hasActiveApiKey = Boolean(settings.providers[settings.activeProvider]?.apiKey)

  return { settings, loaded, save, hasActiveApiKey }
}
