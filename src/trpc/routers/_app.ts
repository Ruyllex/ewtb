import { categoriesRouter } from "@/modules/categories/server/procedores";
import { studioRouter } from "@/modules/studio/server/procedures";
import { liveRouter } from "@/modules/live/server/procedures";
import { videosRouter } from "@/modules/videos/server/procedures";
import { likesRouter } from "@/modules/likes/server/procedures";
import { monetizationRouter } from "@/modules/monetization/server/procedures";
import { usersRouter } from "@/modules/users/server/procedures";
import { channelsRouter } from "@/modules/channels/server/procedures";
import { commentsRouter } from "@/modules/comments/server/procedures";
import { createTRPCRouter } from "../init";

export const appRouter = createTRPCRouter({
  categories: categoriesRouter,
  studio: studioRouter,
  videos: videosRouter,
  likes: likesRouter,
  live: liveRouter,
  monetization: monetizationRouter,
  users: usersRouter,
  channels: channelsRouter,
  comment: commentsRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
