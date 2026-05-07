// Per-county official source links.
// Each county entry has:
//   - static URLs: base URLs to county offices
//   - parcelUrl(parcelNumber): property-specific search URL when available
// These appear in the property table (mini link icons) and memo page.

export interface CountyLinks {
  assessor?: string
  assessorParcel?: string    // parcel-specific assessor lookup
  treasurer?: string
  treasurerParcel?: string
  recorder?: string
  recorderParcel?: string
  gis?: string
  gisParcel?: string
  taxSale?: string
  eagleweb?: string
}

type ParcelLinker = (parcel: string) => CountyLinks

const LINKERS: Record<string, ParcelLinker> = {

  utah: (p) => {
    const serial = p.replace(/[^0-9]/g, '')
    return {
      assessor: 'https://www.utahcounty.gov/dept/Assessor/',
      assessorParcel: `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${serial}`,
      treasurer: 'https://www.utahcounty.gov/dept/auditor/',
      recorder: `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${serial}`,
      gis: 'https://maps.utahcounty.gov/ParcelMap/ParcelMap.html',
      gisParcel: `https://maps.utahcounty.gov/ParcelMap/ParcelMap?parcel=${encodeURIComponent(p)}`,
      taxSale: 'https://auditor.utahcounty.gov/may-tax-sale/',
    }
  },

  salt_lake: (p) => ({
    assessor: 'https://slco.org/assessor/',
    assessorParcel: `https://slco.org/assessor/new/searches/parcelNumber.cfm?parcelNumber=${encodeURIComponent(p)}`,
    treasurer: 'https://tax.slco.org/',
    recorder: 'https://recorder.slco.org/',
    recorderParcel: `https://recorder.slco.org/index.cfm/parcel/${encodeURIComponent(p)}`,
    gis: 'https://maps.slco.org/',
    taxSale: 'https://slco.org/auditor/tax-sale/',
  }),

  davis: (p) => ({
    assessor: 'https://www.daviscountyutah.gov/assessor',
    assessorParcel: `https://www.daviscountyutah.gov/assessor/property-search?parcelNumber=${encodeURIComponent(p)}`,
    treasurer: 'https://www.daviscountyutah.gov/treasurer',
    recorder: 'https://www.daviscountyutah.gov/recorder',
    gis: 'https://gis.daviscountyutah.gov/',
    taxSale: 'https://www.daviscountyutah.gov/auditor/tax-sale',
  }),

  weber: (p) => ({
    assessor: 'https://www.webercountyutah.gov/Assessor/',
    assessorParcel: `https://www.webercountyutah.gov/Assessor/ParcelSearch/?parcelNumber=${encodeURIComponent(p)}`,
    treasurer: 'https://www.webercountyutah.gov/Treasurer/',
    recorder: 'https://www.webercountyutah.gov/Recorder/',
    gis: 'https://www.webercountyutah.gov/gis/',
    taxSale: 'https://www.webercountyutah.gov/Auditor/TaxSale/',
  }),

  box_elder: (p) => ({
    assessor: 'https://www.boxeldercounty.org/assessor/',
    assessorParcel: `https://www.arcgis.com/apps/webappviewer/index.html?id=1ff5Hi3`,
    recorder: 'https://www.boxeldercounty.org/recorder/',
    gis: 'https://arcg.is/1ff5Hi3',
    gisParcel: `https://www.arcgis.com/apps/webappviewer/index.html?id=1ff5Hi3`,
    taxSale: 'https://www.publicsurplus.com/sms/all,ut/list/current?orgid=59749',
  }),

  iron: (p) => ({
    assessor: 'https://ironcounty.utah.gov/departments/assessor/',
    assessorParcel: `https://eagleweb.ironcounty.utah.gov/eaglesoftware/web/login.jsp`,
    recorder: 'https://ironcounty.utah.gov/departments/recorder/',
    gis: 'https://ironcountygis.maps.arcgis.com/apps/webappviewer/',
    gisParcel: `https://services.arcgis.com/xGNWaeXY0POVazgT/arcgis/rest/services/Parcels_Public/FeatureServer/0/query?where=SERIAL%3D'${encodeURIComponent(p)}'&outFields=*&f=json`,
    taxSale: 'https://www.publicsurplus.com/sms/all,ut/list/current',
  }),

  washington: (p) => ({
    assessor: 'https://www.washco.utah.gov/departments/assessor/',
    eagleweb: `https://eagleweb.washco.utah.gov/eaglesoftware/web/login.jsp`,
    assessorParcel: `https://eagleweb.washco.utah.gov/eaglesoftware/web/login.jsp`,
    recorder: 'https://www.washco.utah.gov/departments/recorder/',
    gis: 'https://gis.washco.utah.gov/',
    taxSale: 'https://www.washco.utah.gov/departments/auditor/tax-sale/',
  }),

  tooele: (p) => ({
    assessor: 'https://www.tooelecounty.net/174/Assessor',
    recorder: 'https://www.tooelecounty.net/175/Recorder',
    treasurer: 'https://www.tooelecounty.net/176/Treasurer',
    gis: 'https://gis.tooelecounty.net/',
    taxSale: 'https://www.publicsurplus.com/sms/all,ut/list/current',
  }),

  wasatch: (p) => ({
    assessor: 'https://wasatch.utah.gov/assessor/',
    assessorParcel: `https://maps.wasatch.utah.gov/arcgis/rest/services/MapLayers/Web_Map_Parcels/MapServer/20/query?where=TaxParcel%3D'${encodeURIComponent(p)}'&outFields=*&f=json`,
    recorder: 'https://wasatch.utah.gov/recorder/',
    gis: 'https://maps.wasatch.utah.gov/',
    gisParcel: `https://maps.wasatch.utah.gov/`,
    taxSale: 'https://www.publicsurplus.com/sms/all,ut/list/current',
  }),

  sanpete: (p) => ({
    assessor: 'https://sanpetecounty.net/assessor/',
    recorder: 'https://sanpetecounty.net/recorder/',
    taxSale: 'https://www.publicsurplus.com/sms/sanpeteco,ut/list/current',
  }),

  duchesne: (p) => ({
    assessor: 'https://www.duchesnecounty.org/government/assessor/',
    recorder: 'https://www.duchesnecounty.org/government/recorder/',
    taxSale: 'https://www.duchesnecounty.org/government/auditor/',
  }),

  juab: (p) => ({
    assessor: 'https://www.juabcounty.com/assessor',
    recorder: 'https://www.juabcounty.com/recorder',
    eagleweb: `https://eagleweb.juabcounty.com/eaglesoftware/web/login.jsp`,
    assessorParcel: `https://eagleweb.juabcounty.com/eaglesoftware/web/login.jsp`,
    taxSale: 'https://www.publicsurplus.com/sms/all,ut/list/current',
  }),

  beaver: (p) => ({
    assessor: 'https://beaver.utah.gov/assessor/',
    recorder: 'https://beaver.utah.gov/recorder/',
    eagleweb: `https://eagleweb.beaver.utah.gov/eaglesoftware/web/login.jsp`,
    assessorParcel: `https://eagleweb.beaver.utah.gov/eaglesoftware/web/login.jsp`,
    taxSale: 'https://www.publicsurplus.com/sms/all,ut/list/current',
  }),

  sevier: (p) => ({
    assessor: 'https://seviercounty.net/assessor/',
    recorder: 'https://seviercounty.net/recorder/',
    eagleweb: `https://eagleweb.seviercounty.net/eaglesoftware/web/login.jsp`,
    assessorParcel: `https://eagleweb.seviercounty.net/eaglesoftware/web/login.jsp`,
    taxSale: 'https://www.publicsurplus.com/sms/all,ut/list/current',
  }),

  rich: (p) => ({
    assessor: 'https://richcountyut.gov/assessor/',
    recorder: 'https://richcountyut.gov/recorder/',
    taxSale: 'https://richcountyut.gov/auditor/',
  }),

  cache: (_p) => ({
    assessor: 'https://www.cachecounty.gov/assessor/',
    recorder: 'https://www.cachecounty.gov/recorder/',
    taxSale: 'https://www.cachecounty.gov/auditor/',
  }),

  summit: (_p) => ({
    assessor: 'https://www.summitcounty.org/assessor/',
    recorder: 'https://www.summitcounty.org/recorder/',
    taxSale: 'https://www.summitcounty.org/auditor/',
  }),
}

export function getCountyLinks(county: string, parcelNumber: string): CountyLinks {
  const linker = LINKERS[county]
  if (!linker) return {}
  return linker(parcelNumber)
}

// Returns ordered list of [label, url] pairs for display
export function getCountyLinkList(county: string, parcelNumber: string): Array<{ label: string; url: string; primary: boolean }> {
  const links = getCountyLinks(county, parcelNumber)
  const out: Array<{ label: string; url: string; primary: boolean }> = []

  if (links.assessorParcel) out.push({ label: 'Assessor', url: links.assessorParcel, primary: true })
  else if (links.assessor) out.push({ label: 'Assessor', url: links.assessor, primary: true })

  if (links.eagleweb) out.push({ label: 'EagleWeb', url: links.eagleweb, primary: true })

  if (links.recorderParcel) out.push({ label: 'Recorder', url: links.recorderParcel, primary: false })
  else if (links.recorder) out.push({ label: 'Recorder', url: links.recorder, primary: false })

  if (links.treasurerParcel) out.push({ label: 'Tax', url: links.treasurerParcel, primary: false })
  else if (links.treasurer) out.push({ label: 'Tax', url: links.treasurer, primary: false })

  if (links.gisParcel) out.push({ label: 'GIS', url: links.gisParcel, primary: false })
  else if (links.gis) out.push({ label: 'GIS', url: links.gis, primary: false })

  if (links.taxSale) out.push({ label: 'Tax Sale', url: links.taxSale, primary: false })

  return out
}
