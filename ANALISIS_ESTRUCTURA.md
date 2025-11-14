# 📋 Análisis Completo de la Estructura del Repositorio

## 🏗️ Arquitectura General

Este proyecto sigue una **arquitectura modular** basada en features, donde cada funcionalidad está encapsulada en su propio módulo. Utiliza **Next.js 15** con App Router, **tRPC** para APIs type-safe, y **Drizzle ORM** para la base de datos.

---

## 📁 Estructura de Directorios y Responsabilidades

### 1. `/src/app/` - Rutas de Next.js (App Router)

#### **`(auth)/`** - Rutas de Autenticación

- **`sign-in/[[...sign-in]]/page.tsx`**: Página de inicio de sesión (Clerk)
- **`sign-up/[[...sign-up]]/page.tsx`**: Página de registro (Clerk)
- **`layout.tsx`**: Layout para páginas de autenticación

**✅ Estado**: Implementado y funcionando

---

#### **`(home)/`** - Página Principal

- **`page.tsx`**: Página principal que muestra videos
- **`client.tsx`**: Componente cliente para interactividad
- **`layout.tsx`**: Layout con navbar y sidebar

**✅ Estado**: Implementado (básico)
**🛠️ Pendiente**:

- Sistema de búsqueda funcional (actualmente solo UI)
- Página de detalle de video individual
- Sistema de recomendaciones

---

#### **`(studio)/`** - Área de Estudio (Dashboard de Creadores)

- **`studio/page.tsx`**: Lista de videos del usuario
- **`studio/videos/[videoId]/page.tsx`**: Editor de video individual
- **`layout.tsx`**: Layout con navbar y sidebar del estudio

**✅ Estado**: Implementado (básico)
**🛠️ Pendiente**:

- Analíticas de videos (vistas, engagement)
- Configuración avanzada de video
- Gestión de playlists

---

#### **`api/`** - Endpoints de API

##### **`trpc/[trpc]/route.ts`**

- Handler principal de tRPC
- **✅ Estado**: Implementado

##### **`uploadthing/`**

- **`core.ts`**: Configuración de UploadThing para thumbnails
- **`route.ts`**: Handler de rutas de UploadThing
- **✅ Estado**: Implementado

##### **`users/webhook/route.ts`**

- Webhook de Clerk para sincronizar usuarios
- Maneja: `user.created`, `user.updated`, `user.deleted`
- **✅ Estado**: Implementado

##### **`videos/webhook/route.ts`**

- Webhook de Mux para actualizar estado de videos
- Maneja: `video.asset.created`, `video.asset.ready`, `video.asset.errored`, `video.asset.deleted`, `video.asset.track.ready`
- **✅ Estado**: Implementado

---

### 2. `/src/components/` - Componentes UI Reutilizables

#### **`ui/`** - Componentes de Radix UI + shadcn/ui

- Componentes base: `button`, `card`, `dialog`, `input`, `select`, etc.
- **✅ Estado**: Implementado (biblioteca completa)

#### **Componentes Específicos**:

- **`filter-carousel.tsx`**: Carrusel de filtros/categorías
- **`infinite-scroll.tsx`**: Scroll infinito para paginación
- **`responsive-dialog.tsx`**: Diálogo responsivo
- **`user-avatar.tsx`**: Avatar de usuario
- **✅ Estado**: Implementado

---

### 3. `/src/db/` - Base de Datos

#### **`schema.ts`** - Esquema de Base de Datos (Drizzle ORM)

**Tablas implementadas**:

1. **`users`**

   - Campos: `id`, `clerkId`, `name`, `imageUrl`, `createdAt`, `updatedAt`
   - **🛠️ Pendiente**: Campo `banner` (mencionado en TODO)

2. **`categories`**

   - Campos: `id`, `name`, `description`, `createdAt`, `updatedAt`
   - **✅ Estado**: Implementado

3. **`videos`**
   - Campos: `id`, `title`, `description`, `muxStatus`, `muxAssetId`, `muxUploadId`, `muxPlaybackId`, `muxTrackId`, `muxTrackStatus`, `thumbnailUrl`, `thumbnailKey`, `previewUrl`, `previewKey`, `duration`, `visibility`, `userId`, `categoryId`, `createdAt`, `updatedAt`
   - **✅ Estado**: Implementado

**🛠️ Tablas pendientes** (según README):

- `comments` - Sistema de comentarios
- `playlists` - Playlists de usuarios
- `subscriptions` - Suscripciones a canales
- `notifications` - Notificaciones
- `watch_history` - Historial de visualización
- `likes` / `dislikes` - Sistema de likes
- `analytics` - Analíticas de videos

#### **`index.ts`** - Configuración de Drizzle

- **✅ Estado**: Implementado

---

### 4. `/src/modules/` - Módulos por Feature

Esta es la **arquitectura modular** del proyecto. Cada módulo contiene su lógica de servidor (tRPC) y UI.

#### **`auth/`** - Autenticación

```
auth/
  ui/
    components/
      auth-button.tsx  # Botón de autenticación
```

**✅ Estado**: Implementado (básico)
**🛠️ Pendiente**:

- Menú de perfil de usuario (mencionado en TODO)
- Diferentes estados de autenticación (mencionado en TODO)

---

#### **`categories/`** - Categorías

```
categories/
  server/
    procedores.ts  # tRPC: getMany
```

**Endpoints tRPC**:

- `categories.getMany` - Obtener todas las categorías

**✅ Estado**: Implementado

---

#### **`home/`** - Página Principal

```
home/
  ui/
    components/
      home-navbar/
        index.tsx           # Navbar principal
        search-input.tsx    # Input de búsqueda (UI only)
      home-sidebar/
        index.tsx           # Sidebar principal
        main-section.tsx    # Sección principal del sidebar
        personal-section.tsx # Sección personal del sidebar
    layouts/
      home-layout.tsx       # Layout de la página principal
    sections/
      categories-section.tsx # Sección de categorías
    views/
      home-view.tsx         # Vista principal
```

**✅ Estado**: Implementado (UI completa)
**🛠️ Pendiente**:

- Funcionalidad de búsqueda (actualmente solo UI)
- Detección de ruta activa en sidebar (mencionado en TODO)
- Página de video individual
- Sistema de recomendaciones

---

#### **`studio/`** - Área de Estudio

```
studio/
  server/
    procedures.ts  # tRPC: getOne, getMany
  ui/
    components/
      studio-navbar/
        index.tsx              # Navbar del estudio
      studio-sidebar/
        index.tsx              # Sidebar del estudio
        studio-sidebar-header.tsx
      studio-upload-modal.tsx  # Modal de subida
      studio-uploader.tsx      # Componente de subida (Mux)
      thumbnail-upload-modal.tsx # Modal de thumbnail
    layouts/
      studio-layout.tsx        # Layout del estudio
    sections/
      form-section.tsx         # Formulario de edición de video
      videos-section.tsx       # Lista de videos del usuario
    views/
      studio-view.tsx          # Vista principal del estudio
      video-view.tsx           # Vista de edición de video
```

**Endpoints tRPC**:

- `studio.getOne` - Obtener un video por ID
- `studio.getMany` - Obtener videos del usuario (paginación infinita)

**✅ Estado**: Implementado (básico)
**🛠️ Pendiente**:

- Analíticas de videos
- Configuración avanzada
- Gestión de playlists
- Sistema de comentarios en videos

---

#### **`videos/`** - Gestión de Videos

```
videos/
  constants.ts           # Constantes relacionadas con videos
  server/
    procedures.ts        # tRPC: create, update, remove, restoreThumbnail
  ui/
    components/
      video-player.tsx   # Reproductor de video (Mux Player)
      video-thumbnail.tsx # Thumbnail de video
```

**Endpoints tRPC**:

- `videos.create` - Crear nuevo video (inicia upload en Mux)
- `videos.update` - Actualizar video (título, descripción, categoría, visibilidad)
- `videos.remove` - Eliminar video
- `videos.restoreThumbnail` - Restaurar thumbnail desde Mux

**✅ Estado**: Implementado
**🛠️ Pendiente**:

- Endpoint para obtener videos públicos (para página principal)
- Endpoint para obtener video individual (para página de detalle)
- Sistema de likes/dislikes
- Sistema de comentarios
- Sistema de recomendaciones

---

### 5. `/src/trpc/` - Configuración de tRPC

#### **`routers/_app.ts`**

- Router principal que combina todos los routers
- **✅ Estado**: Implementado

#### **`init.ts`**

- Configuración de tRPC (context, middleware)
- **✅ Estado**: Implementado
- **🛠️ Pendiente**: Generar problema para build (mencionado en TODO)

#### **`server.tsx`**

- Helpers para usar tRPC en servidor
- **✅ Estado**: Implementado

#### **`client.tsx`**

- Configuración de cliente tRPC
- **✅ Estado**: Implementado

#### **`query-client.ts`**

- Configuración de React Query
- **✅ Estado**: Implementado

---

### 6. `/src/lib/` - Utilidades y Configuraciones

- **`mux.ts`**: Cliente de Mux
- **`redis.ts`**: Cliente de Upstash Redis
- **`ratelimit.ts`**: Rate limiting con Redis
- **`uploadthing.ts`**: Configuración de UploadThing
- **`utils.ts`**: Utilidades generales (cn, etc.)

**✅ Estado**: Implementado

---

### 7. `/src/hooks/` - Custom React Hooks

- **`use-intersection-observer.ts`**: Hook para intersection observer
- **`use-mobile.tsx`**: Hook para detectar dispositivos móviles

**✅ Estado**: Implementado

---

### 8. `/src/providers/` - Context Providers

- **`index.tsx`**: Providers de React (tRPC, Query, etc.)

**✅ Estado**: Implementado

---

### 9. `/src/scripts/` - Scripts Utilitarios

- **`seed-categories.ts`**: Script para poblar categorías iniciales
- **✅ Estado**: Implementado

---

### 10. `/src/middleware.ts` - Middleware de Next.js

- Maneja autenticación con Clerk
- Excluye rutas de webhook
- **✅ Estado**: Implementado

---

## 🛠️ Funcionalidades Pendientes (Según README)

### 🔴 Alta Prioridad

1. **Sistema de Búsqueda**

   - Implementar lógica de búsqueda en `home-navbar/search-input.tsx`
   - Crear endpoint tRPC `videos.search`
   - Agregar índice de búsqueda en base de datos

2. **Página de Video Individual**

   - Crear ruta `/video/[videoId]`
   - Componente de reproductor completo
   - Información del video (título, descripción, autor, fecha)
   - Sistema de likes/dislikes
   - Sistema de comentarios

3. **Perfiles y Canales de Usuario**
   - Agregar campo `banner` a tabla `users`
   - Crear página `/channel/[userId]`
   - Mostrar videos del canal
   - Información del canal

### 🟡 Media Prioridad

4. **Sistema de Comentarios**

   - Crear tabla `comments` en schema
   - Endpoints tRPC para crear/obtener comentarios
   - UI de comentarios en página de video
   - Sistema de respuestas (comentarios anidados)

5. **Playlists**

   - Crear tabla `playlists` y `playlist_videos`
   - Endpoints tRPC para gestionar playlists
   - UI para crear/editar playlists
   - Agregar videos a playlists

6. **Suscripciones**

   - Crear tabla `subscriptions`
   - Endpoints tRPC para suscribirse/desuscribirse
   - UI de botón de suscripción
   - Lista de canales suscritos

7. **Notificaciones**
   - Crear tabla `notifications`
   - Sistema de notificaciones en tiempo real
   - UI de centro de notificaciones

### 🟢 Baja Prioridad

8. **Recomendaciones Inteligentes**

   - Algoritmo de recomendaciones basado en:
     - Videos vistos
     - Categorías preferidas
     - Canales suscritos
   - Endpoint tRPC `videos.recommendations`

9. **Historial de Visualización**

   - Crear tabla `watch_history`
   - Guardar videos vistos
   - Endpoint para obtener historial
   - UI de historial

10. **Analíticas para Creadores**

    - Crear tabla `analytics` o `video_stats`
    - Tracking de vistas, likes, comentarios
    - Dashboard de analíticas en `/studio/analytics`
    - Gráficos y métricas

11. **Testing**

    - Configurar Vitest
    - Tests unitarios
    - Tests E2E con Cypress

12. **Mejoras de Accesibilidad**

    - Auditar con herramientas WCAG
    - Mejorar ARIA labels
    - Navegación por teclado

13. **Optimización de Performance**
    - Lighthouse audit
    - Bundle splitting
    - Optimización de imágenes
    - Lazy loading

---

## 📝 TODOs Encontrados en el Código

1. **`src/db/schema.ts`**: Agregar campo `banner` a tabla `users`
2. **`src/modules/auth/ui/components/auth-button.tsx`**:
   - Agregar diferentes estados de autenticación
   - Agregar menú de perfil de usuario
3. **`src/modules/videos/server/procedures.ts`**: Restringir `cors_origin` en producción
4. **`src/modules/home/ui/components/home-sidebar/main-section.tsx`**: Detectar ruta activa
5. **`src/modules/home/ui/components/home-sidebar/personal-section.tsx`**: Detectar ruta activa
6. **`src/modules/home/ui/components/home-navbar/search-input.tsx`**:
   - Implementar funcionalidad de búsqueda
   - Agregar botón para remover búsqueda
7. **`src/modules/studio/ui/sections/form-section.tsx`**: Agregar sección de thumbnail
8. **`src/trpc/init.ts`**: Generar problema para build

---

## 🎯 Plan de Implementación Sugerido

### Fase 1: Funcionalidades Básicas

1. ✅ Sistema de búsqueda
2. ✅ Página de video individual
3. ✅ Sistema de likes/dislikes básico

### Fase 2: Interacción Social

4. ✅ Sistema de comentarios
5. ✅ Perfiles y canales de usuario
6. ✅ Suscripciones

### Fase 3: Funcionalidades Avanzadas

7. ✅ Playlists
8. ✅ Historial de visualización
9. ✅ Recomendaciones

### Fase 4: Analíticas y Optimización

10. ✅ Analíticas para creadores
11. ✅ Testing
12. ✅ Optimización de performance

---

## 📚 Recursos y Referencias

- **Next.js 15 Docs**: https://nextjs.org/docs
- **tRPC Docs**: https://trpc.io/docs
- **Drizzle ORM Docs**: https://orm.drizzle.team/docs
- **Mux Docs**: https://docs.mux.com
- **Clerk Docs**: https://clerk.com/docs

---

**Última actualización**: Basado en análisis del código actual del repositorio
