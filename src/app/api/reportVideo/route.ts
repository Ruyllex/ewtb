import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, videos, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

// Configuración necesaria para Next.js 15
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Esquema de validación para el body de la petición
const reportVideoSchema = z.object({
  video_id: z.string().uuid("video_id debe ser un UUID válido"),
  reason: z.string().min(1, "La razón es requerida").max(1000, "La razón no puede exceder 1000 caracteres"),
  user_id: z.string().uuid("user_id debe ser un UUID válido").optional(),
});

/**
 * Endpoint POST /api/reportVideo
 * Permite a los usuarios reportar videos por contenido inapropiado
 * 
 * Body esperado:
 * - video_id: UUID del video a reportar
 * - reason: Razón del reporte (texto)
 * - user_id: UUID del usuario que reporta (opcional, se obtiene de la sesión si no se proporciona)
 * 
 * Rate limiting: 5 reportes por minuto por usuario
 */
export async function POST(req: NextRequest) {
  try {
    // Obtener información del usuario autenticado
    const { userId: clerkUserId } = await auth();
    
    // Obtener el cuerpo de la petición
    const body = await req.json();
    
    // Validar el body
    const validationResult = reportVideoSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { video_id, reason, user_id: providedUserId } = validationResult.data;

    // Aplicar rate limiting específico para reportes: 5 reportes por minuto
    // Usar el ID de Clerk o la IP como identificador
    const identifier = clerkUserId || req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
    
    // Crear rate limiter específico para reportes si Redis está disponible
    if (redis) {
      const reportRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 reportes por minuto
      });
      
      const rateLimitResult = await reportRatelimit.limit(`report:${identifier}`);
      
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: "Demasiadas peticiones. Por favor, espera un momento antes de reportar otro video." },
          { status: 429 }
        );
      }
    }

    // Verificar que el video existe
    const [video] = await db
      .select({ id: videos.id })
      .from(videos)
      .where(eq(videos.id, video_id))
      .limit(1);

    if (!video) {
      return NextResponse.json(
        { error: "El video especificado no existe" },
        { status: 404 }
      );
    }

    // Determinar el user_id a usar
    let userIdToUse = providedUserId;

    // Si no se proporcionó user_id pero hay un usuario autenticado, obtener su ID de la BD
    if (!userIdToUse && clerkUserId) {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, clerkUserId))
        .limit(1);

      if (user) {
        userIdToUse = user.id;
      }
    }

    // Si aún no hay user_id, rechazar la petición (los reportes deben estar asociados a un usuario)
    if (!userIdToUse) {
      return NextResponse.json(
        { error: "Se requiere autenticación para reportar un video" },
        { status: 401 }
      );
    }

    // Verificar que el usuario existe
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userIdToUse))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "El usuario especificado no existe" },
        { status: 404 }
      );
    }

    // Crear el reporte
    const [newReport] = await db
      .insert(reports)
      .values({
        videoId: video_id,
        userId: userIdToUse,
        reason: reason,
      })
      .returning();

    return NextResponse.json(
      { 
        success: true, 
        message: "Reporte creado exitosamente",
        report: {
          id: newReport.id,
          video_id: newReport.videoId,
          user_id: newReport.userId,
          reason: newReport.reason,
          created_at: newReport.createdAt,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear reporte:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error al crear el reporte: ${errorMessage}` },
      { status: 500 }
    );
  }
}

