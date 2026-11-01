"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import { useViewState } from "@/contexts/ViewStateContext";

export default function MobileTouchControls() {
    const { setMoveInput, resetMoveInput, triggerResetView, styleConfig } = useViewState();
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [showHint, setShowHint] = useState(true);

    const baseRef = useRef<HTMLDivElement>(null);
    const pointerIdRef = useRef<number | null>(null);

    // Max movement radius for joystick knob in pixels
    const MAX_RADIUS = 36;

    // Detect if device supports touch or is on mobile viewport
    useEffect(() => {
        const checkTouch = () => {
            const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
            const isSmallScreen = window.innerWidth < 1024;
            setIsTouchDevice(hasTouch || isSmallScreen);
        };
        checkTouch();
        window.addEventListener("resize", checkTouch);
        return () => window.removeEventListener("resize", checkTouch);
    }, []);

    // Fade out hint after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowHint(false);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    // Pointer events for joystick (supports mouse drag and touch seamlessly)
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (pointerIdRef.current !== null) return;

        pointerIdRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        setShowHint(false);

        updateJoystick(e.clientX, e.clientY);
    };

    const updateJoystick = useCallback((clientX: number, clientY: number) => {
        if (!baseRef.current) return;
        const rect = baseRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let deltaX = clientX - centerX;
        let deltaY = clientY - centerY;

        const distance = Math.hypot(deltaX, deltaY);
        if (distance > MAX_RADIUS) {
            deltaX = (deltaX / distance) * MAX_RADIUS;
            deltaY = (deltaY / distance) * MAX_RADIUS;
        }

        setKnobPos({ x: deltaX, y: deltaY });

        // Normalize to -1 ... 1
        const normX = deltaX / MAX_RADIUS;
        const normY = deltaY / MAX_RADIUS;
        setMoveInput({ x: normX, y: normY });
    }, [MAX_RADIUS, setMoveInput]);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (pointerIdRef.current !== e.pointerId) return;
        e.preventDefault();
        e.stopPropagation();
        updateJoystick(e.clientX, e.clientY);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (pointerIdRef.current !== e.pointerId) return;
        e.preventDefault();
        e.stopPropagation();

        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // Pointer may already be released
        }

        pointerIdRef.current = null;
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        resetMoveInput();
    };

    if (!isTouchDevice) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-30 select-none touch-none">
            {/* Gesture Helper Hint (Fades out automatically) */}
            {showHint && (
                <div
                    style={{ animation: "fadeInOut 5s ease forwards" }}
                    className="absolute top-28 left-1/2 -translate-x-1/2 pointer-events-none transition-opacity duration-500"
                >
                    <div className="px-3.5 py-1.5 rounded-full bg-black/75 border border-white/20 backdrop-blur-md shadow-2xl flex items-center gap-2 text-xs text-white/90 font-medium whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: styleConfig.ui.accentColor }} />
                        <span>Swipe screen to look around • Drag joystick to walk</span>
                    </div>
                </div>
            )}

            {/* Movement Control Cluster (Bottom Left) */}
            <div
                data-joystick="true"
                className="absolute bottom-4 left-3 sm:bottom-6 sm:left-6 flex items-end gap-2.5 pointer-events-auto"
            >
                {/* Virtual Joystick */}
                <div
                    ref={baseRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    aria-label="Walk movement joystick"
                    role="slider"
                    aria-valuetext={`X: ${Math.round((knobPos.x / MAX_RADIUS) * 100)}%, Y: ${Math.round((knobPos.y / MAX_RADIUS) * 100)}%`}
                    className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-black/50 border border-white/25 backdrop-blur-md shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors hover:border-white/40"
                    style={{ touchAction: "none" }}
                >
                    {/* Subtle directional indicators */}
                    <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] text-white/40 font-bold">▲</span>
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] text-white/40 font-bold">▼</span>
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-white/40 font-bold">◀</span>
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-white/40 font-bold">▶</span>

                    {/* Joystick Center Deadzone Ring */}
                    <div className="w-8 h-8 rounded-full border border-dashed border-white/15 pointer-events-none" />

                    {/* Draggable Thumb Knob */}
                    <div
                        className={`absolute w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/40 shadow-xl pointer-events-none ${
                            isDragging ? "scale-105" : "transition-transform duration-150 ease-out"
                        }`}
                        style={{
                            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
                            backgroundColor: isDragging
                                ? styleConfig.ui.accentColor
                                : styleConfig.ui.isLight
                                ? "#ffffff"
                                : "rgba(255, 255, 255, 0.25)",
                            boxShadow: isDragging ? `0 0 16px ${styleConfig.ui.accentColor}80` : undefined,
                        }}
                    >
                        <div className="w-full h-full rounded-full flex items-center justify-center">
                            <div className="w-3.5 h-3.5 rounded-full bg-white/40" />
                        </div>
                    </div>
                </div>

                {/* Vertical Elevation & View Reset Mini Controls */}
                <div className="flex flex-col gap-1.5 pb-1">
                    {/* Height Up */}
                    <button
                        onPointerDown={(e) => {
                            e.preventDefault();
                            setMoveInput({ up: true });
                        }}
                        onPointerUp={(e) => {
                            e.preventDefault();
                            setMoveInput({ up: false });
                        }}
                        onPointerLeave={() => setMoveInput({ up: false })}
                        aria-label="Move camera up"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 border border-white/20 hover:bg-zinc-800 text-white flex items-center justify-center backdrop-blur-md shadow-md active:scale-95 transition-transform"
                    >
                        <ChevronUp className="w-4 h-4 text-white/80" />
                    </button>

                    {/* Height Down */}
                    <button
                        onPointerDown={(e) => {
                            e.preventDefault();
                            setMoveInput({ down: true });
                        }}
                        onPointerUp={(e) => {
                            e.preventDefault();
                            setMoveInput({ down: false });
                        }}
                        onPointerLeave={() => setMoveInput({ down: false })}
                        aria-label="Move camera down"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 border border-white/20 hover:bg-zinc-800 text-white flex items-center justify-center backdrop-blur-md shadow-md active:scale-95 transition-transform"
                    >
                        <ChevronDown className="w-4 h-4 text-white/80" />
                    </button>

                    {/* Re-center view forward */}
                    <button
                        onClick={triggerResetView}
                        aria-label="Center view forward"
                        title="Center view forward"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 border border-white/20 hover:bg-zinc-800 text-white flex items-center justify-center backdrop-blur-md shadow-md active:scale-95 transition-transform"
                    >
                        <RotateCcw className="w-3.5 h-3.5 text-white/80" />
                    </button>
                </div>
            </div>
        </div>
    );
}
