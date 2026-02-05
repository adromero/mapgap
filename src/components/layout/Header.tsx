import { Map, Moon, Sun, Menu, Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/ThemeProvider"
import { AboutDialog } from "@/components/about/AboutDialog"

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light")
    } else {
      setTheme("dark")
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <Map className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold">MapGap</span>
      </div>

      <div className="flex items-center gap-1">
        <AboutDialog>
          <Button variant="ghost" size="sm">About</Button>
        </AboutDialog>
        <Button variant="ghost" size="icon" asChild>
          <a href="https://github.com/alfonsobries/mapgap" target="_blank" rel="noopener noreferrer">
            <Github className="h-4 w-4" />
            <span className="sr-only">GitHub repository</span>
          </a>
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  )
}