import { categoriesRouter } from "@/modules/categories/server/procedures";
import { studioRouter } from "@/modules/studio/server/procedures";
import { liveRouter } from "@/modules/live/server/procedures";
import { videosRouter } from "@/modules/videos/server/procedures";
import { likesRouter } from "@/modules/likes/server/procedures";
import { monetizationRouter } from "@/modules/monetization/server/procedures";
import { usersRouter } from "@/modules/users/server/procedures";
import { channelsRouter } from "@/modules/channels/server/procedures";
import { commentsRouter } from "@/modules/comments/server/procedures";
import { reportsRouter } from "@/modules/reports/server/procedures";
import { playlistsRouter } from "@/modules/playlists/server/procedures";
import { chatRouter } from "@/modules/chat/server/procedures";
import { membershipsRouter } from "@/modules/memberships/server/procedures";
import { adsRouter } from "@/modules/ads/server/procedures";
import { adminRouter } from "@/modules/admin/server/procedures";
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
  reports: reportsRouter,
  playlists: playlistsRouter,
  chat: chatRouter,
  memberships: membershipsRouter,
  ads: adsRouter,
  admin: adminRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
