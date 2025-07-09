"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { UnifiedToken } from "../../lib/data/types/token-types";
import NFTFrame from "../nft-frame";
import GalleryLighting from "./environment/GalleryLighting";
import GalleryWalls from "./environment/GalleryWalls";
import Door from "./environment/Door";
import RoomTitle from "./ui/RoomTitle";
import WalkController from "./controls/WalkController";
import OverviewController from "./controls/OverviewController";
import MobileTouchControls from "./controls/MobileTouchControls";
import { CameraMode } from "./ui/CameraModeSelector";
import { getImageDimensions, getIPFSUrl } from "../../lib/utils";

interface GalleryRoomProps {
    nfts: UnifiedToken[];
    roomNumber: number;
    totalRooms: number;
    walletAddress: string;
    domain?: string | null;
    displayName?: string;
    onNFTSelect?: (nft: UnifiedToken) => void;
    onNextRoom?: () => void;
    onPrevRoom?: () => void;
    preloadedTextures?: Map<string, any>;
    cameraMode: CameraMode;
}

interface NFTWithDimensions extends UnifiedToken {
    aspectRatio: number;
    width?: number;
    height?: number;
}

export default function GalleryRoom({
    nfts,
    roomNumber,
    totalRooms,
    walletAddress,
    domain,
    displayName,
    onNFTSelect,
    onNextRoom,
    onPrevRoom,
    preloadedTextures,
    cameraMode,
}: GalleryRoomProps) {
    const [nftsWithDimensions, setNftsWithDimensions] = useState<NFTWithDimensions[]>([]);
    const [dimensionsLoading, setDimensionsLoading] = useState(true);

    // Helper function to get image URI
    const getImageUri = (nft: UnifiedToken) => {
        return (
            nft.displayImage ||
            nft.metadata?.displayUri ||
            nft.metadata?.artifactUri ||
            nft.metadata?.image ||
            nft.metadata?.thumbnailUri
        );
    };

    // Load image dimensions for all NFTs
    useEffect(() => {
        const loadDimensions = async () => {
            setDimensionsLoading(true);
            const nftsWithDims: NFTWithDimensions[] = await Promise.all(
                nfts.map(async (nft) => {
                    const imageUri = getImageUri(nft);
                    if (!imageUri) {
                        return { ...nft, aspectRatio: 1 }; // Default square
                    }

                    try {
                        const url = getIPFSUrl(imageUri);
                        const { width, height } = await getImageDimensions(url);
                        const aspectRatio = width / height;

                        return {
                            ...nft,
                            aspectRatio: Math.max(0.5, Math.min(3, aspectRatio)), // Clamp between 0.5 and 3
                            width,
                            height,
                        };
                    } catch (error) {
                        return { ...nft, aspectRatio: 1 }; // Default square on error
                    }
                })
            );

            setNftsWithDimensions(nftsWithDims);
            setDimensionsLoading(false);
        };

        if (nfts.length > 0) {
            loadDimensions();
        }
    }, [nfts]);

    // Calculate hallway layout and positions
    const { positions, hallwayLength, hallwayWidth } = useMemo(() => {
        if (nftsWithDimensions.length === 0) {
            return { positions: [], hallwayLength: 30, hallwayWidth: 12 };
        }

        const count = nftsWithDimensions.length;
        const result: Array<[number, number, number, number?, number?]> = []; // [x, y, z, rotationY, aspectRatio]

        const standardHeight = 2.5; // Standard frame height
        const minSpacing = 0.5; // Minimum gap between artworks
        const artworkHeight = 4; // Halfway up the 8-unit wall
        const baseHallwayWidth = 12;

        // Group artworks: first 10 on left wall, next 10 on right wall
        const leftWallNFTs = nftsWithDimensions.slice(0, 10);
        const rightWallNFTs = nftsWithDimensions.slice(10, 20);

        // Calculate positions for left wall
        let leftWallLength = 0;
        const leftPositions: Array<[number, number, number, number?, number?]> = [];
        let currentZ = 0;

        leftWallNFTs.forEach((nft, index) => {
            const frameWidth = standardHeight * nft.aspectRatio;

            if (index === 0) {
                // First artwork starts at beginning
                currentZ = frameWidth / 2;
            } else {
                // Subsequent artworks: previous center + previous half-width + gap + current half-width
                const prevNft = leftWallNFTs[index - 1];
                const prevFrameWidth = standardHeight * prevNft.aspectRatio;
                currentZ += prevFrameWidth / 2 + minSpacing + frameWidth / 2;
            }

            leftPositions.push([-baseHallwayWidth, artworkHeight, currentZ, Math.PI / 2, nft.aspectRatio]);
            leftWallLength = currentZ + frameWidth / 2; // Track total length needed
        });

        // Calculate positions for right wall
        let rightWallLength = 0;
        const rightPositions: Array<[number, number, number, number?, number?]> = [];
        currentZ = 0;

        rightWallNFTs.forEach((nft, index) => {
            const frameWidth = standardHeight * nft.aspectRatio;

            if (index === 0) {
                // First artwork starts at beginning
                currentZ = frameWidth / 2;
            } else {
                // Subsequent artworks: previous center + previous half-width + gap + current half-width
                const prevNft = rightWallNFTs[index - 1];
                const prevFrameWidth = standardHeight * prevNft.aspectRatio;
                currentZ += prevFrameWidth / 2 + minSpacing + frameWidth / 2;
            }

            rightPositions.push([baseHallwayWidth, artworkHeight, currentZ, -Math.PI / 2, nft.aspectRatio]);
            rightWallLength = currentZ + frameWidth / 2; // Track total length needed
        });

        // Calculate total needed hallway length
        const maxWallLength = Math.max(leftWallLength, rightWallLength);
        const neededLength = Math.max(30, maxWallLength + 16); // Extra padding for walking space

        // Position artworks starting from the beginning (near z=0), not centered
        const startOffset = 8; // Start artwork a bit forward from the previous door

        // Apply offset to all positions - start from beginning instead of centering
        leftPositions.forEach((pos) => {
            pos[2] += startOffset; // Adjust Z position to start from beginning
            result.push(pos);
        });

        rightPositions.forEach((pos) => {
            pos[2] += startOffset; // Adjust Z position to start from beginning
            result.push(pos);
        });

        return {
            positions: result,
            hallwayLength: neededLength,
            hallwayWidth: baseHallwayWidth,
        };
    }, [nftsWithDimensions]);

    const handleNFTClick = useCallback(
        (nft: UnifiedToken) => {
            onNFTSelect?.(nft);
        },
        [onNFTSelect]
    );

    // Show loading state while dimensions are being calculated
    if (dimensionsLoading && nfts.length > 0) {
        return (
            <>
                <GalleryLighting />
                <GalleryWalls hallwayLength={30} hallwayWidth={12} />
                <RoomTitle
                    roomNumber={roomNumber}
                    totalRooms={totalRooms}
                    walletAddress={walletAddress}
                    domain={domain}
                    displayName={displayName}
                    hallwayLength={30}
                />
                {/* Camera Controls */}
                {cameraMode === "walk" && (
                    <>
                        <WalkController hallwayLength={30} hallwayWidth={12} />
                        <MobileTouchControls />
                    </>
                )}
                {cameraMode === "overview" && <OverviewController />}
            </>
        );
    }

    return (
        <>
            <GalleryLighting />
            <GalleryWalls hallwayLength={hallwayLength} hallwayWidth={hallwayWidth} />

            <RoomTitle
                roomNumber={roomNumber}
                totalRooms={totalRooms}
                walletAddress={walletAddress}
                domain={domain}
                displayName={displayName}
                hallwayLength={hallwayLength}
            />

            {/* NFT Frames with proper aspect ratios */}
            {nftsWithDimensions.map((nft, index) => {
                const [x, y, z, rotationY, aspectRatio] = positions[index] || [0, 4, 0, 0, 1];
                return (
                    <NFTFrame
                        key={nft.id}
                        nft={nft}
                        position={[x, y, z]}
                        rotation={[0, rotationY || 0, 0]}
                        onClick={() => handleNFTClick(nft)}
                        isSelected={false}
                        preloadedTexture={preloadedTextures?.get(nft.id)}
                        aspectRatio={aspectRatio || 1}
                    />
                );
            })}

            {/* Navigation Doors - repositioned for forward-facing hallway layout */}
            {roomNumber > 0 && (
                <Door
                    position={[0, 2, 0]}
                    rotation={[0, 0, 0]}
                    label="← PREVIOUS ROOM"
                    onClick={onPrevRoom || (() => {})}
                />
            )}

            {roomNumber < totalRooms - 1 && (
                <Door
                    position={[0, 2, hallwayLength]}
                    rotation={[0, Math.PI, 0]}
                    label="NEXT ROOM →"
                    onClick={onNextRoom || (() => {})}
                />
            )}

            {/* Camera Controls */}
            {cameraMode === "walk" && (
                <>
                    <WalkController hallwayLength={hallwayLength} hallwayWidth={hallwayWidth} />
                    <MobileTouchControls />
                </>
            )}

            {cameraMode === "overview" && <OverviewController hallwayLength={hallwayLength} />}
        </>
    );
}
