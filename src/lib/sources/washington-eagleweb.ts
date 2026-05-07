// Washington County EagleWeb (Tyler Technologies) assessor lookup.
// Public session — no credentials needed. Login establishes a guest session cookie.
// Parcel ID search → account detail page → owner name, mailing address,
// market value (2025), latest taxes, legal description, acres.
// Session is cached for the lifetime of the process; auto-refreshed on failure.

const BASE = 'https://eweb.washco.utah.gov:8443/recorder'

// Session is a single cookie: isLoggedInAsPublic=true + JSESSIONID.
// We track cookies manually since Node.js fetch doesn't support CookieJar.
let cachedCookieHeader: string | null = null

async function login(): Promise<string> {
  // The login URL returns a 302 with Set-Cookie on the redirect response.
  // Must use redirect:'manual' to capture the cookie before following.
  const resp = await fetch(`${BASE}/web/loginPOST.jsp?submit=Public+Login&guest=true`, {
    redirect: 'manual',
  })
  const raw = resp.headers.get('set-cookie') ?? ''
  const cookies = raw.split(/,\s*(?=[A-Za-z_]+=)/)
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
  const cookieStr = cookies.join('; ')
  cachedCookieHeader = cookieStr || 'isLoggedInAsPublic=true'
  return cachedCookieHeader
}

async function getCookies(): Promise<string> {
  if (!cachedCookieHeader) {
    return await login()
  }
  return cachedCookieHeader
}

export interface WashingtonParcelDetail {
  account_number: string | null
  owner_name: string | null
  mailing_address: string | null
  situs_address: string | null
  legal_description: string | null
  acres: number | null
  market_value: number | null
  taxes_owed: number | null
}

export async function fetchWashingtonParcelDetail(parcelId: string): Promise<WashingtonParcelDetail | null> {
  let cookies = await getCookies()

  // Step 1: parcel number search → extract account number
  const accountNum = await searchForAccount(parcelId, cookies)
  if (!accountNum) {
    // Session may have expired — try re-login once
    cachedCookieHeader = null
    cookies = await getCookies()
    const retried = await searchForAccount(parcelId, cookies)
    if (!retried) return null
    return await fetchAccountDetail(retried, cookies)
  }
  return await fetchAccountDetail(accountNum, cookies)
}

async function searchForAccount(parcelId: string, cookies: string): Promise<string | null> {
  const body = new URLSearchParams({ ParcelNumID: parcelId })
  const resp = await fetch(`${BASE}/taxweb/results.jsp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies,
    },
    body: body.toString(),
  })
  if (!resp.ok) return null
  const html = await resp.text()
  const m = html.match(/account\.jsp\?accountNum=(\d+)/)
  return m ? m[1] : null
}

async function fetchAccountDetail(accountNum: string, cookies: string): Promise<WashingtonParcelDetail | null> {
  const resp = await fetch(`${BASE}/taxweb/account.jsp?accountNum=${accountNum}`, {
    headers: { Cookie: cookies },
  })
  if (!resp.ok || resp.status === 0) return null
  const buf = await resp.arrayBuffer()
  const html = new TextDecoder('latin1').decode(buf)
  if (html.length < 100) return null

  return parseAccountHtml(html, accountNum)
}

function parseAccountHtml(html: string, accountNum: string): WashingtonParcelDetail {
  // Extract all table rows as flat cell arrays
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
  let owner_name: string | null = null
  let mailing_address: string | null = null
  let situs_address: string | null = null
  let legal_description: string | null = null
  let acres: number | null = null
  let market_value: number | null = null
  let taxes_owed: number | null = null
  let found_owner_row = false

  for (let i = 0; i < flat.length; i++) {
    const line = flat[i]
    if (/^Name\s+\S/.test(line)) {
      owner_name = line.replace(/^Name\s+/, '').trim()
      found_owner_row = true
    } else if (found_owner_row && !mailing_address && line.length > 5 &&
               !/^(Account|Parcel|Tax|Market|Legal|Acres|Situs|Parent|Child|Sibling|Type|Name|Transfer|Summary)/.test(line)) {
      mailing_address = line.trim()
      found_owner_row = false
    } else if (/^Market\s*\(/.test(line)) {
      const mv = line.match(/\$([0-9,]+)/)
      if (mv) market_value = parseInt(mv[1].replace(/,/g, ''), 10)
    } else if (/^Situs\s+/.test(line)) {
      const s = line.replace(/^Situs\s+/, '').trim()
      if (s && s !== '0, 0') situs_address = s
    } else if (/^Legal\s+/.test(line) && !legal_description) {
      legal_description = line.replace(/^Legal\s+/, '').trim() || null
    } else if (/^Acres\s+/.test(line)) {
      const av = parseFloat(line.replace(/^Acres\s+/, '').trim())
      if (!isNaN(av)) acres = av
    } else if (/^\d{4}\s+\$/.test(line) && !taxes_owed) {
      const tv = line.match(/\$([0-9,.]+)/)
      if (tv) taxes_owed = parseFloat(tv[1].replace(/,/g, ''))
    }
  }

  return {
    account_number: accountNum,
    owner_name,
    mailing_address,
    situs_address,
    legal_description,
    acres,
    market_value,
    taxes_owed,
  }
}
