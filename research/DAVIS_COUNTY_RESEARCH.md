# Davis County Research - May 2026 Tax Sale

## Información del Auction

| Campo | Valor |
|-------|-------|
| **Fecha** | May 13, 2026 |
| **Hora** | 10:00 AM |
| **Pre-registration** | 9:00 AM |
| **Lugar** | Davis County Administration Building, Room 303<br>61 South Main Street, Farmington, UT 84025 |
| **Teléfono** | 801-451-3329 |
| **Tipo** | Tax Deed Sale (5th year delinquency) |

## Formato de Datos

Davis County usa **PowerPoint/PDF** con imágenes, no CSV.

### Datos disponibles por propiedad:
- Parcel Number
- Address to Parcel (si dice solo "City's Name" = raw ground sin dirección)
- Total Acres
- Name of Current Property Owner
- Amount of Taxes, Penalty, Interest, Cost

### Notas importantes:
- Lista disponible **30 días antes** del tax sale (aprox. April 13, 2026)
- Es una venta "Buyer Beware" - Tax Deed similar a Quit Claim Deed
- Publicado en: Ogden Standard Examiner y Davis Journal
- Properties can be redeemed hasta el momento de la venta

## URLs

- **Main Page**: https://www.daviscountyutah.gov/controller/tax-administration-group/tax-sale/delinquent-tax-sale
- **Advertisement PDF**: `/docs/auditorlibraries/default-document-library/2026-advertisement-web-sitecfc6a74f13296568a4f7ff3c0015e574.pdf`
- **PowerPoint**: `/docs/auditorlibraries/default-document-library/2026-may-sale-power-point---advertisement--b5c6a74f13296568a4f7ff3c0015e574.pdf`

## Desafío Técnico

El PowerPoint está en formato PDF con imágenes (6MB), no texto seleccionable.

**Opciones para extraer datos:**

1. **OCR (Optical Character Recognition)**
   - Usar Tesseract OCR
   - Convertir PDF a imágenes, luego extraer texto
   - Costo: Alto procesamiento

2. **Manual Entry**
   - Entrar propiedades manualmente desde el PDF
   - Costo: Tiempo humano

3. **Wait for Alternative Format**
   - Contactar al county para pedir CSV/Excel
   - Costo: Puede no estar disponible

4. **Chrome Extension (Claude)**
   - Usar la extensión de Claude para navegar y extraer datos visuales
   - Costo: ~0% de tu límite (usa el browser)

## Recomendación

Para Davis County, usar la **Chrome Extension de Claude** es la mejor opción porque:
- Puede "ver" el PDF y extraer datos de imágenes
- No consume tu límite de Claude Code
- Puede hacerlo semi-automáticamente

## Próximo Paso

1. Abrir Chrome con la extensión de Claude
2. Navegar al PDF del PowerPoint
3. Pedirle a Claude que extraiga los datos de cada slide
4. Guardar en CSV para importar a la app

## Comparación con Otros Condados

| Condado | Formato | Dificultad | Herramienta |
|---------|---------|------------|-------------|
| Utah | CSV directo | Fácil | Import directo |
| Tooele | Google Sheets | Fácil | Export CSV |
| **Davis** | **PowerPoint/PDF** | **Difícil** | **OCR o Chrome Ext** |
| Salt Lake | HTML tabla | Media | Scraper |
| Weber | TBD | ? | ? |

## Contacto del Condado

- **Davis County Controller**
- 61 S. Main St. Farmington, UT 84025
- (801) 451-3323
- Email: No listado, llamar directamente

## Notas para Implementación

### Adapter de Davis County necesitará:

1. **Source Type**: `pdf_images` (nuevo tipo)
2. **Parser**: OCR-based extraction
3. **Column Mapping**: Similar a otros pero manual
4. **Parcel Format**: TBD - investigar con el PDF extraído

### AGRC API:

Davis County también está en AGRC LIR:
```
https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_Davis_LIR/FeatureServer/0/query
```

Podemos usarlo para enriquecer después de importar.

## Estado

⏳ Esperando extracción de datos del PDF para crear adapter
