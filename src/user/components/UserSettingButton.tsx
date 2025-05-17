"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UserSettingButtonProps {
  onClick: () => void
}

export default function UserSettingButton({ onClick }: UserSettingButtonProps) {
  return (
    <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Go to user settings" onClick={onClick}>
      <Menu className="h-5 w-5" />
    </Button>
  )
}
