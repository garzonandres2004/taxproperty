/**
 * Test script for PDF analyzer
 * Tests document analysis for a specific document
 */

import { analyzeDocumentPDF, fetchBMIDocumentInfo, extractDocumentText } from '../src/lib/title/pdf-analyzer'

async function testPDFAnalyzer() {
  // Test with a known document from property 03:060:0016
  const testDoc = {
    entry: '187386',
    year: '2020',
    type: 'WD',
    party1: 'HARBOLD, KAREN F & JEFFREY S',
    party2: 'SOME GRANTEE'
  }

  console.log('=== PDF Analyzer Test ===')
  console.log(`Testing document: ${testDoc.entry}-${testDoc.year} (${testDoc.type})`)
  console.log()

  // Step 1: Test BMI URL fetching
  console.log('Step 1: Fetching BMI document info...')
  const docInfo = await fetchBMIDocumentInfo(testDoc.entry, testDoc.year)

  if (!docInfo) {
    console.error('❌ Failed to get document info from BMI')
    console.log()
    console.log('Direct BMI URL:')
    console.log(`https://bmiwebdocs.utahcounty.gov/DocView.aspx?DB=DC&Doc=${testDoc.entry}-${testDoc.year}`)
    return
  }

  console.log('✅ Found document info:')
  console.log('  PDF URL:', docInfo.pdfUrl || 'Not accessible (auth required)')
  console.log()

  // Step 2: Test document text extraction
  console.log('Step 2: Extracting document text...')
  const text = await extractDocumentText(testDoc.entry, testDoc.year)

  if (!text) {
    console.log('⚠️ No document text extracted (may require authentication)')
  } else {
    console.log('✅ Extracted text (first 300 chars):')
    console.log('---')
    console.log(text.substring(0, 300))
    console.log('---')
    console.log(`Total characters: ${text.length}`)
  }
  console.log()

  // Step 3: Test full analysis
  console.log('Step 3: Running full analysis...')
  const analysis = await analyzeDocumentPDF(
    testDoc.entry,
    testDoc.year,
    testDoc.type,
    testDoc.party1,
    testDoc.party2
  )

  if (!analysis) {
    console.error('❌ Analysis failed')
    return
  }

  console.log('✅ Analysis complete:')
  console.log()
  console.log('Document Type:', analysis.documentType)
  console.log('Grantor:', analysis.grantor || 'Not found')
  console.log('Grantee:', analysis.grantee || 'Not found')
  console.log('Consideration:', analysis.consideration || 'Not found')
  console.log('Parcel Number:', analysis.parcelNumber || 'Not found')
  console.log()
  console.log('Key Findings:')
  analysis.keyFindings.forEach(f => console.log('  •', f))
  console.log()
  console.log('Warnings:')
  if (analysis.warnings.length > 0) {
    analysis.warnings.forEach(w => console.log('  ⚠️', w))
  } else {
    console.log('  None')
  }
  console.log()
  console.log('Document Complete:', analysis.isComplete ? 'Yes' : 'No')
}

testPDFAnalyzer().catch(console.error)
