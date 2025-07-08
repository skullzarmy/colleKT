"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html, Box } from "@react-three/drei";
import * as THREE from "three";
import MediaContent from "./MediaContent";
import { sanitizeNFTName, getDynamicFontSize, splitTextForDisplay } from "../lib/text-utils";

interface NFTToken {
    id: string;
    token_id: string;
    balance?: number;
    contract: {
        address: string;
        alias?: string;
    };
    metadata?: {
        name?: string;
        description?: string;
        image?: string;
        artifact_uri?: string;
        artifactUri?: string;
        display_uri?: string;
        displayUri?: string;
        thumbnail_uri?: string;
        thumbnailUri?: string;
        formats?: Array<{
            uri: string;
            mimeType: string;
        }>;
    };
}

interface NFTFrameProps {
    nft: NFTToken;
    position: [number, number, number];
    rotation?: [number, number, number];
    onClick: () => void;
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

    // Get the best available image URI with media type detection
    const getImageUri = () => {
        const metadata = nft.metadata;
        if (!metadata) return null;

        // All possible URIs with their sources
        const possibleUris = [
            { uri: metadata.display_uri, source: "display_uri" },
            { uri: metadata.displayUri, source: "displayUri" },
            { uri: metadata.image, source: "image" },
            { uri: metadata.thumbnail_uri, source: "thumbnail_uri" },
            { uri: metadata.thumbnailUri, source: "thumbnailUri" },
            { uri: metadata.artifact_uri, source: "artifact_uri" },
            { uri: metadata.artifactUri, source: "artifactUri" },
            { uri: metadata.formats?.[0]?.uri, source: "formats[0].uri" },
            // Additional fallbacks for different standards
            { uri: (metadata as any).imageUri, source: "imageUri" },
            { uri: (metadata as any).media?.[0]?.uri, source: "media[0].uri" },
            { uri: (metadata as any).assets?.[0]?.uri, source: "assets[0].uri" },
        ].filter((item) => item.uri && typeof item.uri === "string");

        // First, try to find URIs that are likely images
        const imageUris = possibleUris.filter((item) => isImageUri(item.uri));

        if (imageUris.length > 0) {
            return imageUris[0].uri;
        }

        // If no obvious image URIs, fall back to first available URI
        const foundUri = possibleUris[0]?.uri;

        // Log for debugging when no image URI found
        return foundUri;
    };

    const getMimeType = () => {
        const metadata = nft.metadata;
        return metadata?.formats?.[0]?.mimeType;
    };

    const imageUri = getImageUri();
    const effectiveTexture = preloadedTexture;

    // Calculate frame dimensions based on aspect ratio
    // Standard height of 2.5 units, width adjusted by aspect ratio
    const frameHeight = 2.5;
    const frameWidth = frameHeight * aspectRatio;

    // Frame border (slightly larger than artwork)
    const borderSize = 0.15;
    const frameBorderWidth = frameWidth + borderSize;
    const frameBorderHeight = frameHeight + borderSize;

    // Improved animation
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
            onClick={onClick}
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
                {preloadedTexture ? (
                    <meshBasicMaterial
                        map={preloadedTexture}
                        side={THREE.DoubleSide}
                        transparent={false}
                        alphaTest={0.1}
                    />
                ) : imageUri ? (
                    <MediaContent uri={imageUri} mimeType={getMimeType()} />
                ) : (
                    <meshBasicMaterial color="#ff0000" side={THREE.DoubleSide} />
                )}
            </mesh>

            {/* Smart title rendering below the frame */}
            {(() => {
                const sanitizedName = sanitizeNFTName(nft.metadata?.name, nft.token_id, 35);
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
