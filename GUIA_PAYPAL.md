# Guía Paso a Paso: Configurar PayPal en FacuGo! Plus

Esta guía te ayudará a configurar PayPal para que el botón de prueba funcione correctamente.

## 📋 Requisitos Previos

- Una cuenta de PayPal (puede ser personal o de negocio)
- Acceso a la [Consola de Desarrolladores de PayPal](https://developer.paypal.com/)

---

## 🚀 Paso 1: Crear una Aplicación en PayPal Developer

1. **Accede a PayPal Developer Console**
   - Ve a: https://developer.paypal.com/
   - Inicia sesión con tu cuenta de PayPal

2. **Crea una Nueva Aplicación**
   - Haz clic en "Dashboard" en el menú superior
   - En el menú lateral, selecciona "My Apps & Credentials"
   - Haz clic en el botón "Create App" (Crear Aplicación)

3. **Configura la Aplicación**
   - **App Name**: `FacuGo Plus - Sandbox` (o el nombre que prefieras)
   - **Merchant**: Selecciona tu cuenta de negocio (si tienes) o crea una cuenta de prueba
   - **Features**: Asegúrate de que estén habilitadas:
     - ✅ Accept Payments
     - ✅ Future Payments (para suscripciones)
   - Haz clic en "Create App"

4. **Obtén tus Credenciales**
   - Una vez creada la app, verás dos secciones:
     - **Sandbox**: Para pruebas (usa estas primero)
     - **Live**: Para producción (solo cuando estés listo)
   - En la sección **Sandbox**, copia:
     - **Client ID**
     - **Secret** (haz clic en "Show" para verlo)

---

## 🔧 Paso 2: Configurar Variables de Entorno

1. **Crea el archivo `.env.local`**
   - En la raíz de tu proyecto, crea un archivo llamado `.env.local`
   - Si ya existe, ábrelo para editarlo

2. **Agrega las Variables de PayPal**
   ```env
   # PayPal Configuration (Sandbox - Pruebas)
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu_client_id_sandbox_aqui
   PAYPAL_CLIENT_SECRET=tu_client_secret_sandbox_aqui
   PAYPAL_ENVIRONMENT=sandbox
   ```

3. **Reemplaza los Valores**
   - Reemplaza `tu_client_id_sandbox_aqui` con el **Client ID** que copiaste
   - Reemplaza `tu_client_secret_sandbox_aqui` con el **Secret** que copiaste
   - Deja `PAYPAL_ENVIRONMENT=sandbox` para pruebas

4. **Guarda el Archivo**
   - Guarda el archivo `.env.local`
   - ⚠️ **IMPORTANTE**: Este archivo NO debe subirse a Git (ya debería estar en `.gitignore`)

---

## 🔄 Paso 3: Reiniciar el Servidor de Desarrollo

1. **Detén el Servidor**
   - Si tienes `npm run dev` corriendo, deténlo con `Ctrl + C`

2. **Reinicia el Servidor**
   ```bash
   npm run dev
   ```

   ⚠️ **Nota**: Next.js solo carga las variables de entorno al iniciar. Si ya estaba corriendo, debes reiniciarlo.

---

## ✅ Paso 4: Probar la Integración

1. **Abre tu Aplicación**
   - Ve a: http://localhost:3000 (o el puerto que uses)

2. **Busca el Botón de Prueba**
   - En la página principal (feed), deberías ver un card con el título "Prueba de Integración PayPal"
   - Si no aparece, verifica que el componente esté correctamente importado

3. **Inicia una Prueba**
   - Haz clic en el botón "Iniciar Prueba de PayPal"
   - Deberías ver los botones de PayPal aparecer

4. **Completa el Pago de Prueba**
   - Haz clic en "Pay with PayPal" o "Pagar con PayPal"
   - Serás redirigido a la página de PayPal Sandbox
   - **Inicia sesión con una cuenta de prueba de PayPal**:
     - Ve a: https://developer.paypal.com/
     - Dashboard → Accounts → Sandbox → Create Account
     - Crea una cuenta de prueba (Personal o Business)
     - Usa esas credenciales para iniciar sesión en el checkout de PayPal

5. **Confirma el Pago**
   - Completa el proceso de pago en PayPal
   - Serás redirigido de vuelta a tu aplicación
   - Deberías ver un mensaje de éxito: "¡Pago de prueba completado exitosamente!"

---

## 🐛 Solución de Problemas

### Error: "PayPal no está configurado"
- **Causa**: Las variables de entorno no están configuradas o el servidor no se reinició
- **Solución**: 
  1. Verifica que `.env.local` existe y tiene las variables correctas
  2. Reinicia el servidor de desarrollo
  3. Verifica que los nombres de las variables sean exactamente como se muestran arriba

### Error: "Error obteniendo token de acceso de PayPal"
- **Causa**: Las credenciales (Client ID o Secret) son incorrectas
- **Solución**:
  1. Verifica que copiaste correctamente el Client ID y Secret
  2. Asegúrate de que no hay espacios extra al inicio o final
  3. Verifica que estás usando las credenciales de **Sandbox**, no de **Live**

### Error: "Invalid client credentials"
- **Causa**: Las credenciales no coinciden o están mal configuradas
- **Solución**:
  1. Ve a PayPal Developer Console
  2. Verifica que la aplicación esté activa
  3. Regenera el Secret si es necesario
  4. Actualiza `.env.local` con las nuevas credenciales

### El botón no aparece en la página
- **Causa**: El componente no está importado o hay un error de compilación
- **Solución**:
  1. Verifica la consola del navegador para errores
  2. Verifica que `PayPalTestButton` esté importado en `home-view.tsx`
  3. Verifica que `@paypal/react-paypal-js` esté instalado: `npm install @paypal/react-paypal-js`

---

## 🎯 Paso 5: Configurar para Producción (Opcional - Más Adelante)

Cuando estés listo para aceptar pagos reales:

1. **Crea una Aplicación Live en PayPal**
   - En PayPal Developer Console, crea una nueva app para producción
   - Obtén las credenciales de **Live** (no Sandbox)

2. **Actualiza las Variables de Entorno**
   ```env
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu_client_id_live_aqui
   PAYPAL_CLIENT_SECRET=tu_client_secret_live_aqui
   PAYPAL_ENVIRONMENT=production
   ```

3. **Configura Webhooks** (si los usas)
   - En PayPal Developer Console, configura los webhooks para producción
   - Actualiza la URL del webhook en tu servidor de producción

---

## 📝 Notas Importantes

- ⚠️ **Nunca subas `.env.local` a Git** - Contiene información sensible
- 🔒 **Mantén tus credenciales seguras** - No las compartas públicamente
- 🧪 **Usa Sandbox para desarrollo** - No uses credenciales de producción en desarrollo
- 💰 **Los pagos en Sandbox son simulados** - No se procesan pagos reales
- 🔄 **Reinicia el servidor** después de cambiar variables de entorno

---

## ✅ Checklist Final

- [ ] Cuenta de PayPal Developer creada
- [ ] Aplicación Sandbox creada en PayPal
- [ ] Client ID y Secret copiados
- [ ] Archivo `.env.local` creado con las variables
- [ ] Servidor de desarrollo reiniciado
- [ ] Botón de prueba visible en la página principal
- [ ] Prueba de pago completada exitosamente

---

¡Listo! Si completaste todos los pasos, tu integración de PayPal debería estar funcionando. 🎉





