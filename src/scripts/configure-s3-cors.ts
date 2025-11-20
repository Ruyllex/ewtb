import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config({ path: ".env.local" });

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || "us-east-1";
const bucketName = process.env.AWS_S3_BUCKET_NAME;

if (!accessKeyId || !secretAccessKey || !bucketName) {
    console.error("❌ Faltan variables de entorno. Asegúrate de tener AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY y AWS_S3_BUCKET_NAME en .env.local");
    process.exit(1);
}

const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

async function configureCors() {
    console.log(`🔧 Configurando CORS para el bucket: ${bucketName}...`);

    const command = new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedHeaders: ["*"],
                    AllowedMethods: ["PUT", "POST", "GET", "HEAD"],
                    AllowedOrigins: ["*"], // En producción, cambiar a tu dominio real
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3000,
                },
            ],
        },
    });

    try {
        await s3Client.send(command);
        console.log("✅ Configuración CORS aplicada exitosamente.");
    } catch (error) {
        console.error("❌ Error al configurar CORS:", error);
    }
}

configureCors();
