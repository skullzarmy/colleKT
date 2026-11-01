import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Html } from "@react-three/drei";
import { UnifiedToken } from "../lib/data/types/token-types";
import GalleryRoom from "./gallery/GalleryRoom";
import GalleryTitle from "./gallery-title";
import GalleryControls from "./gallery/ui/GalleryControls";
import RoomNavigation from "./gallery/ui/RoomNavigation";
import GalleryFooter from "./gallery/ui/GalleryFooter";
import MobileTouchControls from "./gallery/controls/MobileTouchControls";
import { useViewState } from "@/contexts/ViewStateContext";
import LoadingAnimation from "./LoadingAnimation";

export type CameraMode = "walk" | "overview";

interface Gallery3DProps {
    nfts: UnifiedToken[];
    address: string;
    domain?: string | null;
    displayName?: string;
    onNFTSelect: (nft: UnifiedToken) => void;
    preloadedTextures?: Map<string, any>; // THREE.Texture but avoiding import issues
    currentRoom?: number;
    onRoomChange?: (roomNumber: number) => void;
    totalNFTs?: number; // Total NFTs in the collection for calculating total rooms
    // Layout coordination props to avoid UI overlaps
    topOffset?: number; // Offset from top to avoid overlapping with page headers
    isEmbed?: boolean;
}

const NFTS_PER_ROOM = 20;

export default function Gallery3D({
    nfts,
    address,
    domain,
    displayName,
    onNFTSelect,
    preloadedTextures,
    currentRoom: initialRoom = 0,
    onRoomChange,
    totalNFTs = 0,
    topOffset = 0, // Default to no offset
    isEmbed = false,
}: Gallery3DProps) {
    const [currentRoom, setCurrentRoom] = useState(initialRoom);
    const { cameraMode, setCameraMode } = useViewState();
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

    // Track exact container dimensions via ResizeObserver for responsive iframe/embed/mobile layouts
    useEffect(() => {
        if (!containerRef.current) return;
        const updateDims = () => {
            if (containerRef.current) {
                setContainerDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
        };
        updateDims();

        const observer = new ResizeObserver(updateDims);
        observer.observe(containerRef.current);
        window.addEventListener("resize", updateDims);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updateDims);
        };
    }, []);

    // Layout flags based on container dimensions
    const isCompact = containerDimensions.width > 0 ? containerDimensions.width < 540 : false;
    const isUltraCompact = containerDimensions.width > 0 ? containerDimensions.width < 380 : false;
    const isShort = containerDimensions.height > 0 ? containerDimensions.height < 460 : false;

    // Update local room state when prop changes
    useEffect(() => {
        setCurrentRoom(initialRoom);
    }, [initialRoom]);

    // Calculate total rooms based on total NFTs in collection
    const totalRooms = Math.max(1, Math.ceil(totalNFTs / NFTS_PER_ROOM));
    const currentRoomNFTs = nfts; // All NFTs passed are for the current room

    const handleNextRoom = useCallback(() => {
        if (currentRoom < totalRooms - 1) {
            const newRoom = currentRoom + 1;
            setCurrentRoom(newRoom);
            onRoomChange?.(newRoom);
        }
    }, [currentRoom, totalRooms, onRoomChange]);

    const handlePrevRoom = useCallback(() => {
        if (currentRoom > 0) {
            const newRoom = currentRoom - 1;
            setCurrentRoom(newRoom);
            onRoomChange?.(newRoom);
        }
    }, [currentRoom, onRoomChange]);

    if (nfts.length === 0) {
        return (
            <div className="flex items-center justify-center w-full h-screen bg-black">
                <div className="space-y-4 text-center">
                    <p className="text-xl text-white">No NFTs found</p>
                    <p className="text-white/60">This address doesn't seem to have any NFTs with metadata</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative w-full h-screen h-[100dvh] overflow-hidden"
            style={{ width: "100%", height: "100%", minHeight: "100%" }}
        >
            <Canvas
                shadows
                camera={{ fov: 60 }}
                gl={{
                    antialias: true,
                    alpha: false,
                    powerPreference: "high-performance",
                }}
                dpr={[1, 2]}
                performance={{ min: 0.5 }}
                className="w-full h-full touch-none select-none"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            >
                <Suspense
                    fallback={
                        <Html center>
                            <div className="flex flex-col items-center justify-center space-y-4">
                                <LoadingAnimation />
                                <div className="text-xl text-white">Loading Room {currentRoom + 1}...</div>
                            </div>
                        </Html>
                    }
                >
                    <Environment preset="warehouse" />
                    <GalleryTitle
                        address={address}
                        domain={domain}
                        displayName={displayName}
                        position={[0, 15, -20]}
                        fontSize={2.0}
                    />
                    <GalleryRoom
                        nfts={currentRoomNFTs}
                        roomNumber={currentRoom}
                        totalRooms={totalRooms}
                        walletAddress={address}
                        domain={domain}
                        displayName={displayName}
                        onNFTSelect={onNFTSelect}
                        onNextRoom={handleNextRoom}
                        onPrevRoom={handlePrevRoom}
                        preloadedTextures={preloadedTextures}
                        cameraMode={cameraMode}
                    />
                </Suspense>
            </Canvas>

            {/* Gallery Controls - Adapts to compact / embed / desktop */}
            <GalleryControls
                isCompact={isCompact}
                isUltraCompact={isUltraCompact}
                isEmbed={isEmbed}
            />

            {/* Room Navigation UI */}
            <RoomNavigation
                currentRoom={currentRoom}
                totalRooms={totalRooms}
                currentRoomNFTCount={currentRoomNFTs.length}
                totalCollectionNFTs={totalNFTs}
                address={address}
                onPrevRoom={handlePrevRoom}
                onNextRoom={handleNextRoom}
                onGoToRoom={onRoomChange}
                isEmbed={isEmbed}
                isCompact={isCompact}
                isShort={isShort}
            />

            {/* Mobile Touch Movement Joystick & Helpers - In walk mode */}
            {cameraMode === "walk" && (
                <MobileTouchControls isCompact={isCompact} isShort={isShort} />
            )}

            {/* Footer */}
            <GalleryFooter isEmbed={isEmbed} />
        </div>
    );
}
