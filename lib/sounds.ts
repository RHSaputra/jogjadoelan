"use client";

// Pre-load audio objects on the client to avoid delay
let notifAudio: HTMLAudioElement | null = null;
let chatAudio: HTMLAudioElement | null = null;

if (typeof window !== "undefined") {
  notifAudio = new Audio("/sounds/notification.ogg");
  notifAudio.volume = 0.5;

  chatAudio = new Audio("/sounds/chat.ogg");
  chatAudio.volume = 0.6;
}

export function playNotificationSound() {
  if (notifAudio) {
    notifAudio.currentTime = 0;
    notifAudio.play().catch((e) => console.log("Audio play blocked by browser policy:", e));
  }
}

export function playChatSound() {
  if (chatAudio) {
    chatAudio.currentTime = 0;
    chatAudio.play().catch((e) => console.log("Audio play blocked by browser policy:", e));
  }
}
