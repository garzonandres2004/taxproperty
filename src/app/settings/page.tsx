'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type UserSettings = {
  id: string
  totalBudget: number
  maxPerProperty: number
  reserveBuffer: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Form state
  const [formData, setFormData] = useState({
    totalBudget: '',
    maxPerProperty: '',
    reserveBuffer: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setFormData({
          totalBudget: data.totalBudget.toString(),
          maxPerProperty: data.maxPerProperty.toString(),
          reserveBuffer: data.reserveBuffer.toString()
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}
    const totalBudget = parseFloat(formData.totalBudget)
    const maxPerProperty = parseFloat(formData.maxPerProperty)
    const reserveBuffer = parseFloat(formData.reserveBuffer)

    if (isNaN(totalBudget) || totalBudget <= 0) {
      newErrors.totalBudget = 'Total budget must be a positive number'
    }
    if (isNaN(maxPerProperty) || maxPerProperty <= 0) {
      newErrors.maxPerProperty = 'Max per property must be a positive number'
    }
    if (isNaN(reserveBuffer) || reserveBuffer < 0) {
      newErrors.reserveBuffer = 'Reserve buffer must be 0 or greater'
    }
    if (maxPerProperty > totalBudget) {
      newErrors.maxPerProperty = 'Max per property cannot exceed total budget'
    }
    if (reserveBuffer >= totalBudget) {
      newErrors.reserveBuffer = 'Reserve buffer must be less than total budget'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalBudget: parseFloat(formData.totalBudget),
          maxPerProperty: parseFloat(formData.maxPerProperty),
          reserveBuffer: parseFloat(formData.reserveBuffer)
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setMessage({ type: 'success', text: 'Settings saved successfully' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' })
    } finally {
      setIsSaving(false)
    }
  }

  const calculatePreview = () => {
    const totalBudget = parseFloat(formData.totalBudget) || 0
    const maxPerProperty = parseFloat(formData.maxPerProperty) || 0
    const reserveBuffer = parseFloat(formData.reserveBuffer) || 0

    if (totalBudget <= 0) return null

    const availableForBidding = totalBudget - reserveBuffer
    const maxProperties = Math.floor(availableForBidding / (maxPerProperty || 1))
    const conservativeEstimate = Math.floor(availableForBidding / (maxPerProperty * 0.7 || 1))

    return {
      availableForBidding,
      maxProperties: Math.max(0, maxProperties),
      conservativeEstimate: Math.max(0, conservativeEstimate)
    }
  }

  const preview = calculatePreview()

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-500">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600 mt-1">Configure your budget and capital limits</p>
        </div>
        <Link href="/">
          <Button variant="outline">← Back to Dashboard</Button>
        </Link>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}>
          <AlertTitle className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.type === 'success' ? 'Success' : 'Error'}
          </AlertTitle>
          <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Budget Configuration</CardTitle>
              <CardDescription>
                Set your capital limits for this tax sale cycle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="totalBudget">Total Budget for Sale Cycle</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="totalBudget"
                    type="number"
                    value={formData.totalBudget}
                    onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
                    className={`pl-7 ${errors.totalBudget ? 'border-red-500' : ''}`}
                    placeholder="50000"
                  />
                </div>
                {errors.totalBudget ? (
                  <p className="text-sm text-red-600">{errors.totalBudget}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Total amount you are willing to invest across all properties this cycle
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPerProperty">Max Spend Per Property</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="maxPerProperty"
                    type="number"
                    value={formData.maxPerProperty}
                    onChange={(e) => setFormData({ ...formData, maxPerProperty: e.target.value })}
                    className={`pl-7 ${errors.maxPerProperty ? 'border-red-500' : ''}`}
                    placeholder="25000"
                  />
                </div>
                {errors.maxPerProperty ? (
                  <p className="text-sm text-red-600">{errors.maxPerProperty}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Maximum amount you will bid on any single property
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reserveBuffer">Reserve Buffer</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="reserveBuffer"
                    type="number"
                    value={formData.reserveBuffer}
                    onChange={(e) => setFormData({ ...formData, reserveBuffer: e.target.value })}
                    className={`pl-7 ${errors.reserveBuffer ? 'border-red-500' : ''}`}
                    placeholder="5000"
                  />
                </div>
                {errors.reserveBuffer ? (
                  <p className="text-sm text-red-600">{errors.reserveBuffer}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Amount of cash to keep uncommitted for contingencies and unexpected costs
                  </p>
                )}
              </div>

              <Button type="submit" disabled={isSaving} className="w-full">
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </form>

        {preview && preview.availableForBidding > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Capacity Preview</CardTitle>
              <CardDescription>
                Based on your settings, here is what you can afford
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 mb-1">Available for Bidding</div>
                  <div className="text-2xl font-bold text-blue-800">
                    ${preview.availableForBidding.toLocaleString()}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Total budget minus reserve
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 mb-1">Max Properties</div>
                  <div className="text-2xl font-bold text-green-800">
                    {preview.maxProperties}
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    At max per property limit
                  </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600 mb-1">Conservative Estimate</div>
                  <div className="text-2xl font-bold text-yellow-800">
                    {preview.conservativeEstimate}
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">
                    At 70% of max per property
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">How scoring uses these settings:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Properties exceeding <strong>max per property</strong> get lower capital-fit scores</li>
                  <li>Properties leaving less than <strong>reserve buffer</strong> get penalized</li>
                  <li>Capital fit is shown on property detail pages with budget usage percentage</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>About Budget Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gray-600">
              <p>
                These settings control how the scoring engine evaluates <strong>capital fit</strong> —
                one of five factors in the opportunity score. The goal is to help you avoid deals
                that would over-commit your available capital.
              </p>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">Total Budget</Badge>
                  <span>Your total available capital for this tax sale cycle</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">Max Per Property</Badge>
                  <span>Concentration limit — prevents over-investment in a single deal</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">Reserve Buffer</Badge>
                  <span>Cash kept available for unexpected costs, legal fees, repairs</span>
                </div>
              </div>

              <p>
                <strong>Example:</strong> With $50k total, $25k max per property, and $5k reserve,
                you could safely bid on 2 properties at $22.5k each, or spread across more smaller deals.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
