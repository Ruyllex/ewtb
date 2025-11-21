# Migración de Mux a Amazon IVS y S3

Este documento describe el proceso de migración de Mux a Amazon IVS (para transmisiones en vivo) y Amazon S3 (para almacenamiento de videos).

## Resumen de Cambios

### Tecnologías Reemplazadas

- **Mux Video** → **Amazon S3** (almacenamiento y reproducción de videos)
- **Mux Live** → **Amazon IVS** (transmisiones en vivo)
- **Mux Player** → **Amazon IVS Player** (para live) y **HTML5 Video** (para VOD)

### Campos de Base de Datos

#### Tabla `videos` - Eliminados:
- `mux_asset_id`
- `mux_playback_id`
- `mux_upload_id`
- `mux_status`
- `mux_track_id`
- `mux_track_status`

#### Tabla `videos` - Agregados (ya existentes):
- `s3_key` - Clave del archivo en S3
- `s3_url` - URL pública del video en S3

#### Tabla `live_streams` - Eliminados:
- `mux_live_stream_id`
- `mux_stream_key`
- `mux_playback_id`

#### Tabla `live_streams` - Agregados (ya existentes):
- `ivs_channel_arn` - ARN del canal IVS
- `ivs_stream_key` - Stream key de IVS
- `ivs_playback_url` - URL de reproducción del stream
- `ivs_ingest_endpoint` - Endpoint RTMP para ingest

## Pasos de Migración

### 1. Configurar Credenciales AWS

Agregar las siguientes variables de entorno a tu archivo `.env.local`:

```env
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=tu-bucket-name
AWS_CLOUDFRONT_DOMAIN=tu-dominio.cloudfront.net  # Opcional, para CDN
```

### 2. Configurar Permisos IAM

El usuario IAM debe tener los siguientes permisos:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ivs:*",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:PutObjectAcl"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. Configurar Bucket S3

1. Crear un bucket S3 en la región configurada
2. Configurar CORS si es necesario:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```
3. Configurar política de acceso público o usar CloudFront

### 4. Ejecutar Migración de Base de Datos

#### Opción A: Usar el script TypeScript (Recomendado)

```bash
npm run migrate:remove-mux
```

Este script:
- Verifica qué columnas de Mux existen
- Las elimina de forma segura usando `DROP COLUMN IF EXISTS`
- Proporciona feedback detallado del proceso

#### Opción B: Ejecutar SQL manualmente

```bash
psql -d tu_database -f drizzle/migrate-remove-mux-fields.sql
```

O ejecuta el SQL directamente en tu cliente de base de datos.

### 5. Sincronizar Esquema con Drizzle

Después de ejecutar la migración, sincroniza el esquema:

```bash
npm run drizzle:push
```

### 6. Verificar Migración

1. Verifica que no haya errores en la aplicación
2. Intenta subir un video desde el Studio
3. Verifica que el video aparece en el bucket S3
4. Verifica que el video se reproduce correctamente
5. Crea un stream en vivo y verifica que se crea el canal en IVS

## Componentes Actualizados

### Backend

- ✅ `src/modules/videos/server/procedures.ts` - Usa S3 para subida y reproducción
- ✅ `src/modules/live/server/procedures.ts` - Usa IVS para streams en vivo
- ✅ `src/modules/studio/server/procedures.ts` - Eliminadas referencias a campos Mux
- ✅ `src/lib/aws.ts` - Clientes AWS (IVS y S3)

### Frontend

- ✅ `src/modules/videos/ui/components/video-player.tsx` - Soporta IVS y HTML5 video
- ✅ `src/modules/studio/ui/components/studio-uploader.tsx` - Subida directa a S3
- ✅ `src/modules/live/ui/views/live-stream-view.tsx` - Usa IVS Player
- ✅ `src/modules/channels/ui/components/channel-live-streams.tsx` - Usa IVS Player

## Archivos Deshabilitados

- `src/lib/mux.ts` - Deshabilitado (mantenido para referencia histórica)
- `src/app/api/videos/webhook/route.ts` - Deshabilitado (retorna 410 Gone)
- `scripts/verify-mux-live.ts` - Eliminado

## Notas Importantes

1. **Videos antiguos**: Los videos que fueron subidos con Mux y aún tienen `mux_playback_id` no se reproducirán correctamente. Necesitarás:
   - Migrar esos videos a S3 manualmente, o
   - Mantener ambos sistemas hasta completar la migración

2. **Thumbnails**: Con S3, los thumbnails deben subirse manualmente. No hay generación automática como en Mux. Considera usar AWS MediaConvert para generar thumbnails si es necesario.

3. **Webhooks**: El webhook de Mux está deshabilitado. Si necesitas procesamiento asíncrono de videos (transcodificación, thumbnails), considera usar:
   - AWS MediaConvert para transcodificación
   - AWS Lambda para procesamiento automático
   - S3 Event Notifications para triggers

4. **Costos**: Asegúrate de revisar los costos de AWS IVS y S3. IVS cobra por horas de streaming y S3 cobra por almacenamiento y transferencia de datos.

## Troubleshooting

### Error: "Missing AWS credentials"
- Verifica que `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` estén configuradas en `.env.local`
- Reinicia el servidor de desarrollo después de agregar las variables

### Error: "Bucket does not exist"
- Verifica que `AWS_S3_BUCKET_NAME` sea correcto
- Asegúrate de que el bucket existe en la región configurada

### Videos no se reproducen
- Verifica que el bucket S3 tenga acceso público o CloudFront configurado
- Verifica que las URLs de S3 sean correctas
- Revisa la consola del navegador para errores CORS

### Live streams no funcionan
- Verifica que IVS esté habilitado en tu cuenta de AWS
- Verifica que los permisos IAM incluyan `ivs:*`
- Revisa los logs del servidor para errores específicos de IVS

## Referencias

- [Amazon IVS Documentation](https://docs.aws.amazon.com/ivs/)
- [Amazon S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)
- [Amazon IVS Player](https://docs.aws.amazon.com/ivs/latest/userguide/player.html)


