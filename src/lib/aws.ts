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
export const ivsClient = new IvsClient({
  region,
  credentials: accessKeyId && secretAccessKey
    ? {
      accessKeyId,
      secretAccessKey,
    }
    : undefined,
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
    throw new Error("Missing AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.");
  }
  if (!bucketName) {
    throw new Error("Missing AWS S3 bucket name. Set AWS_S3_BUCKET_NAME.");
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
