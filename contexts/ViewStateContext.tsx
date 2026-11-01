"use client";

import { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import {
    type GalleryStyleId,
    type GalleryStyle,
    DEFAULT_GALLERY_STYLE,
    getGalleryStyle,
} from "@/lib/gallery/gallery-styles";

export type CameraMode = "walk" | "overview";

export interface MoveInput {
    x: number; // -1 to 1 (strafe)
    y: number; // -1 to 1 (forward/backward)
    up: boolean;
    down: boolean;
}

interface ViewStateContextType {
    cameraMode: CameraMode;
    setCameraMode: (mode: CameraMode) => void;
    animationsEnabled: boolean;
    setAnimationsEnabled: (enabled: boolean) => void;
    currentStyle: GalleryStyleId;
    setStyle: (style: GalleryStyleId) => void;
    styleConfig: GalleryStyle;
    prefersReducedMotion: boolean;
    moveInputRef: React.MutableRefObject<MoveInput>;
    resetViewSignalRef: React.MutableRefObject<number>;
    setMoveInput: (input: Partial<MoveInput>) => void;
    resetMoveInput: () => void;
    triggerResetView: () => void;
}

const ViewStateContext = createContext<ViewStateContextType | undefined>(undefined);

export function ViewStateProvider({ children }: { children: React.ReactNode }) {
    const [cameraMode, setCameraMode] = useState<CameraMode>("walk");
    const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(false);
    const [currentStyle, setCurrentStyle] = useState<GalleryStyleId>(DEFAULT_GALLERY_STYLE);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

    // High performance movement input refs for 60/120fps physics loop without re-renders
    const moveInputRef = useRef<MoveInput>({ x: 0, y: 0, up: false, down: false });
    const resetViewSignalRef = useRef<number>(0);

    const setMoveInput = (input: Partial<MoveInput>) => {
        Object.assign(moveInputRef.current, input);
    };

    const resetMoveInput = () => {
        moveInputRef.current = { x: 0, y: 0, up: false, down: false };
    };

    const triggerResetView = () => {
        resetViewSignalRef.current += 1;
    };

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
                moveInputRef,
                resetViewSignalRef,
                setMoveInput,
                resetMoveInput,
                triggerResetView,
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
