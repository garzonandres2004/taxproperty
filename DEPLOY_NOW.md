# Deploy TaxProperty V2.1 - PASSWORD PROTECTED

## Paso 1: Verificar Build Local
```bash
cd /Users/andres/Desktop/claude-projects/taxtpropertyidea/taxproperty-utah
npm run build
```

## Paso 2: Login en Vercel
```bash
npx vercel login
```

## Paso 3: Configurar Variables de Entorno
```bash
# Configurar password privado (cambia "mi-password-secreto")
npx vercel env add DEMO_PASSWORD
# Cuando pregunte: escribe tu password y presiona Enter

# Configurar Google Maps API (opcional, para imágenes)
npx vercel env add GOOGLE_MAPS_API_KEY
```

## Paso 4: Deploy
```bash
npx vercel --prod
```

## Paso 5: Acceder
1. Ve a la URL que te da Vercel (ej: `https://taxproperty-xyz.vercel.app`)
2. Te pedirá password
3. Default: `taxdemo2026` (o el que configuraste en DEMO_PASSWORD)

## Tu URL será:
- **Pública**: `https://[tu-proyecto].vercel.app`
- **Protegida**: Requiere password para entrar
- **Móvil**: Funciona en iPhone, Android, cualquier dispositivo

## Compartir Acceso
Link con password incluido:
```
https://[tu-proyecto].vercel.app/dashboard?token=mi-password-secreto
```

Listo para ejecutar.
