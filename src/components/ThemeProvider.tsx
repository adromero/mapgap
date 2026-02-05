import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "system",
  setTheme: () => null,
})

const STORAGE_KEY = "mapgap-theme"

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as Theme) || defaultTheme
    } catch {
      return defaultTheme
    }
  })

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      try {
        localStorage.setItem(STORAGE_KEY, theme)
      } catch {
        // localStorage may be unavailable (private browsing, storage full, etc.)
      }
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
