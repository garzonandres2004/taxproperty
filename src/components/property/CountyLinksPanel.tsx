'use client'

import { ExternalLink, UserSearch, FileText, FolderOpen, Scale, Map, Building } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { generateAllCountyLinks, CountyLinks, COUNTY_LINK_METADATA } from '@/lib/utah-county-links'

interface CountyLinksPanelProps {
  ownerName?: string | null
  parcelNumber: string
}

// Icon mapping
const iconMap = {
  UserSearch,
  FileText,
  FolderOpen,
  Scale,
  Map,
  Building
}

interface LinkButtonProps {
  href: string | null
  label: string
  description: string
  iconName: keyof typeof iconMap
  disabled?: boolean
  disabledReason?: string
}

function LinkButton({ href, label, description, iconName, disabled, disabledReason }: LinkButtonProps) {
  const Icon = iconMap[iconName]

  if (disabled || !href) {
    return (
      <div
        className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 opacity-60"
        title={disabledReason || 'Link unavailable'}
      >
        <div className="p-2 bg-slate-200 rounded-md">
          <Icon size={18} className="text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-slate-500">{label}</div>
          <div className="text-xs text-slate-400">{disabledReason || description}</div>
        </div>
      </div>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors group"
    >
      <div className="p-2 bg-blue-100 rounded-md group-hover:bg-blue-200 transition-colors">
        <Icon size={18} className="text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-slate-700 group-hover:text-blue-700">{label}</span>
          <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-500" />
        </div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
    </a>
  )
}

export function CountyLinksPanel({ ownerName, parcelNumber }: CountyLinksPanelProps) {
  const links: CountyLinks = generateAllCountyLinks(parcelNumber, ownerName)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building size={18} className="text-blue-600" />
          County Resources
        </CardTitle>
        <CardDescription>
          Direct links to Utah County research tools
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Owner Search - disabled if no owner name */}
          <LinkButton
            href={links.ownerSearch}
            label={COUNTY_LINK_METADATA.ownerSearch.label}
            description={COUNTY_LINK_METADATA.ownerSearch.description}
            iconName="UserSearch"
            disabled={!ownerName}
            disabledReason="Owner name required"
          />

          {/* Parcel Records */}
          <LinkButton
            href={links.parcelLookup}
            label={COUNTY_LINK_METADATA.parcelLookup.label}
            description={COUNTY_LINK_METADATA.parcelLookup.description}
            iconName="FileText"
          />

          {/* Document Index */}
          <LinkButton
            href={links.documentIndex}
            label={COUNTY_LINK_METADATA.documentIndex.label}
            description={COUNTY_LINK_METADATA.documentIndex.description}
            iconName="FolderOpen"
          />

          {/* Court Records */}
          <LinkButton
            href={links.courtRecords}
            label={COUNTY_LINK_METADATA.courtRecords.label}
            description={COUNTY_LINK_METADATA.courtRecords.description}
            iconName="Scale"
          />

          {/* GIS Map */}
          <LinkButton
            href={links.gisMap}
            label={COUNTY_LINK_METADATA.gisMap.label}
            description={COUNTY_LINK_METADATA.gisMap.description}
            iconName="Map"
          />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <a
            href={links.recordersOffice}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            Visit Utah County Recorder's Office website
            <ExternalLink size={12} />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

export default CountyLinksPanel
