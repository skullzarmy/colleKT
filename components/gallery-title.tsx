"use client";

import { Text3D, Center } from "@react-three/drei";
import { useGalleryMetadata } from "@/hooks/use-gallery-metadata";
import { suspend } from "suspend-react";

interface GalleryTitleProps {
    address: string;
    domain?: string | null;
    displayName?: string;
    position?: [number, number, number];
    fontSize?: number;
    color?: string;
}

// Load font for 3D text
const fontUrl = "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json";

export default function GalleryTitle({
    address,
    domain,
    displayName,
    position = [0, 12, -8],
    fontSize = 1.5,
    color = "#00bcd4",
}: GalleryTitleProps) {
    // Use the gallery metadata hook
    const metadata = useGalleryMetadata(address, domain, displayName);

    // Load font using suspend
    const font = suspend(async () => {
        const response = await fetch(fontUrl);
        return response.json();
    }, [fontUrl]);

    // Generate title text based on gallery type
    const getTitleText = () => {
        if (metadata.isLoading) {
            return "Loading Gallery...";
        }

        switch (metadata.type) {
            case "USER":
                return `${metadata.name}'s ColleKT`;
            case "CURATION":
                return metadata.name;
            case "COLLECTION":
                return metadata.name;
            default:
                return "ColleKT Gallery";
        }
    };

    // Generate subtitle based on gallery type
    const getSubtitleText = () => {
        if (metadata.isLoading) {
            return "";
        }

        switch (metadata.type) {
            case "USER":
                return "NFT Gallery";
            case "CURATION":
                return "Curated Collection";
            case "COLLECTION":
                return "NFT Collection";
            default:
                return "";
        }
    };

    const titleText = getTitleText();
    const subtitleText = getSubtitleText();
    const titleColor = metadata.isLoading ? "#888888" : color;

    return (
        <group position={position}>
            <Center>
                {/* Main title */}
                <Text3D
                    font={font}
                    size={fontSize}
                    height={0.3} // 3D depth
                    curveSegments={12}
                    bevelEnabled
                    bevelThickness={0.03}
                    bevelSize={0.02}
                    bevelOffset={0}
                    bevelSegments={5}
                    position={[0, 1, 0]} // Offset up for main title
                >
                    {titleText}
                    <meshStandardMaterial
                        color={titleColor}
                        roughness={0.2}
                        metalness={0.3}
                        emissive={titleColor}
                        emissiveIntensity={0.1}
                    />
                </Text3D>

                {/* Subtitle - only show if we have one */}
                {subtitleText && (
                    <Text3D
                        font={font}
                        size={fontSize * 0.5} // Smaller size
                        height={0.15} // Less depth
                        curveSegments={8}
                        bevelEnabled
                        bevelThickness={0.015}
                        bevelSize={0.01}
                        bevelOffset={0}
                        bevelSegments={3}
                        position={[0, -0.5, 0]} // Offset down for subtitle
                    >
                        {subtitleText}
                        <meshStandardMaterial
                            color={titleColor}
                            roughness={0.4}
                            metalness={0.1}
                            emissive={titleColor}
                            emissiveIntensity={0.05}
                        />
                    </Text3D>
                )}

                {/* Description text for curations/collections */}
                {metadata.description && (
                    <Text3D
                        font={font}
                        size={fontSize * 0.3} // Even smaller
                        height={0.08}
                        curveSegments={6}
                        bevelEnabled={false}
                        position={[0, -1.2, 0]} // Further down
                    >
                        {metadata.description.length > 60
                            ? `${metadata.description.substring(0, 60)}...`
                            : metadata.description}
                        <meshStandardMaterial
                            color="#ffffff"
                            roughness={0.6}
                            metalness={0.05}
                            transparent
                            opacity={0.8}
                        />
                    </Text3D>
                )}
            </Center>
        </group>
    );
}
