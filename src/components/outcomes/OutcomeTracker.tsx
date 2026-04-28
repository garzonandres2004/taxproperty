'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import OutcomeForm from './OutcomeForm'

interface Outcome {
  id: string
  event_type: string
  event_date: string
  details: string | null
  created_at: string | Date
}

interface OutcomeTrackerProps {
  propertyId: string
  initialOutcomes: Outcome[]
}

const OUTCOME_LABELS: Record<string, string> = {
  redeemed: 'Redeemed',
  removed: 'Removed',
  sold: 'Sold',
  passed: 'Passed',
  struck_off: 'Struck Off',
  note: 'Note'
}

const OUTCOME_COLORS: Record<string, string> = {
  redeemed: 'bg-gray-100 text-gray-600',
  removed: 'bg-red-100 text-red-600',
  sold: 'bg-green-100 text-green-600',
  passed: 'bg-yellow-100 text-yellow-600',
  struck_off: 'bg-gray-100 text-gray-600',
  note: 'bg-blue-100 text-blue-600'
}

export default function OutcomeTracker({ propertyId, initialOutcomes }: OutcomeTrackerProps) {
  const [outcomes, setOutcomes] = useState<Outcome[]>(initialOutcomes)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const refreshOutcomes = useCallback(async () => {
    const response = await fetch(`/api/outcomes?propertyId=${propertyId}`)
    if (response.ok) {
      const data = await response.json()
      setOutcomes(data)
    }
    setIsDialogOpen(false)
  }, [propertyId])

  const handleSuccess = () => {
    refreshOutcomes()
  }

  const handleDelete = async (outcomeId: string) => {
    if (!confirm('Are you sure you want to delete this outcome?')) return

    try {
      const response = await fetch(`/api/outcomes?id=${outcomeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        refreshOutcomes()
      }
    } catch (error) {
      console.error('Error deleting outcome:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">+ Add Outcome</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Outcome Event</DialogTitle>
            </DialogHeader>
            <OutcomeForm
              propertyId={propertyId}
              onSuccess={handleSuccess}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {outcomes.length === 0 && (
          <p className="text-gray-500 text-sm">No outcomes recorded. Track status changes here.</p>
        )}

        {outcomes.map((outcome) => (
          <div key={outcome.id} className="p-3 bg-gray-50 rounded text-sm">
            <div className="flex justify-between items-start">
              <Badge variant="outline" className={`capitalize ${OUTCOME_COLORS[outcome.event_type] || ''}`}>
                {OUTCOME_LABELS[outcome.event_type] || outcome.event_type}
              </Badge>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">{outcome.event_date}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(outcome.id)}
                >
                  ×
                </Button>
              </div>
            </div>
            {outcome.details && (
              <p className="mt-2 text-gray-600">{outcome.details}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
