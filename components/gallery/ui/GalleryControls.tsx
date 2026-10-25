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

    const solidBg = styleConfig.ui.isLight
        ? styleConfig.id === "warm-solarium"
            ? "#fcfaf6"
            : "#ffffff"
        : styleConfig.id === "cyberpunk-neon"
        ? "#080914"
        : styleConfig.id === "minimal-spotlight"
        ? "#18191d"
        : "#09090b";

    const inactiveBtnClasses = styleConfig.ui.isLight
        ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300"
        : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-700";

    const focusRingClasses = styleConfig.ui.isLight
        ? "focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        : "focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

    return (
        <div className={`fixed z-40 pointer-events-auto bottom-3 left-3 sm:bottom-4 sm:left-4 ${styleConfig.typography.fontFamily}`}>
            <div
                style={{ backgroundColor: solidBg }}
                className={`flex flex-row items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 border rounded-xl shadow-2xl transition-colors duration-200 ${styleConfig.typography.panelBorder} ${styleConfig.typography.panelText}`}
            >
                {/* Camera Mode Buttons */}
                <div className="flex items-center gap-1 sm:gap-1.5" role="group" aria-label="Camera perspective">
                    <Button
                        onClick={() => setCameraMode("walk")}
                        variant="secondary"
                        size="sm"
                        aria-pressed={cameraMode === "walk"}
                        style={
                            cameraMode === "walk"
                                ? { backgroundColor: styleConfig.ui.accentColor, color: styleConfig.ui.isLight ? "#ffffff" : "#000000" }
                                : {}
                        }
                        className={`transition-all duration-200 min-h-[32px] sm:min-h-[36px] flex items-center justify-center gap-1 sm:gap-1.5 ${focusRingClasses} ${
                            cameraMode === "walk"
                                ? "font-semibold border-transparent"
                                : inactiveBtnClasses
                        } px-2 sm:px-2.5 py-1 sm:py-1.5`}
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
                        aria-pressed={cameraMode === "overview"}
                        style={
                            cameraMode === "overview"
                                ? { backgroundColor: styleConfig.ui.accentColor, color: styleConfig.ui.isLight ? "#ffffff" : "#000000" }
                                : {}
                        }
                        className={`transition-all duration-200 min-h-[32px] sm:min-h-[36px] flex items-center justify-center gap-1 sm:gap-1.5 ${focusRingClasses} ${
                            cameraMode === "overview"
                                ? "font-semibold border-transparent"
                                : inactiveBtnClasses
                        } px-2 sm:px-2.5 py-1 sm:py-1.5`}
                        title="Overview Mode - Fixed overhead view"
                        aria-label="Bird's eye overview mode"
                    >
                        <Map className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="text-xs">Overview</span>
                    </Button>
                </div>

                {/* Divider */}
                <div
                    className={`hidden sm:block w-px h-5 ${styleConfig.ui.isLight ? "bg-zinc-300" : "bg-zinc-700/80"}`}
                    aria-hidden="true"
                />

                {/* Environment Style Switcher */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="secondary"
                            size="sm"
                            className={`min-h-[32px] sm:min-h-[36px] ${inactiveBtnClasses} px-2 sm:px-2.5 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 ${focusRingClasses}`}
                            aria-label={`Current environment style: ${styleConfig.name}. Open style switcher menu`}
                        >
                            <Palette
                                className={`w-3.5 h-3.5 ${styleConfig.ui.isLight ? "text-zinc-700" : "text-zinc-300"}`}
                                aria-hidden="true"
                            />
                            <span className="text-xs font-medium max-w-[80px] sm:max-w-none truncate">{styleConfig.name}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="start"
                        side="top"
                        style={{ backgroundColor: solidBg }}
                        className={`w-56 p-1.5 mb-2 shadow-2xl ${styleConfig.typography.panelBorder} ${styleConfig.typography.panelText} ${styleConfig.typography.fontFamily}`}
                    >
                        <DropdownMenuLabel
                            className={`px-2 py-1 text-xs font-semibold ${
                                styleConfig.ui.isLight ? "text-zinc-700" : "text-zinc-300"
                            }`}
                        >
                            3D Environment Style
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator
                            className={`my-1 ${styleConfig.ui.isLight ? "bg-zinc-200" : "bg-zinc-800"}`}
                        />
                        {Object.values(GALLERY_STYLES).map((style) => (
                            <DropdownMenuItem
                                key={style.id}
                                onClick={() => setStyle(style.id as GalleryStyleId)}
                                aria-current={currentStyle === style.id ? "true" : undefined}
                                className={`flex items-center justify-between px-2.5 py-2 text-xs rounded-md cursor-pointer transition-colors ${
                                    styleConfig.ui.isLight
                                        ? "text-zinc-900 hover:bg-zinc-100 hover:text-black focus:bg-zinc-100 focus:text-black data-[highlighted]:bg-zinc-100 data-[highlighted]:text-black"
                                        : "text-zinc-100 hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white data-[highlighted]:bg-zinc-800 data-[highlighted]:text-white"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`w-3.5 h-3.5 rounded-full border shadow-sm flex-shrink-0 ${
                                            styleConfig.ui.isLight ? "border-zinc-400" : "border-zinc-600"
                                        }`}
                                        style={{ backgroundColor: style.swatchColor }}
                                        aria-hidden="true"
                                    />
                                    <span className={currentStyle === style.id ? "font-semibold" : "font-normal"}>
                                        {style.name}
                                    </span>
                                </div>
                                {currentStyle === style.id && (
                                    <Check
                                        className="w-3.5 h-3.5 ml-2 flex-shrink-0"
                                        style={{ color: styleConfig.ui.accentColor }}
                                        aria-hidden="true"
                                    />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Divider */}
                <div
                    className={`hidden sm:block w-px h-5 ${styleConfig.ui.isLight ? "bg-zinc-300" : "bg-zinc-700/80"}`}
                    aria-hidden="true"
                />

                {/* Animation Toggle */}
                <AnimationToggle />

                {/* Controls Info - Only on large viewports so it doesn't collide with room navigation */}
                <div
                    className={`ml-1 text-xs hidden 2xl:block whitespace-nowrap ${
                        styleConfig.ui.isLight ? "text-zinc-700 font-medium" : "text-zinc-300 opacity-80"
                    }`}
                >
                    {cameraMode === "walk" ? "WASD: Move • Q/E: Turn • R/F: Height" : "Overview Mode"}
                </div>
            </div>
        </div>
    );
}
