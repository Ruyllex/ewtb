import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
import https from "https";

// Cargar variables de entorno
dotenv.config({ path: ".env.local" });

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || "us-east-1";
const bucketName = process.env.AWS_S3_BUCKET_NAME;

console.log("🔍 Verificando configuración AWS...");
console.log(`Region: ${region}`);
console.log(`Bucket: ${bucketName}`);
console.log(`AccessKeyId: ${accessKeyId ? "******" + accessKeyId.slice(-4) : "MISSING"}`);

if (!accessKeyId || !secretAccessKey || !bucketName) {
    console.error("❌ Faltan variables de entorno.");
    process.exit(1);
}

const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

async function verifyUpload() {
    const key = `test-upload-${Date.now()}.txt`;
    const content = "Hello World";
    const contentType = "text/plain";

    // 1. Intentar subida directa (verifica credenciales)
    console.log("\n1️⃣ Intentando subida directa (PutObject)...");
    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: content,
            ContentType: contentType,
        }));
        console.log("✅ Subida directa exitosa. Las credenciales tienen permiso de escritura.");
    } catch (error: any) {
        console.error("❌ Falló la subida directa:", error.message);
        if (error.Code === "AccessDenied") {
            console.error("   👉 Tus credenciales NO tienen permiso s3:PutObject en este bucket.");
        }
        return;
    }

    // 2. Intentar generar URL firmada y usarla (verifica firma/región)
    console.log("\n2️⃣ Intentando subida vía URL firmada...");
    try {
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: `signed-${key}`,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        console.log("✅ URL firmada generada.");

        // Intentar usar la URL
        await new Promise((resolve, reject) => {
            const req = https.request(signedUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": contentType,
                    "Content-Length": Buffer.byteLength(content),
                },
            }, (res) => {
                if (res.statusCode === 200) {
                    console.log("✅ Subida vía URL firmada exitosa.");
                    resolve(null);
                } else {
                    console.error(`❌ Falló la subida vía URL firmada. Status: ${res.statusCode} ${res.statusMessage}`);
                    res.on("data", (d) => console.error("   Respuesta:", d.toString()));
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });

            req.on("error", (e) => {
                console.error("❌ Error de red:", e.message);
                reject(e);
            });

            req.write(content);
            req.end();
        });

    } catch (error: any) {
        console.error("❌ Error en prueba de URL firmada:", error.message);
    }
}

verifyUpload();
