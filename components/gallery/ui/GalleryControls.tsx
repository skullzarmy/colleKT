"use client";

import { User, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimationToggle } from "./AnimationToggle";
import { useViewState } from "@/contexts/ViewStateContext";

export default function GalleryControls() {
    const { cameraMode, setCameraMode } = useViewState();

    return (
        <div className="fixed z-40 pointer-events-auto bottom-4 left-4">
            <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-black/30 backdrop-blur-sm border-white/20">
                {/* Camera Mode Buttons */}
                <div className="flex items-center gap-1">
                    <Button
                        onClick={() => setCameraMode("walk")}
                        variant="secondary"
                        size="sm"
                        className={`transition-all duration-200 flex items-center justify-center gap-1.5 ${
                            cameraMode === "walk"
                                ? "bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-400"
                                : "bg-black/60 hover:bg-black/80 text-white border-white/20"
                        } backdrop-blur-sm`}
                        title="Walk Mode - WASD to move, Q/E to turn"
                    >
                        <User className="w-3 h-3" />
                        <span className="hidden text-xs font-medium sm:inline">Walk</span>
                    </Button>

                    <Button
                        onClick={() => setCameraMode("overview")}
                        variant="secondary"
                        size="sm"
                        className={`transition-all duration-200 flex items-center justify-center gap-1.5 ${
                            cameraMode === "overview"
                                ? "bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-400"
                                : "bg-black/60 hover:bg-black/80 text-white border-white/20"
                        } backdrop-blur-sm`}
                        title="Overview Mode - Fixed overhead view"
                    >
                        <Map className="w-3 h-3" />
                        <span className="hidden text-xs font-medium sm:inline">Overview</span>
                    </Button>
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-white/20"></div>

                {/* Animation Toggle */}
                <AnimationToggle />

                {/* Controls Info */}
                <div className="hidden ml-2 text-xs md:block text-white/70">
                    {cameraMode === "walk" ? "WASD: Move • Q/E: Turn • R/F: Height" : "Overview Mode"}
                </div>
            </div>
        </div>
    );
}
