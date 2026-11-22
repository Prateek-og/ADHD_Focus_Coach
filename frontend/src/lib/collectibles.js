/**
 * Hybrid avatar catalogue.
 *
 * The SVG dog stays the default avatar. Rive files are optional companions
 * that are only fetched when the child actually selects one (see page.js).
 * Accessories are pure SVG overlays rendered on top of the dog, so they work
 * even before any Rive state-machine inputs are wired.
 */

export const COLLECTIBLES = [
  {
    id: "none",
    name: "Just Buddy",
    icon: "🐶",
    file: null,
    description: "Your dog buddy on their own.",
  },
  {
    id: "ducky",
    name: "Ducky",
    icon: "🦆",
    file: "/rive/ducky.riv",
    description: "A cheerful little duck friend.",
    accessoryTransform: "translate(0px, 5px) scale(0.88)",
  },
  {
    id: "robo",
    name: "Robo",
    icon: "🤖",
    file: "/rive/robo.riv",
    description: "A tiny robot sidekick.",
    accessoryTransform: "translate(0px, 3px) scale(0.9)",
  },
  {
    id: "snek",
    name: "Snek",
    icon: "🐍",
    file: "/rive/snek.riv",
    description: "A wiggly animated snake.",
    large: true,
    accessoryTransform: "translate(0px, -6px) scale(0.8)",
  },
  {
    id: "sobo",
    name: "Sobo",
    icon: "👾",
    file: "/rive/sobo.riv",
    description: "A big animated buddy (loads on demand).",
    large: true,
    accessoryTransform: "translate(0px, 0px) scale(0.92)",
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
