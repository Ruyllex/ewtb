# 📺 Instrucciones para Implementar Canales y Comunidad

## ✅ Funcionalidades Implementadas

### 1. Base de Datos
- ✅ Tabla `channels` con campos: `user_id`, `banner`, `description`, `avatar`, `name`, `is_verified`
- ✅ Tabla `subscriptions` para manejar suscripciones a canales
- ✅ Campo `username` agregado a la tabla `users` para URLs de canales

### 2. Frontend
- ✅ Página dinámica `/channel/[username]` que muestra información del canal
- ✅ Subida de avatar y banner usando UploadThing
- ✅ Botón "Suscribirse" para manejar suscripciones
- ✅ Contador visible de suscriptores

### 3. Sección "Videos y En Vivo"
- ✅ Mostrar streams activos con indicador **LIVE 🔴**
- ✅ Mostrar videos on demand (VOD)

### 4. Canales Verificados
- ✅ Campo `is_verified` en la tabla `channels`
- ✅ Mostrar **✅ check azul** junto al nombre del canal cuando esté verificado

## 🚀 Pasos para Aplicar los Cambios

### Paso 1: Aplicar Migraciones de Base de Datos

Ejecuta el siguiente comando para aplicar los cambios al esquema de la base de datos:

```bash
npm run drizzle:push
```

Esto creará:
- Campo `username` en la tabla `users`
- Tabla `channels`
- Tabla `subscriptions`
- Índices necesarios

### Paso 2: Crear Canales para Usuarios Existentes

Si ya tienes usuarios en tu base de datos, ejecuta el script para crear canales automáticamente:

```bash
npm run ensure:channels
```

Este script:
- Busca todos los usuarios sin canal
- Genera un username único para cada uno
- Crea un canal asociado a cada usuario

### Paso 3: Verificar Configuración de UploadThing

Asegúrate de tener configurado UploadThing en tu `.env.local`:

```env
UPLOADTHING_TOKEN=sk_live_...
UPLOADTHING_SECRET=sk_live_...
```

Los nuevos uploaders (`channelAvatarUploader` y `channelBannerUploader`) ya están configurados y funcionarán automáticamente.

### Paso 4: Probar la Funcionalidad

1. **Crear un canal automáticamente:**
   - Cuando un usuario se registre, se creará automáticamente un canal
   - También puedes llamar a `trpc.channels.createOrGet.mutate()` desde el frontend

2. **Acceder a un canal:**
   - Visita `/channel/[username]` donde `username` es el username del usuario
   - Ejemplo: `/channel/johndoe`

3. **Subir avatar y banner:**
   - Si eres el dueño del canal, verás botones para subir avatar y banner
   - Los botones aparecen al hacer hover sobre el avatar/banner

4. **Suscribirse a un canal:**
   - Haz clic en el botón "Suscribirse" en la página del canal
   - El contador de suscriptores se actualizará automáticamente

5. **Ver videos y streams:**
   - La página del canal tiene dos pestañas: "Videos" y "En Vivo"
   - Los streams activos se muestran con un indicador "EN VIVO 🔴"

## 🔧 Funcionalidades Adicionales

### Verificar un Canal (Admin)

Para verificar un canal, puedes usar el procedimiento tRPC:

1. **Configurar admins en `.env.local`:**
```env
# IDs de usuarios administradores (separados por comas)
# Puedes usar el ID de la base de datos o el Clerk ID
ADMIN_USER_IDS=user-id-1,user-id-2,clerk-id-3
```

2. **Usar el procedimiento desde el frontend o API:**
```typescript
// Verificar un canal
trpc.channels.verifyChannel.mutate({ channelId: "canal-id" });

// Desverificar un canal
trpc.channels.unverifyChannel.mutate({ channelId: "canal-id" });
```

**Nota:** Solo los usuarios listados en `ADMIN_USER_IDS` pueden verificar/desverificar canales.

### Actualizar Información del Canal

Los usuarios pueden actualizar su canal usando:

```typescript
trpc.channels.update.mutate({
  name: "Nuevo nombre",
  description: "Nueva descripción",
  username: "nuevo-username", // Opcional, debe ser único
});
```

## 📝 Notas Importantes

1. **Usernames únicos:** El sistema genera automáticamente usernames únicos basados en el nombre del usuario. Si un username ya existe, se agrega un número al final.

2. **Canales automáticos:** Cada usuario nuevo obtiene automáticamente un canal cuando se registra (vía webhook de Clerk).

3. **Suscripciones:** Un usuario no puede suscribirse a su propio canal.

4. **Streams en vivo:** Solo se muestran streams con `status = 'active'` en la sección "En Vivo".

5. **Videos públicos:** Solo se muestran videos con `visibility = 'public'` en la página del canal.

## 🐛 Solución de Problemas

### Error: "Canal no encontrado"
- Asegúrate de que el usuario tenga un canal creado
- Ejecuta `npm run ensure:channels` para crear canales faltantes

### Error: "Username ya está en uso"
- El sistema intenta generar un username único automáticamente
- Si persiste, verifica que no haya duplicados en la base de datos

### Los uploads de avatar/banner no funcionan
- Verifica que UploadThing esté configurado correctamente
- Revisa la consola del navegador para errores
- Asegúrate de que el usuario tenga un canal creado

## ✨ Próximos Pasos Sugeridos

1. **Panel de administración:** Crear una interfaz para verificar canales
2. **Notificaciones:** Notificar a los suscriptores cuando un canal publique un nuevo video
3. **Estadísticas:** Agregar estadísticas de visualización por canal
4. **Personalización:** Permitir más opciones de personalización del canal

