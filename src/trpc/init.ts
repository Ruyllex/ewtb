import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { cache } from "react";
import superjson from "superjson";

// Upstash
import { ratelimit } from "@/lib/ratelimit";

export const createTRPCContext = cache(async () => {
  // TODO: Generate a problem for building the app
  const { userId } = await auth();
  return {
    clerkUserId: userId,
  };
});

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
// Add your own context type here
const t = initTRPC.context<Context>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

// Create a Redis instance

// Create a Ratelimit instance

// Comprobar si el usuario está autenticado y si no lo es, lanzar una excepción
export const protectedProcedure = t.procedure.use(async function isAuthed(opts) {
  const { ctx } = opts;

  if (!ctx.clerkUserId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You are not authorized to access this resource" });
  }

  // Obtener los datos del usuario desde la base de datos
  let [user] = await db.select().from(users).where(eq(users.clerkId, ctx.clerkUserId)).limit(1);
  
  // Si el usuario no existe, crearlo automáticamente (fallback si el webhook no funcionó)
  if (!user) {
    try {
      // Intentar obtener información del usuario desde Clerk
      const { currentUser } = await import("@clerk/nextjs/server");
      const clerkUser = await currentUser();
      
      if (clerkUser && clerkUser.id === ctx.clerkUserId) {
        // Crear el usuario en la base de datos
        try {
          [user] = await db
            .insert(users)
            .values({
              clerkId: clerkUser.id,
              name: clerkUser.fullName || `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
              imageUrl: clerkUser.imageUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + clerkUser.id,
            })
            .returning();
        } catch (dbError: any) {
          // Si hay un error de duplicado (usuario ya existe), intentar obtenerlo de nuevo
          if (dbError?.code === "23505" || dbError?.message?.includes("duplicate")) {
            [user] = await db.select().from(users).where(eq(users.clerkId, ctx.clerkUserId)).limit(1);
          } else {
            throw dbError;
          }
        }
      }
    } catch (error) {
      console.error("Error creating user:", error);
      // Si no podemos crear el usuario, lanzar error
      throw new TRPCError({ 
        code: "UNAUTHORIZED", 
        message: "Not user found in database and could not create user" 
      });
    }
    
    if (!user) {
      throw new TRPCError({ 
        code: "UNAUTHORIZED", 
        message: "Not user found in database" 
      });
    }
  }
  
  // Comprobar si el usuario ha superado el límite de peticiones
  // Solo si Redis está configurado
  try {
    const { success } = await ratelimit.limit(user.id);
    if (!success) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
    }
  } catch (rateLimitError: any) {
    // Si Redis no está configurado o hay un error, continuar sin rate limiting
    // Esto permite que la app funcione incluso sin Redis
    // Solo lanzar error si es un error de TOO_MANY_REQUESTS explícito
    if (rateLimitError?.code === "TOO_MANY_REQUESTS") {
      throw rateLimitError;
    }
    // Para otros errores (como Redis no configurado), solo loguear y continuar
    if (rateLimitError?.message && !rateLimitError.message.includes("TOO_MANY_REQUESTS")) {
      console.warn("Rate limiting not available:", rateLimitError.message);
    }
  }

  return opts.next({
    ctx: {
      ...ctx,
      user,
    },
  });
});
