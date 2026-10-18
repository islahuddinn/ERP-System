'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export interface ConfirmOptions {
  title?: string
  description: string
  confirmLabel?: string
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
}

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(async () => false)

/**
 * Promise-based confirmation, rendered with the standard supplier-style ConfirmDialog.
 * Usage:  const confirm = useConfirm();  if (await confirm('Delete this?')) { ... }
 */
export const useConfirm = (): ConfirmFn => useContext(ConfirmContext)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions>({ description: '' })
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((input) => {
    const options: ConfirmOptions = typeof input === 'string' ? { description: input } : input
    setOpts(options)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = (value: boolean) => {
    setOpen(false)
    resolver.current?.(value)
    resolver.current = null
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={open}
        title={opts.title ?? 'Are you sure?'}
        description={opts.description}
        confirmLabel={opts.confirmLabel ?? 'Confirm'}
        confirmVariant={opts.confirmVariant ?? 'destructive'}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </ConfirmContext.Provider>
  )
}
