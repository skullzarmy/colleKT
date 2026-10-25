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
        name: "Velvet Obsidian",
        description: "Deep volcanic obsidian walls with reflective liquid-glass flooring and high-contrast gallery spotlights",
        swatchColor: "#121318",
        walls: {
            wallColor: "#121318",
            floorColor: "#08090c",
            ceilingColor: "#050507",
            roughness: 0.22, // Liquid mirror terrazzo sheen
            metalness: 0.5,
        },
        lighting: {
            ambient: { color: "#ffffff", intensity: 0.4 },
            directional: { position: [10, 12, 6], color: "#ffffff", intensity: 1.15 },
            fill: { position: [-10, 9, -6], color: "#94a3b8", intensity: 0.35 },
            point: { position: [0, 8, 0], color: "#ffffff", intensity: 0.5 },
        },
        frames: {
            borderColor: "#272930",
            selectedColor: "#38bdf8",
            hoverColor: "#475569",
            roughness: 0.25,
            metalness: 0.85,
        },
        door: {
            frameColor: "#1e2026",
            portalColor: "#38bdf8",
        },
        ui: {
            isLight: false,
            accentColor: "#38bdf8",
            badgeText: "text-sky-300 bg-sky-950/60 border-sky-700",
        },
    },
    "warm-solarium": {
        id: "warm-solarium",
        name: "Tuscan Travertine",
        description: "Honed Roman limestone walls with warm smoked oak timber flooring and natural daylight",
        swatchColor: "#d4cbbe",
        walls: {
            wallColor: "#d4cbbe",
            floorColor: "#2c221a", // Smoked oak floor
            ceilingColor: "#e8e0d5",
            roughness: 0.88,
            metalness: 0.05,
        },
        lighting: {
            ambient: { color: "#faf7f2", intensity: 0.65 },
            directional: { position: [10, 12, 5], color: "#fff5ea", intensity: 1.05 },
            fill: { position: [-10, 9, -5], color: "#f1ede6", intensity: 0.45 },
            point: { position: [0, 8, 0], color: "#fffcf7", intensity: 0.55 },
        },
        frames: {
            borderColor: "#382e25",
            selectedColor: "#d4af37", // Champagne brass
            hoverColor: "#59493c",
            roughness: 0.35,
            metalness: 0.75,
        },
        door: {
            frameColor: "#382e25",
            portalColor: "#d4af37",
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
        description: "Raw architectural cast-concrete walls with polished dark basalt floors and crisp museum track lighting",
        swatchColor: "#787b80",
        walls: {
            wallColor: "#787b80", // Tadao Ando smooth cast concrete
            floorColor: "#1c1e21", // Honed basalt stone
            ceilingColor: "#505358",
            roughness: 0.95,
            metalness: 0.04,
        },
        lighting: {
            ambient: { color: "#f8fafc", intensity: 0.5 },
            directional: { position: [9, 12, 5], color: "#ffffff", intensity: 1.2 },
            fill: { position: [-9, 8, -5], color: "#94a3b8", intensity: 0.35 },
            point: { position: [0, 8, 0], color: "#ffffff", intensity: 0.45 },
        },
        frames: {
            borderColor: "#161719",
            selectedColor: "#f59e0b", // Architectural safety amber / hazard gold
            hoverColor: "#383b40",
            roughness: 0.25,
            metalness: 0.85,
        },
        door: {
            frameColor: "#161719",
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
