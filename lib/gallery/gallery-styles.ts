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
        description: "Pristine white gallery walls with reflective polished light flooring",
        swatchColor: "#f4f4f6",
        walls: {
            wallColor: "#f4f4f6",
            floorColor: "#e2e2e8",
            ceilingColor: "#fafafa",
            roughness: 0.35, // Polished floor sheen
            metalness: 0.25,
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
        name: "Cyberpunk Neon",
        description: "Midnight indigo space with dual cyan and magenta reflections",
        swatchColor: "#0d0221",
        walls: {
            wallColor: "#0d0221",
            floorColor: "#050014",
            ceilingColor: "#03000a",
            roughness: 0.2, // Wet asphalt sheen
            metalness: 0.65,
        },
        lighting: {
            ambient: { color: "#1f0038", intensity: 0.5 },
            directional: { position: [10, 10, 5], color: "#00f0ff", intensity: 1.1 }, // Neon Cyan
            fill: { position: [-10, 8, -5], color: "#ff007f", intensity: 0.9 }, // Neon Magenta
            point: { position: [0, 7.5, 0], color: "#00f0ff", intensity: 0.7 },
        },
        frames: {
            borderColor: "#1b0d36",
            selectedColor: "#ff007f",
            hoverColor: "#00f0ff",
            roughness: 0.15,
            metalness: 0.9,
        },
        door: {
            frameColor: "#1b0d36",
            portalColor: "#ff007f",
        },
        ui: {
            isLight: false,
            accentColor: "#00f0ff",
            badgeText: "text-pink-400 bg-pink-950/60 border-pink-700",
        },
    },
    "warm-solarium": {
        id: "warm-solarium",
        name: "Warm Solarium",
        description: "Terracotta sandstone walls with warm golden hour spotlighting",
        swatchColor: "#2c221e",
        walls: {
            wallColor: "#2c221e",
            floorColor: "#1b1310",
            ceilingColor: "#140e0b",
            roughness: 0.85,
            metalness: 0.1,
        },
        lighting: {
            ambient: { color: "#ffe0b2", intensity: 0.55 },
            directional: { position: [10, 10, 5], color: "#ffb74d", intensity: 0.9 },
            fill: { position: [-10, 8, -5], color: "#ffcc80", intensity: 0.4 },
            point: { position: [0, 7.5, 0], color: "#ffe082", intensity: 0.6 },
        },
        frames: {
            borderColor: "#6d4c41",
            selectedColor: "#ff9800",
            hoverColor: "#8d6e63",
            roughness: 0.3,
            metalness: 0.8, // Bronze sheen
        },
        door: {
            frameColor: "#6d4c41",
            portalColor: "#ff9800",
        },
        ui: {
            isLight: false,
            accentColor: "#ff9800",
            badgeText: "text-amber-400 bg-amber-950/60 border-amber-700",
        },
    },
    "minimal-spotlight": {
        id: "minimal-spotlight",
        name: "Minimal Spotlight",
        description: "Pure void matte black with pinpoint dramatic spotlights on art",
        swatchColor: "#000000",
        walls: {
            wallColor: "#050505",
            floorColor: "#000000",
            ceilingColor: "#000000",
            roughness: 1.0,
            metalness: 0.0,
        },
        lighting: {
            ambient: { color: "#ffffff", intensity: 0.15 },
            directional: { position: [8, 12, 4], color: "#ffffff", intensity: 1.3 },
            fill: { position: [-8, 6, -4], color: "#52525b", intensity: 0.2 },
            point: { position: [0, 7, 0], color: "#ffffff", intensity: 0.3 },
        },
        frames: {
            borderColor: "#111113",
            selectedColor: "#ffffff",
            hoverColor: "#3f3f46",
            roughness: 0.9,
            metalness: 0.1,
        },
        door: {
            frameColor: "#18181b",
            portalColor: "#ffffff",
        },
        ui: {
            isLight: false,
            accentColor: "#ffffff",
            badgeText: "text-zinc-200 bg-zinc-900 border-zinc-700",
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
