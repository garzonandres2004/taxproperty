import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAuctions() {
  try {
    // Check if Utah County auction already exists
    const existing = await prisma.auction.findFirst({
      where: {
        county: 'Utah County',
        state: 'Utah',
      },
    });

    if (existing) {
      console.log('Utah County auction already exists');
      return;
    }

    // Create Utah County May 2026 Tax Sale
    const auction = await prisma.auction.create({
      data: {
        county: 'Utah County',
        state: 'Utah',
        auction_date: new Date('2026-05-21'),
        format: 'Online',
        property_count: 127,
        url: 'https://www.utahcounty.gov/Dept/ClerkAud/TaxSaleInfo.html',
        notes: 'Annual tax deed sale. Registration required 48 hours before auction.',
      },
    });

    console.log('Created auction:', auction);

    // Also create a future monthly OTC auction
    const otcAuction = await prisma.auction.create({
      data: {
        county: 'Utah County',
        state: 'Utah',
        auction_date: new Date('2026-06-15'),
        format: 'OTC (Over The Counter)',
        property_count: 15,
        url: 'https://www.utahcounty.gov/Dept/ClerkAud/TaxSaleInfo.html',
        notes: 'Monthly OTC sale for unsold properties.',
      },
    });

    console.log('Created OTC auction:', otcAuction);

  } catch (error) {
    console.error('Error seeding auctions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAuctions();
