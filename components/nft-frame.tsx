"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import MediaContent from "./MediaContent";
import { sanitizeNFTName, getDynamicFontSize, splitTextForDisplay } from "../lib/text-utils";
import { UnifiedToken } from "../lib/data/types/token-types";
import { detectMediaType } from "../lib/media-utils";

interface NFTFrameProps {
    nft: UnifiedToken;
    position: [number, number, number];
    rotation?: [number, number, number];
    onClick?: () => void;
    isSelected: boolean;
    preloadedTexture?: any; // THREE.Texture but avoiding import issues
    aspectRatio?: number; // width/height ratio for proper sizing
}

export default function NFTFrame({
    nft,
    position,
    rotation = [0, 0, 0],
    onClick,
    isSelected,
    preloadedTexture,
    aspectRatio = 1, // Default to square if no aspect ratio provided
}: NFTFrameProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const frameRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const [currentTexture, setCurrentTexture] = useState<THREE.Texture | null>(preloadedTexture || null);

    // Helper function to detect if URI is likely an image
    const isImageUri = (uri: string): boolean => {
        if (!uri) return false;

        // Check file extension
        const lowerUri = uri.toLowerCase();
        const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
        const hasImageExtension = imageExtensions.some((ext) => lowerUri.includes(ext));

        // Check for HTML indicators
        const htmlIndicators = [".html", "text/html", "<html", "<!doctype"];
        const isHtml = htmlIndicators.some((indicator) => lowerUri.includes(indicator));

        return hasImageExtension && !isHtml;
    };

    // 🔥 UNIFIED MEDIA DETECTION - No circular dependencies
    const detectUnifiedMedia = () => {
        const metadata = nft.metadata;
        if (!metadata) return { uri: null, mimeType: undefined };

        // Run media detection once
        const mediaTypeResult = detectMediaType(metadata);

        // console.log("🎭 UNIFIED MEDIA DETECTION:", {
        //     result: mediaTypeResult,
        //     nftId: nft.id,
        //     hasFormats: !!metadata.formats,
        //     formatsCount: metadata.formats?.length || 0,
        //     rawFormats: metadata.formats,
        //     allAvailableUris: {
        //         displayImage: nft.displayImage,
        //         displayUri: metadata.displayUri,
        //         image: metadata.image,
        //         thumbnailUri: metadata.thumbnailUri,
        //         artifactUri: metadata.artifactUri,
        //     },
        // });

        console.log("🎭 UNIFIED MEDIA DETECTION:", {
            result: mediaTypeResult,
            nftId: nft.id,
            hasFormats: !!metadata.formats,
            formatsCount: metadata.formats?.length || 0,
            rawFormats: metadata.formats,
            allAvailableUris: {
                displayImage: nft.displayImage,
                displayUri: metadata.displayUri,
                image: metadata.image,
                thumbnailUri: metadata.thumbnailUri,
                artifactUri: metadata.artifactUri,
            },
        });

        // If media detection found a specific URI (from formats), use that
        if (mediaTypeResult.uri && mediaTypeResult.confidence > 0.8) {
            console.log("🎭 URI SELECTION: Using URI from media detection:", {
                uri: mediaTypeResult.uri,
                mimeType: mediaTypeResult.mimeType,
                source: mediaTypeResult.source,
                confidence: mediaTypeResult.confidence,
            });
            console.log("🔥 FINAL URI BEING USED:", mediaTypeResult.uri);
            console.log("🔥 FINAL MIME TYPE BEING USED:", mediaTypeResult.mimeType);
            return {
                uri: mediaTypeResult.uri,
                mimeType: mediaTypeResult.mimeType,
            };
        }

        // Fallback to legacy URI priority for low-confidence detections
        const possibleUris = [
            { uri: nft.displayImage, source: "displayImage" },
            { uri: metadata.displayUri, source: "displayUri" },
            { uri: metadata.image, source: "image" },
            { uri: metadata.thumbnailUri, source: "thumbnailUri" },
            { uri: metadata.artifactUri, source: "artifactUri" },
        ].filter((item) => item.uri && typeof item.uri === "string");

        // First, try to find URIs that are likely images
        const imageUris = possibleUris.filter((item) => item.uri && isImageUri(item.uri));

        let selectedUri: string | null = null;
        if (imageUris.length > 0) {
            selectedUri = imageUris[0].uri || null;
        } else {
            selectedUri = possibleUris[0]?.uri || null;
        }

        // Re-detect media type for fallback URI
        let finalMimeType = undefined;
        if (selectedUri) {
            const fallbackResult = detectMediaType(metadata, selectedUri);
            finalMimeType = fallbackResult.mimeType;
        }

        console.log("🎭 FALLBACK URI SELECTION:", {
            selectedUri,
            finalMimeType,
            totalPossibleUris: possibleUris.length,
            imageUris: imageUris.length,
        });

        return {
            uri: selectedUri,
            mimeType: finalMimeType,
        };
    };

    const mediaInfo = detectUnifiedMedia();
    const imageUri = mediaInfo.uri;
    const mimeType = mediaInfo.mimeType;
    const effectiveTexture = preloadedTexture;

    // Update currentTexture when preloadedTexture changes
    useEffect(() => {
        if (preloadedTexture) {
            setCurrentTexture(preloadedTexture);
        }
    }, [preloadedTexture]);

    // Calculate frame dimensions based on aspect ratio
    // Standard height of 2.5 units, width adjusted by aspect ratio
    const frameHeight = 2.5;
    const frameWidth = frameHeight * aspectRatio;

    // Frame border (slightly larger than artwork)
    const borderSize = 0.15;
    const frameBorderWidth = frameWidth + borderSize;
    const frameBorderHeight = frameHeight + borderSize;

    // Simple animation - no proximity bullshit!
    useFrame((state) => {
        if (frameRef.current) {
            // Subtle floating animation only when hovered or selected
            if (hovered || isSelected) {
                frameRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
            } else {
                frameRef.current.position.y = position[1];
            }

            // Scale when selected or hovered
            const targetScale = isSelected ? 1.1 : hovered ? 1.02 : 1;
            frameRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    return (
        <group
            ref={frameRef}
            position={position}
            rotation={rotation}
            onClick={onClick || (() => {})}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            {/* Improved Frame with aspect ratio support */}
            <mesh position={[0, 0, -0.05]} castShadow>
                <boxGeometry args={[frameBorderWidth, frameBorderHeight, 0.15]} />
                <meshStandardMaterial
                    color={isSelected ? "#00bcd4" : hovered ? "#555" : "#333"}
                    roughness={0.2}
                    metalness={0.8}
                />
            </mesh>

            {/* Artwork with proper aspect ratio */}
            <mesh position={[0, 0, 0.08]} castShadow rotation={[Math.PI, 0, 0]}>
                <planeGeometry args={[frameWidth, frameHeight]} />
                {imageUri ? (
                    <MediaContent
                        uri={imageUri}
                        mimeType={mimeType}
                        initialTexture={preloadedTexture}
                        onTextureReady={setCurrentTexture}
                    />
                ) : (
                    <meshBasicMaterial color="#ff0000" side={THREE.DoubleSide} />
                )}
            </mesh>

            {/* Smart title rendering below the frame */}
            {(() => {
                const sanitizedName = sanitizeNFTName(nft.metadata?.name, nft.tokenId, 35);
                const textLines = splitTextForDisplay(sanitizedName, 25);
                const fontSize = getDynamicFontSize(sanitizedName, 0.2);

                return textLines.map((line, index) => (
                    <Text
                        key={index}
                        position={[0, -(frameBorderHeight / 2 + 0.3 + index * fontSize * 1.2), 0.1]}
                        fontSize={fontSize}
                        color={isSelected ? "#00bcd4" : "#ffffff"}
                        anchorX="center"
                        anchorY="top"
                        maxWidth={Math.max(frameWidth, 2.5)}
                        outlineWidth={0.01}
                        outlineColor="#000000"
                    >
                        {line}
                    </Text>
                ));
            })()}

            {/* Improved hover info */}
            {hovered && !isSelected && (
                <Html position={[0, frameBorderHeight / 2 + 0.3, 0.3]} center>
                    <div className="px-3 py-2 text-sm text-white border rounded-lg pointer-events-none bg-black/90 backdrop-blur-sm border-cyan-400/30">
                        Click for details
                    </div>
                </Html>
            )}

            {/* Spotlight effect for selected artwork */}
            {isSelected && meshRef.current && (
                <spotLight
                    position={[0, 3, 2]}
                    target={meshRef.current}
                    angle={0.3}
                    penumbra={0.5}
                    intensity={2}
                    color="#00bcd4"
                />
            )}
        </group>
    );
}
