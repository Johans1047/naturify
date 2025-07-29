"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Leaf, Square } from "lucide-react"

export default function ThemeToggle() {
  const [isRounded, setIsRounded] = useState(false)

  const toggleTheme = () => {
    setIsRounded(!isRounded)
    const body = document.body
    if (isRounded) {
      body.classList.remove("nature-rounded")
    } else {
      body.classList.add("nature-rounded")
    }
  }

  return (
    <Button
      onClick={toggleTheme}
      className="theme-toggle"
      size="sm"
      title={isRounded ? "Cambiar a estilo angular" : "Cambiar a estilo redondeado"}
    >
      {isRounded ? <Square className="h-6 w-6" /> : <Leaf className="h-6 w-6" />}
    </Button>
  )
}
