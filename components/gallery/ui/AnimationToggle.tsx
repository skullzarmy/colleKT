"use client";

import { Switch } from "@/components/ui/switch";
import { Play, Pause, Sparkles } from "lucide-react";
import { useViewState } from "@/contexts/ViewStateContext";

interface AnimationToggleProps {
    className?: string;
    compact?: boolean;
}

export function AnimationToggle({ className = "", compact = false }: AnimationToggleProps) {
    const { animationsEnabled, setAnimationsEnabled, styleConfig } = useViewState();

    const iconColor = styleConfig.ui.isLight ? "text-zinc-700" : "text-zinc-300";
    const textColor = styleConfig.ui.isLight ? "text-zinc-800" : "text-zinc-200";

    // Compact single-button toggle for mobile viewports, small iframes, and constrained containers
    if (compact) {
        return (
            <button
                type="button"
                onClick={() => setAnimationsEnabled(!animationsEnabled)}
                aria-pressed={animationsEnabled}
                aria-label={animationsEnabled ? "Disable ambient gallery animations" : "Enable ambient gallery animations"}
                title={animationsEnabled ? "Animations: ON (tap to turn off)" : "Animations: OFF (tap to turn on)"}
                className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg border transition-all flex items-center justify-center ${
                    animationsEnabled
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm"
                        : styleConfig.ui.isLight
                        ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-300"
                        : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 border-zinc-700"
                } ${className}`}
            >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                {animationsEnabled && (
                    <span
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                        style={{ backgroundColor: styleConfig.ui.accentColor }}
                    />
                )}
            </button>
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Pause className={`w-3.5 h-3.5 ${iconColor}`} aria-hidden="true" />
            <Switch
                checked={animationsEnabled}
                onCheckedChange={setAnimationsEnabled}
                aria-label="Toggle ambient gallery animations"
                className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-zinc-600 focus-visible:ring-2 focus-visible:ring-offset-2"
            />
            <Play className={`w-3.5 h-3.5 ${iconColor}`} aria-hidden="true" />
            <span className={`text-xs font-medium hidden sm:inline ${textColor}`}>
                {animationsEnabled ? "Animate" : "Still"}
            </span>
        </div>
    );
}
