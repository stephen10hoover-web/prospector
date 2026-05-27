'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

type Theme = 'light' | 'dark'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    const resolved = stored ?? 'light'
    setTheme(resolved)
  }, [])

  function apply(next: Theme) {
    setTheme(next)
    localStorage.setItem('theme', next)
    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={() => apply('light')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
          theme === 'light'
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-background text-muted-foreground hover:text-foreground'
        }`}
      >
        <Sun className="h-4 w-4" />
        Light
      </button>
      <button
        onClick={() => apply('dark')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
          theme === 'dark'
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-background text-muted-foreground hover:text-foreground'
        }`}
      >
        <Moon className="h-4 w-4" />
        Dark
      </button>
    </div>
  )
}
