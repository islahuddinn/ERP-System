'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface CalculatorModalProps {
  open: boolean
  onClose: () => void
}

const STORAGE_KEY = 'calculator-position'
const keypad: Array<Array<string>> = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', '=', '+'],
]

const utilityButtons = ['C', 'DEL']

const allowedExpression = /^[0-9+\-*/.() ]+$/

const evaluateExpression = (expression: string): string => {
  const trimmed = expression.trim()
  if (!trimmed) {
    return '0'
  }

  if (!allowedExpression.test(trimmed)) {
    return 'Error'
  }

  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${trimmed})`)()
    if (result === Infinity || result === -Infinity || Number.isNaN(result)) {
      return 'Error'
    }
    return result.toString()
  } catch {
    return 'Error'
  }
}

export function CalculatorModal({ open, onClose }: CalculatorModalProps) {
  const [expression, setExpression] = useState('0')
  const [previewResult, setPreviewResult] = useState('0')
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 24, y: 24 })
  const [positionLoaded, setPositionLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!open) {
      setExpression('0')
      setPreviewResult('0')
    }
  }, [open])

  useEffect(() => {
    const calculated = evaluateExpression(expression)
    setPreviewResult(calculated)
  }, [expression])

  const clampPosition = useCallback((x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y }
    const width = containerRef.current?.offsetWidth ?? 320
    const height = containerRef.current?.offsetHeight ?? 420
    const min = 16
    const maxX = Math.max(min, window.innerWidth - width - min)
    const maxY = Math.max(min, window.innerHeight - height - min)
    return {
      x: Math.min(Math.max(min, x), maxX),
      y: Math.min(Math.max(min, y), maxY),
    }
  }, [])

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragOffsetRef.current) return
      const { x: offsetX, y: offsetY } = dragOffsetRef.current
      const nextPosition = clampPosition(event.clientX - offsetX, event.clientY - offsetY)
      setPosition(nextPosition)
    },
    [clampPosition],
  )

  const stopDragging = useCallback(() => {
    dragOffsetRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopDragging)
  }, [handlePointerMove])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setPosition(clampPosition(parsed.x ?? 24, parsed.y ?? 24))
      } else {
        const width = 320
        const height = 420
        setPosition({
          x: Math.max(16, window.innerWidth - width - 24),
          y: Math.max(16, window.innerHeight - height - 24),
        })
      }
    } catch {
      setPosition({ x: 24, y: 24 })
    } finally {
      setPositionLoaded(true)
    }
  }, [clampPosition])

  useEffect(() => {
    if (!positionLoaded || typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
  }, [position, positionLoaded])

  const startDragging = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current || !positionLoaded) return
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      dragOffsetRef.current = {
        x: event.clientX - position.x,
        y: event.clientY - position.y,
      }
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', stopDragging)
    },
    [handlePointerMove, position.x, position.y, positionLoaded, stopDragging],
  )

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
    }
  }, [handlePointerMove, stopDragging])

  const handleInput = (value: string) => {
    if (value === 'C') {
      setExpression('0')
      setPreviewResult('0')
      return
    }

    if (value === 'DEL') {
      setExpression((prev) => {
        const next = prev.length > 1 ? prev.slice(0, -1) : '0'
        return next
      })
      return
    }

    if (value === '=') {
      setExpression((prev) => {
        const evaluated = evaluateExpression(prev)
        return evaluated === 'Error' ? prev : evaluated
      })
      return
    }

    setExpression((prev) => {
      if (prev === '0' && ['+', '-', '*', '/', '.'].indexOf(value) === -1) {
        return value
      }
      return prev + value
    })
  }

  const expressionDisplay = useMemo(() => expression || '0', [expression])

  return (
    <div
      className={`fixed z-[60] transition-opacity duration-300 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        left: position.x,
        top: position.y,
        bottom: 'auto',
        right: 'auto',
      }}
      ref={containerRef}
    >
      <div className="w-full sm:w-80 rounded-2xl border border-white/10 bg-gray-950/90 shadow-2xl backdrop-blur-xl p-4">
        <div
          className="flex items-center justify-between mb-4 cursor-grab active:cursor-grabbing select-none"
          onPointerDown={startDragging}
        >
          <div>
            <p className="text-sm font-semibold text-white">Quick Calculator</p>
            <p className="text-xs text-gray-400">Lightweight in-app calculator.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white rounded-full p-1 hover:bg-white/10 transition-colors"
            aria-label="Close calculator"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-right">
            <div className="text-sm text-gray-400 truncate">{expressionDisplay}</div>
            <div className="text-2xl font-semibold text-white">
              {previewResult}
            </div>
          </div>
          <div className="flex gap-2">
            {utilityButtons.map((utility) => (
              <Button
                key={utility}
                onClick={() => handleInput(utility)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white"
              >
                {utility}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {keypad.flat().map((value) => (
              <Button
                key={value}
                onClick={() => handleInput(value)}
                className={value === '=' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-900 text-gray-200 hover:text-white hover:bg-gray-800'}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

