#!/usr/bin/env ts-node
/**
 * V2 Scoring Audit Script
 * Analyzes distribution and quality of scored properties
 * Run: npx ts-node scripts/audit-v2-scores.ts
 */

const { prisma } = require('../src/lib/db');

async function auditV2Scores() {
  console.log('🔍 V2 SCORING AUDIT REPORT');
  console.log('='.repeat(70));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('');

  // 1. Basic stats
  const totalProps = await prisma.property.count({
    where: { is_seed: false }
  });

  const scoredProps = await prisma.property.count({
    where: {
      is_seed: false,
      investability_score: { not: null }
    }
  });

  console.log(`📊 DATASET OVERVIEW`);
  console.log(`  Total Properties: ${totalProps}`);
  console.log(`  V2 Scored: ${scoredProps} (${((scoredProps/totalProps)*100).toFixed(1)}%)`);
  console.log('');

  if (scoredProps === 0) {
    console.log('❌ No V2 scored properties found. Run scoring first.');
    await prisma.$disconnect();
    return;
  }

  // 2. Distribution by recommendation bucket
  const byRecommendation = await prisma.$queryRaw`
    SELECT
      recommendation_bucket,
      COUNT(*) as count,
      AVG(investability_score) as avg_invest,
      AVG(title_score_v2) as avg_title,
      AVG(confidence_score_v2) as avg_conf
    FROM Property
    WHERE is_seed = false AND investability_score IS NOT NULL
    GROUP BY recommendation_bucket
    ORDER BY count DESC
  `;

  console.log(`📈 DISTRIBUTION BY RECOMMENDATION BUCKET`);
  console.log('-'.repeat(70));
  console.log(`${'Bucket'.padEnd(20)} | ${'Count'.padEnd(8)} | ${'%'.padEnd(6)} | ${'Avg Invest'.padEnd(12)} | ${'Avg Title'.padEnd(12)} | ${'Avg Conf'.padEnd(12)}`);
  console.log('-'.repeat(70));

  const bucketRows = byRecommendation as any[];
  bucketRows.forEach((data: any) => {
    const count = Number(data.count);
    const pct = ((count / scoredProps) * 100).toFixed(1);
    console.log(
      `${(data.recommendation_bucket || 'N/A').padEnd(20)} | ${count.toString().padEnd(8)} | ${pct.padEnd(6)} | ` +
      `${Number(data.avg_invest).toFixed(1).padEnd(12)} | ` +
      `${Number(data.avg_title).toFixed(1).padEnd(12)} | ` +
      `${Number(data.avg_conf).toFixed(1).padEnd(12)}`
    );
  });
  console.log('');

  // 3. Distribution by investability ranges
  console.log(`📊 DISTRIBUTION BY INVESTABILITY SCORE RANGES`);
  console.log('-'.repeat(70));

  const ranges = [
    { name: '0-20 (Avoid)', min: 0, max: 20 },
    { name: '21-40 (Caution)', min: 21, max: 40 },
    { name: '41-60 (Neutral)', min: 41, max: 60 },
    { name: '61-80 (Good)', min: 61, max: 80 },
    { name: '81-100 (Excellent)', min: 81, max: 100 }
  ];

  for (const range of ranges) {
    const count = await prisma.property.count({
      where: {
        is_seed: false,
        investability_score: {
          gte: range.min,
          lte: range.max
        }
      }
    });
    const pct = scoredProps > 0 ? ((count / scoredProps) * 100).toFixed(1) : '0.0';
    const bar = '█'.repeat(Math.round(Number(pct) / 2));
    console.log(`${range.name.padEnd(20)} | ${count.toString().padEnd(5)} (${pct}%) ${bar}`);
  }
  console.log('');

  // 4. Top 15 properties
  console.log(`🏆 TOP 15 PROPERTIES (Investability Score)`);
  console.log('-'.repeat(70));
  const top15 = await prisma.property.findMany({
    where: {
      is_seed: false,
      investability_score: { not: null }
    },
    orderBy: { investability_score: 'desc' },
    take: 15,
    select: {
      id: true,
      parcel_number: true,
      county: true,
      investability_score: true,
      title_score_v2: true,
      confidence_score_v2: true,
      recommendation_bucket: true,
      estimated_market_value: true,
      total_amount_due: true
    }
  });

  console.log(`${'Rank'.padEnd(5)} | ${'Parcel'.padEnd(15)} | ${'County'.padEnd(10)} | ${'Invest'.padEnd(8)} | ${'Title'.padEnd(8)} | ${'Conf'.padEnd(8)} | ${'Bucket'.padEnd(20)} | ${'Equity %'.padEnd(10)}`);
  console.log('-'.repeat(70));

  top15.forEach((p: any, i: number) => {
    const equity = p.estimated_market_value && p.total_amount_due
      ? (((p.estimated_market_value - p.total_amount_due) / p.estimated_market_value) * 100).toFixed(0)
      : 'N/A';
    console.log(
      `${(i + 1).toString().padEnd(5)} | ${p.parcel_number.substring(0, 15).padEnd(15)} | ${p.county.substring(0,10).padEnd(10)} | ` +
      `${(p.investability_score || 0).toFixed(1).padEnd(8)} | ${(p.title_score_v2 || 0).toFixed(1).padEnd(8)} | ` +
      `${(p.confidence_score_v2 || 0).toFixed(1).padEnd(8)} | ${(p.recommendation_bucket || 'N/A').padEnd(20)} | ${equity.padEnd(10)}`
    );
  });
  console.log('');

  // 5. Bottom 15 properties
  console.log(`⬇️ BOTTOM 15 PROPERTIES`);
  console.log('-'.repeat(70));
  const bottom15 = await prisma.property.findMany({
    where: {
      is_seed: false,
      investability_score: { not: null }
    },
    orderBy: { investability_score: 'asc' },
    take: 15,
    select: {
      id: true,
      parcel_number: true,
      county: true,
      investability_score: true,
      title_score_v2: true,
      confidence_score_v2: true,
      recommendation_bucket: true,
      estimated_market_value: true,
      total_amount_due: true
    }
  });

  console.log(`${'Rank'.padEnd(5)} | ${'Parcel'.padEnd(15)} | ${'County'.padEnd(10)} | ${'Invest'.padEnd(8)} | ${'Title'.padEnd(8)} | ${'Conf'.padEnd(8)} | ${'Bucket'.padEnd(20)}`);
  console.log('-'.repeat(70));

  bottom15.forEach((p: any, i: number) => {
    console.log(
      `${(i + 1).toString().padEnd(5)} | ${p.parcel_number.substring(0, 15).padEnd(15)} | ${p.county.substring(0,10).padEnd(10)} | ` +
      `${(p.investability_score || 0).toFixed(1).padEnd(8)} | ${(p.title_score_v2 || 0).toFixed(1).padEnd(8)} | ` +
      `${(p.confidence_score_v2 || 0).toFixed(1).padEnd(8)} | ${(p.recommendation_bucket || 'N/A').padEnd(20)}`
    );
  });
  console.log('');

  // 6. Edge Cases Analysis
  console.log(`⚠️ EDGE CASES ANALYSIS`);
  console.log('-'.repeat(70));

  // Title high but investability low
  const titleHighInvestLow = await prisma.property.findMany({
    where: {
      is_seed: false,
      investability_score: { not: null },
      title_score_v2: { gte: 70 },
      AND: [{ investability_score: { lte: 40 } }]
    },
    take: 10,
    select: {
      parcel_number: true,
      title_score_v2: true,
      investability_score: true,
      recommendation_bucket: true,
      total_amount_due: true,
      estimated_market_value: true
    }
  });

  console.log(`\nA) Title Score ≥70 BUT Investability ≤40 (${titleHighInvestLow.length} cases)`);
  console.log('   (Why: Good title but terrible deal structure)');
  titleHighInvestLow.forEach((p: any) => {
    console.log(`   ${p.parcel_number}: Title=${p.title_score_v2}, Invest=${p.investability_score}, Bucket=${p.recommendation_bucket}`);
  });

  // Title low but investability high
  const titleLowInvestHigh = await prisma.property.findMany({
    where: {
      is_seed: false,
      investability_score: { not: null },
      title_score_v2: { lte: 40 },
      AND: [{ investability_score: { gte: 70 } }]
    },
    take: 10,
    select: {
      parcel_number: true,
      title_score_v2: true,
      investability_score: true,
      recommendation_bucket: true
    }
  });

  console.log(`\nB) Title Score ≤40 BUT Investability ≥70 (${titleLowInvestHigh.length} cases)`);
  console.log('   (⚠️ WARNING: Great deal but title issues - risky!)');
  titleLowInvestHigh.forEach((p: any) => {
    console.log(`   ${p.parcel_number}: Title=${p.title_score_v2}, Invest=${p.investability_score}, Bucket=${p.recommendation_bucket}`);
  });

  // Low confidence but high bucket
  const lowConfHighBucket = await prisma.property.findMany({
    where: {
      is_seed: false,
      confidence_score_v2: { lte: 0.5 },
      recommendation_bucket: { in: ['BID_CANDIDATE', 'TOP_TARGET'] }
    },
    take: 10,
    select: {
      parcel_number: true,
      confidence_score_v2: true,
      investability_score: true,
      recommendation_bucket: true
    }
  });

  console.log(`\nC) Confidence ≤0.5 BUT Bucket = Buy/Strong Buy (${lowConfHighBucket.length} cases)`);
  console.log('   (⚠️ WARNING: High recommendation on shaky data)');
  lowConfHighBucket.forEach((p: any) => {
    console.log(`   ${p.parcel_number}: Conf=${p.confidence_score_v2?.toFixed(2)}, Invest=${p.investability_score}, Bucket=${p.recommendation_bucket}`);
  });

  console.log('');

  // 7. Summary statistics
  console.log(`📋 SUMMARY STATISTICS`);
  console.log('-'.repeat(70));

  const stats = await prisma.$queryRaw`
    SELECT
      AVG(investability_score) as avg_invest,
      AVG(title_score_v2) as avg_title,
      AVG(confidence_score_v2) as avg_conf,
      MIN(investability_score) as min_invest,
      MAX(investability_score) as max_invest,
      MIN(title_score_v2) as min_title,
      MAX(title_score_v2) as max_title
    FROM Property
    WHERE is_seed = false AND investability_score IS NOT NULL
  `;

  const s = (stats as any[])[0];
  console.log(`  Avg Investability Score: ${Number(s.avg_invest).toFixed(2)}`);
  console.log(`  Avg Title Score: ${Number(s.avg_title).toFixed(2)}`);
  console.log(`  Avg Confidence Score: ${Number(s.avg_conf).toFixed(2)}`);
  console.log(`  Investability Range: ${s.min_invest} - ${s.max_invest}`);
  console.log(`  Title Range: ${s.min_title} - ${s.max_title}`);
  console.log('');

  // 8. Assessment
  console.log(`🎯 DISTRIBUTION ASSESSMENT`);
  console.log('-'.repeat(70));

  const goodBuckets = await prisma.property.count({
    where: {
      is_seed: false,
      recommendation_bucket: { in: ['BID_CANDIDATE', 'TOP_TARGET'] }
    }
  });

  const badBuckets = await prisma.property.count({
    where: {
      is_seed: false,
      recommendation_bucket: { in: ['AVOID'] }
    }
  });

  const goodPct = ((goodBuckets / scoredProps) * 100).toFixed(1);
  const badPct = ((badBuckets / scoredProps) * 100).toFixed(1);

  console.log(`  Good Deals (Top Targets): ${goodBuckets} (${goodPct}%)`);
  console.log(`  Bad Deals (Avoid): ${badBuckets} (${badPct}%)`);
  console.log(`  Needs Review: ${bucketRows.find((b: any) => b.recommendation_bucket === 'RESEARCH')?.count || 0}`);
  console.log('');

  // Verdict
  console.log(`📊 VERDICT`);
  console.log('-'.repeat(70));

  if (Number(goodPct) < 5) {
    console.log('  ❌ TOO PESSIMISTIC: Less than 5% good deals');
    console.log('     → Suggestion: Lower investability threshold for "BID_CANDIDATE"');
  } else if (Number(goodPct) > 40) {
    console.log('  ⚠️ TOO OPTIMISTIC: More than 40% good deals');
    console.log('     → Suggestion: Raise bar for "TOP_TARGET", check weights');
  } else if (Number(badPct) < 10) {
    console.log('  ⚠️ NOT DISCRIMINATING: Less than 10% bad deals');
    console.log('     → Suggestion: Strengthen penalty for high title risk');
  } else {
    console.log('  ✅ BALANCED: Distribution looks reasonable for tax deed auction');
    console.log(`     → ${goodPct}% good deals is healthy selectivity`);
  }

  if (titleLowInvestHigh.length > 5) {
    console.log('');
    console.log('  ⚠️  CONCERN: Many high-invest/low-title properties');
    console.log(`     → ${titleLowInvestHigh.length} cases where title is risky but investability is high`);
    console.log('     → Suggestion: Increase title_weight in scoring or add warning flag');
  }

  if (lowConfHighBucket.length > 5) {
    console.log('');
    console.log('  ⚠️  CONCERN: Many low-confidence/high-recommendation properties');
    console.log(`     → ${lowConfHighBucket.length} cases with confidence ≤0.5 but bucket is BUY`);
    console.log('     → Suggestion: Add confidence gate to recommendation logic');
  }

  console.log('');
  console.log('🔧 MINIMAL WEIGHT ADJUSTMENTS (if needed):');
  console.log('  - If too many TOP_TARGET: lower DEAL_QUALITY_WEIGHT by 0.05');
  console.log('  - If too few BID_CANDIDATE: lower threshold from 65 to 60');
  console.log('  - If titleLowInvestHigh >10: increase TITLE_SCORE_WEIGHT by 0.1');

  await prisma.$disconnect();
}

auditV2Scores().catch(e => {
  console.error(e);
  process.exit(1);
});
