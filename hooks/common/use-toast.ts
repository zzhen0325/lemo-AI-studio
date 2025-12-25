"use client"

import { toast as sonnerToast } from "sonner"
import type { ReactNode } from "react"

interface ToastProps {
  id?: string | number
  title?: ReactNode
  description?: ReactNode
  variant?: "default" | "destructive"
  duration?: number
}

/**
 * Compatibility wrapper for sonner toast
 */
function toast({ id, title, description, variant, duration }: ToastProps) {
  const options = {
    id,
    description,
    duration: duration || 4000,
  }

  if (variant === "destructive") {
    return sonnerToast.error(title, options)
  }

  return sonnerToast(title, options)
}

function useToast() {
  return {
    toast,
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  }
}

export { useToast, toast }

