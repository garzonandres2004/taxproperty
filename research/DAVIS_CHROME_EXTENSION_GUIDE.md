# Guía: Extraer Datos de Davis County con Chrome Extension

## Paso 1: Abrir el PDF

1. Abre Chrome
2. Ve a la extensión de Claude (icono de estrella/spark)
3. Pega este prompt:

```
Abre el archivo PDF en:
/Users/andres/Desktop/claude-projects/taxtpropertyidea/2026-advertisement-web-sitecfc6a74f13296568a4f7ff3c0015e574.pdf

Este es un tax sale de Davis County Utah (May 2026). 

Por favor:
1. Extrae TODAS las propiedades que veas
2. Para cada propiedad, busca:
   - Parcel Number (formato: 08-001-0002)
   - Property Address
   - City
   - Owner Name  
   - Total Amount Due (con $)
   - Acres (si está disponible)

3. Organiza los datos en formato CSV
4. Guarda el resultado en:
/Users/andres/Desktop/claude-projects/taxtpropertyidea/davis_2026_extracted.csv

El formato CSV debe ser:
parcel_number,property_address,city,owner_name,total_amount_due,acres
```

## Paso 2: Verificar Extracción

Después de que Claude extraiga los datos, verifica:

```bash
# En terminal, verifica el archivo
cat /Users/andres/Desktop/claude-projects/taxtpropertyidea/davis_2026_extracted.csv | head -10
```

## Paso 3: Importar a la App

```bash
# Copiar al directorio del proyecto
cp /Users/andres/Desktop/claude-projects/taxtpropertyidea/davis_2026_extracted.csv \
   /Users/andres/Desktop/claude-projects/taxtpropertyidea/taxproperty-utah/

# Ir a la app y usar /import
cd /Users/andres/Desktop/claude-projects/taxtpropertyidea/taxproperty-utah
```

Luego en el navegador:
1. Ve a `http://localhost:3000/import`
2. Selecciona "Davis County"
3. Sube `davis_2026_extracted.csv`

## Paso 4: Enriquecer Datos

```bash
# Después de importar, enriquecer con AGRC
curl -X POST http://localhost:3000/api/counties/davis/enrich-all
```

## Tips para Extracción

Si Claude no extrae bien, intenta:

### Opción A: Por páginas
```
Mira la página 1 del PDF y extrae solo las propiedades de esa página...
Luego la página 2...
```

### Opción B: Formato específico
```
Busca patrones como:
- "08-" al inicio de línea (parcel number)
- "$" seguido de números (amount)
- Nombres en MAYÚSCULAS (owners)
```

### Opción C: Tabla manual
```
Crea una tabla con las columnas que ves en el PDF:
| Parcel | Address | City | Owner | Amount |
```

## Costo

Usar Chrome Extension para esto:
- ✅ No consume tu límite de Claude Code
- ✅ Puede procesar imágenes (OCR visual)
- ✅ Ideal para PDFs escaneados

## Tiempo Estimado

- Extracción manual con Chrome Ext: ~5-10 minutos
- Crear adapter automático: ~2-3 horas (una vez)
- Siguientes condados con PDF: ~2 minutos cada uno

## Alternativa: OCR Script

Si prefieres automatizar, usa el script:
```bash
# Requiere API key de Google Vision
export GOOGLE_CLOUD_API_KEY="tu-api-key"
npx ts-node scripts/pdf-ocr-extractor.ts \
  /Users/andres/Desktop/claude-projects/taxtpropertyidea/2026-advertisement-web-sitecfc6a74f13296568a4f7ff3c0015e574.pdf \
  google
```

## Notas

- Davis County tiene ~100-200 propiedades típicamente
- El PDF puede tener varias páginas
- Algunas propiedades son "raw ground" (solo ciudad, sin dirección)
