/**
 * Utilidades para interactuar con la API de PayPal
 */

// Obtener token de acceso de PayPal
export async function getPayPalAccessToken(): Promise<string> {
  const clientId = (process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "").trim();
  const clientSecret = (process.env.PAYPAL_CLIENT_SECRET || "").trim();
  const isProduction = process.env.PAYPAL_ENVIRONMENT === "production";
  const baseUrl = isProduction 
    ? "https://api-m.paypal.com" 
    : "https://api-m.sandbox.paypal.com";

  // Validar que las credenciales existan
  if (!clientId || !clientSecret) {
    throw new Error(
      "PayPal no está configurado correctamente. " +
      "Asegúrate de tener PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET en tu archivo .env.local. " +
      "Revisa la guía en GUIA_PAYPAL.md para más información."
    );
  }

  // Validar formato básico de las credenciales
  if (clientId.length < 10 || clientSecret.length < 10) {
    throw new Error(
      "Las credenciales de PayPal parecen inválidas. " +
      "Verifica que hayas copiado correctamente el Client ID y Secret desde PayPal Developer Console."
    );
  }

  try {
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "Error obteniendo token de acceso de PayPal";
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error === "invalid_client") {
          errorMessage = 
            "Las credenciales de PayPal son inválidas. " +
            "Verifica que:\n" +
            "1. El Client ID y Secret sean correctos\n" +
            "2. Ambos sean de Sandbox (o ambos de Producción)\n" +
            "3. No haya espacios extra al copiar las credenciales\n" +
            "4. La aplicación esté activa en PayPal Developer Console\n\n" +
            `Error: ${errorJson.error_description || errorText}`;
        } else {
          errorMessage = `Error de PayPal: ${errorJson.error_description || errorText}`;
        }
      } catch {
        errorMessage = `Error obteniendo token de acceso de PayPal: ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    // Si el error ya tiene un mensaje personalizado, relanzarlo
    if (error instanceof Error && error.message.includes("PayPal no está configurado")) {
      throw error;
    }
    // Si es un error de red u otro tipo, dar un mensaje más claro
    throw new Error(
      `Error de conexión con PayPal: ${error instanceof Error ? error.message : "Error desconocido"}. ` +
      "Verifica tu conexión a internet y que las credenciales sean correctas."
    );
  }
}

// Obtener URL base de PayPal
export function getPayPalBaseUrl(): string {
  const isProduction = process.env.PAYPAL_ENVIRONMENT === "production";
  return isProduction 
    ? "https://api-m.paypal.com" 
    : "https://api-m.sandbox.paypal.com";
}

// Crear una orden de PayPal
export async function createPayPalOrder(orderData: {
  amount: string;
  currency?: string;
  description?: string;
  customId?: string;
  returnUrl?: string;
  cancelUrl?: string;
}): Promise<{ id: string; links: Array<{ href: string; rel: string }> }> {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: orderData.currency || "USD",
            value: orderData.amount,
          },
          description: orderData.description,
          custom_id: orderData.customId,
        },
      ],
      application_context: {
        return_url: orderData.returnUrl,
        cancel_url: orderData.cancelUrl,
        brand_name: "EWTB Clone",
        user_action: "PAY_NOW",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error creando orden de PayPal: ${errorText}`);
  }

  return await response.json();
}

// Capturar una orden de PayPal aprobada
export async function capturePayPalOrder(orderId: string): Promise<any> {
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();
  
    const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error capturando orden de PayPal: ${errorText}`);
    }
  
    return await response.json();
}

