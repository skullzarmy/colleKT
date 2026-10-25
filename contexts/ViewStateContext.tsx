"use client";

import { createContext, useContext, useState, useEffect, useMemo } from "react";
import {
    type GalleryStyleId,
    type GalleryStyle,
    DEFAULT_GALLERY_STYLE,
    getGalleryStyle,
} from "@/lib/gallery/gallery-styles";

export type CameraMode = "walk" | "overview";

interface ViewStateContextType {
    cameraMode: CameraMode;
    setCameraMode: (mode: CameraMode) => void;
    animationsEnabled: boolean;
    setAnimationsEnabled: (enabled: boolean) => void;
    currentStyle: GalleryStyleId;
    setStyle: (style: GalleryStyleId) => void;
    styleConfig: GalleryStyle;
    prefersReducedMotion: boolean;
}

const ViewStateContext = createContext<ViewStateContextType | undefined>(undefined);

export function ViewStateProvider({ children }: { children: React.ReactNode }) {
    const [cameraMode, setCameraMode] = useState<CameraMode>("walk");
    const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(false);
    const [currentStyle, setCurrentStyle] = useState<GalleryStyleId>(DEFAULT_GALLERY_STYLE);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

    // Read reduced-motion and URL parameters on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
            setPrefersReducedMotion(mediaQuery.matches);

            const handleMotionChange = (e: MediaQueryListEvent) => {
                setPrefersReducedMotion(e.matches);
            };
            mediaQuery.addEventListener("change", handleMotionChange);

            // Read ?style= and ?mode= from URL search params
            try {
                const params = new URLSearchParams(window.location.search);
                const styleParam = params.get("style");
                if (styleParam) {
                    const matched = getGalleryStyle(styleParam);
                    setCurrentStyle(matched.id);
                }

                const modeParam = params.get("mode");
                if (modeParam === "overview" || modeParam === "walk") {
                    setCameraMode(modeParam);
                }
            } catch {
                /* URL parsing fallback */
            }

            return () => {
                mediaQuery.removeEventListener("change", handleMotionChange);
            };
        }
    }, []);

    // Persist animation preference to localStorage
    useEffect(() => {
        const saved = localStorage.getItem("collekt-animations-enabled");
        if (saved !== null) {
            setAnimationsEnabled(JSON.parse(saved));
        } else {
            setAnimationsEnabled(false);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("collekt-animations-enabled", JSON.stringify(animationsEnabled));
    }, [animationsEnabled]);

    const styleConfig = useMemo(() => getGalleryStyle(currentStyle), [currentStyle]);

    return (
        <ViewStateContext.Provider
            value={{
                cameraMode,
                setCameraMode,
                animationsEnabled,
                setAnimationsEnabled,
                currentStyle,
                setStyle: setCurrentStyle,
                styleConfig,
                prefersReducedMotion,
            }}
        >
            {children}
        </ViewStateContext.Provider>
    );
}

export function useViewState() {
    const context = useContext(ViewStateContext);
    if (context === undefined) {
        throw new Error("useViewState must be used within a ViewStateProvider");
    }
    return context;
}
