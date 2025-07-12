import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, Hash, Dices } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    totalCollectionNFTs,
    address,
    onPrevRoom,
    onNextRoom,
    onGoToRoom,
}: RoomNavigationProps) {
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

    // Calculate progress percentage
    const progressPercent = ((currentRoom + 1) / totalRooms) * 100;

    return (
        <TooltipProvider>
            <div className="fixed z-50 transform -translate-x-1/2 bottom-4 left-1/2">
                <div
                    className={`
                        bg-black/80 backdrop-blur-md rounded-2xl border border-white/20 
                        transition-all duration-300 ease-in-out
                        ${isExpanded ? "px-3 py-3 sm:px-6 sm:py-4" : "px-2 py-2 sm:px-4 sm:py-3"}
                        hover:bg-black/90 hover:border-white/30 max-w-[90vw] sm:max-w-none
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
                                className="p-1.5 transition-colors rounded-full sm:p-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={14} className="text-white sm:w-4 sm:h-4" />
                            </button>

                            <div className="flex flex-col items-center min-w-[60px] sm:min-w-[80px]">
                                <span className="text-xs font-medium text-white sm:text-sm">
                                    {currentRoom + 1}/{totalRooms}
                                </span>
                                <div className="relative w-12 h-1 mt-1 sm:w-16">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                                ref={progressBarRef}
                                                className="w-full h-full rounded-full cursor-pointer bg-white/20"
                                                onClick={handleProgressBarClick}
                                                onMouseMove={handleProgressBarMouseMove}
                                                onMouseLeave={handleProgressBarMouseLeave}
                                            >
                                                <div
                                                    className="h-full transition-all duration-300 rounded-full bg-cyan-400"
                                                    style={{ width: `${progressPercent}%` }}
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
                                className="p-1.5 transition-colors rounded-full sm:p-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={14} className="text-white sm:w-4 sm:h-4" />
                            </button>
                        </div>
                    )}

                    {/* Expanded view */}
                    {isExpanded && (
                        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                            <button
                                onClick={onPrevRoom}
                                disabled={currentRoom === 0}
                                className="flex items-center gap-1 px-2 py-1.5 transition-colors rounded-lg sm:gap-2 sm:px-3 sm:py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={14} className="text-white sm:w-4 sm:h-4" />
                                <span className="text-xs text-white sm:text-sm">Previous</span>
                            </button>

                            <div className="flex flex-col items-center min-w-[120px] sm:min-w-[140px]">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-white sm:text-base">
                                        Room {currentRoom + 1} of {totalRooms}
                                    </span>
                                    {onGoToRoom && (
                                        <button
                                            onClick={() => setShowJumpInput(!showJumpInput)}
                                            className="p-1 transition-colors rounded hover:bg-white/20"
                                            title="Jump to room"
                                        >
                                            <Hash size={12} className="text-cyan-400 sm:w-3.5 sm:h-3.5" />
                                        </button>
                                    )}
                                    {onGoToRoom && totalRooms > 1 && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={handleRandomRoom}
                                                    className="p-1 transition-colors rounded hover:bg-white/20"
                                                    title="Random room"
                                                >
                                                    <Dices size={12} className="text-purple-400 sm:w-3.5 sm:h-3.5" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Go to random room</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>

                                <div className="relative w-24 h-2 mt-2 mb-1 sm:w-32 sm:h-3">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                                ref={progressBarRef}
                                                className="w-full h-full transition-colors rounded-full cursor-pointer bg-white/20 hover:bg-white/30"
                                                onClick={handleProgressBarClick}
                                                onMouseMove={handleProgressBarMouseMove}
                                                onMouseLeave={handleProgressBarMouseLeave}
                                            >
                                                <div
                                                    className="h-full transition-all duration-300 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                                {/* Hover indicator */}
                                                {hoveredRoom !== null && (
                                                    <div
                                                        className="absolute top-0 w-1 h-full rounded-full bg-white/60"
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

                                <span className="text-xs text-gray-300">{currentRoomNFTCount} NFTs in this room</span>
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
                                        className="w-16 px-2 py-1 text-xs text-white placeholder-gray-400 border rounded sm:w-20 sm:text-sm bg-white/10 border-white/20 focus:outline-none focus:border-cyan-400"
                                    />
                                    <button
                                        onClick={handleJumpSubmit}
                                        className="px-2 py-1 text-xs text-white transition-colors rounded bg-cyan-500 hover:bg-cyan-600"
                                    >
                                        Go
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={onNextRoom}
                                disabled={currentRoom === totalRooms - 1}
                                className="flex items-center gap-1 px-2 py-1.5 transition-colors rounded-lg sm:gap-2 sm:px-3 sm:py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="text-xs text-white sm:text-sm">Next</span>
                                <ChevronRight size={14} className="text-white sm:w-4 sm:h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
