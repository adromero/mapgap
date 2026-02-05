import { cn } from "@/lib/utils"

interface SidebarProps {
  className?: string
  children?: React.ReactNode
}

export function Sidebar({ className, children }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden lg:flex lg:w-[280px] lg:flex-col lg:border-r bg-background",
        className
      )}
    >
      <div className="flex-1 overflow-y-auto p-4">
        {children ?? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sidebar controls
          </div>
        )}
      </div>
      <div className="border-t p-3 text-center text-xs text-muted-foreground">
        <p className="mb-3">For educational use only</p>
        <a
          href="mailto:digitalstructures@proton.me"
          className="inline-flex flex-col items-center gap-1 opacity-60 transition-opacity hover:opacity-100"
          title="Contact Digital Structures"
        >
          <svg viewBox="0 0 80 82" className="h-6 w-6" fill="currentColor" aria-hidden="true">
            <rect x="0" y="0" width="80" height="22" rx="6" ry="6" />
            <rect x="0" y="12" width="80" height="10" />
            <rect x="0" y="30" width="80" height="22" />
            <rect x="0" y="60" width="80" height="22" rx="6" ry="6" />
            <rect x="0" y="60" width="80" height="10" />
          </svg>
          <span className="text-[10px] tracking-wider"><span className="font-bold">DIGITAL</span>STRUCTURES</span>
        </a>
      </div>
    </aside>
  )
}
