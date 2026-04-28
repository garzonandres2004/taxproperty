'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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

export default function EditPropertyPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [property, setProperty] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/properties/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setProperty(data)
        setIsLoading(false)
      })
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    try {
      const response = await fetch(`/api/properties/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push(`/properties/${params.id}`)
      } else {
        alert('Error updating property')
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error updating property')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="p-8">Loading...</div>
  }

  if (!property) {
    return <div className="p-8">Property not found</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Edit Property</h1>
        <Link href={`/properties/${params.id}`}>
          <Button variant="outline">← Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>County</Label>
                    <Select name="county" defaultValue={property.county}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utah">Utah County</SelectItem>
                        <SelectItem value="salt_lake">Salt Lake County</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sale Year</Label>
                    <Input type="number" name="sale_year" defaultValue={property.sale_year} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Parcel Number</Label>
                  <Input name="parcel_number" defaultValue={property.parcel_number} />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select name="status" defaultValue={property.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="researching">Researching</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="redeemed">Redeemed</SelectItem>
                      <SelectItem value="removed">Removed</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="passed">Passed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Financials - Same as new form */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tax Amount Due</Label>
                    <Input type="number" name="total_amount_due" defaultValue={property.total_amount_due || ''} step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <Label>Deposit Required</Label>
                    <Input type="number" name="deposit_required" defaultValue={property.deposit_required || ''} step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <Label>Assessed Value</Label>
                    <Input type="number" name="assessed_value" defaultValue={property.assessed_value || ''} step="0.01" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Estimated Market Value</Label>
                  <Input type="number" name="estimated_market_value" defaultValue={property.estimated_market_value || ''} step="0.01" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Repair Cost</Label>
                    <Input type="number" name="estimated_repair_cost" defaultValue={property.estimated_repair_cost || ''} step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cleanup Cost</Label>
                    <Input type="number" name="estimated_cleanup_cost" defaultValue={property.estimated_cleanup_cost || ''} step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <Label>Closing Cost</Label>
                    <Input type="number" name="estimated_closing_cost" defaultValue={property.estimated_closing_cost || ''} step="0.01" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Select name="property_type" defaultValue={property.property_type}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_family">Single Family</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                        <SelectItem value="multifamily">Multifamily</SelectItem>
                        <SelectItem value="vacant_land">Vacant Land</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="mobile_home">Mobile Home</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Occupancy</Label>
                    <Select name="occupancy_status" defaultValue={property.occupancy_status}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner_occupied">Owner Occupied</SelectItem>
                        <SelectItem value="tenant">Tenant</SelectItem>
                        <SelectItem value="vacant">Vacant</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Property Address</Label>
                  <Input name="property_address" defaultValue={property.property_address || ''} />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea name="notes" defaultValue={property.notes || ''} className="min-h-[100px]" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {['access_risk', 'title_risk', 'legal_risk', 'marketability_risk'].map((risk) => (
                  <div className="space-y-2" key={risk}>
                    <Label className="capitalize">{risk.replace('_', ' ')}</Label>
                    <Select name={risk} defaultValue={property[risk]}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
