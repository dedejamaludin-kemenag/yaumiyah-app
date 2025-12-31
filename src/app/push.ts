import { db } from "./supabase";

const VAPID = import.meta.env.VITE_PUBLIC_VAPID_KEY as string;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function upsertPushSubscription(userId: string, sub: PushSubscription) {
  const json = sub.toJSON();
  const payload = {
    user_id: userId,
    endpoint: json.endpoint!,
    p256dh: (json.keys?.p256dh ?? null) as any,
    auth: (json.keys?.auth ?? null) as any,
    user_agent: navigator.userAgent,
    platform: navigator.platform || null,
    is_active: true,
  };

  const { error } = await db.from("push_subscriptions").upsert(payload, { onConflict: "endpoint" });
  if (error) throw error;
}

export async function registerPush(): Promise<PushSubscription | null> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    if (!VAPID) return null;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });
    }
    return sub;
  } catch (e) {
    console.error("Push register error:", e);
    return null;
  }
}

export function isStandaloneMode() {
  // Android/Chrome: display-mode, iOS Safari: navigator.standalone
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
}
