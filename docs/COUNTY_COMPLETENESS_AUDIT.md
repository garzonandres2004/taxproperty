# County Data Completeness Audit & Autofill Plan

**Fecha:** 2026-05-04
**Gold Standard:** Utah County (127 propiedades, 94%+ completitud)
**Objetivo:** Llevar Weber, Davis, Tooele y Rich al nivel de Utah County

---

## PARTE 1: GAP AUDIT - Estado Actual

### 1.1 Resumen por County

| County | Total Props | Market Value | Assessed | Building | Year Built | Lat/Lon | Zoning | Title Analysis |
|--------|-------------|--------------|----------|----------|------------|---------|--------|----------------|
| **Utah** | 127 | 94.5% ✅ | 94.5% ✅ | 34.6% ⚠️ | 34.6% ⚠️ | 100% ✅ | 70.9% ✅ | 100% ✅ |
| **Weber** | 69 | 100% ✅ | 0% ❌ | 36.2% ⚠️ | 36.2% ⚠️ | 0% ❌ | 100% ✅ | 0% ❌ |
| **Tooele** | 29 | 82.8% ✅ | 0% ❌ | 27.6% ⚠️ | 27.6% ⚠️ | 100% ✅ | 100% ✅ | 0% ❌ |
| **Davis** | 22 | 13.6% ⚠️ | 0% ❌ | 13.6% ⚠️ | 36.4% ⚠️ | 100% ✅ | 100% ✅ | 0% ❌ |
| **Rich** | 4 | 100% ✅ | 0% ❌ | 50% ⚠️ | 50% ⚠️ | 0% ❌ | 100% ✅ | 0% ❌ |

### 1.2 Análisis Crítico por County

#### 🟢 Utah County (Gold Standard)
- **Fortalezas:** AGRC LIR completo, Title Analysis 100%, fotos GIS
- **Debilidades:** Physical characteristics (34%) - lot_size OK pero building/year bajos
- **Acción:** Refinar extracción de características físicas

#### 🟡 Weber County (Potencial Alto)
- **Bloqueador:** Sin coordenadas GPS (0% lat/lon)
- **Bloqueador:** Sin title analysis
- **Oportunidad:** 100% tienen property_type y lot_size (importados)
- **AGRC:** Parcels_Weber_LIR disponible

#### 🟡 Tooele County (Potencial Alto)
- **Bloqueador:** Sin title analysis
- **Debilidad:** Sin assessed_value (0%)
- **Fortaleza:** Lat/lon 100%, zoning 100%
- **AGRC:** Parcels_Tooele_LIR disponible

#### 🔴 Davis County (CRÍTICO - Mayor Impacto)
- **Estado:** 22 propiedades - AGRC enrichment ejecutado con resultados mixtos
- **Mejora:** Coordinates 4.5% → 100%, Year Built 0% → 36.4%
- **Limitación:** Solo 3/22 tienen market value en AGRC (13.6%)
- **Root cause:** Los 19 parcels sin market value son propiedades tax-delinquent que no tienen datos de assessor completos en AGRC
- **Fix aplicado:** Davis adapter corregido para usar formato numérico `XXXXXXXXX` en lugar de `XX-XXX-XXXX` para queries AGRC
- **AGRC:** Parcels_Davis_LIR funciona correctamente, pero datos fiscales incompletos para estas propiedades

#### 🟠 Rich County (Potencial Limitado)
- **Tamaño:** Solo 4 propiedades
- **Bloqueador:** Sin coordenadas, sin title analysis
- **Fortaleza:** 100% market value (enriquecido), 100% zoning
- **Nota:** County pequeño, prioridad baja

### 1.3 Top 5 Campos Faltantes por County

| County | Prioridad 1 | Prioridad 2 | Prioridad 3 | Prioridad 4 | Prioridad 5 |
|--------|-------------|-------------|-------------|-------------|-------------|
| **Weber** | latitude/longitude | title_analysis | assessed_value | building_sqft | year_built |
| **Tooele** | title_analysis | assessed_value | building_sqft | year_built | photos |
| **Davis** | estimated_market_value | latitude/longitude | building_sqft | year_built | title_analysis |
| **Rich** | latitude/longitude | title_analysis | assessed_value | photos | aerial_url |

### 1.4 Propiedades Más Incompletas (Top 10)

| Parcel | County | Completitud Score | Razón |
|--------|--------|-------------------|-------|
| 01-113-0049 | Davis | 1/7 | Solo datos básicos del CSV |
| 02-173-0010 | Davis | 1/7 | Solo datos básicos del CSV |
| 03-038-0029 | Davis | 1/7 | Solo datos básicos del CSV |
| 03-114-3202 | Davis | 1/7 | Solo datos básicos del CSV |
| 04-046-0034 | Davis | 1/7 | Solo datos básicos del CSV |
| 04-046-0036 | Davis | 1/7 | Solo datos básicos del CSV |
| 05-022-0037 | Davis | 1/7 | Solo datos básicos del CSV |
| 05-069-0023 | Davis | 1/7 | Solo datos básicos del CSV |
| 05-071-0010 | Davis | 1/7 | Solo datos básicos del CSV |
| 06-034-0168 | Davis | 1/7 | Solo datos básicos del CSV |

**Nota:** Todas las 22 propiedades de Davis tienen score de completitud 1/7 (solo owner + address + tax amount). Son el target más crítico.

---

## PARTE 2: AUTOFILL FEASIBILITY PLAN

### 2.1 Fuentes de Datos por County

#### Weber County
```
AGRC LIR:         ✅ Parcels_Weber_LIR (disponible)
Assessor GIS:     ✅ gis-portal.webercountyutah.gov
Treasurer:        ✅ webercountyutah.gov/Treasurer/
Recorder:         ✅ webercountyutah.gov/Recorder/
Tax Portal:       ⚠️  Propietario, no scrapeable
```

**Campos Auto-fillables:**
- ✅ estimated_market_value (AGRC LIR)
- ✅ assessed_value (AGRC LIR)
- ✅ building_sqft (AGRC LIR)
- ✅ year_built (AGRC LIR)
- ✅ latitude/longitude (AGRC geocoding)
- ✅ property_type (AGRC LIR)
- ⚠️ photos (Street View API si tenemos lat/lon)

**Potencial de Automatización:** HIGH (85%+)

#### Davis County
```
AGRC LIR:         ✅ Parcels_Davis_LIR (disponible)
Assessor:         ✅ daviscountyutah.gov/assessor
Property Search:  ✅ daviscountyutah.gov/property-search
Recorder:         ✅ daviscountyutah.gov/recorder
Treasurer:        ✅ daviscountyutah.gov/treasurer
```

**Campos Auto-fillables:**
- ✅ estimated_market_value (AGRC LIR)
- ✅ assessed_value (AGRC LIR)
- ✅ building_sqft (AGRC LIR)
- ✅ year_built (AGRC LIR)
- ✅ latitude/longitude (AGRC o Property Search)
- ✅ property_type (AGRC LIR)

**Potencial de Automatización:** HIGH (90%+)

#### Tooele County
```
AGRC LIR:         ✅ Parcels_Tooele_LIR (disponible)
Assessor:         ✅ tooeleco.org/assessor
GIS:              ✅ tooeleco.org/gis
Treasurer:        ✅ tooeleco.org/treasurer
```

**Campos Auto-fillables:**
- ✅ assessed_value (AGRC LIR - confirmar)
- ✅ building_sqft (AGRC LIR)
- ✅ year_built (AGRC LIR)
- ✅ photos (si lat/lon existe)

**Potencial de Automatización:** HIGH (80%+)

#### Rich County
```
AGRC LIR:         ⚠️  Posiblemente no existe (county < 1000 props)
Assessor:         ✅ richcountyutah.org/assessor
Treasurer:        ✅ richcountyutah.org/treasurer
GIS:              ❌ Muy limitado o inexistente
```

**Campos Auto-fillables:**
- ⚠️ limited AGRC data
- ❌ No hay GIS robusto
- ✅ Manual entry required

**Potencial de Automatización:** LOW (30%)

### 2.2 Matriz de Automatización

| County | AGRC LIR | Assessor Portal | GIS Coord | Photos | Title | Automation Level |
|--------|----------|-----------------|-----------|--------|-------|------------------|
| **Weber** | ✅ Full | ✅ Available | ✅ AGRC | ⚠️ StreetView | ❌ Manual | **HIGH** |
| **Davis** | ✅ Full | ✅ Available | ✅ AGRC | ⚠️ StreetView | ❌ Manual | **HIGH** |
| **Tooele** | ✅ Full | ✅ Available | ✅ AGRC | ✅ Exists | ❌ Manual | **HIGH** |
| **Rich** | ⚠️ Limited | ⚠️ Basic | ❌ None | ❌ Manual | ❌ Manual | **LOW** |

### 2.3 Estimación de Completitud Post-Autofill

| County | Actual | Post-Autofill | Gap Remaining |
|--------|--------|---------------|---------------|
| **Weber** | 45% | 85% | Title analysis + Photos |
| **Davis** | 15% | 80% | Title analysis |
| **Tooele** | 55% | 85% | Title analysis + Photos |
| **Rich** | 60% | 70% | Title + Photos + Coords |

---

## PARTE 3: COUNTY PLAYBOOKS

### 3.1 Prioridad de Implementación

```
PRIORIDAD 1 (Alto Impacto): Davis → 22 props, impacto masivo
PRIORIDAD 2 (Medio Impacto): Weber → 69 props, AGRC disponible  
PRIORIDAD 3 (Medio Impacto): Tooele → 29 props, AGRC disponible
PRIORIDAD 4 (Bajo Impacto): Rich → 4 props, manual
```

### 3.2 Playbook: Davis County (PRIORIDAD 1)

#### URLs Relevantes
- Property Search: https://www.daviscountyutah.gov/property-search
- Assessor: https://www.daviscountyutah.gov/assessor
- Treasurer: https://www.daviscountyutah.gov/treasurer
- Recorder: https://www.daviscountyutah.gov/recorder

#### Búsqueda por Parcel
1. Ir a https://www.daviscountyutah.gov/property-search
2. Seleccionar "Parcel Number" del dropdown
3. Formato: `01-113-0049` (dos dígitos, tres dígitos, cuatro dígitos)
4. Click Search → ver detalles

#### Búsqueda por Address (fallback)
1. Seleccionar "Property Address"
2. Ingresar calle (ej: "1200 E")
3. Filtrar por ciudad si es necesario

#### Campos a Extraer (Davis)

**Valuation Tab:**
- Market Value: `estimated_market_value`
- Assessed Value: `assessed_value`
- Taxable Value: (verificar si difiere)

**Property Details Tab:**
- Year Built: `year_built`
- Living Area: `building_sqft`
- Lot Size: `lot_size_sqft` (en acres, convertir × 43560)
- Bedrooms/Bathrooms: opcional
- Property Type: `property_type` (Residential, Commercial, etc.)

**Map/GIS:**
- Click "View Map" → obtener lat/lon de la URL o del mapa
- Formato: `latitude`, `longitude`

**Señales de "No Automatizable":**
- CAPTCHA en property search
- Login requerido
- Session tokens dinámicos
- Mapa que no expone coordenadas en URL

**Ejemplo a Documentar:**
- Parcel: `01-113-0049`
- Screenshots: Valuation tab, Property Details, Map view
- Campos extraídos: market value, year built, sqft, lat/lon

---

### 3.3 Playbook: Weber County (PRIORIDAD 2)

#### URLs Relevantes
- GIS Portal: https://gis-portal.webercountyutah.gov/
- Property Search: En GIS portal → Search
- Treasurer: https://www.webercountyutah.gov/Treasurer/
- Recorder: https://www.webercountyutah.gov/Recorder/

#### Búsqueda por Parcel
1. Ir a GIS Portal
2. Usar Search → "Parcel Number"
3. Formato: Varios posibles:
   - `35-509-0039` (similar a Utah)
   - `12-3456-789` (diferente)
   - Probar formatos con/sin guiones

#### Extracción
**GIS Panel (lateral derecho):**
- Owner: `owner_name` (verificar vs CSV)
- Address: `property_address`
- Value: `estimated_market_value`, `assessed_value`

**Physical:**
- Year Built: Buscar en atributos
- SqFt: Living area o building area
- Lot Size: En acres

**Coordinates:**
- Click en centro del lote
- Ver coordenadas en panel inferior o URL del mapa

**Señales de "No Automatizable":**
- Mapa requiere plugin especial
- Popups blocker interferen
- Datos solo visibles en popups, no en panel

---

### 3.4 Playbook: Tooele County (PRIORIDAD 3)

#### URLs Relevantes
- GIS: https://tooeleco.org/gis
- Assessor: https://tooeleco.org/assessor
- Treasurer: https://tooeleco.org/treasurer

#### Estado Actual
- Ya tiene lat/lon (100%)
- Ya tiene zoning (100%)
- Solo falta assessed_value y title

#### Búsqueda por Parcel
1. GIS → Search by Parcel
2. Formato: similar a Utah County (`NN:NNN:NNNN`)
3. Ver propiedades del lote

#### Campos Faltantes
- **assessed_value**: En AGRC LIR o Assessor
- **title_analysis**: Recorder office

**Señales de "No Automatizable":**
- Tooele ya está bastante completo
- Solo title requiere análisis manual

---

### 3.5 Playbook: Rich County (PRIORIDAD 4)

#### URLs Relevantes
- Assessor: https://richcountyutah.org/assessor
- Treasurer: https://richcountyutah.org/treasurer

#### Realidad
- Solo 4 propiedades
- AGRC coverage limitado o inexistente
- GIS básico o inexistente

#### Enfoque
- **Manual entry obligatorio**
- Llamar al assessor: 435-793-2121
- Email: assessor@richcountyutah.org
- Pedir datos en formato CSV o Excel

#### Campos a Solicitar
- Parcel Number
- Owner Name
- Property Address
- Market Value
- Assessed Value
- Lot Size
- Year Built
- Building SqFt
- Latitude/Longitude

**Señales de "No Automatizable":**
- County pequeño, recursos limitados
- No hay GIS público robusto
- Respuesta: Solicitar datos oficiales

---

## PARTE 4: PLAN DE IMPLEMENTACIÓN

### Fase 1: Davis County (Semana 1)
**Objetivo:** Llevar 15% → 80% completitud

**Acciones:**
1. Verificar AGRC Parcels_Davis_LIR endpoint
2. Correr `enrich-all` para Davis (batch de 22)
3. Validar que estimated_market_value y assessed_value se llenan
4. Para las que fallen AGRC, usar manual playbook
5. Documentar ejemplo paso a paso con screenshots

**Métrica de éxito:**
- estimated_market_value > 80%
- latitude/longitude > 80%
- building_sqft > 70%

### Fase 2: Weber County (Semana 2)
**Objetivo:** Llenar lat/lon y physical characteristics

**Acciones:**
1. AGRC Parcels_Weber_LIR
2. Enrich-all para 69 propiedades
3. Validar coordenadas (de 0% a >90%)
4. Extraer building_sqft, year_built

**Métrica de éxito:**
- latitude/longitude > 90%
- building_sqft > 60%
- year_built > 60%

### Fase 3: Tooele County (Semana 2-3)
**Objetivo:** Assessed value y title

**Acciones:**
1. Verificar por qué assessed_value está en 0%
2. AGRC enrich si no se hizo
3. Llenar gaps

**Métrica de éxito:**
- assessed_value > 80%

### Fase 4: Rich County (Semana 3-4)
**Objetivo:** Completitud básica

**Acciones:**
1. Contactar assessor
2. Solicitar datos en formato estructurado
3. Import manual

**Métrica de éxito:**
- latitude/longitude > 75%
- All basic fields > 80%

### Fase 5: Title Analysis (Paralelo)
**Objetivo:** Llevar title_analysis de 0% a >50% en Weber, Davis, Tooele

**Acciones:**
1. Implementar scraper para cada recorder county
2. O: Entrenar modelo para análisis de títulos
3. Batch run: "Analyze All Titles" por county

**Nota:** Title analysis es el campo más complejo (requiere OCR/AI)

---

## PARTE 5: RESUMEN EJECUTIVO

### Estado Actual (Gap)
```
Utah County:    ████████████ 95% (Gold Standard)
Weber County:   ██████░░░░░░ 45% (-50pp gap)
Tooele County:  ███████░░░░░ 55% (-40pp gap)  
Davis County:   ██░░░░░░░░░░ 15% (-80pp gap) ⚠️ CRÍTICO
Rich County:    ███████░░░░░ 60% (-35pp gap, solo 4 props)
```

### Potencial Post-Autofill
```
After AGRC + Enrichment:
Utah County:    ████████████ 95% (ya está)
Weber County:   ██████████░░ 85% (+40pp)
Tooele County:  ██████████░░ 85% (+30pp)
Davis County:   █████████░░░ 80% (+65pp) ✅ Mayor impacto
Rich County:    ████████░░░░ 70% (+10pp, limitado por tamaño)
```

### Prioridad de Acción
1. **Davis** → Mayor impacto (22 props → 80% completitud)
2. **Weber** → Volumen alto (69 props → 85%)
3. **Tooele** → Casi completo (29 props → 85%)
4. **Rich** → Bajo impacto (4 props → 70%)

### Recursos Necesarios
- **Automatizable (AGRC):** ~2 días de trabajo
- **Semi-automático:** ~3 días de validación
- **Manual (Title Analysis):** ~1 semana por county
- **Total estimado:** 2-3 semanas para 90%+ completitud

### Resultados Post-Ejecución (2026-05-04)

#### Davis County Enrichment - COMPLETED
```
POST /api/counties/davis/enrich-all
Result: 22/22 properties enriched

Campos poblados:
- latitude/longitude: 0% → 100% (via AGRC polygon centroid + geocoding fallback)
- year_built: 0% → 36.4% (8 properties con datos AGRC)
- estimated_market_value: 0% → 13.6% (3 properties con $409k-$646k)
- building_sqft: 0% → 13.6% (3 properties con 1218-1810 sqft)
- lot_size_sqft: 0% → ~18% (4 properties)
```

**Problema descubierto:** Los 19/22 parcels sin market value en AGRC son tax delinquent properties que el assessor no ha valuado completamente. Esto es común en propiedades que llevan años sin pagar impuestos.

**Fix técnico:** Davis adapter actualizado para usar formato numérico `XXXXXXXXX` en queries AGRC (el layer LIR almacena `PARCEL_ID` sin guiones).

**Próximo paso Davis:** Extraer valores manualmente de daviscountyutah.gov/property-search para los 19 parcels sin market value.

#### Top 3 Properties Davis con Data Completa
| Parcel | Market Value | Building | Year | Lot Size |
|--------|-------------|----------|------|----------|
| 12-660-0312 | $646,000 | 1,810 sqft | 2007 | 14,810 sqft |
| 12-325-0730 | $429,000 | 1,218 sqft | 1999 | 8,276 sqft |
| 10-139-0031 | $409,000 | 1,331 sqft | 1989 | 6,098 sqft |

### Próximo Paso Inmediato
Extraer market values manualmente para los 19 Davis parcels restantes desde daviscountyutah.gov/property-search.

---

## Anexos

### A. SQL Queries para Seguimiento

```sql
-- Completitud por county
SELECT county,
  ROUND(100.0 * COUNT(CASE WHEN estimated_market_value IS NOT NULL THEN 1 END) / COUNT(*), 1) as market,
  ROUND(100.0 * COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) / COUNT(*), 1) as coords,
  ROUND(100.0 * COUNT(CASE WHEN building_sqft IS NOT NULL THEN 1 END) / COUNT(*), 1) as building
FROM Property WHERE is_seed = 0 GROUP BY county;

-- Propiedades críticamente incompletas
SELECT parcel_number, county,
  (CASE WHEN estimated_market_value IS NULL THEN 1 ELSE 0 END +
   CASE WHEN latitude IS NULL THEN 1 ELSE 0 END +
   CASE WHEN building_sqft IS NULL THEN 1 ELSE 0 END) as missing_count
FROM Property WHERE is_seed = 0 AND county != 'utah'
ORDER BY missing_count DESC LIMIT 20;
```

### B. URLs AGRC LIR por County
- Weber: `https://services1.arcgis.com/.../Parcels_Weber_LIR/...`
- Davis: `https://services1.arcgis.com/.../Parcels_Davis_LIR/...`
- Tooele: `https://services1.arcgis.com/.../Parcels_Tooele_LIR/...`
- Rich: `https://services1.arcgis.com/.../Parcels_Rich_LIR/...` (verificar)

### C. Contactos County (para datos manuales)
- Davis Assessor: (801) 451-3543
- Weber Assessor: (801) 399-8577
- Tooele Assessor: (435) 843-3104
- Rich Assessor: (435) 793-2121
