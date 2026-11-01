"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import { useViewState } from "@/contexts/ViewStateContext";

interface MobileTouchControlsProps {
    isCompact?: boolean;
    isShort?: boolean;
}

export default function MobileTouchControls({
    isCompact = false,
    isShort = false,
}: MobileTouchControlsProps) {
    const { setMoveInput, resetMoveInput, triggerResetView, styleConfig } = useViewState();
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [showHint, setShowHint] = useState(true);

    const baseRef = useRef<HTMLDivElement>(null);
    const activeTrackingIdRef = useRef<number | string | null>(null);

    // Max movement radius for joystick knob in pixels
    const MAX_RADIUS = isCompact ? 28 : 36;

    // Detect if device supports touch or is on mobile viewport / compact iframe
    useEffect(() => {
        const checkTouch = () => {
            const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
            const isSmallScreen = window.innerWidth < 1024 || isCompact;
            setIsTouchDevice(hasTouch || isSmallScreen);
        };
        checkTouch();
        window.addEventListener("resize", checkTouch);
        return () => window.removeEventListener("resize", checkTouch);
    }, [isCompact]);

    // Fade out hint after 4 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowHint(false);
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    const updateJoystickFromCoords = useCallback(
        (clientX: number, clientY: number) => {
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
        },
        [MAX_RADIUS, setMoveInput]
    );

    const stopJoystick = useCallback(() => {
        activeTrackingIdRef.current = null;
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        resetMoveInput();
    }, [resetMoveInput]);

    // Global touch & pointer listeners on window for seamless tracking in iframes
    useEffect(() => {
        const handleWindowTouchMove = (e: TouchEvent) => {
            if (activeTrackingIdRef.current === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === activeTrackingIdRef.current) {
                    if (e.cancelable) e.preventDefault();
                    updateJoystickFromCoords(touch.clientX, touch.clientY);
                    break;
                }
            }
        };

        const handleWindowTouchEnd = (e: TouchEvent) => {
            if (activeTrackingIdRef.current === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === activeTrackingIdRef.current) {
                    stopJoystick();
                    break;
                }
            }
        };

        const handleWindowPointerMove = (e: PointerEvent) => {
            if (activeTrackingIdRef.current === e.pointerId) {
                e.preventDefault();
                updateJoystickFromCoords(e.clientX, e.clientY);
            }
        };

        const handleWindowPointerUp = (e: PointerEvent) => {
            if (activeTrackingIdRef.current === e.pointerId) {
                stopJoystick();
            }
        };

        window.addEventListener("touchmove", handleWindowTouchMove, { passive: false });
        window.addEventListener("touchend", handleWindowTouchEnd);
        window.addEventListener("touchcancel", handleWindowTouchEnd);
        window.addEventListener("pointermove", handleWindowPointerMove);
        window.addEventListener("pointerup", handleWindowPointerUp);
        window.addEventListener("pointercancel", handleWindowPointerUp);

        return () => {
            window.removeEventListener("touchmove", handleWindowTouchMove);
            window.removeEventListener("touchend", handleWindowTouchEnd);
            window.removeEventListener("touchcancel", handleWindowTouchEnd);
            window.removeEventListener("pointermove", handleWindowPointerMove);
            window.removeEventListener("pointerup", handleWindowPointerUp);
            window.removeEventListener("pointercancel", handleWindowPointerUp);
        };
    }, [updateJoystickFromCoords, stopJoystick]);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        const touch = e.changedTouches[0];
        if (!touch) return;

        activeTrackingIdRef.current = touch.identifier;
        setIsDragging(true);
        setShowHint(false);
        updateJoystickFromCoords(touch.clientX, touch.clientY);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // Pointer down fallback for mouse/stylus
        if (activeTrackingIdRef.current !== null) return;
        e.stopPropagation();
        e.preventDefault();

        activeTrackingIdRef.current = e.pointerId;
        setIsDragging(true);
        setShowHint(false);
        updateJoystickFromCoords(e.clientX, e.clientY);
    };

    if (!isTouchDevice) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-30 select-none touch-none">
            {/* Gesture Helper Hint (Fades out automatically) */}
            {showHint && (
                <div
                    style={{ animation: "fadeInOut 4s ease forwards" }}
                    className={`absolute left-1/2 -translate-x-1/2 pointer-events-none transition-opacity duration-500 ${
                        isShort ? "top-10" : "top-20 sm:top-24"
                    }`}
                >
                    <div className="px-3 py-1 rounded-full bg-black/80 border border-white/20 backdrop-blur-md shadow-2xl flex items-center gap-2 text-[11px] sm:text-xs text-white/90 font-medium whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: styleConfig.ui.accentColor }} />
                        <span>Swipe to look • Joystick to walk</span>
                    </div>
                </div>
            )}

            {/* Movement Control Cluster (Bottom Left) */}
            <div
                data-joystick="true"
                className={`absolute pointer-events-auto ${
                    isCompact
                        ? "bottom-2.5 left-2.5 flex flex-col items-center"
                        : "bottom-4 left-3 sm:bottom-6 sm:left-6 flex items-end gap-2.5"
                }`}
            >
                {/* Elevation & Re-center View Mini Buttons */}
                <div className={`flex ${isCompact ? "flex-row gap-1 mb-1.5" : "flex-col gap-1.5 pb-1"}`}>
                    {/* Height Up */}
                    <button
                        onTouchStart={(e) => {
                            e.stopPropagation();
                            if (e.cancelable) e.preventDefault();
                            setMoveInput({ up: true });
                        }}
                        onTouchEnd={(e) => {
                            e.stopPropagation();
                            setMoveInput({ up: false });
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setMoveInput({ up: true });
                        }}
                        onPointerUp={(e) => {
                            e.stopPropagation();
                            setMoveInput({ up: false });
                        }}
                        onPointerLeave={() => setMoveInput({ up: false })}
                        aria-label="Move camera up"
                        title="Move up"
                        className={`${
                            isCompact ? "w-6 h-6 rounded-md" : "w-8 h-8 sm:w-9 sm:h-9 rounded-full"
                        } bg-black/60 border border-white/20 hover:bg-zinc-800 text-white flex items-center justify-center backdrop-blur-md shadow-md active:scale-95 transition-transform`}
                    >
                        <ChevronUp className={`${isCompact ? "w-3 h-3" : "w-4 h-4"} text-white/80`} />
                    </button>

                    {/* Height Down */}
                    <button
                        onTouchStart={(e) => {
                            e.stopPropagation();
                            if (e.cancelable) e.preventDefault();
                            setMoveInput({ down: true });
                        }}
                        onTouchEnd={(e) => {
                            e.stopPropagation();
                            setMoveInput({ down: false });
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setMoveInput({ down: true });
                        }}
                        onPointerUp={(e) => {
                            e.stopPropagation();
                            setMoveInput({ down: false });
                        }}
                        onPointerLeave={() => setMoveInput({ down: false })}
                        aria-label="Move camera down"
                        title="Move down"
                        className={`${
                            isCompact ? "w-6 h-6 rounded-md" : "w-8 h-8 sm:w-9 sm:h-9 rounded-full"
                        } bg-black/60 border border-white/20 hover:bg-zinc-800 text-white flex items-center justify-center backdrop-blur-md shadow-md active:scale-95 transition-transform`}
                    >
                        <ChevronDown className={`${isCompact ? "w-3 h-3" : "w-4 h-4"} text-white/80`} />
                    </button>

                    {/* Re-center view forward */}
                    <button
                        onClick={triggerResetView}
                        aria-label="Center view forward"
                        title="Center view"
                        className={`${
                            isCompact ? "w-6 h-6 rounded-md" : "w-8 h-8 sm:w-9 sm:h-9 rounded-full"
                        } bg-black/60 border border-white/20 hover:bg-zinc-800 text-white flex items-center justify-center backdrop-blur-md shadow-md active:scale-95 transition-transform`}
                    >
                        <RotateCcw className={`${isCompact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} text-white/80`} />
                    </button>
                </div>

                {/* Virtual Joystick */}
                <div
                    ref={baseRef}
                    onTouchStart={handleTouchStart}
                    onPointerDown={handlePointerDown}
                    aria-label="Walk movement joystick"
                    role="slider"
                    aria-valuetext={`X: ${Math.round((knobPos.x / MAX_RADIUS) * 100)}%, Y: ${Math.round((knobPos.y / MAX_RADIUS) * 100)}%`}
                    className={`relative rounded-full bg-black/50 border border-white/25 backdrop-blur-md shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors hover:border-white/40 ${
                        isCompact ? "w-[76px] h-[76px]" : "w-24 h-24 sm:w-28 sm:h-28"
                    }`}
                    style={{ touchAction: "none" }}
                >
                    {/* Subtle directional indicators */}
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] text-white/40 font-bold pointer-events-none">▲</span>
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-white/40 font-bold pointer-events-none">▼</span>
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-white/40 font-bold pointer-events-none">◀</span>
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-white/40 font-bold pointer-events-none">▶</span>

                    {/* Joystick Center Deadzone Ring */}
                    <div className={`${isCompact ? "w-6 h-6" : "w-8 h-8"} rounded-full border border-dashed border-white/15 pointer-events-none`} />

                    {/* Draggable Thumb Knob */}
                    <div
                        className={`absolute rounded-full border border-white/40 shadow-xl pointer-events-none ${
                            isCompact ? "w-9 h-9" : "w-11 h-11 sm:w-12 sm:h-12"
                        } ${isDragging ? "scale-105" : "transition-transform duration-150 ease-out"}`}
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
                            <div className={`${isCompact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} rounded-full bg-white/40`} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
