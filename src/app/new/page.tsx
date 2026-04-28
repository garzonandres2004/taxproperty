'use client'

import { useState } from 'react'
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
import { Separator } from '@/components/ui/separator'

export default function NewPropertyPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const property = await response.json()
        router.push(`/properties/${property.id}`)
      } else {
        alert('Error creating property')
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating property')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Add New Property</h1>
        <Link href="/properties">
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
                <CardDescription>County, parcel number, and sale details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="county">County *</Label>
                    <Select name="county" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select county" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utah">Utah County</SelectItem>
                        <SelectItem value="salt_lake">Salt Lake County</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sale_year">Sale Year *</Label>
                    <Input type="number" name="sale_year" defaultValue={2026} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parcel_number">Parcel Number *</Label>
                  <Input name="parcel_number" placeholder="e.g., 55-123-4567" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sale_date">Sale Date</Label>
                    <Input type="date" name="sale_date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auction_platform">Auction Platform</Label>
                    <Input name="auction_platform" placeholder="e.g., Public Surplus" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financials */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Information</CardTitle>
                <CardDescription>Taxes, costs, and valuations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total_amount_due">Tax Amount Due *</Label>
                    <Input type="number" name="total_amount_due" placeholder="0.00" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deposit_required">Deposit Required</Label>
                    <Input type="number" name="deposit_required" placeholder="500" step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assessed_value">Assessed Value</Label>
                    <Input type="number" name="assessed_value" placeholder="0.00" step="0.01" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="estimated_market_value">Estimated Market Value</Label>
                  <Input type="number" name="estimated_market_value" placeholder="0.00" step="0.01" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estimated_repair_cost">Repair Cost</Label>
                    <Input type="number" name="estimated_repair_cost" placeholder="0.00" step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated_cleanup_cost">Cleanup Cost</Label>
                    <Input type="number" name="estimated_cleanup_cost" placeholder="0.00" step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated_closing_cost">Closing Cost</Label>
                    <Input type="number" name="estimated_closing_cost" placeholder="0.00" step="0.01" />
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
                    <Label htmlFor="property_type">Property Type</Label>
                    <Select name="property_type" defaultValue="unknown">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_family">Single Family</SelectItem>
                        <SelectItem value="condo">Condo/Townhome</SelectItem>
                        <SelectItem value="multifamily">Multifamily</SelectItem>
                        <SelectItem value="vacant_land">Vacant Land</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="mobile_home">Mobile Home</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupancy_status">Occupancy</Label>
                    <Select name="occupancy_status" defaultValue="unknown">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner_occupied">Owner Occupied</SelectItem>
                        <SelectItem value="tenant">Tenant Occupied</SelectItem>
                        <SelectItem value="vacant">Vacant</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zoning">Zoning</Label>
                  <Input name="zoning" placeholder="e.g., R-1 Residential" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lot_size_sqft">Lot Size (sqft)</Label>
                    <Input type="number" name="lot_size_sqft" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="building_sqft">Building SqFt</Label>
                    <Input type="number" name="building_sqft" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year_built">Year Built</Label>
                    <Input type="number" name="year_built" placeholder="e.g., 1990" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property_address">Property Address</Label>
                  <Input name="property_address" placeholder="Full street address" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal_description">Legal Description</Label>
                  <Textarea name="legal_description" placeholder="Legal description from county records" />
                </div>
              </CardContent>
            </Card>

            {/* Owner Info */}
            <Card>
              <CardHeader>
                <CardTitle>Owner Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="owner_name">Owner Name</Label>
                  <Input name="owner_name" placeholder="Property owner name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_mailing_address">Mailing Address</Label>
                  <Textarea name="owner_mailing_address" placeholder="Owner's mailing address" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Access Risk</Label>
                  <Select name="access_risk" defaultValue="unknown">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title Risk</Label>
                  <Select name="title_risk" defaultValue="unknown">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Legal Risk</Label>
                  <Select name="legal_risk" defaultValue="unknown">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Marketability Risk</Label>
                  <Select name="marketability_risk" defaultValue="unknown">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea name="notes" placeholder="Any additional notes about this property..." className="min-h-[120px]" />
              </CardContent>
            </Card>

            {/* Submit */}
            <Card>
              <CardContent className="pt-6">
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Property'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
