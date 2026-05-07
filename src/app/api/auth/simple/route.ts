import { NextResponse } from 'next/server'

// Accept multiple passwords for flexibility
const PASSWORDS = [
  process.env.DEMO_PASSWORD,
  'taxdemo2026',
  'taxdemo2025'
].filter(Boolean)

const COOKIE_NAME = 'taxproperty-auth'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      )
    }

    // Check against any valid password
    if (!PASSWORDS.includes(password)) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Set auth cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set(COOKIE_NAME, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  // Logout
  const response = NextResponse.json({ success: true })
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0
  })
  return response
}
