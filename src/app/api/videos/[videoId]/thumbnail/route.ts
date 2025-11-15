import { db } from "@/db";
import { videos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Configuración para Next.js 15
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ videoId: string }> | { videoId: string } }
) {
  try {
    // Manejar tanto Next.js 15 (params como Promise) como versiones anteriores
    const params = await Promise.resolve(context.params);
    const { videoId } = params;

    // Obtener el video y su thumbnail
    const [video] = await db
      .select({
        thumbnailImage: videos.thumbnailImage,
        thumbnailUrl: videos.thumbnailUrl,
      })
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!video) {
      return new NextResponse("Video not found", { status: 404 });
    }

    // Si hay una imagen almacenada en la BD, servirla
    if (video.thumbnailImage) {
      // Convertir el dato binario a Buffer
      // En PostgreSQL, BYTEA se devuelve como Buffer o Uint8Array
      let buffer: Buffer;
      if (Buffer.isBuffer(video.thumbnailImage)) {
        buffer = video.thumbnailImage;
      } else if (video.thumbnailImage instanceof Uint8Array) {
        buffer = Buffer.from(video.thumbnailImage);
      } else {
        // Si es un objeto con data o similar
        buffer = Buffer.from(video.thumbnailImage as any);
      }
      
      let contentType = "image/jpeg"; // Por defecto JPEG

      // Detectar el tipo de imagen basado en los magic bytes
      if (buffer.length >= 4) {
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
          contentType = "image/png";
        } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
          contentType = "image/jpeg";
        } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
          contentType = "image/gif";
        } else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
          contentType = "image/webp";
        }
      }

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Si no hay imagen en la BD pero hay una URL externa, redirigir
    if (video.thumbnailUrl && !video.thumbnailUrl.startsWith("/api/")) {
      return NextResponse.redirect(video.thumbnailUrl);
    }

    return new NextResponse("Thumbnail not found", { status: 404 });
  } catch (error) {
    console.error("Error al obtener thumbnail:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

