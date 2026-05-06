# Multi-State Tax Sale Architecture

## Overview
Escalar de Utah County (1 condado) a todos los condados de USA (3,000+) requiere automatización.

## Arquitectura de 3 Capas

### Capa 1: State Registry
Cada estado tiene reglas fiscales diferentes:
- **Tax Deed States**: Venden la propiedad directamente (CA, TX, FL)
- **Tax Lien States**: Venden el certificado de deuda (AZ, CO, IL)
- **Hybrid**: Combinación de ambos

```typescript
interface StateConfig {
  state_code: 'CA' | 'TX' | 'FL' | etc
  sale_type: 'tax_deed' | 'tax_lien' | 'hybrid'
  redemption_period_months: number
  auction_frequency: 'monthly' | 'quarterly' | 'annual'
  
  // URLs centrales
  state_tax_sale_portal?: string
  auction_platforms: string[] // ["publicsurplus.com", "bid4assets.com"]
  
  // Configuración por defecto para condados del estado
  default_county_config: Partial<CountyConfig>
}
```

### Capa 2: County Source Adapter
Cada condado publica datos en formatos diferentes:

```typescript
type SourceType = 
  | 'csv_download'        // Link directo a CSV
  | 'pdf_scrape'          // PDF parseable
  | 'html_table'          // Tabla en página web
  | 'google_sheet'        // Google Sheets público
  | 'api_rest'            // API del condado
  | 'manual_entry'        // Datos por email/teléfono (rural)

interface CountySourceAdapter {
  county: string
  state: string
  source_type: SourceType
  
  // Configuración de scraping
  source_config: {
    url: string
    selector?: string           // CSS selector para tablas HTML
    pdf_pages?: number[]        // Páginas relevantes en PDF
    csv_encoding?: 'utf-8' | 'latin1'
    refresh_schedule?: string    // Cron para actualizaciones
  }
  
  // Mapeo de columnas (cada condado usa nombres diferentes)
  column_mapping: Record<string, string[]>
  
  // Parseo específico
  parseParcelNumber: (raw: string) => string
  parseAmount: (raw: string) => number
  parseAddress: (raw: string) => { street: string; city: string; zip: string }
}
```

### Capa 3: Unified Enrichment Pipeline
El pipeline de enriquecimiento ya lo tienes. Solo necesita normalizar la entrada.

## Fuente de Datos por Estado

### Estados con Portales Centralizados (Fáciles)
| Estado | Portal | Tipo | Notas |
|--------|--------|------|-------|
| **Florida** | fltaxcollectors.com | Tax Lien | Cada condado tiene website |
| **Texas** | taxsale.txsuit.com | Tax Deed | Mensual por condado |
| **Arizona** | aztaxliensale.com | Tax Lien | Portal estatal |
| **Colorado** | coloradotaxsale.com | Tax Lien | Por condado |
| **Nevada** | nvtaxliens.com | Tax Lien | Las Vegas es mayor mercado |
| **California** | Por condado | Tax Deed | 58 condados, cada uno diferente |

### Estados con APIs Públicas
- **Utah**: AGRC LIR (ya implementado)
- **Texas**: TXSuit API
- **Florida**: Florida API de parcels (varía por condado)

### Estados que Requieren Scraping Manual
- Rural counties sin portales
- Condados que publican en PDF solo
- Estados del medio oeste (Nebraska, Dakota, etc.)

## Plan de Implementación

### Fase 1: Utah Completo (29 counties)
Estado actual: 2/29 implementados (Utah, Tooele)

Restantes 27 counties de Utah:
1. **Salt Lake** - High priority (volumen)
2. **Davis** - High priority (cerca de SLC)
3. **Weber** - High priority
4. **Washington** - High priority (St. George growth)
5. **Cache** - Medium priority
6. **Summit** - Medium priority (Park City luxury)
7. **Iron** - Low priority (rural)
8. **21 rural counties** - Low priority (requieren contacto manual)

### Fase 2: Estados Vecinos (Mountain West)
1. **Colorado** - Tax lien state, buen mercado
2. **Nevada** - Tax lien, Las Vegas opportunity
3. **Arizona** - Tax lien, Phoenix/Tucson markets
4. **Idaho** - Tax deed, similar a Utah

### Fase 3: Estados con Alto Volumen
1. **Texas** - Tax deed, mensual, alto volumen
2. **Florida** - Tax lien, retiree market
3. **California** - Tax deed, high value properties

## Herramientas de Scraping Recomendadas

### Para HTML Tables
```typescript
// Playwright para sitios con JavaScript
import { chromium } from 'playwright'

// Cheerio para HTML estático
import * as cheerio from 'cheerio'
```

### Para PDFs
```typescript
// pdf-parse para extracción de texto
import pdfParse from 'pdf-parse'

// Tabula para tablas en PDF
// (requiere Java, pero muy efectivo)
```

### Para Google Sheets
```typescript
// Sheets API directo
const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
```

## Sistema de Detección Automática

Crear un scraper que detecte el tipo de fuente automáticamente:

```typescript
async function detectSourceType(url: string): Promise<SourceType> {
  const response = await fetch(url)
  const contentType = response.headers.get('content-type')
  
  if (contentType?.includes('pdf')) return 'pdf_scrape'
  if (contentType?.includes('csv')) return 'csv_download'
  if (url.includes('google.com/sheets')) return 'google_sheet'
  
  // HTML - detectar si tiene tabla
  const html = await response.text()
  const $ = cheerio.load(html)
  const hasTable = $('table').length > 0
  
  return hasTable ? 'html_table' : 'manual_entry'
}
```

## Data Normalization Pipeline

Cada condado tiene nombres de columnas diferentes. Ejemplo real:

| Campo Estándar | Utah County | Tooele | Texas | Florida |
|----------------|-------------|--------|-------|---------|
| parcel_number | Parcel Number | Serial Number | Property ID | Parcel ID |
| owner_name | Owner Name | Grantee | Owner | Taxpayer |
| total_amount_due | Amount Due | Est. Starting Bid | Opening Bid | Starting Bid |
| property_address | Property Address | Situs Address | Legal Description | Address |

Solución: El Column Detector que ya tienes en `src/lib/import/column-detector.ts` escala perfectamente para esto.

## Priorización por ROI

No todos los condados valen la pena. Priorizar por:

1. **Volumen**: >50 propiedades por año
2. **Valor**: Propiedades >$100k market value
3. **Accesibilidad**: Datos online vs. manual
4. **Competencia**: Menos competencia = mejores deals

### Utah Counties Prioridad (Top 10)

| Rank | County | Population | Est. Properties | Priority |
|------|--------|------------|-----------------|----------|
| 1 | Salt Lake | 1.2M | 500+ | P0 - Must have |
| 2 | Utah | 700K | 300+ | Done |
| 3 | Davis | 370K | 150+ | P0 |
| 4 | Weber | 270K | 120+ | P0 |
| 5 | Washington | 200K | 100+ | P1 |
| 6 | Cache | 140K | 80+ | P1 |
| 7 | Summit | 45K | 30+ | P2 (luxury) |
| 8 | Tooele | 80K | 50+ | Done |
| 9 | Iron | 60K | 40+ | P2 |
| 10 | Box Elder | 60K | 40+ | P2 |

## Costo de Implementación Estimado

### Por Condado
- Con API/CSV: 2-4 horas
- Con HTML scraping: 4-8 horas
- Con PDF parsing: 8-16 horas
- Rural (manual): 1-2 horas research

### Por Estado (promedio 50 condados)
- Tax lien states: ~80 horas
- Tax deed states: ~120 horas
- Estados mixtos: ~100 horas

### Total USA (3,000+ condados)
- Imposible hacerlo manual
- Necesitas crowdsourcing o community contributions
- O enfocarte en top 100 condados (generan 80% de oportunidades)

## Recomendación Inmediata

1. **Completa Utah primero** (27 counties restantes)
2. **Luego Texas** - Alto volumen, datos disponibles
3. **Luego Florida** - Mercado maduro de tax liens
4. **Automatiza el scraping** para que no sea manual cada condado

## Notas Legales Importantes

- Algunos estados requieren licencia de real estate para comprar
- Tax liens vs tax deeds tienen regulaciones diferentes
- Siempre verificar leyes locales antes de implementar
