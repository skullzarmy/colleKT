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
        description: "Deep charcoal museum walls with matte ebony flooring and focused art spotlighting",
        swatchColor: "#16161a",
        walls: {
            wallColor: "#16161a", // Deep charcoal black
            floorColor: "#0e0e11", // Matte ebony floor
            ceilingColor: "#08080a",
            roughness: 0.88,
            metalness: 0.02,
        },
        lighting: {
            ambient: { color: "#ffffff", intensity: 0.4 },
            directional: { position: [10, 10, 5], color: "#ffffff", intensity: 1.0 },
            fill: { position: [-10, 8, -5], color: "#a1a1aa", intensity: 0.35 },
            point: { position: [0, 7.5, 0], color: "#ffffff", intensity: 0.45 },
        },
        frames: {
            borderColor: "#26262b",
            selectedColor: "#00bcd4",
            hoverColor: "#3f3f46",
            roughness: 0.4,
            metalness: 0.6,
        },
        door: {
            frameColor: "#26262b",
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
        description: "Pristine white cube gallery walls with pale limestone flooring and natural ambient daylight",
        swatchColor: "#f8f9fa",
        walls: {
            wallColor: "#f8f9fa", // Pristine gallery white
            floorColor: "#e2e4e8", // Matte light limestone terrazzo
            ceilingColor: "#ffffff",
            roughness: 0.85,
            metalness: 0.02,
        },
        lighting: {
            ambient: { color: "#ffffff", intensity: 0.7 },
            directional: { position: [10, 12, 6], color: "#ffffff", intensity: 0.95 },
            fill: { position: [-10, 10, -6], color: "#e2e8f0", intensity: 0.45 },
            point: { position: [0, 8, 0], color: "#ffffff", intensity: 0.55 },
        },
        frames: {
            borderColor: "#18181b",
            selectedColor: "#2563eb", // Klein blue
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
    "warm-solarium": {
        id: "warm-solarium",
        name: "Warm Solarium",
        description: "Sunlit gallery with warm French linen walls, natural European oak timber flooring, and golden hour light",
        swatchColor: "#ede8df",
        walls: {
            wallColor: "#ede8df", // Warm linen canvas
            floorColor: "#8a6d4b", // Natural warm European oak hardwood
            ceilingColor: "#f6f4ee",
            roughness: 0.85,
            metalness: 0.02,
        },
        lighting: {
            ambient: { color: "#fffbf0", intensity: 0.7 },
            directional: { position: [10, 12, 5], color: "#fff5e4", intensity: 1.1 },
            fill: { position: [-10, 9, -5], color: "#f0ebe1", intensity: 0.45 },
            point: { position: [0, 8, 0], color: "#fffbf0", intensity: 0.55 },
        },
        frames: {
            borderColor: "#423326",
            selectedColor: "#d97706", // Amber gold
            hoverColor: "#5e4936",
            roughness: 0.4,
            metalness: 0.4,
        },
        door: {
            frameColor: "#423326",
            portalColor: "#d97706",
        },
        ui: {
            isLight: true,
            accentColor: "#b45309",
            badgeText: "text-amber-900 bg-amber-100 border-amber-300",
        },
    },
    "minimal-spotlight": {
        id: "minimal-spotlight",
        name: "Brutalist Concrete",
        description: "Smooth architectural cast-concrete pavilion with honed basalt stone flooring and track lighting",
        swatchColor: "#73767c",
        walls: {
            wallColor: "#73767c", // Architectural cast concrete
            floorColor: "#212327", // Honed matte basalt stone
            ceilingColor: "#4d5055",
            roughness: 0.92,
            metalness: 0.02,
        },
        lighting: {
            ambient: { color: "#f1f5f9", intensity: 0.55 },
            directional: { position: [9, 12, 5], color: "#ffffff", intensity: 1.25 },
            fill: { position: [-9, 8, -5], color: "#94a3b8", intensity: 0.35 },
            point: { position: [0, 8, 0], color: "#ffffff", intensity: 0.45 },
        },
        frames: {
            borderColor: "#1a1b1e",
            selectedColor: "#f59e0b", // Safety amber
            hoverColor: "#373a40",
            roughness: 0.4,
            metalness: 0.5,
        },
        door: {
            frameColor: "#1a1b1e",
            portalColor: "#f59e0b",
        },
        ui: {
            isLight: false,
            accentColor: "#f59e0b",
            badgeText: "text-amber-400 bg-amber-950/60 border-amber-700",
        },
    },
    "cyberpunk-neon": {
        id: "cyberpunk-neon",
        name: "Cyberpunk Neon",
        description: "Noir midnight corridor with dual electric-cyan & hot-magenta neon runners, atmospheric rim lights, and glowing portals",
        swatchColor: "#070810",
        walls: {
            wallColor: "#070812", // Noir midnight with indigo undertone
            floorColor: "#090a14", // Dark carbon-slate (matte diffuse, responds to neon runners)
            ceilingColor: "#040408",
            roughness: 0.78,
            metalness: 0.08,
        },
        lighting: {
            ambient: { color: "#0a081a", intensity: 0.45 },
            directional: { position: [10, 12, 6], color: "#00f0ff", intensity: 1.25 }, // Electric cyan key light
            fill: { position: [-10, 8, -6], color: "#ff007f", intensity: 0.85 }, // Hot neon magenta rim light
            point: { position: [0, 7.5, 0], color: "#00f0ff", intensity: 0.75 },
        },
        frames: {
            borderColor: "#141525",
            selectedColor: "#00f0ff", // Electric cyan
            hoverColor: "#ff007f", // Hot neon magenta
            roughness: 0.25,
            metalness: 0.75,
        },
        door: {
            frameColor: "#141525",
            portalColor: "#00f0ff",
        },
        ui: {
            isLight: false,
            accentColor: "#00f0ff",
            badgeText: "text-cyan-300 bg-cyan-950/70 border-cyan-500 shadow-[0_0_12px_rgba(0,240,255,0.3)]",
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
