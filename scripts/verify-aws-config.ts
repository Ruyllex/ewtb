/**
 * Script de verificación: Verificar configuración de AWS
 * 
 * Este script verifica que todas las credenciales y configuraciones
 * de AWS estén correctamente configuradas antes de ejecutar la migración.
 * 
 * Ejecutar con: tsx scripts/verify-aws-config.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { S3Client, GetBucketLocationCommand } from "@aws-sdk/client-s3";
import { IVSClient, ListChannelsCommand } from "@aws-sdk/client-ivs";
import type { IVSClient as IVSClientType } from "@aws-sdk/client-ivs";

// Cargar .env.local de forma síncrona
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

async function verifyAwsConfig() {
  console.log("🔍 Verificando configuración de AWS...\n");

  // Verificar variables de entorno
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "us-east-1";
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

  let allValid = true;

  // Verificar Access Key ID
  if (!accessKeyId) {
    console.error("❌ AWS_ACCESS_KEY_ID no está configurada");
    allValid = false;
  } else {
    console.log(`✅ AWS_ACCESS_KEY_ID: ${accessKeyId.substring(0, 4)}...${accessKeyId.substring(accessKeyId.length - 4)}`);
  }

  // Verificar Secret Access Key
  if (!secretAccessKey) {
    console.error("❌ AWS_SECRET_ACCESS_KEY no está configurada");
    allValid = false;
  } else {
    console.log(`✅ AWS_SECRET_ACCESS_KEY: ${secretAccessKey.substring(0, 4)}...${secretAccessKey.substring(secretAccessKey.length - 4)}`);
  }

  // Verificar región
  console.log(`✅ AWS_REGION: ${region}`);

  // Verificar bucket
  if (!bucketName) {
    console.error("❌ AWS_S3_BUCKET_NAME no está configurada");
    allValid = false;
  } else {
    console.log(`✅ AWS_S3_BUCKET_NAME: ${bucketName}`);
  }

  // CloudFront (opcional)
  if (cloudFrontDomain) {
    console.log(`ℹ️  AWS_CLOUDFRONT_DOMAIN: ${cloudFrontDomain} (opcional)`);
  } else {
    console.log(`ℹ️  AWS_CLOUDFRONT_DOMAIN: No configurado (opcional)`);
  }

  if (!allValid) {
    console.error("\n❌ Faltan credenciales necesarias. Por favor, configura todas las variables en .env.local");
    process.exit(1);
  }

  console.log("\n🔄 Verificando conexión con AWS...\n");

  try {
    // Verificar conexión con S3 verificando directamente el bucket
    console.log("📦 Verificando conexión con S3...");
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });

    // Verificar si el bucket existe (método más directo que no requiere ListAllMyBuckets)
    if (bucketName) {
      try {
        const location = await s3Client.send(new GetBucketLocationCommand({ Bucket: bucketName }));
        console.log(`✅ Conexión con S3 exitosa.`);
        console.log(`✅ Bucket "${bucketName}" existe y es accesible.`);
        if (location.LocationConstraint) {
          console.log(`   Región del bucket: ${location.LocationConstraint}`);
        }
      } catch (error: any) {
        if (error.name === "NoSuchBucket" || error.$metadata?.httpStatusCode === 404) {
          console.error(`❌ El bucket "${bucketName}" no existe. Por favor, créalo en la consola de AWS S3.`);
          allValid = false;
        } else if (error.name === "AccessDenied" || error.$metadata?.httpStatusCode === 403) {
          console.warn(`⚠️  No se pudo verificar el bucket (permisos insuficientes).`);
          console.warn(`   Asegúrate de tener permisos s3:GetBucketLocation en el bucket "${bucketName}".`);
          console.warn(`   Continuando con la verificación...`);
        } else {
          console.warn(`⚠️  No se pudo verificar el bucket: ${error.message}`);
        }
      }
    } else {
      console.log(`✅ Conexión con S3 configurada.`);
    }

    // Verificar conexión con IVS
    console.log("\n📡 Verificando conexión con Amazon IVS...");
    try {
      const { IVSClient: IVSClientConstructor } = await import("@aws-sdk/client-ivs");
      const ivsClient = new IVSClientConstructor({
        region,
        credentials: {
          accessKeyId: accessKeyId!,
          secretAccessKey: secretAccessKey!,
        },
      });

      try {
        const channels = await ivsClient.send(new ListChannelsCommand({}));
        console.log(`✅ Conexión con IVS exitosa. Encontrados ${channels.channels?.length || 0} canales.`);
      } catch (error: any) {
        if (error.name === "AccessDeniedException" || error.$metadata?.httpStatusCode === 403) {
          console.warn(`⚠️  Acceso denegado a IVS. Verifica que el usuario IAM tenga permisos ivs:*`);
          console.warn(`   Esto no es crítico si solo vas a usar S3 para videos VOD.`);
        } else {
          console.warn(`⚠️  Advertencia al verificar IVS: ${error.message}`);
          console.warn(`   Esto no es crítico si solo vas a usar S3 para videos VOD.`);
        }
      }
    } catch (error: any) {
      console.warn(`⚠️  No se pudo cargar el cliente IVS: ${error.message}`);
      console.warn(`   Esto no es crítico si solo vas a usar S3 para videos VOD.`);
    }

    if (allValid) {
      console.log("\n✅ ¡Todas las verificaciones pasaron exitosamente!");
      console.log("\n📝 Próximos pasos:");
      console.log("   1. Ejecuta: npm run migrate:remove-mux");
      console.log("   2. Ejecuta: npm run drizzle:push");
      console.log("   3. Prueba subir un video desde el Studio");
      console.log("   4. Verifica que el video aparece en S3");
    } else {
      console.error("\n❌ Hay problemas con la configuración. Por favor, corrígelos antes de continuar.");
      process.exit(1);
    }
  } catch (error: any) {
    console.error("\n❌ Error verificando AWS:", error.message);
    if (error.name === "InvalidAccessKeyId") {
      console.error("   Las credenciales de acceso son inválidas. Verifica AWS_ACCESS_KEY_ID.");
    } else if (error.name === "SignatureDoesNotMatch") {
      console.error("   La clave secreta no coincide. Verifica AWS_SECRET_ACCESS_KEY.");
    }
    process.exit(1);
  }
}

verifyAwsConfig();

