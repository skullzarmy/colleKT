"use client";

import { createContext, useContext, useState } from "react";

type CameraMode = "walk" | "overview";

interface ViewStateContextType {
    cameraMode: CameraMode;
    setCameraMode: (mode: CameraMode) => void;
}

const ViewStateContext = createContext<ViewStateContextType | undefined>(undefined);

export function ViewStateProvider({ children }: { children: React.ReactNode }) {
    const [cameraMode, setCameraMode] = useState<CameraMode>("walk");

    return <ViewStateContext.Provider value={{ cameraMode, setCameraMode }}>{children}</ViewStateContext.Provider>;
}

export function useViewState() {
    const context = useContext(ViewStateContext);
    if (context === undefined) {
        throw new Error("useViewState must be used within a ViewStateProvider");
    }
    return context;
}
