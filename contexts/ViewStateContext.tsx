"use client";

import { createContext, useContext, useState, useEffect } from "react";

type CameraMode = "walk" | "overview";

interface ViewStateContextType {
    cameraMode: CameraMode;
    setCameraMode: (mode: CameraMode) => void;
    animationsEnabled: boolean;
    setAnimationsEnabled: (enabled: boolean) => void;
}

const ViewStateContext = createContext<ViewStateContextType | undefined>(undefined);

export function ViewStateProvider({ children }: { children: React.ReactNode }) {
    const [cameraMode, setCameraMode] = useState<CameraMode>("walk");
    const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(false); // Default to still

    // Persist animation preference to localStorage
    useEffect(() => {
        const saved = localStorage.getItem("collekt-animations-enabled");
        if (saved !== null) {
            setAnimationsEnabled(JSON.parse(saved));
        } else {
            // Set default to false for new users
            setAnimationsEnabled(false);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("collekt-animations-enabled", JSON.stringify(animationsEnabled));
    }, [animationsEnabled]);

    return (
        <ViewStateContext.Provider
            value={{
                cameraMode,
                setCameraMode,
                animationsEnabled,
                setAnimationsEnabled,
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
