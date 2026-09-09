import type { SurfaceProfile } from "./types";

export const surfaces: Record<string, SurfaceProfile> = {
  mobilePortrait: {
    id: "mobilePortrait",
    width: 320,
    height: 480,
    safeArea: {
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
    },
    minTapTarget: 44,
    minTextSize: 16,
    viewingDistance: "near",
    touchOnly: true,
  },

  mobileLandscape: {
    id: "mobileLandscape",
    width: 480,
    height: 320,
    safeArea: {
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
    },
    minTapTarget: 44,
    minTextSize: 16,
    viewingDistance: "near",
    touchOnly: true,
  },

  broadcastLowerThird: {
    id: "broadcastLowerThird",
    width: 1920,
    height: 250,
    safeArea: {
      top: 12,
      right: 48,
      bottom: 12,
      left: 48,
    },
    minTextSize: 32,
    viewingDistance: "far",
    touchOnly: false,
  },

  squareKiosk: {
    id: "squareKiosk",
    width: 1080,
    height: 1080,
    safeArea: {
      top: 32,
      right: 32,
      bottom: 32,
      left: 32,
    },
    minTapTarget: 60,
    minTextSize: 22,
    viewingDistance: "normal",
    touchOnly: true,
  },

  constrained: {
    id: "constrained",
    width: 260,
    height: 180,
    safeArea: {
      top: 8,
      right: 8,
      bottom: 8,
      left: 8,
    },
    minTapTarget: 44,
    minTextSize: 14,
    viewingDistance: "near",
    touchOnly: true,
  },
};