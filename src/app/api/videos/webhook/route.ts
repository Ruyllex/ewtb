import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { UTApi } from "uploadthing/server";

import { db } from "@/db";
import { videos } from "@/db/schema";
import { mux } from "@/lib/mux";
import { logServer } from "@/lib/logtail";
import {
  VideoAssetCreatedWebhookEvent,
  VideoAssetDeletedWebhookEvent,
  VideoAssetErroredWebhookEvent,
  VideoAssetReadyWebhookEvent,
  VideoAssetTrackReadyWebhookEvent,
} from "@mux/mux-node/resources/webhooks";
import { NextRequest } from "next/server";

// Configuración necesaria para Next.js 15
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SIGNING_SECRET = process.env.MUX_WEBHOOK_SECRET!;
const USE_UPLOADTHING = Boolean(process.env.UPLOADTHING_TOKEN);

type WebHookEvent =
  | VideoAssetCreatedWebhookEvent
  | VideoAssetErroredWebhookEvent
  | VideoAssetReadyWebhookEvent
  | VideoAssetTrackReadyWebhookEvent
  | VideoAssetDeletedWebhookEvent;

export const POST = async (request: NextRequest) => {
  try {
    if (!SIGNING_SECRET) {
      logServer.error("MUX_WEBHOOK_SECRET is not set", new Error("MUX_WEBHOOK_SECRET missing"), {
        endpoint: "/api/videos/webhook",
      });
      return new Response("MUX_WEBHOOK_SECRET is not set", { status: 500 });
    }

    const headersPayload = await headers();
    const muxSignature = headersPayload.get("mux-signature");

    if (!muxSignature) {
      logServer.warn("Mux signature is not set", {
        endpoint: "/api/videos/webhook",
      });
      return new Response("Mux signature is not set", { status: 400 });
    }

    const payload = await request.json();
    const body = JSON.stringify(payload);

    // Verificar la firma del webhook
    try {
      mux.webhooks.verifySignature(
        body,
        {
          "mux-signature": muxSignature,
        },
        SIGNING_SECRET
      );
    } catch (error) {
      logServer.error("Failed to verify Mux webhook signature", error instanceof Error ? error : new Error(String(error)), {
        endpoint: "/api/videos/webhook",
      });
      return new Response("Invalid signature", { status: 401 });
    }

    logServer.info("Webhook received", {
      type: payload.type,
      endpoint: "/api/videos/webhook",
    });
    
    if (!USE_UPLOADTHING) {
      logServer.warn("UploadThing not configured - using Mux URLs directly", {
        endpoint: "/api/videos/webhook",
      });
    }

    switch (payload.type as WebHookEvent["type"]) {
      case "video.asset.created": {
        const data = payload.data as VideoAssetCreatedWebhookEvent["data"];
        if (!data.upload_id) {
          return new Response("Upload ID is not set", { status: 400 });
        }
        
        // Solo actualizar si el video existe en la BD
        const existingVideo = await db
          .select()
          .from(videos)
          .where(eq(videos.muxUploadId, data.upload_id))
          .limit(1);

        if (existingVideo.length > 0) {
          await db
            .update(videos)
            .set({
              muxAssetId: data.id,
              muxStatus: data.status,
              updatedAt: new Date(),
            })
            .where(eq(videos.muxUploadId, data.upload_id));
          logServer.info("Video asset created", {
            assetId: data.id,
            uploadId: data.upload_id,
            videoId: existingVideo[0].id,
          });
        } else {
          logServer.info("Video asset created but video not in DB yet", {
            assetId: data.id,
            uploadId: data.upload_id,
            note: "Will be created when finalized",
          });
        }
        break;
      }

      case "video.asset.ready": {
        const data = payload.data as VideoAssetReadyWebhookEvent["data"];
        const playbackId = data.playback_ids?.[0]?.id;

        if (!data.upload_id) {
          return new Response("Upload ID is not set", { status: 400 });
        }

        if (!playbackId) {
          return new Response("Missing playback ID ", { status: 400 });
        }

        // Solo actualizar si el video existe en la BD
        const existingVideo = await db
          .select()
          .from(videos)
          .where(eq(videos.muxUploadId, data.upload_id))
          .limit(1);

        if (existingVideo.length === 0) {
          logServer.info("Video asset ready but video not in DB yet", {
            assetId: data.id,
            uploadId: data.upload_id,
            note: "Will be created when finalized",
          });
          break;
        }

        const tempThumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.png`;
        const tempPreviewUrl = `https://image.mux.com/${playbackId}/animated.gif`;
        const duration = data.duration ? Math.round(data.duration * 1000) : 0;

        let thumbnailUrl = tempThumbnailUrl;
        let thumbnailKey: string | null = null;
        let previewUrl = tempPreviewUrl;
        let previewKey: string | null = null;

        // Si UploadThing está configurado, subir las imágenes allí
        if (USE_UPLOADTHING) {
          try {
            logServer.info("Uploading thumbnails to UploadThing", {
              assetId: data.id,
              uploadId: data.upload_id,
            });
            const utapi = new UTApi();
            const [uploadedThumbnail, uploadedPreview] = await utapi.uploadFilesFromUrl([
              tempThumbnailUrl,
              tempPreviewUrl,
            ]);

            if (uploadedThumbnail.data && uploadedPreview.data) {
              thumbnailUrl = uploadedThumbnail.data.ufsUrl;
              thumbnailKey = uploadedThumbnail.data.key;
              previewUrl = uploadedPreview.data.ufsUrl;
              previewKey = uploadedPreview.data.key;
              logServer.info("Thumbnails uploaded to UploadThing", {
                assetId: data.id,
                uploadId: data.upload_id,
              });
            } else {
              logServer.warn("Failed to upload to UploadThing, using Mux URLs", {
                assetId: data.id,
                uploadId: data.upload_id,
              });
            }
          } catch (error) {
            logServer.error("Error uploading to UploadThing, using Mux URLs", error instanceof Error ? error : new Error(String(error)), {
              assetId: data.id,
              uploadId: data.upload_id,
            });
          }
        } else {
          logServer.info("Using Mux URLs directly (UploadThing not configured)", {
            assetId: data.id,
            uploadId: data.upload_id,
          });
        }

        await db
          .update(videos)
          .set({
            muxStatus: data.status,
            muxPlaybackId: playbackId,
            muxAssetId: data.id,
            thumbnailUrl,
            thumbnailKey,
            previewUrl,
            previewKey,
            duration,
            updatedAt: new Date(),
          })
          .where(eq(videos.muxUploadId, data.upload_id));

        logServer.info("Video asset ready", {
          assetId: data.id,
          uploadId: data.upload_id,
          playbackId,
          videoId: existingVideo[0].id,
        });
        break;
      }

      case "video.asset.errored": {
        const data = payload.data as VideoAssetErroredWebhookEvent["data"];
        if (!data.upload_id) {
          return new Response("Upload ID is not set", { status: 400 });
        }
        await db
          .update(videos)
          .set({
            muxStatus: data.status,
            updatedAt: new Date(),
          })
          .where(eq(videos.muxUploadId, data.upload_id));

        logServer.error("Video asset errored", new Error("Mux video processing error"), {
          assetId: data.id,
          uploadId: data.upload_id,
          errors: data.errors,
        });
        break;
      }

      case "video.asset.deleted": {
        const data = payload.data as VideoAssetDeletedWebhookEvent["data"];
        if (!data.upload_id) {
          return new Response("Upload ID is not set", { status: 400 });
        }
        await db.delete(videos).where(eq(videos.muxUploadId, data.upload_id));
        console.log("🗑️  Video deleted:", data.upload_id);
        break;
      }

      case "video.asset.track.ready": {
        const data = payload.data as VideoAssetTrackReadyWebhookEvent["data"] & {
          asset_id: string;
        };

        console.log("📝 Video asset track ready:", data);

        const assetId = data.asset_id;
        const trackId = data.id;
        const status = data.status;

        if (!assetId) {
          return new Response("Missing asset ID", { status: 400 });
        }
        await db
          .update(videos)
          .set({
            muxTrackId: trackId,
            muxTrackStatus: status,
            updatedAt: new Date(),
          })
          .where(eq(videos.muxAssetId, assetId));

        console.log("🎵  Track processed", {
          assetId,
          trackId,
          status,
        });

        break;
      }

      default: {
        console.log("ℹ️  Unhandled webhook type", payload.type);
        break;
      }
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    logServer.error("Unhandled webhook error", error instanceof Error ? error : new Error(String(error)), {
      endpoint: "/api/videos/webhook",
      payloadType: payload?.type,
    });
    return new Response("Internal Server Error", { status: 500 });
  }
};
