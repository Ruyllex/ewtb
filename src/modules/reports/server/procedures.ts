import { db } from "@/db";
import { reports, videos, users, userActions } from "@/db/schema";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, desc, or, like, sql } from "drizzle-orm";
import z from "zod";

/**
 * Verificar si un usuario es admin
 * Primero verifica la columna isAdmin en la base de datos, luego la variable de entorno
 */
async function isUserAdmin(userId: string, clerkUserId: string | null): Promise<boolean> {
  // Primero verificar la columna isAdmin en la base de datos
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId)).limit(1);
  
  if (user?.isAdmin) {
    return true;
  }

  // Si no está marcado como admin en la BD, verificar variable de entorno (retrocompatibilidad)
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(",").map((id) => id.trim()) || [];
  
  // Verificar por ID de usuario o Clerk ID
  const isAdmin = 
    adminUserIds.includes(userId) || 
    (clerkUserId && adminUserIds.includes(clerkUserId));

  // Si no se encontró por ID, verificar por email (si está en la lista)
  if (!isAdmin && clerkUserId) {
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
        const userEmail = clerkUser.emailAddresses[0].emailAddress;
        if (adminUserIds.includes(userEmail)) {
          return true;
        }
      }
    } catch {
      // Si no se puede obtener el email, continuar sin él
    }
  }

  return isAdmin;
}

export const reportsRouter = createTRPCRouter({
  /**
   * Obtiene todos los reportes con filtros opcionales (solo admin)
   * Para dashboard administrativo
   */
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().uuid().optional(),
        videoId: z.string().uuid().optional(),
        userId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si el usuario es admin
      const isAdmin = await isUserAdmin(userId, ctx.clerkUserId || null);

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden ver los reportes",
        });
      }

      // Construir condiciones de filtro
      const conditions = [];

      if (input.videoId) {
        conditions.push(eq(reports.videoId, input.videoId));
      }

      if (input.userId) {
        conditions.push(eq(reports.userId, input.userId));
      }

      if (input.cursor) {
        conditions.push(sql`${reports.id} < ${input.cursor}`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Obtener reportes con información del video y usuario
      const reportsData = await db
        .select({
          id: reports.id,
          videoId: reports.videoId,
          userId: reports.userId,
          reason: reports.reason,
          status: reports.status,
          adminAction: reports.adminAction,
          adminNotes: reports.adminNotes,
          reviewedBy: reports.reviewedBy,
          reviewedAt: reports.reviewedAt,
          createdAt: reports.createdAt,
          video: {
            id: videos.id,
            title: videos.title,
            thumbnailUrl: videos.thumbnailUrl,
            visibility: videos.visibility,
          },
          user: {
            id: users.id,
            name: users.name,
            username: users.username,
            imageUrl: users.imageUrl,
          },
        })
        .from(reports)
        .leftJoin(videos, eq(reports.videoId, videos.id))
        .leftJoin(users, eq(reports.userId, users.id))
        .where(whereClause)
        .orderBy(desc(reports.createdAt))
        .limit(input.limit + 1);

      // Obtener información del reviewer para cada reporte
      const reportsWithReviewer = await Promise.all(
        reportsData.map(async (report) => {
          if (!report.reviewedBy) {
            return { ...report, reviewer: null };
          }
          const [reviewer] = await db
            .select({
              id: users.id,
              name: users.name,
              username: users.username,
            })
            .from(users)
            .where(eq(users.id, report.reviewedBy!))
            .limit(1);
          return { ...report, reviewer: reviewer || null };
        })
      );

      // Determinar si hay más páginas
      let nextCursor: string | undefined = undefined;
      if (reportsWithReviewer.length > input.limit) {
        const nextItem = reportsWithReviewer.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: reportsWithReviewer,
        nextCursor,
      };
    }),

  /**
   * Obtiene un reporte por ID (solo admin)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si el usuario es admin
      const isAdmin = await isUserAdmin(userId, ctx.clerkUserId || null);

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden ver los reportes",
        });
      }

      const [report] = await db
        .select({
          id: reports.id,
          videoId: reports.videoId,
          userId: reports.userId,
          reason: reports.reason,
          status: reports.status,
          adminAction: reports.adminAction,
          adminNotes: reports.adminNotes,
          reviewedBy: reports.reviewedBy,
          reviewedAt: reports.reviewedAt,
          createdAt: reports.createdAt,
          video: {
            id: videos.id,
            title: videos.title,
            description: videos.description,
            thumbnailUrl: videos.thumbnailUrl,
            visibility: videos.visibility,
          },
          user: {
            id: users.id,
            name: users.name,
            username: users.username,
            imageUrl: users.imageUrl,
          },
        })
        .from(reports)
        .leftJoin(videos, eq(reports.videoId, videos.id))
        .leftJoin(users, eq(reports.userId, users.id))
        .where(eq(reports.id, input.id))
        .limit(1);

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reporte no encontrado" });
      }

      return report;
    }),

  /**
   * Obtiene estadísticas de reportes (solo admin)
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    // Verificar si el usuario es admin
    const isAdmin = await isUserAdmin(userId, ctx.clerkUserId || null);

    if (!isAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Solo los administradores pueden ver las estadísticas de reportes",
      });
    }

    // Contar total de reportes
    const [totalReports] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports);

    // Contar reportes únicos por video
    const [uniqueVideoReports] = await db
      .select({ count: sql<number>`count(distinct ${reports.videoId})` })
      .from(reports);

    // Contar reportes únicos por usuario
    const [uniqueUserReports] = await db
      .select({ count: sql<number>`count(distinct ${reports.userId})` })
      .from(reports);

      return {
        totalReports: Number(totalReports?.count || 0),
        uniqueVideoReports: Number(uniqueVideoReports?.count || 0),
        uniqueUserReports: Number(uniqueUserReports?.count || 0),
      };
    }),

  /**
   * Revisar un reporte y tomar acciones (solo admin)
   */
  reviewReport: protectedProcedure
    .input(
      z.object({
        reportId: z.string().uuid(),
        status: z.enum(["valid", "invalid", "resolved"]),
        adminAction: z
          .enum([
            "no_action",
            "video_hidden",
            "video_deleted",
            "video_restricted",
            "user_warned",
            "user_suspended",
            "user_banned",
            "reporter_penalized",
          ])
          .optional(),
        adminNotes: z.string().optional(),
        // Acciones sobre el video
        videoAction: z
          .object({
            action: z.enum(["keep", "hide", "delete", "restrict"]),
          })
          .optional(),
        // Acciones sobre el usuario denunciado
        userAction: z
          .object({
            action: z.enum(["warning", "suspension", "ban"]),
            reason: z.string().min(1),
            duration: z.number().positive().optional(), // Duración en días (solo para suspension)
          })
          .optional(),
        // Penalizar al reportero
        penalizeReporter: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si el usuario es admin
      const isAdmin = await isUserAdmin(userId, ctx.clerkUserId || null);

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden revisar reportes",
        });
      }

      // Obtener el reporte
      const [report] = await db
        .select()
        .from(reports)
        .where(eq(reports.id, input.reportId))
        .limit(1);

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reporte no encontrado" });
      }

      // Obtener el video
      const [video] = await db
        .select()
        .from(videos)
        .where(eq(videos.id, report.videoId))
        .limit(1);

      if (!video) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video no encontrado" });
      }

      // Actualizar el reporte
      const [updatedReport] = await db
        .update(reports)
        .set({
          status: input.status,
          adminAction: input.adminAction || null,
          adminNotes: input.adminNotes || null,
          reviewedBy: userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reports.id, input.reportId))
        .returning();

      // Aplicar acciones sobre el video
      if (input.videoAction) {
        switch (input.videoAction.action) {
          case "hide":
            await db
              .update(videos)
              .set({
                visibility: "hidden",
                updatedAt: new Date(),
              })
              .where(eq(videos.id, report.videoId));
            break;
          case "delete":
            // Eliminar el video (cascade eliminará reportes y otros datos relacionados)
            await db.delete(videos).where(eq(videos.id, report.videoId));
            break;
          case "restrict":
            await db
              .update(videos)
              .set({
                visibility: "restricted",
                updatedAt: new Date(),
              })
              .where(eq(videos.id, report.videoId));
            break;
          case "keep":
            // No hacer nada, mantener el video como está
            break;
        }
      }

      // Aplicar acciones sobre el usuario denunciado (dueño del video)
      if (input.userAction) {
        const expiresAt =
          input.userAction.duration && input.userAction.action === "suspension"
            ? new Date(Date.now() + input.userAction.duration * 24 * 60 * 60 * 1000)
            : null;

        await db.insert(userActions).values({
          userId: video.userId,
          actionType: input.userAction.action,
          reason: input.userAction.reason,
          reportId: report.id,
          duration: input.userAction.duration || null,
          expiresAt: expiresAt,
          isActive: true,
          createdBy: userId,
        });
      }

      // Penalizar al reportero si es necesario
      if (input.penalizeReporter && input.status === "invalid") {
        // Crear una acción de advertencia para el reportero
        await db.insert(userActions).values({
          userId: report.userId,
          actionType: "warning",
          reason: "Reporte infundado o malicioso",
          reportId: report.id,
          isActive: true,
          createdBy: userId,
        });
      }

      return updatedReport;
    }),

  /**
   * Obtener acciones activas de un usuario (solo admin)
   */
  getUserActions: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si el usuario es admin
      const isAdmin = await isUserAdmin(userId, ctx.clerkUserId || null);

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden ver las acciones de usuarios",
        });
      }

      const actions = await db
        .select({
          id: userActions.id,
          actionType: userActions.actionType,
          reason: userActions.reason,
          duration: userActions.duration,
          expiresAt: userActions.expiresAt,
          isActive: userActions.isActive,
          createdAt: userActions.createdAt,
          creator: {
            id: users.id,
            name: users.name,
            username: users.username,
          },
        })
        .from(userActions)
        .leftJoin(users, eq(userActions.createdBy, users.id))
        .where(eq(userActions.userId, input.userId))
        .orderBy(desc(userActions.createdAt));

      return actions;
    }),
});

