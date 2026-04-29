# Deploy TaxProperty via GitHub (Más Estable)

## Paso 1: Commit y Push a GitHub
```bash
# Agregar los cambios
git add .
git commit -m "V2.1 Demo Ready - Password protected"
git push origin main
```

## Paso 2: Conectar en Vercel Dashboard
1. Ve a https://vercel.com/new
2. Selecciona tu repo `garzonandres2004/taxproperty`
3. Click "Import"

## Paso 3: Configurar Variables
En el formulario de Vercel, agrega:

| Variable | Valor |
|----------|-------|
| `DEMO_PASSWORD` | `taxdemo2026` (o tu password) |
| `GOOGLE_MAPS_API_KEY` | (opcional) tu API key |

## Paso 4: Deploy
Click "Deploy"

## Ventajas
- Build más estable (caché de Vercel)
- Deploy automático en cada push
- Logs más detallados si falla

## Tu URL
Será algo como:
`https://taxproperty-utah.vercel.app`

## Acceso
- Página de login: `/private`
- Password: el que configuraste
- Cookie dura 7 días
