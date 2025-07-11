"use client";

import { Switch } from "@/components/ui/switch";
import { Play, Pause } from "lucide-react";
import { useViewState } from "@/contexts/ViewStateContext";

interface AnimationToggleProps {
    className?: string;
}

export function AnimationToggle({ className = "" }: AnimationToggleProps) {
    const { animationsEnabled, setAnimationsEnabled } = useViewState();

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Pause className="w-3 h-3 text-white/70" />
            <Switch
                checked={animationsEnabled}
                onCheckedChange={setAnimationsEnabled}
                className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-gray-600"
            />
            <Play className="w-3 h-3 text-white/70" />
            <span className="text-xs font-medium text-white/70 hidden sm:inline">
                {animationsEnabled ? "Animate" : "Still"}
            </span>
        </div>
    );
}
