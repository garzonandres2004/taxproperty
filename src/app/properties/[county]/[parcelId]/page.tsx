import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'

interface Props {
  params: Promise<{
    county: string
    parcelId: string
  }>
}

export default async function PropertyRedirectPage({ params }: Props) {
  const { county, parcelId } = await params

  // Verify the property exists
  const property = await prisma.property.findFirst({
    where: {
      county: county.toLowerCase(),
      parcel_number: parcelId
    },
    select: { id: true }
  })

  if (!property) {
    notFound()
  }

  // Redirect to memo page
  redirect(`/memo/${county}/${parcelId}`)
}
