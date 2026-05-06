// Analyze Davis County Tax Sale PDF
import pdfParse from 'pdf-parse'
import fs from 'fs'

const pdfPath = '/Users/andres/Downloads/davis_2026_tax_sale.pdf'

async function analyzePDF() {
  console.log('Analyzing Davis County Tax Sale PDF...\n')

  const dataBuffer = fs.readFileSync(pdfPath)
  const data = await pdfParse(dataBuffer)

  console.log('=== PDF INFO ===')
  console.log('Pages:', data.numpages)
  console.log('Text length:', data.text.length, 'characters')
  console.log('')

  console.log('=== FIRST 3000 CHARACTERS ===')
  console.log(data.text.substring(0, 3000))
  console.log('')

  console.log('=== SAMPLE DATA (lines with numbers) ===')
  const lines = data.text.split('\n').filter(line => line.trim())
  const sampleLines = lines.slice(0, 50)
  sampleLines.forEach((line, i) => {
    if (line.match(/\d/) && line.length > 10) {
      console.log(`Line ${i}: ${line}`)
    }
  })
}

analyzePDF().catch(console.error)
