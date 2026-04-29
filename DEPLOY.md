# TaxProperty V2.1 - Deployment Guide

## Opción Recomendada: Vercel + Password Protection

Vercel es la plataforma oficial de Next.js y soporta todas las features de TaxProperty sin modificaciones. **Ahora con protección por password para mantenerlo privado.**

### Deploy en 3 Pasos

#### Paso 1: Preparar el Proyecto
```bash
# Asegúrate de tener el build funcionando
npm run build
```

#### Paso 2: Crear Cuenta e Instalar CLI
```bash
# Instalar Vercel CLI globalmente
npm i -g vercel

# Login (abre navegador para autorizar)
vercel login
```

#### Paso 3: Deploy
```bash
# Deploy interactivo (primera vez)
vercel

# Para producción
vercel --prod
```

### Variables de Entorno (Vercel Dashboard)

Ve a tu proyecto en [vercel.com](https://vercel.com) → Settings → Environment Variables:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DATABASE_URL` | `file:./prisma/dev.db` | SQLite local (para demo) |
| `GOOGLE_MAPS_API_KEY` | tu-api-key | Street View images |
| `DEMO_PASSWORD` | tu-password-secreto | **Password de acceso** |

**Nota:** Si no configuras `DEMO_PASSWORD`, el password por defecto es `taxdemo2026`.

---

## Acceso Privado

### ¿Cómo funciona?

1. Al entrar a la URL, se muestra página de login con password
2. Solo quienes conozcan el password pueden entrar
3. Cookie de auth dura 7 días
4. Puedes compartir link con token: `https://tuapp.com/dashboard?token=tu-password`

### Cambiar Password

Edita la variable `DEMO_PASSWORD` en el dashboard de Vercel y redeploya:
```bash
vercel --prod
```

---

## Opción Alternativa: Cloudflare Pages (Static Export)

**Limitaciones:** Modo solo-lectura, no hay importación de propiedades ni autenticación.

### Deploy en Cloudflare

```bash
# 1. Instalar Wrangler
npm install -g wrangler

# 2. Login
wrangler login

# 3. Usar config estática
cp next.config.static.ts next.config.ts

# 4. Build
npm run build

# 5. Deploy
wrangler pages deploy dist
```

---

## Acceso desde Móvil

Una vez deployado en Vercel, tendrás una URL como:
- `https://taxproperty-utah.vercel.app`

Esta URL funciona en:
- ✅ Celulares (iPhone, Android)
- ✅ Tablets
- ✅ Desktop
- ✅ Cualquier navegador moderno

La app es responsive y se adapta automáticamente.

---

## Solución de Problemas

### Error: "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### Error: "DATABASE_URL not set"
Configura la variable en Vercel Dashboard antes del deploy.

### Build falla
```bash
# Limpiar caché
rm -rf .next
npm run build
```

---

## Estado de Preparación

- ✅ Build exitoso
- ✅ API routes funcionando
- ✅ Datos exportados (127 propiedades)
- ✅ Configuración lista

**Listo para deploy en Vercel.**
