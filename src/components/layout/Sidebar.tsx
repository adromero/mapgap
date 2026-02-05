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
        For educational use only
      </div>
    </aside>
  )
}
