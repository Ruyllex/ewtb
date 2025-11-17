# 🗺️ MAPA VISUAL DEL PROYECTO - NewTube

**Última actualización:** Diciembre 2024  
**Estado:** ✅ Funcional y en producción

---

## 📊 VISTA GENERAL

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEWTUBE - ARQUITECTURA                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend (Next.js 15)  →  tRPC API  →  Drizzle ORM  →  DB    │
│       ↓                    ↓            ↓                       │
│   React Query          Type-Safe      PostgreSQL               │
│   Tailwind CSS         Endpoints      (NeonDB)                 │
│   Radix UI             Procedures                               │
│                                                                 │
│  Servicios Externos:                                            │
│  • Clerk (Auth)        • Mux (Video)    • Stripe (Pagos)       │
│  • UploadThing (Files) • Redis (Cache)  • Sentry (Errors)      │
│                        • Logtail (Logs)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ ARQUITECTURA DE CAPAS

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   (home)/    │  │  (studio)/   │  │   (auth)/    │     │
│  │  Páginas     │  │  Dashboard   │  │  Login/Reg   │     │
│  │  Públicas    │  │  Creador     │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE MÓDULOS UI                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Home  │ │Video │ │Chan. │ │Studio│ │Live  │ │Admin │   │
│  │      │ │      │ │      │ │      │ │      │ │      │   │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE API (tRPC)                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Video │ │Chan. │ │Studio│ │Live  │ │Monet.│ │Users │   │
│  │Router│ │Router│ │Router│ │Router│ │Router│ │Router│   │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE DATOS                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Drizzle ORM + Schema                    │  │
│  │  users | videos | channels | subscriptions | etc.    │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              PostgreSQL (NeonDB)                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 ESTRUCTURA DE DIRECTORIOS

```
newtb/
├── 📱 src/app/                          # Next.js App Router
│   ├── (auth)/                          # Rutas de autenticación
│   │   ├── sign-in/[[...sign-in]]/      # Login
│   │   └── sign-up/[[...sign-up]]/      # Registro
│   │
│   ├── (home)/                          # Páginas públicas
│   │   ├── page.tsx                     # Home principal
│   │   ├── video/[videoId]/             # Ver video
│   │   ├── channel/[username]/          # Perfil de canal
│   │   ├── search/                      # Resultados búsqueda
│   │   ├── admin/                       # Dashboard admin
│   │   ├── success/                     # Pago exitoso
│   │   └── cancel/                      # Pago cancelado
│   │
│   ├── (studio)/                        # Dashboard creador
│   │   └── studio/
│   │       ├── page.tsx                 # Dashboard principal
│   │       ├── videos/                  # Gestión videos
│   │       ├── live/                    # Streaming en vivo
│   │       ├── earnings/                # Ganancias
│   │       └── settings/                # Configuración
│   │
│   └── api/                             # API Routes
│       ├── trpc/[trpc]/                 # Endpoint tRPC
│       ├── uploadthing/                 # UploadThing handler
│       ├── videos/webhook/              # Webhook Mux
│       ├── users/webhook/               # Webhook Clerk
│       ├── stripe/                      # Stripe endpoints
│       └── webhooks/stripe/             # Webhook Stripe
│
├── 🧩 src/modules/                      # Módulos de funcionalidad
│   ├── home/                            # Página principal
│   │   └── ui/
│   │       ├── views/                   # Vistas principales
│   │       ├── components/              # Navbar, Sidebar
│   │       ├── sections/                # Secciones
│   │       └── layouts/                 # Layouts
│   │
│   ├── videos/                          # Sistema de videos
│   │   ├── server/procedures.ts         # tRPC procedures
│   │   └── ui/
│   │       ├── views/                   # VideoView, SearchResults
│   │       ├── components/              # VideoCard, Player
│   │       └── sections/                # VideosGrid
│   │
│   ├── channels/                        # Sistema de canales
│   │   ├── server/procedures.ts         # tRPC procedures
│   │   └── ui/
│   │       ├── views/                   # ChannelView
│   │       └── components/              # Header, Content, Videos
│   │
│   ├── studio/                          # Dashboard creador
│   │   ├── server/procedures.ts         # tRPC procedures
│   │   └── ui/
│   │       ├── views/                   # StudioView, VideoView
│   │       ├── components/              # Uploader, Modals
│   │       ├── sections/                # Form, Videos
│   │       └── layouts/                 # StudioLayout
│   │
│   ├── live/                            # Streaming en vivo
│   │   ├── server/procedures.ts         # tRPC procedures
│   │   └── ui/
│   │       ├── views/                   # LiveStreamView
│   │       └── components/              # CreateStreamModal
│   │
│   ├── monetization/                    # Sistema de pagos
│   │   ├── server/procedures.ts         # tRPC procedures
│   │   └── ui/
│   │       ├── views/                   # EarningsView
│   │       └── components/              # MonetizationModal
│   │
│   ├── users/                           # Gestión usuarios
│   │   ├── server/procedures.ts         # tRPC procedures
│   │   └── ui/
│   │       └── views/                   # SettingsView
│   │
│   ├── admin/                           # Panel administrador
│   │   └── ui/
│   │       └── views/                   # AdminDashboardView
│   │
│   ├── auth/                            # Autenticación
│   │   └── ui/
│   │       └── components/              # AuthButton
│   │
│   └── categories/                      # Categorías
│       └── server/procedores.ts         # tRPC procedures
│
├── 🗄️ src/db/                           # Base de datos
│   ├── schema.ts                        # Esquema Drizzle
│   └── index.ts                         # Conexión DB
│
├── 🔌 src/trpc/                         # tRPC setup
│   ├── routers/_app.ts                  # Router principal
│   ├── server.tsx                       # Server context
│   ├── client.tsx                       # Client setup
│   └── query-client.ts                  # React Query config
│
├── 🎨 src/components/                   # Componentes compartidos
│   ├── ui/                              # Radix UI components
│   └── [componentes reutilizables]
│
├── 🛠️ src/lib/                          # Utilidades
│   ├── mux.ts                           # Cliente Mux
│   ├── uploadthing.ts                   # UploadThing config
│   ├── redis.ts                         # Redis client
│   ├── logtail.ts                       # Logging
│   ├── sentry.ts                        # Error tracking
│   └── utils.ts                         # Utilidades generales
│
├── 📜 src/scripts/                      # Scripts de utilidad
│   ├── ensure-channels.ts               # Crear canales faltantes
│   ├── sync-admin-users.ts              # Sincronizar admins
│   ├── seed-categories.ts               # Seed categorías
│   └── seed-test-video.ts               # Seed video prueba
│
└── ⚙️ Configuración
    ├── package.json                     # Dependencias
    ├── tsconfig.json                    # TypeScript config
    ├── next.config.ts                   # Next.js config
    ├── drizzle.config.ts                # Drizzle config
    └── middleware.ts                    # Middleware Next.js
```

---

## 🗄️ ESQUEMA DE BASE DE DATOS

```
┌─────────────────────────────────────────────────────────────┐
│                    TABLAS PRINCIPALES                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐
│   users     │  ──┐
├─────────────┤    │
│ id (PK)     │    │
│ clerkId     │    │
│ name        │    │
│ username    │    │
│ imageUrl    │    │
│ isAdmin     │    │
│ stripeAcct  │    │
│ canMonetize │    │
│ dateOfBirth │    │
└─────────────┘    │
                   │
┌─────────────┐    │
│  channels   │  ──┼──┐
├─────────────┤    │  │
│ id (PK)     │    │  │
│ userId (FK) │────┘  │
│ name        │       │
│ description │       │
│ avatar      │       │
│ banner      │       │
│ isVerified  │       │
└─────────────┘       │
                      │
┌─────────────┐       │
│subscriptions│  ─────┼──┐
├─────────────┤       │  │
│ id (PK)     │       │  │
│ subscriberId│───────┘  │
│ channelId   │──────────┘
└─────────────┘

┌─────────────┐
│   videos    │  ──┐
├─────────────┤    │
│ id (PK)     │    │
│ userId (FK) │────┼──┐
│ title       │    │  │
│ description │    │  │
│ muxAssetId  │    │  │
│ thumbnail   │    │  │
│ visibility  │    │  │
│ categoryId  │────┼──┼──┐
└─────────────┘    │  │  │
                   │  │  │
┌─────────────┐    │  │  │
│ categories  │  ──┘  │  │
├─────────────┤       │  │
│ id (PK)     │       │  │
│ name        │       │  │
│ description │       │  │
└─────────────┘       │  │
                      │  │
┌─────────────┐       │  │
│live_streams │  ─────┘  │
├─────────────┤          │
│ id (PK)     │          │
│ userId (FK) │──────────┘
│ channelId   │
│ streamKey   │
│ playbackId  │
│ status      │
└─────────────┘

┌─────────────┐
│transactions │  ──┐
├─────────────┤    │
│ id (PK)     │    │
│ userId (FK) │────┘
│ type        │
│ amount      │
│ status      │
└─────────────┘

┌─────────────┐
│  balances   │  ──┐
├─────────────┤    │
│ id (PK)     │    │
│ userId (FK) │────┘
│ amount      │
└─────────────┘
```

---

## 🔄 FLUJOS PRINCIPALES

### 1. Flujo de Autenticación

```
Usuario → Clerk Sign In → Webhook Clerk → Crear Usuario en DB
                                              ↓
                                    Crear Canal Automático
                                              ↓
                                    Generar Username Único
```

### 2. Flujo de Subida de Video

```
Usuario → Studio → Seleccionar Video → Mux Direct Upload
                                              ↓
                                    Mux Procesa Video
                                              ↓
                                    Webhook Mux → Actualizar DB
                                              ↓
                                    Video Disponible
```

### 3. Flujo de Streaming en Vivo

```
Usuario → Studio/Live → Crear Stream → Mux Live API
                                              ↓
                                    Obtener Stream Key
                                              ↓
                                    Configurar OBS
                                              ↓
                                    Transmitir → Mux → Reproducir
```

### 4. Flujo de Monetización

```
Usuario → Settings → Verificar Requisitos → Stripe Connect
                                              ↓
                                    Onboarding Stripe
                                              ↓
                                    Habilitar Monetización
                                              ↓
                                    Recibir Tips/Suscripciones
```

### 5. Flujo de Búsqueda

```
Usuario → Buscar → tRPC videos.search → Buscar en DB
                                              ↓
                                    Videos por Título
                                    Canales por Nombre/Username
                                              ↓
                                    Mostrar Resultados
```

---

## 🎯 MÓDULOS Y FUNCIONALIDADES

### 📺 Módulo Videos
- ✅ Subida de videos (Mux Direct Upload)
- ✅ Procesamiento automático (Webhooks Mux)
- ✅ Thumbnails (UploadThing)
- ✅ Reproductor de video (Mux Player)
- ✅ Búsqueda de videos
- ✅ Filtrado por categorías
- ✅ Visibilidad (público/privado)

### 👤 Módulo Canales
- ✅ Página de canal por username
- ✅ Avatar y banner personalizables
- ✅ Sistema de suscripciones
- ✅ Contador de suscriptores
- ✅ Lista de videos del canal
- ✅ Streams en vivo del canal
- ✅ Verificación de canales (admin)

### 🎬 Módulo Studio
- ✅ Dashboard de creador
- ✅ Gestión de videos
- ✅ Subida de videos
- ✅ Edición de videos
- ✅ Estadísticas básicas
- ✅ Configuración de canal

### 🔴 Módulo Live Streaming
- ✅ Crear streams en vivo
- ✅ Integración con Mux Live
- ✅ Configuración OBS
- ✅ Reproductor de streams
- ✅ Lista de streams activos

### 💰 Módulo Monetización
- ✅ Stripe Connect onboarding
- ✅ Tips/Donaciones
- ✅ Suscripciones recurrentes
- ✅ Dashboard de ganancias
- ✅ Sistema de retiros
- ✅ Validación de requisitos

### 👥 Módulo Usuarios
- ✅ Perfil de usuario
- ✅ Configuración de cuenta
- ✅ Gestión de canal
- ✅ Cambio de avatar/banner
- ✅ Cambio de username

### 🛡️ Módulo Admin
- ✅ Dashboard administrativo
- ✅ Verificación de canales
- ✅ Lista de canales
- ✅ Gestión de usuarios

---

## 🔌 APIs Y ENDPOINTS

### tRPC Routers

```
appRouter
├── videos
│   ├── getPublic          # Obtener video público
│   ├── getMany            # Listar videos
│   ├── search             # Buscar videos y canales
│   └── getByCategory      # Videos por categoría
│
├── channels
│   ├── getByUsername      # Obtener canal
│   ├── getMyChannel       # Mi canal
│   ├── createOrGet        # Crear/obtener canal
│   ├── update             # Actualizar canal
│   ├── toggleSubscription # Suscribirse/desuscribirse
│   ├── isSubscribed       # Verificar suscripción
│   ├── getVideos          # Videos del canal
│   ├── getLiveStreams     # Streams del canal
│   ├── verifyChannel      # Verificar canal (admin)
│   └── getAll             # Todos los canales (admin)
│
├── studio
│   ├── getVideos          # Mis videos
│   ├── getVideo           # Video específico
│   ├── createUpload       # Crear upload Mux
│   ├── updateVideo        # Actualizar video
│   └── deleteVideo        # Eliminar video
│
├── live
│   ├── create             # Crear stream
│   ├── getMany            # Listar streams
│   ├── getById            # Stream específico
│   └── delete             # Eliminar stream
│
├── monetization
│   ├── getBalance         # Obtener balance
│   ├── getTransactions    # Transacciones
│   ├── getPayouts         # Retiros
│   └── requestPayout      # Solicitar retiro
│
├── users
│   ├── getProfile         # Perfil usuario
│   ├── updateProfile      # Actualizar perfil
│   └── isAdmin            # Verificar admin
│
└── categories
    └── getAll             # Todas las categorías
```

### API Routes (Next.js)

```
/api
├── trpc/[trpc]            # Endpoint tRPC principal
│
├── uploadthing/
│   ├── route.ts           # UploadThing handler
│   └── core.ts            # Uploaders config
│
├── videos/
│   ├── webhook/           # Webhook Mux
│   └── [videoId]/thumbnail/ # Thumbnail endpoint
│
├── users/
│   └── webhook/           # Webhook Clerk
│
├── stripe/
│   ├── connect/           # Stripe Connect onboarding
│   ├── tip/               # Endpoint tips
│   ├── subscription/      # Endpoint suscripciones
│   └── webhook/           # Webhook Stripe
│
└── webhooks/stripe/       # Webhook Stripe alternativo
```

---

## 🎨 COMPONENTES UI PRINCIPALES

### Componentes Compartidos (`src/components/ui/`)
- Button, Card, Dialog, Input, Select, Tabs, etc. (Radix UI)
- Avatar, Badge, Skeleton, Sonner (toasts)

### Componentes de Módulos

**Home:**
- `HomeNavbar` - Barra de navegación
- `HomeSidebar` - Sidebar principal
- `SearchInput` - Input de búsqueda
- `CategoriesSection` - Carrusel de categorías

**Videos:**
- `VideoCard` - Tarjeta de video
- `VideoPlayer` - Reproductor Mux
- `VideoThumbnail` - Thumbnail con overlay
- `VideosGridSection` - Grid de videos

**Channels:**
- `ChannelHeader` - Header del canal
- `ChannelContent` - Contenido con tabs
- `ChannelVideos` - Lista de videos
- `ChannelLiveStreams` - Streams en vivo

**Studio:**
- `StudioUploader` - Componente de subida
- `StudioUploadModal` - Modal de subida
- `VideoPreviewForm` - Formulario de video
- `ThumbnailUploadModal` - Modal de thumbnail

**Live:**
- `CreateLiveStreamModal` - Modal crear stream
- `LiveStreamView` - Vista de stream

**Monetization:**
- `MonetizationModal` - Modal de monetización
- `MonetizationStatusCard` - Estado monetización

---

## 🔐 AUTENTICACIÓN Y AUTORIZACIÓN

```
┌─────────────────────────────────────────┐
│         Clerk Authentication            │
├─────────────────────────────────────────┤
│                                         │
│  Sign In → Clerk → JWT Token           │
│              ↓                          │
│  Middleware → Verificar Token          │
│              ↓                          │
│  tRPC Context → User Info              │
│              ↓                          │
│  Protected Procedures                   │
│                                         │
└─────────────────────────────────────────┘

Roles:
├── Usuario Normal
│   ├── Ver videos
│   ├── Crear canal
│   ├── Subir videos
│   └── Suscribirse a canales
│
├── Creador
│   ├── Todo lo anterior +
│   ├── Gestionar videos
│   ├── Streaming en vivo
│   └── Monetización (si cumple requisitos)
│
└── Administrador
    ├── Todo lo anterior +
    ├── Verificar canales
    ├── Acceso dashboard admin
    └── Gestión de usuarios
```

---

## 🚀 SERVICIOS EXTERNOS

### Clerk (Autenticación)
- Sign In/Sign Up
- Webhooks para sincronización
- User management

### Mux (Video)
- Direct Uploads
- Video processing
- Live streaming
- Webhooks para actualización de estado

### UploadThing (Archivos)
- Thumbnails de videos
- Avatares de canales
- Banners de canales

### Stripe (Pagos)
- Connect para creadores
- Tips/Donaciones
- Suscripciones recurrentes
- Webhooks para transacciones

### Redis (Upstash)
- Rate limiting
- Caching
- Session management

### Sentry (Errores)
- Error tracking
- Performance monitoring

### Logtail (Logs)
- Structured logging
- Server and browser logs

---

## 📊 ESTADO DE IMPLEMENTACIÓN

### ✅ Completado (100%)
- ✅ Autenticación (Clerk)
- ✅ Sistema de videos
- ✅ Sistema de canales
- ✅ Suscripciones
- ✅ Búsqueda
- ✅ Streaming en vivo
- ✅ Monetización (Stripe)
- ✅ Dashboard admin
- ✅ Configuración de usuario

### 🟡 En Mejora Continua
- 🟡 Optimización de performance
- 🟡 Mejoras de UX
- 🟡 Testing

### 🔮 Futuras Mejoras
- 🔮 Sistema de comentarios
- 🔮 Likes/Dislikes
- 🔮 Playlists
- 🔮 Notificaciones
- 🔮 Analytics avanzados

---

## 🛠️ TECNOLOGÍAS PRINCIPALES

### Frontend
- **Next.js 15** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS 4** - Estilos
- **Radix UI** - Componentes accesibles
- **React Query** - Data fetching y caching
- **tRPC** - APIs type-safe

### Backend
- **tRPC** - API layer type-safe
- **Drizzle ORM** - ORM para PostgreSQL
- **PostgreSQL** - Base de datos (NeonDB)

### Servicios
- **Clerk** - Autenticación
- **Mux** - Video processing y streaming
- **UploadThing** - File uploads
- **Stripe** - Pagos
- **Upstash Redis** - Caching
- **Sentry** - Error tracking
- **Logtail** - Logging

---

## 📝 SCRIPTS DISPONIBLES

```bash
# Desarrollo
npm run dev              # Servidor desarrollo
npm run build            # Build producción
npm run start            # Servidor producción

# Base de datos
npm run drizzle:push     # Push schema a DB
npm run drizzle:studio   # Abrir Drizzle Studio

# Utilidades
npm run ensure:channels  # Crear canales faltantes
npm run sync:admins      # Sincronizar administradores
npm run verify:logtail   # Verificar Logtail
npm run verify:mux-live  # Verificar Mux Live
npm run verify:sentry    # Verificar Sentry
```

---

## 🎯 PRÓXIMOS PASOS SUGERIDOS

1. **Sistema de Comentarios**
   - Tabla `comments` en DB
   - Endpoints tRPC
   - UI de comentarios

2. **Mejoras de UX**
   - Loading states mejorados
   - Animaciones
   - Optimización de imágenes

3. **Analytics**
   - Vistas de videos
   - Estadísticas de canal
   - Dashboard de analytics

4. **Notificaciones**
   - Notificaciones en tiempo real
   - Email notifications
   - Push notifications

---

**Última actualización:** Diciembre 2024  
**Mantenido por:** Equipo de desarrollo NewTube

