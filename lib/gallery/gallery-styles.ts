/**
 * Central Gallery Style Registry
 *
 * Defines 5 curated aesthetic environments for colleKT with physical PBR materials
 * and lighting parameters for Three.js rendering, plus WCAG AA accessible UI tokens.
 */

export type GalleryStyleId =
    | "classic-dark"
    | "museum-white"
    | "cyberpunk-neon"
    | "warm-solarium"
    | "minimal-spotlight";

export interface GalleryStyle {
    id: GalleryStyleId;
    name: string;
    description: string;
    swatchColor: string;
    walls: {
        wallColor: string;
        floorColor: string;
        ceilingColor: string;
        roughness: number;
        metalness: number;
    };
    lighting: {
        ambient: { color: string; intensity: number };
        directional: { position: [number, number, number]; color: string; intensity: number };
        fill: { position: [number, number, number]; color: string; intensity: number };
        point: { position: [number, number, number]; color: string; intensity: number };
    };
    frames: {
        borderColor: string;
        selectedColor: string;
        hoverColor: string;
        roughness: number;
        metalness: number;
    };
    door: {
        frameColor: string;
        portalColor: string;
    };
    ui: {
        isLight: boolean;
        accentColor: string;
        badgeText: string;
    };
}

export const GALLERY_STYLES: Record<GalleryStyleId, GalleryStyle> = {
    "classic-dark": {
        id: "classic-dark",
        name: "Classic Dark",
        description: "Deep graphite walls with crisp neutral museum spotlighting",
        swatchColor: "#222225",
        walls: {
            wallColor: "#222225",
            floorColor: "#141416",
            ceilingColor: "#0d0d0f",
            roughness: 0.85,
            metalness: 0.05,
        },
        lighting: {
            ambient: { color: "#ffffff", intensity: 0.45 },
            directional: { position: [10, 10, 5], color: "#ffffff", intensity: 0.85 },
            fill: { position: [-10, 8, -5], color: "#d4d4d8", intensity: 0.4 },
            point: { position: [0, 7.5, 0], color: "#ffffff", intensity: 0.5 },
        },
        frames: {
            borderColor: "#333338",
            selectedColor: "#00bcd4",
            hoverColor: "#55555e",
            roughness: 0.3,
            metalness: 0.7,
        },
        door: {
            frameColor: "#333338",
            portalColor: "#00bcd4",
        },
        ui: {
            isLight: false,
            accentColor: "#00bcd4",
            badgeText: "text-cyan-400 bg-cyan-950/60 border-cyan-800",
        },
    },
    "museum-white": {
        id: "museum-white",
        name: "Museum White",
        description: "Pristine white gallery walls with matte light limestone flooring",
        swatchColor: "#f4f4f6",
        walls: {
            wallColor: "#f4f4f6",
            floorColor: "#e4e4e9",
            ceilingColor: "#fafafa",
            roughness: 0.82,
            metalness: 0.02,
        },
        lighting: {
            ambient: { color: "#fffbf5", intensity: 0.65 },
            directional: { position: [10, 12, 6], color: "#ffffff", intensity: 0.9 },
            fill: { position: [-10, 10, -6], color: "#e4e4e7", intensity: 0.5 },
            point: { position: [0, 8, 0], color: "#fffbf5", intensity: 0.6 },
        },
        frames: {
            borderColor: "#1c1c1e",
            selectedColor: "#2563eb",
            hoverColor: "#52525b",
            roughness: 0.4,
            metalness: 0.3,
        },
        door: {
            frameColor: "#27272a",
            portalColor: "#2563eb",
        },
        ui: {
            isLight: true,
            accentColor: "#2563eb",
            badgeText: "text-blue-700 bg-blue-100 border-blue-300",
        },
    },
    "cyberpunk-neon": {
        id: "cyberpunk-neon",
        name: "Midnight Slate",
        description: "Matte zinc-slate walls with quiet charcoal stone flooring and neutral museum track lighting",
        swatchColor: "#18181b",
        walls: {
            wallColor: "#18181b",
            floorColor: "#111113",
            ceilingColor: "#0a0a0c",
            roughness: 0.88, // Completely matte, zero glare or shiny reflections
            metalness: 0.02,
        },
        lighting: {
            ambient: { color: "#ffffff", intensity: 0.45 },
            directional: { position: [10, 10, 5], color: "#ffffff", intensity: 0.9 },
            fill: { position: [-10, 8, -5], color: "#71717a", intensity: 0.35 },
            point: { position: [0, 7.5, 0], color: "#ffffff", intensity: 0.45 },
        },
        frames: {
            borderColor: "#27272a",
            selectedColor: "#38bdf8",
            hoverColor: "#3f3f46",
            roughness: 0.4,
            metalness: 0.6,
        },
        door: {
            frameColor: "#27272a",
            portalColor: "#38bdf8",
        },
        ui: {
            isLight: false,
            accentColor: "#38bdf8",
            badgeText: "text-sky-400 bg-sky-950/60 border-sky-800",
        },
    },
    "warm-solarium": {
        id: "warm-solarium",
        name: "Warm Walnut",
        description: "Soft gallery linen walls with rich matte walnut timber flooring and warm ambient lighting",
        swatchColor: "#e6e2da",
        walls: {
            wallColor: "#e6e2da", // Warm linen gallery wall
            floorColor: "#2e241c", // Matte rich walnut wood
            ceilingColor: "#f0ece4",
            roughness: 0.85, // Matte wood floor, zero shiny reflections
            metalness: 0.02,
        },
        lighting: {
            ambient: { color: "#fffaf2", intensity: 0.6 },
            directional: { position: [10, 11, 5], color: "#fff8eb", intensity: 0.95 },
            fill: { position: [-10, 8, -5], color: "#ede7dd", intensity: 0.4 },
            point: { position: [0, 7.5, 0], color: "#fffaf2", intensity: 0.5 },
        },
        frames: {
            borderColor: "#3a2f26",
            selectedColor: "#d97706", // Warm amber gold
            hoverColor: "#57483c",
            roughness: 0.4,
            metalness: 0.5,
        },
        door: {
            frameColor: "#3a2f26",
            portalColor: "#d97706",
        },
        ui: {
            isLight: true,
            accentColor: "#b45309",
            badgeText: "text-amber-800 bg-amber-100 border-amber-300",
        },
    },
    "minimal-spotlight": {
        id: "minimal-spotlight",
        name: "Brutalist Concrete",
        description: "Tadao Ando smooth cast-concrete walls with deep matte basalt flooring and crisp museum lighting",
        swatchColor: "#616469",
        walls: {
            wallColor: "#52555a", // Cast concrete
            floorColor: "#18191b", // Matte basalt stone
            ceilingColor: "#323438",
            roughness: 0.92, // Deep matte stone, zero glare
            metalness: 0.02,
        },
        lighting: {
            ambient: { color: "#ffffff", intensity: 0.5 },
            directional: { position: [9, 11, 5], color: "#ffffff", intensity: 1.0 },
            fill: { position: [-9, 8, -5], color: "#8b8f96", intensity: 0.35 },
            point: { position: [0, 7.5, 0], color: "#ffffff", intensity: 0.45 },
        },
        frames: {
            borderColor: "#222427",
            selectedColor: "#f59e0b",
            hoverColor: "#3d4045",
            roughness: 0.4,
            metalness: 0.5,
        },
        door: {
            frameColor: "#222427",
            portalColor: "#f59e0b",
        },
        ui: {
            isLight: false,
            accentColor: "#f59e0b",
            badgeText: "text-amber-400 bg-amber-950/60 border-amber-700",
        },
    },
};

export const DEFAULT_GALLERY_STYLE: GalleryStyleId = "classic-dark";

export function getGalleryStyle(styleId?: string | null): GalleryStyle {
    if (styleId && styleId in GALLERY_STYLES) {
        return GALLERY_STYLES[styleId as GalleryStyleId];
    }
    return GALLERY_STYLES[DEFAULT_GALLERY_STYLE];
}
