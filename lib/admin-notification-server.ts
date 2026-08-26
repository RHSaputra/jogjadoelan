import pusher from "./pusher-server";
import { type NotificationVariant } from "@/components/admin/AdminNotification";
import { type SyncChannel } from "@/lib/sync-events";

interface AdminNotificationPayload {
  variant: NotificationVariant;
  title: string;
  message?: string;
  syncChannel?: SyncChannel; // If provided, the client will also trigger emitSync(channel) to refresh data
}

/**
 * Pushes a real-time notification to all connected Admin dashboards.
 * This will trigger a toast notification and optionally trigger a sync event to refresh counters/data.
 */
export async function pushAdminNotification(
  title: string,
  message: string,
  variant: NotificationVariant = "info",
  syncChannel?: SyncChannel
) {
  try {
    const payload: AdminNotificationPayload = {
      title,
      message,
      variant,
      syncChannel,
    };
    
    // Broadcast to the "admin-notifications" channel
    await pusher.trigger("admin-notifications", "notify", payload);
  } catch (error) {
    console.error("[pushAdminNotification] Failed to push notification via Pusher:", error);
  }
}
