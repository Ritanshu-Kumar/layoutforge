import { defineAd } from "../core/spec";

export const adSpec = defineAd([
  {
    id: "headline",
    type: "text",
    role: "primary",
    priority: 1,
    content: "The future of everyday performance.",
    constraints: {
      minWidth: 160,
      minHeight: 48,
      preferredWidth: 360,
      preferredHeight: 96,
      minFontSize: 20,
    },
  },

  {
    id: "product-image",
    type: "image",
    role: "hero",
    priority: 1,
    content: "Nova X1",
    constraints: {
      minWidth: 120,
      minHeight: 120,
      preferredWidth: 300,
      preferredHeight: 300,
    },
  },

  {
    id: "cta",
    type: "button",
    role: "action",
    priority: 2,
    content: "Shop Now",
    constraints: {
      minWidth: 120,
      minHeight: 48,
      preferredWidth: 160,
      preferredHeight: 52,
      minFontSize: 16,
      minTapTarget: 44,
    },
  },

  {
    id: "price",
    type: "text",
    role: "secondary",
    priority: 2,
    content: "From ₹49,999",
    constraints: {
      minWidth: 110,
      minHeight: 32,
      preferredWidth: 160,
      preferredHeight: 48,
      minFontSize: 16,
    },
  },

  {
    id: "logo",
    type: "image",
    role: "branding",
    priority: 3,
    content: "NOVA",
    constraints: {
      minWidth: 64,
      minHeight: 32,
      preferredWidth: 100,
      preferredHeight: 40,
    },
  },
]);