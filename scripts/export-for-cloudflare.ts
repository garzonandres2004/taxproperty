#!/usr/bin/env tsx
/**
 * Export all properties from SQLite to static JSON for Cloudflare Pages deployment
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportData() {
  console.log('📦 Exporting properties for Cloudflare deployment...\n');

  try {
    // Fetch all properties with their relations
    const properties = await prisma.property.findMany({
      where: {
        is_seed: false, // Only real properties
      },
      include: {
        zoningProfile: true,
        sources: true,
        outcomes: true,
        adjacent_parcels: true,
      },
      orderBy: {
        final_score: 'desc',
      },
    });

    console.log(`✅ Found ${properties.length} properties`);

    // Create output directory
    const outputDir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Export all properties
    const outputPath = path.join(outputDir, 'properties.json');
    fs.writeFileSync(
      outputPath,
      JSON.stringify(properties, null, 2)
    );

    console.log(`✅ Exported to ${outputPath}`);

    // Also export stats
    const stats = {
      total: properties.length,
      bid: properties.filter(p => p.recommendation === 'bid').length,
      research: properties.filter(p => p.recommendation === 'research_more').length,
      avoid: properties.filter(p => p.recommendation === 'avoid').length,
      withImages: properties.filter(p => p.photo_url).length,
      avgScore: properties.reduce((acc, p) => acc + (p.final_score || 0), 0) / properties.length,
      saleDate: '2026-05-21',
      county: 'utah',
      exportedAt: new Date().toISOString(),
    };

    const statsPath = path.join(outputDir, 'stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));

    console.log(`✅ Stats exported to ${statsPath}`);
    console.log('\n📊 Export Summary:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   BID: ${stats.bid}`);
    console.log(`   RESEARCH: ${stats.research}`);
    console.log(`   AVOID: ${stats.avoid}`);
    console.log(`   With Images: ${stats.withImages}`);

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
