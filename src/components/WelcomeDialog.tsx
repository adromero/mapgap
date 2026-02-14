import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "mapgap-welcome-seen"

export function WelcomeDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true)
    }
  }, [])

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, "1")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to MapGap</DialogTitle>
          <DialogDescription>
            Find untapped market opportunities across the U.S.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            MapGap helps you discover counties where demand for products or services
            outpaces local supply. Pick an industry from the sidebar, and the map
            will highlight areas with the highest opportunity scores.
          </p>
          <p>
            Click any county on the map to see detailed demographics and scoring
            breakdowns. Use the filters to narrow results by state or metric.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleClose}>Get Started</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
