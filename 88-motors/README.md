# 88 Motors — Plataforma para el Dealership

Aplicación web completa para **88 Motors**: página pública para los clientes,
panel de administración para el dealer, CRM de clientes (Connect) y un centro
de publicación que unifica la página web, Facebook Marketplace, Facebook e
Instagram desde un solo lugar.

> App independiente dentro de este repositorio (carpeta `88-motors/`).
> No comparte código ni base de datos con la plataforma de tax properties.

## Cómo arrancar

```bash
cd 88-motors
npm install
cp .env.example .env       # ajusta teléfono, dirección y contraseña
npx prisma db push          # crea la base de datos SQLite
npm run db:seed             # (opcional) carga 6 carros y 2 clientes de ejemplo
npm run dev                 # http://localhost:3088
```

- **Página pública**: http://localhost:3088
- **Panel del dealer**: http://localhost:3088/admin — contraseña por defecto: `88motors`
  (cámbiala con `ADMIN_PASSWORD` en `.env`)

## Qué incluye

### 🌐 Página pública (en inglés, para los clientes)
- Home con carros destacados
- Inventario con búsqueda, filtros por marca/precio y ordenamiento
- Página de cada carro: galería de fotos, especificaciones, equipamiento
- Formulario de contacto en cada carro → crea un lead automáticamente
- Botones de llamar directo desde el celular

### 🚗 Manejo de inventario (panel en español)
- Agregar/editar/borrar carros con todos los campos (VIN, millaje, precio,
  costo privado, condición, título, colores, equipamiento, etc.)
- Subida de fotos (o por link), reordenar, foto principal
- Estados: Borrador → Disponible → Apartado → Vendido (con precio final)
- Dashboard: carros disponibles, vendidos del mes, valor del inventario y
  **ganancia del mes** (precio de venta − costo)

### 💬 Connect — CRM de clientes
- Los mensajes de la página web llegan solos como "cliente nuevo"
- Registro manual de clientes de Marketplace, llamadas o visitas al lote
- Pipeline: Nuevo → Contactado → Negociando → Cita → Vendido/Perdido
- Notas de seguimiento por cliente
- Botones directos: 📞 Llamar, 💬 SMS, 🟢 WhatsApp, ✉️ Email

### 📣 Centro de publicación (la unificación)
Desde la página de cada carro → botón **Publicar**:

- **Página web**: ya publicado automáticamente, con link para compartir
- **Facebook Marketplace**: Facebook **no permite** publicar en Marketplace
  desde otras apps (no hay API pública). La plataforma genera la plantilla con
  los campos **en el mismo orden que el formulario de Marketplace** (Year,
  Make, Model, Mileage, Price, Condition, Description...), cada uno con botón
  de copiar + botón que abre el formulario de Marketplace. Publicar toma
  menos de 2 minutos.
- **Facebook (página)**: post completo listo para copiar. Si algún día se
  conecta un token de la Graph API (`FB_PAGE_ID` + `FB_PAGE_ACCESS_TOKEN` en
  `.env`), el botón "⚡ Publicar automáticamente" lo postea solo.
- **Instagram**: caption listo con emojis y hashtags para pegar desde el
  teléfono.
- **Historial**: registro de dónde y cuándo se publicó cada carro (marcas
  "Marketplace ✓ / Facebook ✓ / Instagram ✓" en el inventario).

## Estructura

```
88-motors/
├── prisma/schema.prisma      # Vehicle, Photo, Lead, LeadNote, SocialPost
├── prisma/seed.mjs           # datos de demostración
└── src/
    ├── lib/social.ts         # generador de plantillas (Marketplace/FB/IG)
    ├── lib/auth.ts           # login simple por contraseña (cookie)
    ├── app/                  # páginas públicas: /, /inventory, /contact
    ├── app/admin/            # panel: dashboard, inventario, publicar, clientes
    └── app/api/              # REST: vehicles, leads, upload, social
```

## Notas para producción
- Cambia `ADMIN_PASSWORD` y `NEXT_PUBLIC_SITE_URL` en `.env`
- Las fotos se guardan en `public/uploads/` (disco local). Para desplegar en
  serverless (Vercel), cambiar a un storage como S3/Cloudinary o usar links.
- SQLite funciona perfecto para un dealership pequeño; para Vercel usar Turso
  o Postgres cambiando el `datasource` de Prisma.
