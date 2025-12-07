import { IvsClient, CreateChannelCommand, DeleteChannelCommand, GetChannelCommand } from "@aws-sdk/client-ivs";
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Validar que las credenciales estén presentes antes de inicializar
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || "us-east-1";
const bucketName = process.env.AWS_S3_BUCKET_NAME;

if (!accessKeyId || !secretAccessKey) {
  console.warn(
    "⚠️ AWS credentials are missing. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env.local file."
  );
}

if (!bucketName) {
  console.warn(
    "⚠️ AWS S3 bucket name is missing. Set AWS_S3_BUCKET_NAME in your .env.local file."
  );
}

// Cliente IVS para transmisiones en vivo
// IVS está disponible en estas regiones: us-east-1, us-west-2, eu-west-1, ap-southeast-1, ap-northeast-1
// Si la región no está soportada, usar us-east-1 como fallback
const ivsSupportedRegions = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1", "ap-northeast-1"];
const ivsRegion = ivsSupportedRegions.includes(region) ? region : "us-east-1";

// if (region !== ivsRegion) {
//   console.warn(
//     `⚠️ AWS_REGION "${region}" no es compatible con IVS. Usando "${ivsRegion}" para IVS.`
//   );
// }

export const ivsClient = new IvsClient({
  region: ivsRegion,
  credentials: accessKeyId && secretAccessKey
    ? {
      accessKeyId,
      secretAccessKey,
    }
    : undefined,
  // Configuración para mejor manejo de errores y timeouts
  maxAttempts: 3, // Reintentar hasta 3 veces en caso de error
});

// Cliente S3 para almacenamiento de videos
export const s3Client = new S3Client({
  region,
  credentials: accessKeyId && secretAccessKey
    ? {
      accessKeyId,
      secretAccessKey,
    }
    : undefined,
});

/**
 * Valida que las credenciales AWS estén configuradas
 */
export function ensureAwsCredentials() {
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env.local file.\n\n" +
      "Para crear credenciales:\n" +
      "1. Ve a AWS Console > IAM > Users\n" +
      "2. Selecciona tu usuario o crea uno nuevo\n" +
      "3. Ve a Security Credentials > Create Access Key\n" +
      "4. Copia el Access Key ID y Secret Access Key\n" +
      "5. Agrega estas variables a tu .env.local:\n" +
      "   AWS_ACCESS_KEY_ID=tu_access_key_id\n" +
      "   AWS_SECRET_ACCESS_KEY=tu_secret_access_key"
    );
  }
  if (!bucketName) {
    throw new Error("Missing AWS S3 bucket name. Set AWS_S3_BUCKET_NAME in your .env.local file.");
  }
}

/**
 * Verifica que las credenciales tengan los permisos necesarios para IVS
 * Solo valida que las credenciales sean accesibles, no los permisos específicos
 */
export async function validateIVSCredentials(): Promise<{ valid: boolean; message: string }> {
  ensureAwsCredentials();
  
  try {
    // Intentar una operación simple de IVS para validar credenciales
    const { ListChannelsCommand } = await import("@aws-sdk/client-ivs");
    const command = new ListChannelsCommand({ maxResults: 1 });
    
    await ivsClient.send(command);
    
    return {
      valid: true,
      message: "Credenciales de AWS IVS válidas",
    };
  } catch (error: any) {
    const status = error?.$metadata?.httpStatusCode;
    const errorCode = error?.name || error?.code;
    
    if (status === 401 || status === 403 || errorCode === "UnrecognizedClientException" || errorCode === "InvalidSignatureException") {
      return {
        valid: false,
        message: "Las credenciales de AWS son inválidas. Verifica AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY.",
      };
    }
    
    if (errorCode === "AccessDeniedException") {
      return {
        valid: false,
        message: "Las credenciales no tienen permisos para AWS IVS. Agrega los permisos necesarios en IAM.",
      };
    }
    
    // Otros errores (como región no disponible) se manejan por separado
    return {
      valid: false,
      message: `Error al validar credenciales: ${error?.message || "Error desconocido"}`,
    };
  }
}

/**
 * Genera una URL firmada para subir un archivo a S3
 * @param key - Clave (ruta) del archivo en S3
 * @param contentType - Tipo MIME del archivo (ej: video/mp4)
 * @param expiresIn - Tiempo de expiración en segundos (default: 3600 = 1 hora)
 * @returns URL firmada para subir el archivo
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  ensureAwsCredentials();

  const command = new PutObjectCommand({
    Bucket: bucketName!,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Genera una URL firmada para descargar/ver un archivo de S3
 * @param key - Clave (ruta) del archivo en S3
 * @param expiresIn - Tiempo de expiración en segundos (default: 3600 = 1 hora)
 * @returns URL firmada para ver el archivo
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  ensureAwsCredentials();

  const command = new GetObjectCommand({
    Bucket: bucketName!,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Verifica si un archivo existe en S3
 * @param key - Clave (ruta) del archivo en S3
 * @returns true si el archivo existe, false si no
 */
export async function checkFileExists(key: string): Promise<boolean> {
  ensureAwsCredentials();

  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName!,
        Key: key,
      })
    );
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Obtiene la URL pública de un archivo en S3
 * @param key - Clave (ruta) del archivo en S3
 * @returns URL pública del archivo
 */
export function getS3PublicUrl(key: string): string {
  ensureAwsCredentials();

  // Si el bucket está configurado como público, usar la URL directa
  // O si usas CloudFront, reemplazar con tu dominio de CloudFront
  const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

  if (cloudFrontDomain) {
    return `https://${cloudFrontDomain}/${key}`;
  }

  // URL directa de S3 (requiere que el bucket sea público)
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Crea un canal IVS para transmisión en vivo
 * @param channelName - Nombre del canal (opcional)
 * @returns Información del canal creado
 */
export async function createIVSChannel(channelName?: string) {
  ensureAwsCredentials();

  try {
    const command = new CreateChannelCommand({
      name: channelName || undefined,
      // Configuración recomendada para baja latencia
      latencyMode: "LOW", // LOW o NORMAL
      type: "STANDARD", // STANDARD o BASIC
    });

    const response = await ivsClient.send(command);

    if (!response.channel) {
      throw new Error("Failed to create IVS channel: no channel data returned");
    }

    const channel = response.channel;

    return {
      channelArn: channel.arn,
      streamKey: channel.streamKey?.value || null,
      playbackUrl: channel.playbackUrl || null,
      ingestEndpoint: channel.ingestEndpoint || null,
    };
  } catch (error: any) {
    // Manejar errores de DNS/red de manera más específica
    if (error.code === "ENOTFOUND" || error.message?.includes("getaddrinfo ENOTFOUND")) {
      const errorMessage = `No se pudo conectar al servicio IVS en la región ${ivsRegion}. ` +
        `Verifica tu conexión a internet y que AWS IVS esté disponible en tu cuenta para esta región. ` +
        `Regiones soportadas: ${ivsSupportedRegions.join(", ")}`;
      throw new Error(errorMessage);
    }
    
    // Re-lanzar otros errores
    throw error;
  }
}

/**
 * Elimina un canal IVS
 * @param channelArn - ARN del canal a eliminar
 */
export async function deleteIVSChannel(channelArn: string) {
  ensureAwsCredentials();

  const command = new DeleteChannelCommand({
    arn: channelArn,
  });

  await ivsClient.send(command);
}

/**
 * Obtiene información de un canal IVS
 * @param channelArn - ARN del canal
 * @returns Información del canal
 */
export async function getIVSChannel(channelArn: string) {
  ensureAwsCredentials();

  const command = new GetChannelCommand({
    arn: channelArn,
  });

  const response = await ivsClient.send(command);

  if (!response.channel) {
    throw new Error("Channel not found");
  }

  return {
    channelArn: response.channel.arn,
    streamKey: response.channel.streamKey?.value || null,
    playbackUrl: response.channel.playbackUrl || null,
    ingestEndpoint: response.channel.ingestEndpoint || null,
    health: response.channel.health,
    latencyMode: response.channel.latencyMode,
    type: response.channel.type,
  };
}
