'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useMoveApplicationStage,
  allowedNextStages,
  type ApplicationStage,
} from '@/hooks/useApplications'

/**
 * Advances an application through the hiring pipeline. The backend only permits
 * moving one step forward, or to REJECTED from any stage — `allowedNextStages`
 * mirrors that rule so the dropdown never offers an invalid transition.
 */
export function MoveStageDialog({
  applicationId,
  currentStage,
  open,
  onClose,
}: {
  applicationId: string
  currentStage: ApplicationStage
  open: boolean
  onClose: () => void
}) {
  const moveMutation = useMoveApplicationStage()
  const options = allowedNextStages(currentStage)
  const [stage, setStage] = useState<ApplicationStage | ''>('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setStage(options[0] ?? '')
      setNotes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentStage])

  const handleSubmit = async () => {
    if (!stage) return
    try {
      await moveMutation.mutateAsync({
        id: applicationId,
        data: { stage, notes: notes.trim() || undefined },
      })
      onClose()
    } catch {
      // toast surfaced by the mutation's onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Application Stage</DialogTitle>
          <DialogDescription>
            Current stage: <span className="font-medium">{currentStage}</span>. You can advance one
            step or reject the application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {options.length === 0 ? (
            <p className="text-sm text-gray-500">
              This application is at a terminal stage and cannot be moved further.
            </p>
          ) : (
            <>
              <div>
                <Label className="text-gray-700 font-medium">New Stage</Label>
                <Select value={stage || undefined} onValueChange={(v) => setStage(v as ApplicationStage)}>
                  <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="stage-notes" className="text-gray-700 font-medium">
                  Notes
                </Label>
                <Textarea
                  id="stage-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional note for this transition"
                  className="mt-1.5 border-gray-300"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={moveMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={moveMutation.isPending || options.length === 0 || !stage}
            className="bg-green-600 hover:bg-green-700 text-white min-w-[130px]"
          >
            {moveMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Moving...</>
            ) : (
              'Move Stage'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
