# 💰 Cómo Habilitar los $20 de Créditos de Prueba de Mux Live Streaming

## 🎯 Información Importante

El plan gratuito de Mux **SÍ incluye $20 de créditos de prueba** para Live Streaming, pero necesitas **habilitarlo manualmente** en tu cuenta.

---

## 📋 Pasos para Habilitar Live Streaming con Créditos de Prueba

### Paso 1: Ir al Dashboard de Mux

1. Abre tu navegador
2. Ve a: **https://dashboard.mux.com**
3. Inicia sesión con tu cuenta

### Paso 2: Ir a Configuración de Live Streaming

1. En el menú lateral, ve a **Settings** (Configuración)
2. Busca y haz clic en **Live Streaming**

### Paso 3: Habilitar Live Streaming

1. En la página de Live Streaming, deberías ver:
   - Información sobre los créditos de prueba ($20)
   - Un botón o opción para **habilitar** Live Streaming
   - Instrucciones sobre cómo usar los créditos

2. Haz clic en **Enable Live Streaming** o **Activate** (o el botón equivalente)

3. Confirma la activación

### Paso 4: Verificar que Está Habilitado

Después de habilitar, deberías ver:
- ✅ Estado: "Live Streaming Enabled" o similar
- ✅ Créditos disponibles: $20.00
- ✅ Información sobre el uso de créditos

### Paso 5: Verificar en tu Aplicación

1. Ejecuta el script de verificación:
   ```bash
   npm run verify:mux-live
   ```

2. Deberías ver:
   ```
   ✅ Live Streaming está habilitado y funcionando
   ```

---

## 🔍 Si No Ves la Opción de Live Streaming

### Opción 1: Verificar que Estás en la Sección Correcta

- Asegúrate de estar en: **Settings** → **Live Streaming**
- No confundas con otras secciones como "Video" o "Billing"

### Opción 2: Contactar a Soporte de Mux

Si no ves la opción para habilitar Live Streaming:

1. Ve a: **https://dashboard.mux.com/support**
2. O envía un email a: **support@mux.com**
3. Pregunta sobre cómo activar los créditos de prueba de Live Streaming
4. Menciona que tienes una cuenta gratuita y quieres usar los $20 de créditos

### Opción 3: Verificar tu Tipo de Cuenta

Algunas cuentas pueden necesitar:
- Verificación de email
- Agregar método de pago (aunque no se cobrará hasta agotar los créditos)
- Completar el perfil de la cuenta

---

## 💡 Información sobre los Créditos

### ¿Cuánto duran los $20?

Los $20 de créditos te permiten:
- Transmitir en vivo por varias horas (depende de la calidad y duración)
- Probar todas las funcionalidades de Live Streaming
- Usar todas las características sin restricciones

### ¿Qué pasa cuando se agotan?

Cuando agotes los $20:
- Las transmisiones se detendrán
- Necesitarás actualizar a un plan de pago para continuar
- O agregar créditos adicionales a tu cuenta

### ¿Cómo verificar cuánto crédito queda?

1. Ve a **Settings** → **Live Streaming** en Mux Dashboard
2. Verás el crédito restante
3. También puedes ver el uso en **Billing** → **Usage**

---

## ✅ Checklist

Antes de intentar crear un live stream:

- [ ] Has iniciado sesión en Mux Dashboard
- [ ] Has ido a Settings → Live Streaming
- [ ] Has habilitado Live Streaming
- [ ] Ves que tienes $20 de créditos disponibles
- [ ] Has ejecutado `npm run verify:mux-live` y pasa sin errores
- [ ] Has reiniciado tu servidor de desarrollo después de cualquier cambio

---

## 🚀 Después de Habilitar

Una vez habilitado:

1. **Ejecuta el script de verificación:**
   ```bash
   npm run verify:mux-live
   ```

2. **Deberías ver:**
   ```
   ✅ Live Streaming está habilitado y funcionando
   ✅ Stream de prueba eliminado
   ✅ ¡Todo está configurado correctamente!
   ```

3. **Prueba crear un stream desde la aplicación:**
   - Ve a `/studio/live`
   - Haz clic en "Nueva Transmisión"
   - Completa el formulario
   - Debería funcionar sin errores

---

## 🆘 Si Sigue Sin Funcionar

### Verificar en el Dashboard

1. Ve a **Settings** → **Live Streaming**
2. Toma una captura de pantalla de lo que ves
3. Verifica si hay algún mensaje de error o advertencia

### Verificar Método de Pago

Algunas cuentas pueden requerir agregar un método de pago (aunque no se cobrará hasta agotar los créditos):

1. Ve a **Settings** → **Billing**
2. Agrega un método de pago si es necesario
3. Esto puede desbloquear los créditos de prueba

### Contactar a Soporte

Si nada funciona:

1. Contacta a soporte de Mux: **support@mux.com**
2. Menciona:
   - Que tienes una cuenta gratuita
   - Que quieres usar los $20 de créditos de prueba
   - Que no ves la opción para habilitar Live Streaming
   - El error que recibes (si hay alguno)

---

## 📝 Notas Importantes

- ⚠️ Los créditos de prueba son **solo una vez** por cuenta
- ⚠️ Una vez agotados, necesitarás un plan de pago
- ✅ Puedes usar los créditos para probar todas las funcionalidades
- ✅ No se te cobrará nada hasta que agotes los $20

---

**¿Necesitas ayuda?** Ejecuta `npm run verify:mux-live` para ver el estado actual de tu configuración.

