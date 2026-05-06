'use client'

import { ExternalLink, UserSearch, FileText, FolderOpen, Scale, Map, Building, CreditCard, Gavel } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { makeExternalLinksWithAdapter } from '@/lib/counties'
import type { CountyLinks } from '@/lib/counties/types'
import { generateOwnerSearchUrl } from '@/lib/utah-county-links'

interface CountyLinksPanelProps {
  county: string
  parcelNumber: string
  ownerName?: string | null
  address?: string | null
}

type LinkDef = {
  href: string
  label: string
  description: string
  Icon: React.ComponentType<{ size?: number; className?: string }>
}

// Ordered map from CountyLinks keys to display config
const LINK_DISPLAY: Array<{
  key: keyof CountyLinks
  label: string
  description: string
  Icon: React.ComponentType<{ size?: number; className?: string }>
}> = [
  { key: 'recorderUrl',   label: 'Recorder / Land Records', description: 'Search recorded deeds and documents',               Icon: FileText   },
  { key: 'medicilandUrl', label: 'Mediciland Parcel Search', description: 'Search property records (Google Auth required)',     Icon: FolderOpen },
  { key: 'assessorUrl',   label: 'Assessor',                 description: 'Property valuations and assessments',               Icon: Building   },
  { key: 'taxHistoryUrl', label: 'Tax / Auditor',            description: 'Tax history and auditor records',                   Icon: CreditCard },
  { key: 'auditorUrl',    label: 'Auditor',                  description: 'County auditor and tax records',                    Icon: CreditCard },
  { key: 'treasurerUrl',  label: 'Treasurer',                description: 'Tax payment and treasurer records',                 Icon: CreditCard },
  { key: 'auctionInfoUrl',label: 'Tax Sale Info',            description: 'Current tax sale information and procedures',       Icon: Gavel      },
  { key: 'parcelMapUrl',  label: 'Parcel Map',               description: 'GIS parcel viewer with boundaries',                 Icon: Map        },
  { key: 'planningUrl',   label: 'Planning / Zoning',        description: 'Zoning and planning department',                    Icon: Scale      },
]

function LinkButton({ href, label, description, Icon }: LinkDef) {
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

function DisabledLinkButton({ label, description, Icon }: Omit<LinkDef, 'href'>) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 opacity-60"
      title="Link unavailable"
    >
      <div className="p-2 bg-slate-200 rounded-md">
        <Icon size={18} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-slate-500">{label}</div>
        <div className="text-xs text-slate-400">{description}</div>
      </div>
    </div>
  )
}

export function CountyLinksPanel({ county, parcelNumber, ownerName, address }: CountyLinksPanelProps) {
  const links = makeExternalLinksWithAdapter(county, parcelNumber, address || '', null)

  // Build ordered list of links to display (skip streetViewUrl — that's for the map panel)
  const visibleLinks: LinkDef[] = []

  // Utah-only: owner search by name (before the standard recorder link)
  if (county === 'utah' && ownerName) {
    visibleLinks.push({
      href: generateOwnerSearchUrl(ownerName),
      label: 'Deed Search by Owner',
      description: 'Search property records by owner name',
      Icon: UserSearch,
    })
  }

  for (const def of LINK_DISPLAY) {
    const href = links[def.key]
    if (href) {
      visibleLinks.push({ href, label: def.label, description: def.description, Icon: def.Icon })
    }
  }

  const countyName = county.charAt(0).toUpperCase() + county.slice(1).replace(/_/g, ' ')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building size={18} className="text-blue-600" />
          County Resources
        </CardTitle>
        <CardDescription>
          Direct links to {countyName} County research tools
        </CardDescription>
      </CardHeader>
      <CardContent>
        {visibleLinks.length > 0 ? (
          <div className="space-y-3">
            {visibleLinks.map((link) => (
              <LinkButton key={link.href} {...link} />
            ))}
          </div>
        ) : (
          <DisabledLinkButton
            label="Research links unavailable"
            description="No automated links configured for this county"
            Icon={Building}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default CountyLinksPanel
