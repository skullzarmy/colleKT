import { useState } from "react";

export type CameraMode = "walk" | "overview";

interface CameraModeSelectorProps {
    cameraMode: CameraMode;
    onCameraModeChange: (mode: CameraMode) => void;
    topOffset?: number; // Offset from top to avoid overlapping with page headers
}

export default function CameraModeSelector({ cameraMode, onCameraModeChange, topOffset = 0 }: CameraModeSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Calculate positioning based on offset
    const buttonTop = topOffset > 0 ? `${topOffset + 16}px` : "1rem"; // 16px = 1rem
    const drawerTop = topOffset > 0 ? `${topOffset + 16}px` : "1rem";

    return (
        <>
            {/* Movement Controls Button */}
            <div className="absolute flex gap-2 left-4" style={{ top: buttonTop }}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-center w-12 h-12 text-lg text-white rounded-lg bg-black/50 backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-colors"
                >
                    🚶
                </button>
            </div>

            {/* Controls Drawer */}
            {isOpen && (
                <div
                    className="absolute pointer-events-auto left-16 bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/20"
                    style={{ top: drawerTop }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white">Movement Controls</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/60 hover:text-white text-lg leading-none"
                        >
                            ×
                        </button>
                    </div>

                    {/* Camera Mode Selection */}
                    <div className="mb-4">
                        <div className="text-xs font-medium text-white mb-2">Camera Mode:</div>
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => onCameraModeChange("walk")}
                                className={`px-3 py-1 text-xs rounded ${
                                    cameraMode === "walk"
                                        ? "bg-cyan-500 text-white"
                                        : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                                }`}
                            >
                                🚶 Walk Mode
                            </button>
                            <button
                                onClick={() => onCameraModeChange("overview")}
                                className={`px-3 py-1 text-xs rounded ${
                                    cameraMode === "overview"
                                        ? "bg-cyan-500 text-white"
                                        : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                                }`}
                            >
                                🗺️ Overview
                            </button>
                        </div>
                    </div>

                    <div className="text-xs text-white space-y-2">
                        {cameraMode === "walk" && (
                            <>
                                <div className="text-white/80 font-medium">Desktop:</div>
                                <div className="space-y-1 text-white/70">
                                    <div>• WASD/Arrow Keys: Move</div>
                                    <div>• Q/E: Turn left/right</div>
                                    <div>• R/F: Move up/down</div>
                                </div>
                                <div className="text-white/80 font-medium mt-3">Mobile:</div>
                                <div className="text-white/70">• Use on-screen controls</div>
                            </>
                        )}
                        {cameraMode === "overview" && (
                            <>
                                <div className="text-white/70">• Fixed overhead view</div>
                                <div className="text-white/70">• Better for room navigation</div>
                                <div className="text-white/70">• Switch to Walk for exploration</div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Controls Overlay - Bottom Left */}
            <div className="absolute pointer-events-none bottom-4 left-4 text-xs text-white">
                <div className="bg-black/20 backdrop-blur-sm rounded px-3 py-2 border border-white/10">
                    {cameraMode === "walk" ? (
                        <div className="space-y-1">
                            <div>WASD: Move • Q/E: Turn</div>
                            <div>R/F: Up/Down</div>
                        </div>
                    ) : (
                        <div>Overview Mode</div>
                    )}
                </div>
            </div>
        </>
    );
}
