"use client";

import { User, Map, Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimationToggle } from "./AnimationToggle";
import { useViewState } from "@/contexts/ViewStateContext";
import { GALLERY_STYLES, type GalleryStyleId } from "@/lib/gallery/gallery-styles";

export default function GalleryControls() {
    const { cameraMode, setCameraMode, currentStyle, setStyle, styleConfig } = useViewState();

    return (
        <div className={`fixed z-40 pointer-events-auto bottom-4 left-4 ${styleConfig.typography.fontFamily}`}>
            <div className={`flex flex-col items-start gap-2 px-3 py-2 border rounded-xl xl:flex-row xl:items-center shadow-2xl transition-colors duration-200 ${styleConfig.typography.panelBg} ${styleConfig.typography.panelBorder} ${styleConfig.typography.panelText}`}>
                {/* Camera Mode Buttons */}
                <div className="flex items-center gap-1.5" role="group" aria-label="Camera perspective">
                    <Button
                        onClick={() => setCameraMode("walk")}
                        variant="secondary"
                        size="sm"
                        style={
                            cameraMode === "walk"
                                ? { backgroundColor: styleConfig.ui.accentColor, color: styleConfig.ui.isLight ? "#ffffff" : "#000000" }
                                : {}
                        }
                        className={`transition-all duration-200 min-h-[36px] flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                            cameraMode === "walk"
                                ? "font-semibold border-transparent"
                                : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-700"
                        } px-2.5 py-1.5`}
                        title="Walk Mode - WASD to move, Q/E to turn"
                        aria-label="First person walk mode"
                    >
                        <User className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="text-xs">Walk</span>
                    </Button>

                    <Button
                        onClick={() => setCameraMode("overview")}
                        variant="secondary"
                        size="sm"
                        style={
                            cameraMode === "overview"
                                ? { backgroundColor: styleConfig.ui.accentColor, color: styleConfig.ui.isLight ? "#ffffff" : "#000000" }
                                : {}
                        }
                        className={`transition-all duration-200 min-h-[36px] flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                            cameraMode === "overview"
                                ? "font-semibold border-transparent"
                                : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-700"
                        } px-2.5 py-1.5`}
                        title="Overview Mode - Fixed overhead view"
                        aria-label="Bird's eye overview mode"
                    >
                        <Map className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="text-xs">Overview</span>
                    </Button>
                </div>

                {/* Divider */}
                <div className="hidden w-px h-6 xl:block bg-zinc-700/80" aria-hidden="true"></div>

                {/* Environment Style Switcher */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="min-h-[36px] bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-700 px-2.5 py-1.5 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            aria-label={`Current environment style: ${styleConfig.name}. Open style menu`}
                        >
                            <Palette className="w-3.5 h-3.5 text-zinc-300" aria-hidden="true" />
                            <span className="text-xs font-medium">{styleConfig.name}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="start"
                        side="top"
                        className={`w-56 p-1.5 mb-2 shadow-2xl ${styleConfig.typography.panelBg} ${styleConfig.typography.panelBorder} ${styleConfig.typography.panelText} ${styleConfig.typography.fontFamily}`}
                    >
                        <DropdownMenuLabel className="px-2 py-1 text-xs opacity-70 font-normal">
                            3D Environment Style
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-zinc-800 my-1" />
                        {Object.values(GALLERY_STYLES).map((style) => (
                            <DropdownMenuItem
                                key={style.id}
                                onClick={() => setStyle(style.id as GalleryStyleId)}
                                className="flex items-center justify-between px-2 py-2 text-xs rounded cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-3.5 h-3.5 rounded-full border border-zinc-600 shadow-sm"
                                        style={{ backgroundColor: style.swatchColor }}
                                        aria-hidden="true"
                                    />
                                    <span>{style.name}</span>
                                </div>
                                {currentStyle === style.id && (
                                    <Check className="w-3.5 h-3.5" style={{ color: styleConfig.ui.accentColor }} />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Divider */}
                <div className="hidden w-px h-6 xl:block bg-zinc-700/80" aria-hidden="true"></div>

                {/* Animation Toggle */}
                <AnimationToggle />

                {/* Controls Info */}
                <div className="ml-1 text-xs opacity-80 hidden md:block">
                    {cameraMode === "walk" ? "WASD: Move • Q/E: Turn • R/F: Height" : "Overview Mode"}
                </div>
            </div>
        </div>
    );
}
