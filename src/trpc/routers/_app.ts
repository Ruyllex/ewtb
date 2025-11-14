import { categoriesRouter } from "@/modules/categories/server/procedores";
import { studioRouter } from "@/modules/studio/server/procedures";
import { liveRouter } from "@/modules/live/server/procedures";
import { videosRouter } from "@/modules/videos/server/procedures";
import { createTRPCRouter } from "../init";

export const appRouter = createTRPCRouter({
  categories: categoriesRouter,
  studio: studioRouter,
  videos: videosRouter,
  live: liveRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
