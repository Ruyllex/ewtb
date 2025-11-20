-- Migración SQL: Eliminar campos de Mux de la base de datos
-- 
-- Este archivo SQL elimina las columnas relacionadas con Mux de las tablas
-- después de la migración a Amazon IVS y S3.
--
-- Ejecutar este script manualmente en tu base de datos PostgreSQL si prefieres
-- hacerlo directamente en lugar de usar el script TypeScript.

-- ============================================
-- Eliminar columnas de Mux de la tabla videos
-- ============================================

-- Nota: DROP COLUMN IF EXISTS solo funciona en PostgreSQL 9.6+
-- Si tu versión es anterior, comenta las líneas y ejecuta solo las necesarias

ALTER TABLE videos DROP COLUMN IF EXISTS mux_asset_id;
ALTER TABLE videos DROP COLUMN IF EXISTS mux_playback_id;
ALTER TABLE videos DROP COLUMN IF EXISTS mux_upload_id;
ALTER TABLE videos DROP COLUMN IF EXISTS mux_status;
ALTER TABLE videos DROP COLUMN IF EXISTS mux_track_id;
ALTER TABLE videos DROP COLUMN IF EXISTS mux_track_status;

-- ============================================
-- Eliminar columnas de Mux de la tabla live_streams
-- ============================================

ALTER TABLE live_streams DROP COLUMN IF EXISTS mux_live_stream_id;
ALTER TABLE live_streams DROP COLUMN IF EXISTS mux_stream_key;
ALTER TABLE live_streams DROP COLUMN IF EXISTS mux_playback_id;

-- ============================================
-- Verificación (opcional - ejecutar para verificar)
-- ============================================
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'videos' 
-- AND column_name LIKE 'mux_%';
--
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'live_streams' 
-- AND column_name LIKE 'mux_%';

