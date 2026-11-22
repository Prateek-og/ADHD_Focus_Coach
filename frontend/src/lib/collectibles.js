/**
 * Hybrid avatar catalogue.
 *
 * The SVG dog stays the default avatar. Rive files are optional companions
 * that are only fetched when the child actually selects one (see page.js).
 * Accessories are SVG overlays rendered on top of the active avatar.
 *
 * accessoryAnchors are per-buddy AND per-accessory because every artboard
 * places its character differently:
 *   x, y  -> head/wear point as a fraction of the avatar stage
 *   size  -> accessory width as a fraction of the stage
 */

export const COLLECTIBLES = [
  {
    id: "none",
    name: "Just Buddy",
    icon: "🐶",
    file: null,
    description: "Your dog buddy on their own.",
    // The SVG dog uses its native full-stage coordinates, no override needed.
    allowedAccessories: ["cap", "glasses", "scarf", "bow"],
  },
  {
    id: "ducky",
    name: "Ducky",
    icon: "🦆",
    file: "/rive/ducky.riv",
    description: "A cheerful little duck friend (the ice-cream buddy).",
    allowedAccessories: ["cap", "glasses", "scarf", "bow"],
    accessoryAnchor: { x: 0.50, y: 0.45, size: 0.22 },
    accessoryAnchors: {
      cap: { x: 0.50, y: 0.33, size: 0.20 },
      glasses: { x: 0.50, y: 0.40, size: 0.18 },
      scarf: { x: 0.50, y: 0.56, size: 0.24 }, // ice-cream: in the middle
      bow: { x: 0.50, y: 0.55, size: 0.16 },
    },
  },
  {
    id: "robo",
    name: "Robo",
    icon: "🤖",
    file: "/rive/robo.riv",
    description: "A tiny robot sidekick.",
    // No glasses on Robo — its face is a display, specs look wrong.
    allowedAccessories: ["cap", "scarf", "bow"],
    accessoryAnchor: { x: 0.50, y: 0.55, size: 0.28 },
    accessoryAnchors: {
      cap: { x: 0.50, y: 0.30, size: 0.26 },
      scarf: { x: 0.50, y: 0.76, size: 0.30 }, // robot: low, below the eyes
      bow: { x: 0.50, y: 0.74, size: 0.20 },
    },
  },
  {
    id: "snek",
    name: "Snek",
    icon: "🐍",
    file: "/rive/snek.riv",
    description: "A wiggly animated snake.",
    large: true,
    // Snek already has its own look — no accessories at all.
    allowedAccessories: [],
    accessoryAnchor: null,
    accessoryAnchors: {},
  },
  {
    id: "sobo",
    name: "Sobo",
    icon: "👾",
    file: "/rive/sobo.riv",
    description: "A big animated buddy (loads on demand).",
    large: true,
    // No hat on Sobo — it already wears its own head pieces.
    allowedAccessories: ["glasses", "scarf", "bow"],
    accessoryAnchor: { x: 0.50, y: 0.42, size: 0.22 },
    accessoryAnchors: {
      glasses: { x: 0.50, y: 0.40, size: 0.19 },
      scarf: { x: 0.50, y: 0.54, size: 0.20 },
      bow: { x: 0.50, y: 0.54, size: 0.15 },
    },
  },
];

export const ACCESSORIES = [
  { id: "none", name: "None", icon: "✖️", description: "No accessory." },
  { id: "cap", name: "Cap", icon: "🧢", description: "A bright cap." },
  { id: "glasses", name: "Glasses", icon: "👓", description: "Super-smart specs." },
  { id: "scarf", name: "Scarf", icon: "🧣", description: "Cosy scarf." },
  { id: "bow", name: "Bow tie", icon: "🎀", description: "Fancy bow tie." },
];

export function getCollectible(id) {
  return COLLECTIBLES.find((item) => item.id === id) || COLLECTIBLES[0];
}

export function getAccessory(id) {
  return ACCESSORIES.find((item) => item.id === id) || ACCESSORIES[0];
}

/** Resolve the exact placement for a buddy + accessory pair. */
export function getAccessoryAnchor(collectibleId, accessoryId) {
  const buddy = getCollectible(collectibleId);
  return (
    buddy.accessoryAnchors?.[accessoryId] ||
    buddy.accessoryAnchor ||
    null
  );
}

/** Whether an accessory may be worn by a given buddy. */
export function isAccessoryAllowed(collectibleId, accessoryId) {
  if (!accessoryId || accessoryId === "none") return true;
  const buddy = getCollectible(collectibleId);
  if (!buddy.allowedAccessories) return true;
  return buddy.allowedAccessories.includes(accessoryId);
}
