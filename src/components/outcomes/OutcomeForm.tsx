'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const OUTCOME_TYPES = [
  { value: 'redeemed', label: 'Redeemed', description: 'Owner paid delinquent taxes' },
  { value: 'removed', label: 'Removed', description: 'Property removed from sale list' },
  { value: 'sold', label: 'Sold', description: 'Successfully purchased at auction' },
  { value: 'passed', label: 'Passed', description: 'Decided not to bid' },
  { value: 'struck_off', label: 'Struck Off', description: 'Unsold - struck off to county' },
  { value: 'note', label: 'Note', description: 'General note or update' },
]

interface OutcomeFormProps {
  propertyId: string
  onSuccess: () => void
  onCancel?: () => void
}

export default function OutcomeForm({ propertyId, onSuccess, onCancel }: OutcomeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      property_id: propertyId,
      event_type: formData.get('event_type') as string,
      event_date: formData.get('event_date') as string,
      details: formData.get('details') as string,
    }

    try {
      const response = await fetch('/api/outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to add outcome')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get today's date in YYYY-MM-DD format for default
  const today = new Date().toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="event_type">Outcome Type *</Label>
        <Select name="event_type" required>
          <SelectTrigger>
            <SelectValue placeholder="Select outcome type..." />
          </SelectTrigger>
          <SelectContent>
            {OUTCOME_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div>
                  <div>{type.label}</div>
                  <div className="text-xs text-gray-500">{type.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_date">Event Date *</Label>
        <Input
          type="date"
          name="event_date"
          defaultValue={today}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">Details</Label>
        <Textarea
          name="details"
          placeholder="Add any additional details about this outcome..."
          className="min-h-[80px]"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Outcome'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
