import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/auctions - List all auctions
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user (optional - auctions are public)
    const session = await getServerSession(authOptions);

    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const county = searchParams.get('county');
    const format = searchParams.get('format');
    const upcoming = searchParams.get('upcoming');

    // Build where clause
    const where: any = {};

    if (state) {
      where.state = state;
    }

    if (county) {
      where.county = county;
    }

    if (format) {
      where.format = format;
    }

    if (upcoming === 'true') {
      where.auction_date = {
        gte: new Date()
      };
    }

    const auctions = await prisma.auction.findMany({
      where,
      orderBy: {
        auction_date: 'asc'
      }
    });

    return NextResponse.json(auctions);
  } catch (error) {
    console.error('Error fetching auctions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auctions' },
      { status: 500 }
    );
  }
}

// POST /api/auctions - Create new auction (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['county', 'state', 'auction_date', 'format', 'property_count'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate format
    if (!['online', 'in-person'].includes(body.format)) {
      return NextResponse.json(
        { error: 'Format must be "online" or "in-person"' },
        { status: 400 }
      );
    }

    const auction = await prisma.auction.create({
      data: {
        county: body.county,
        state: body.state,
        auction_date: new Date(body.auction_date),
        format: body.format,
        property_count: parseInt(body.property_count, 10),
        url: body.url || null,
        notes: body.notes || null
      }
    });

    return NextResponse.json(auction, { status: 201 });
  } catch (error) {
    console.error('Error creating auction:', error);
    return NextResponse.json(
      { error: 'Failed to create auction' },
      { status: 500 }
    );
  }
}
