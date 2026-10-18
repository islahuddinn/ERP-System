"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  isVisible: boolean
  onClose: () => void
}

export function Toast({ message, type = 'success', isVisible, onClose }: ToastProps) {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-[100]">
      <div
        className={cn(
          "px-4 py-3 rounded-lg shadow-lg text-white font-medium",
          type === 'success' && "bg-green-500",
          type === 'error' && "bg-red-500",
          type === 'info' && "bg-green-500"
        )}
      >
        {message}
      </div>
    </div>
  )
}
