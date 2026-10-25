import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Hash, Dices } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useViewState } from "@/contexts/ViewStateContext";

interface RoomNavigationProps {
    currentRoom: number;
    totalRooms: number;
    currentRoomNFTCount: number;
    totalCollectionNFTs: number;
    address: string;
    onPrevRoom: () => void;
    onNextRoom: () => void;
    onGoToRoom?: (roomNumber: number) => void;
}

export default function RoomNavigation({
    currentRoom,
    totalRooms,
    currentRoomNFTCount,
    address,
    onPrevRoom,
    onNextRoom,
    onGoToRoom,
}: RoomNavigationProps) {
    const { styleConfig } = useViewState();
    const [isExpanded, setIsExpanded] = useState(false);
    const [jumpInput, setJumpInput] = useState("");
    const [showJumpInput, setShowJumpInput] = useState(false);
    const [hoveredRoom, setHoveredRoom] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    // Focus input when it becomes visible
    useEffect(() => {
        if (showJumpInput && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [showJumpInput]);

    const handleJumpSubmit = () => {
        const roomNum = parseInt(jumpInput) - 1; // Convert to 0-based index
        if (roomNum >= 0 && roomNum < totalRooms && onGoToRoom) {
            onGoToRoom(roomNum);
            setJumpInput("");
            setShowJumpInput(false);
            setIsExpanded(false);
        }
    };

    const handleRandomRoom = () => {
        if (onGoToRoom && totalRooms > 1) {
            let randomRoom;
            do {
                randomRoom = Math.floor(Math.random() * totalRooms);
            } while (randomRoom === currentRoom); // Ensure we don't go to the same room
            onGoToRoom(randomRoom);
        }
    };

    const handleProgressBarClick = (e: React.MouseEvent) => {
        if (!progressBarRef.current || !onGoToRoom) return;

        const rect = progressBarRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const targetRoom = Math.floor(percentage * totalRooms);
        const clampedRoom = Math.max(0, Math.min(totalRooms - 1, targetRoom));

        onGoToRoom(clampedRoom);
    };

    const handleProgressBarMouseMove = (e: React.MouseEvent) => {
        if (!progressBarRef.current) return;

        const rect = progressBarRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const percentage = mouseX / rect.width;
        const targetRoom = Math.floor(percentage * totalRooms);
        const clampedRoom = Math.max(0, Math.min(totalRooms - 1, targetRoom));

        setHoveredRoom(clampedRoom);
    };

    const handleProgressBarMouseLeave = () => {
        setHoveredRoom(null);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleJumpSubmit();
        } else if (e.key === "Escape") {
            setJumpInput("");
            setShowJumpInput(false);
            setIsExpanded(false);
        }
    };

    const handleProgressBarKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft" && currentRoom > 0) {
            onPrevRoom();
        } else if (e.key === "ArrowRight" && currentRoom < totalRooms - 1) {
            onNextRoom();
        }
    };

    // Calculate progress percentage
    const progressPercent = ((currentRoom + 1) / totalRooms) * 100;

    const btnClasses = styleConfig.ui.isLight
        ? "bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-300 disabled:opacity-40"
        : "bg-white/10 hover:bg-white/20 text-white border-white/10 disabled:opacity-40";

    const focusRingClasses = styleConfig.ui.isLight
        ? "focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        : "focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

    const textPrimary = styleConfig.ui.isLight ? "text-zinc-900" : "text-white";
    const textSecondary = styleConfig.ui.isLight ? "text-zinc-700" : "text-zinc-300";

    const solidBg = styleConfig.ui.isLight
        ? styleConfig.id === "warm-solarium"
            ? "#fcfaf6"
            : "#ffffff"
        : styleConfig.id === "cyberpunk-neon"
        ? "#080914"
        : styleConfig.id === "minimal-spotlight"
        ? "#18191d"
        : "#09090b";

    return (
        <TooltipProvider>
            <div className={`fixed z-50 transform -translate-x-1/2 bottom-4 left-1/2 ${styleConfig.typography.fontFamily}`}>
                <div
                    style={{ backgroundColor: solidBg }}
                    className={`
                        ${styleConfig.typography.panelBorder} ${styleConfig.typography.panelText}
                        rounded-2xl border shadow-2xl transition-all duration-300 ease-in-out
                        ${isExpanded ? "px-3 py-3 sm:px-6 sm:py-4" : "px-2.5 py-2 sm:px-4 sm:py-3"}
                        max-w-[92vw] sm:max-w-none
                    `}
                    onMouseEnter={() => setIsExpanded(true)}
                    onMouseLeave={() => {
                        setIsExpanded(false);
                        setShowJumpInput(false);
                        setJumpInput("");
                    }}
                >
                    {/* Compact view */}
                    {!isExpanded && (
                        <div className="flex items-center gap-2 sm:gap-3">
                            <button
                                onClick={onPrevRoom}
                                disabled={currentRoom === 0}
                                aria-label={`Previous room (Room ${currentRoom})`}
                                className={`p-2 transition-colors rounded-full min-w-[36px] min-h-[36px] flex items-center justify-center ${btnClasses} ${focusRingClasses} disabled:cursor-not-allowed`}
                            >
                                <ChevronLeft size={16} className={textPrimary} aria-hidden="true" />
                            </button>

                            <div className="flex flex-col items-center min-w-[64px] sm:min-w-[80px]">
                                <span className={`text-xs font-semibold sm:text-sm ${textPrimary}`}>
                                    {currentRoom + 1}/{totalRooms}
                                </span>
                                <div className="relative w-12 h-1.5 mt-1 sm:w-16">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                                ref={progressBarRef}
                                                role="progressbar"
                                                aria-valuenow={currentRoom + 1}
                                                aria-valuemin={1}
                                                aria-valuemax={totalRooms}
                                                aria-label={`Gallery progress: Room ${currentRoom + 1} of ${totalRooms}`}
                                                tabIndex={0}
                                                onKeyDown={handleProgressBarKeyDown}
                                                className={`w-full h-full rounded-full cursor-pointer ${
                                                    styleConfig.ui.isLight ? "bg-black/15" : "bg-white/20"
                                                } ${focusRingClasses}`}
                                                onClick={handleProgressBarClick}
                                                onMouseMove={handleProgressBarMouseMove}
                                                onMouseLeave={handleProgressBarMouseLeave}
                                            >
                                                <div
                                                    className="h-full transition-all duration-300 rounded-full"
                                                    style={{ width: `${progressPercent}%`, backgroundColor: styleConfig.ui.accentColor }}
                                                />
                                            </div>
                                        </TooltipTrigger>
                                        {hoveredRoom !== null && (
                                            <TooltipContent>
                                                <p>Go to Room {hoveredRoom + 1}</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </div>
                            </div>

                            <button
                                onClick={onNextRoom}
                                disabled={currentRoom === totalRooms - 1}
                                aria-label={`Next room (Room ${currentRoom + 2})`}
                                className={`p-2 transition-colors rounded-full min-w-[36px] min-h-[36px] flex items-center justify-center ${btnClasses} ${focusRingClasses} disabled:cursor-not-allowed`}
                            >
                                <ChevronRight size={16} className={textPrimary} aria-hidden="true" />
                            </button>
                        </div>
                    )}

                    {/* Expanded view */}
                    {isExpanded && (
                        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                            <button
                                onClick={onPrevRoom}
                                disabled={currentRoom === 0}
                                aria-label={`Previous room (Room ${currentRoom})`}
                                className={`flex items-center gap-1 px-3 py-2 transition-colors rounded-lg min-h-[36px] ${btnClasses} ${focusRingClasses} disabled:cursor-not-allowed`}
                            >
                                <ChevronLeft size={16} className={textPrimary} aria-hidden="true" />
                                <span className={`text-xs font-medium sm:text-sm ${textPrimary}`}>Previous</span>
                            </button>

                            <div className="flex flex-col items-center min-w-[130px] sm:min-w-[150px]">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-semibold sm:text-base ${textPrimary}`}>
                                        Room {currentRoom + 1} of {totalRooms}
                                    </span>
                                    {onGoToRoom && (
                                        <button
                                            onClick={() => setShowJumpInput(!showJumpInput)}
                                            className={`p-1.5 transition-colors rounded min-w-[32px] min-h-[32px] flex items-center justify-center ${
                                                styleConfig.ui.isLight ? "hover:bg-black/10" : "hover:bg-white/20"
                                            } ${focusRingClasses}`}
                                            title="Jump to room"
                                            aria-label="Direct room jump"
                                        >
                                            <Hash size={14} style={{ color: styleConfig.ui.accentColor }} aria-hidden="true" />
                                        </button>
                                    )}
                                    {onGoToRoom && totalRooms > 1 && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={handleRandomRoom}
                                                    className={`p-1.5 transition-colors rounded min-w-[32px] min-h-[32px] flex items-center justify-center ${
                                                        styleConfig.ui.isLight ? "hover:bg-black/10" : "hover:bg-white/20"
                                                    } ${focusRingClasses}`}
                                                    title="Random room"
                                                    aria-label="Go to random room"
                                                >
                                                    <Dices size={14} className={styleConfig.ui.isLight ? "text-purple-600" : "text-purple-400"} aria-hidden="true" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Go to random room</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>

                                <div className="relative w-28 h-2.5 mt-2 mb-1 sm:w-36 sm:h-3">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                                ref={progressBarRef}
                                                role="progressbar"
                                                aria-valuenow={currentRoom + 1}
                                                aria-valuemin={1}
                                                aria-valuemax={totalRooms}
                                                aria-label={`Gallery progress: Room ${currentRoom + 1} of ${totalRooms}`}
                                                tabIndex={0}
                                                onKeyDown={handleProgressBarKeyDown}
                                                className={`w-full h-full transition-colors rounded-full cursor-pointer ${
                                                    styleConfig.ui.isLight ? "bg-black/15 hover:bg-black/25" : "bg-white/20 hover:bg-white/30"
                                                } ${focusRingClasses}`}
                                                onClick={handleProgressBarClick}
                                                onMouseMove={handleProgressBarMouseMove}
                                                onMouseLeave={handleProgressBarMouseLeave}
                                            >
                                                <div
                                                    className="h-full transition-all duration-300 rounded-full"
                                                    style={{ width: `${progressPercent}%`, backgroundColor: styleConfig.ui.accentColor }}
                                                />
                                                {/* Hover indicator */}
                                                {hoveredRoom !== null && (
                                                    <div
                                                        className={`absolute top-0 w-1.5 h-full rounded-full ${
                                                            styleConfig.ui.isLight ? "bg-black/50" : "bg-white/70"
                                                        }`}
                                                        style={{ left: `${((hoveredRoom + 0.5) / totalRooms) * 100}%` }}
                                                    />
                                                )}
                                            </div>
                                        </TooltipTrigger>
                                        {hoveredRoom !== null && (
                                            <TooltipContent>
                                                <p>Go to Room {hoveredRoom + 1}</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </div>

                                <span className={`text-xs ${textSecondary}`}>
                                    {currentRoomNFTCount} NFTs in this room
                                </span>
                            </div>

                            {/* Jump to room input */}
                            {showJumpInput && (
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="number"
                                        min="1"
                                        max={totalRooms}
                                        value={jumpInput}
                                        onChange={(e) => setJumpInput(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Room #"
                                        aria-label="Room number to jump to"
                                        className={`w-16 px-2.5 py-1.5 text-xs border rounded-md sm:w-20 sm:text-sm ${
                                            styleConfig.ui.isLight
                                                ? "bg-white text-zinc-900 placeholder-zinc-500 border-zinc-300 focus:border-blue-600"
                                                : "bg-black/60 text-white placeholder-zinc-400 border-zinc-700 focus:border-cyan-400"
                                        } focus:outline-none`}
                                    />
                                    <button
                                        onClick={handleJumpSubmit}
                                        aria-label="Submit room jump"
                                        style={{ backgroundColor: styleConfig.ui.accentColor, color: styleConfig.ui.isLight ? "#ffffff" : "#000000" }}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-md min-h-[32px] transition-opacity hover:opacity-90"
                                    >
                                        Go
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={onNextRoom}
                                disabled={currentRoom === totalRooms - 1}
                                aria-label={`Next room (Room ${currentRoom + 2})`}
                                className={`flex items-center gap-1 px-3 py-2 transition-colors rounded-lg min-h-[36px] ${btnClasses} ${focusRingClasses} disabled:cursor-not-allowed`}
                            >
                                <span className={`text-xs font-medium sm:text-sm ${textPrimary}`}>Next</span>
                                <ChevronRight size={16} className={textPrimary} aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
