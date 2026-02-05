import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface MobileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children?: React.ReactNode
}

export function MobileSheet({ open, onOpenChange, children }: MobileSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>MapGap</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {children ?? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sidebar controls
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
