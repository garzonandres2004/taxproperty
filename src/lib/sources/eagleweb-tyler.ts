// Generic Tyler Technologies EagleWeb parcel lookup.
// Public guest session — no credentials needed.
// Session cookie is cached per baseUrl to avoid repeated logins.
//
// Usage:
//   const detail = await fetchEagleWebDetail('https://juabcountyut-recorder.tylerhost.net/recorder', '0071261')

const sessionCache: Map<string, string> = new Map()

export interface EagleWebDetail {
  account_number: string
  parcel_number: string | null
  owner_name: string | null
  mailing_address: string | null
  situs_address: string | null
  legal_description: string | null
  acres: number | null
  market_value: number | null
  taxes_owed: number | null
}

async function login(baseUrl: string): Promise<string> {
  const resp = await fetch(`${baseUrl}/web/loginPOST.jsp?submit=Public+Login&guest=true`, {
    redirect: 'manual',
  })
  const raw = resp.headers.get('set-cookie') ?? ''
  const cookies = raw.split(/,\s*(?=[A-Za-z_]+=)/)
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
  const cookieStr = cookies.join('; ') || 'isLoggedInAsPublic=true'
  sessionCache.set(baseUrl, cookieStr)
  return cookieStr
}

async function getSession(baseUrl: string): Promise<string> {
  return sessionCache.get(baseUrl) ?? await login(baseUrl)
}

export async function fetchEagleWebDetail(
  baseUrl: string,
  accountNum: string
): Promise<EagleWebDetail | null> {
  let cookies = await getSession(baseUrl)

  let html = await getAccountHtml(baseUrl, accountNum, cookies)
  if (!html) {
    // Session expired — re-login once
    sessionCache.delete(baseUrl)
    cookies = await login(baseUrl)
    html = await getAccountHtml(baseUrl, accountNum, cookies)
    if (!html) return null
  }

  return parseAccountHtml(html, accountNum)
}

async function getAccountHtml(baseUrl: string, accountNum: string, cookies: string): Promise<string | null> {
  const resp = await fetch(`${baseUrl}/taxweb/account.jsp?accountNum=${accountNum}`, {
    headers: { Cookie: cookies },
  })
  if (!resp.ok) return null
  const buf = await resp.arrayBuffer()
  const html = new TextDecoder('latin1').decode(buf)
  return html.length > 500 ? html : null
}

function parseAccountHtml(html: string, accountNum: string): EagleWebDetail {
  const rows: string[][] = []
  const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gi
  let rowMatch: RegExpExecArray | null
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cells: string[] = []
    const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gi
    let cellMatch: RegExpExecArray | null
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      const text = cellMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (text) cells.push(text)
    }
    if (cells.length) rows.push(cells)
  }

  const flat = rows.map(r => r.join(' '))
  let parcel_number: string | null = null
  let owner_name: string | null = null
  let mailing_address: string | null = null
  let situs_address: string | null = null
  let legal_description: string | null = null
  let acres: number | null = null
  let market_value: number | null = null
  let taxes_owed: number | null = null
  let found_owner = false

  for (const line of flat) {
    if (/^Parcel Number\s+/.test(line)) {
      parcel_number = line.replace(/^Parcel Number\s+/, '').replace(/-$/, '').trim() || null
    } else if (/^Name\s+\S/.test(line)) {
      owner_name = line.replace(/^Name\s+/, '').replace(/,\s*$/, '').trim()
      found_owner = true
    } else if (found_owner && !mailing_address && line.length > 5 &&
               !/^(Account|Parcel|Tax|Market|Legal|Acres|Situs|Parent|Child|Sibling|Type|Name|Transfer|FAA|Summary)/.test(line)) {
      mailing_address = line.trim()
      found_owner = false
    } else if (/^Market\s*\(/.test(line)) {
      const mv = line.match(/\$([0-9,]+)/)
      if (mv) market_value = parseInt(mv[1].replace(/,/g, ''), 10)
    } else if (/^Situs\s+/.test(line)) {
      const s = line.replace(/^Situs\s+/, '').trim()
      if (s && s !== '0, 0' && !/^0,\s*0/.test(s)) situs_address = s
    } else if (/^Legal\s+/.test(line) && !legal_description) {
      legal_description = line.replace(/^Legal\s+/, '').trim() || null
    } else if (/^Acres\s+/.test(line)) {
      const av = parseFloat(line.replace(/^Acres\s+/, '').trim())
      if (!isNaN(av)) acres = av
    } else if (/^\*?\d{4}\s+\$/.test(line) && !taxes_owed) {
      const tv = line.match(/\$([0-9,.]+)/)
      if (tv) taxes_owed = parseFloat(tv[1].replace(/,/g, ''))
    }
  }

  return { account_number: accountNum, parcel_number, owner_name, mailing_address, situs_address, legal_description, acres, market_value, taxes_owed }
}
