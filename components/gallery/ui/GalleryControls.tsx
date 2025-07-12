"use client";

import { User, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimationToggle } from "./AnimationToggle";
import { useViewState } from "@/contexts/ViewStateContext";

export default function GalleryControls() {
    const { cameraMode, setCameraMode } = useViewState();

    return (
        <div className="fixed z-40 pointer-events-auto bottom-4 left-4">
            <div className="flex flex-col items-start gap-2 px-3 py-2 border rounded-lg xl:flex-row xl:items-center bg-black/30 backdrop-blur-sm border-white/20">
                {/* Camera Mode Buttons */}
                <div className="flex items-center gap-1">
                    <Button
                        onClick={() => setCameraMode("walk")}
                        variant="secondary"
                        size="sm"
                        className={`transition-all duration-200 flex items-center justify-center gap-1 ${
                            cameraMode === "walk"
                                ? "bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-400"
                                : "bg-black/60 hover:bg-black/80 text-white border-white/20"
                        } backdrop-blur-sm px-2 py-1.5`}
                        title="Walk Mode - WASD to move, Q/E to turn"
                    >
                        <User className="w-3 h-3" />
                        <span className="text-xs font-medium">Walk</span>
                    </Button>

                    <Button
                        onClick={() => setCameraMode("overview")}
                        variant="secondary"
                        size="sm"
                        className={`transition-all duration-200 flex items-center justify-center gap-1 ${
                            cameraMode === "overview"
                                ? "bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-400"
                                : "bg-black/60 hover:bg-black/80 text-white border-white/20"
                        } backdrop-blur-sm px-2 py-1.5`}
                        title="Overview Mode - Fixed overhead view"
                    >
                        <Map className="w-3 h-3" />
                        <span className="text-xs font-medium">Overview</span>
                    </Button>
                </div>

                {/* Divider - hidden on mobile, vertical on larger screens */}
                <div className="hidden w-px h-6 xl:block bg-white/20"></div>

                {/* Animation Toggle */}
                <AnimationToggle />

                {/* Controls Info - shown at all sizes */}
                <div className="ml-2 text-xs text-white/70">
                    {cameraMode === "walk" ? "WASD: Move • Q/E: Turn • R/F: Height" : "Overview Mode"}
                </div>
            </div>
        </div>
    );
}
