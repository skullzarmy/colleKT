"use client";

import { Switch } from "@/components/ui/switch";
import { Play, Pause } from "lucide-react";
import { useViewState } from "@/contexts/ViewStateContext";

interface AnimationToggleProps {
    className?: string;
}

export function AnimationToggle({ className = "" }: AnimationToggleProps) {
    const { animationsEnabled, setAnimationsEnabled, styleConfig } = useViewState();

    const iconColor = styleConfig.ui.isLight ? "text-zinc-700" : "text-zinc-300";
    const textColor = styleConfig.ui.isLight ? "text-zinc-800" : "text-zinc-200";

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
