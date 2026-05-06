# Estrategia OCR para Condados con PDFs/Imágenes

## Problema

Algunos condados publican tax sales como:
- PDFs escaneados (imágenes, no texto)
- PowerPoints convertidos a PDF
- Documentos fotografiados

## Soluciones (Ordenadas por Facilidad)

### Opción 1: Chrome Extension de Claude (Recomendada para pocos archivos)

**Cuándo usar:**
- 1-5 archivos por procesar
- Formato irregular
- Necesitas resultado rápido

**Ventajas:**
- No requiere instalación
- OCR visual automático
- Puede entender contexto
- No consume API credits

**Costo:** Gratis (incluido en Pro)

**Cómo usar:**
```
En Chrome con extensión Claude:
"Extrae datos de este PDF de tax sale"
```

---

### Opción 2: Google Vision API (Recomendada para automatización)

**Cuándo usar:**
- 10+ archivos
- Procesamiento recurrente
- Formato consistente

**Setup:**
```bash
# 1. Crear cuenta en Google Cloud
# 2. Habilitar Vision API
# 3. Crear API Key
export GOOGLE_CLOUD_API_KEY="tu-key"

# 4. Usar el script
npx ts-node scripts/pdf-ocr-extractor.ts archivo.pdf google
```

**Costo:**
- $1.50 por 1000 páginas (primeros 1000 gratis/mes)
- Para 100 condados × 5 páginas = $0.75/mes

**Precisión:** 95%+ para texto impreso

---

### Opción 3: AWS Textract (Alternativa a Google)

**Cuándo usar:**
- Ya usas AWS
- Necesitas tablas estructuradas
- Formularios con campos

**Setup:**
```bash
export AWS_ACCESS_KEY_ID="tu-key"
export AWS_SECRET_ACCESS_KEY="tu-secret"
export AWS_REGION="us-east-1"

npx ts-node scripts/pdf-ocr-extractor.ts archivo.pdf aws
```

**Costo:**
- $0.00125 por página (tablas)
- Similar a Google Vision

---

### Opción 4: Tesseract (Local, Gratis)

**Cuándo usar:**
- Sin presupuesto
- Privacidad importante
- Procesamiento masivo local

**Setup:**
```bash
# Mac
brew install tesseract

# Ubuntu
sudo apt-get install tesseract-ocr

# Usar
npx ts-node scripts/pdf-ocr-extractor.ts archivo.pdf tesseract
```

**Costo:** Gratis

**Precisión:** 85-90% (menor que cloud)

---

## Comparación Rápida

| Solución | Precisión | Costo | Setup | Velocidad |
|----------|-----------|-------|-------|-----------|
| Claude Chrome Ext | 90% | Gratis | Ninguno | Medio |
| Google Vision | 95% | ~$2/mes | API Key | Rápido |
| AWS Textract | 95% | ~$2/mes | API Key | Rápido |
| Tesseract | 85% | Gratis | Instalación | Lento |

## Recomendación por Volumen

### 1-10 PDFs/año
→ **Chrome Extension** (manual pero fácil)

### 10-100 PDFs/año
→ **Google Vision API** (automático, preciso)

### 100+ PDFs/año
→ **Tesseract local** (escalable, gratis)

## Implementación en el Proyecto

Ya creé `scripts/pdf-ocr-extractor.ts` que soporta los 3 proveedores.

Para agregar soporte OCR a cualquier condado:

1. Identificar si usa PDF/imágenes
2. Elegir proveedor OCR
3. Configurar API keys si es necesario
4. Ejecutar extractor
5. Importar CSV resultante

## Ejemplo Completo: Davis County

```bash
# Paso 1: Descargar PDF
# (hecho manualmente)

# Paso 2: Extraer con OCR
export GOOGLE_CLOUD_API_KEY="..."
npx ts-node scripts/pdf-ocr-extractor.ts \
  davis_2026_tax_sale.pdf \
  google

# Paso 3: Importar
# Ir a /import en la app
# Seleccionar Davis County
# Subir davis_2026_tax_sale-extracted.csv

# Paso 4: Enriquecer
curl -X POST http://localhost:3000/api/counties/davis/enrich-all
```

## Condados que Probablemente Necesiten OCR

Basado en investigación:

| Condado | Estado | Formato | Probabilidad OCR |
|---------|--------|---------|------------------|
| Davis | Utah | PowerPoint/PDF | Alta |
| Rich | Utah | Posible PDF | Media |
| Sanpete | Utah | Desconocido | Media |
| Rural TX counties | Texas | PDF escaneados | Alta |
| Rural FL counties | Florida | PDF escaneados | Alta |
| CA counties | California | Varía | Media |

## Notas Importantes

1. **Siempre verificar** los datos extraídos
2. OCR no es 100% preciso - revisar montos
3. Parcel numbers son críticos - verificar formato
4. Guardar PDF original por si acaso

## Próximos Pasos

Para implementar OCR completo:

1. [ ] Elegir proveedor (recomendado: Google Vision)
2. [ ] Crear cuenta y obtener API key
3. [ ] Probar con Davis County
4. [ ] Automatizar para futuros condados
5. [ ] Documentar en COUNTY_EXPANSION.md
