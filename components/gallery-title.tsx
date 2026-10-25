"use client";

import { Text3D, Center, Text } from "@react-three/drei";
import { useGalleryMetadata } from "@/hooks/use-gallery-metadata";
import { useViewState } from "@/contexts/ViewStateContext";
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
    position = [0, 15, -20],
    fontSize = 2.0,
    color,
}: GalleryTitleProps) {
    const { styleConfig } = useViewState();
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

    const isCyberpunk = styleConfig.id === "cyberpunk-neon";
    const rawTitleText = getTitleText();
    const titleText =
        styleConfig.typography.textTransform === "uppercase" ? rawTitleText.toUpperCase() : rawTitleText;

    const rawSubtitleText = getSubtitleText();
    const subtitleText =
        styleConfig.typography.textTransform === "uppercase" ? rawSubtitleText.toUpperCase() : rawSubtitleText;

    // Theme-driven colors
    const titleColor = metadata.isLoading
        ? "#888888"
        : color ?? styleConfig.typography.titleColor;
    const subtitleColor = metadata.isLoading
        ? "#666666"
        : isCyberpunk
        ? styleConfig.typography.accentTextColor
        : styleConfig.ui.accentColor;
    const descColor = metadata.isLoading ? "#777777" : styleConfig.typography.placardColor;

    // Dynamic title scaling so long collection names do not overflow the gallery
    const maxTitleWidth = 26;
    const calculateTitleFontSize = (text: string, maxWidth: number, baseSize: number) => {
        const estimatedWidth = text.length * 0.58 * baseSize;
        if (estimatedWidth <= maxWidth) return baseSize;
        return Math.max(0.8, baseSize * (maxWidth / estimatedWidth));
    };
    const dynamicTitleFontSize = calculateTitleFontSize(titleText, maxTitleWidth, fontSize);
    const dynamicSubtitleFontSize = Math.min(dynamicTitleFontSize * 0.45, 0.9);

    // Dynamic description scaling and multiline formatting
    const rawDesc = metadata.description?.trim() || "";
    // Allow up to 1800 characters to fit full artist descriptions
    const descText = rawDesc.length > 1800 ? `${rawDesc.substring(0, 1800).trim()}...` : rawDesc;
    const descLength = descText.length;

    let dynamicDescFontSize = 0.44;
    let maxDescWidth = 24;
    let descLineHeight = 1.35;

    if (descLength > 1200) {
        dynamicDescFontSize = 0.28;
        maxDescWidth = 28;
        descLineHeight = 1.28;
    } else if (descLength > 600) {
        dynamicDescFontSize = 0.33;
        maxDescWidth = 27;
        descLineHeight = 1.32;
    } else if (descLength > 250) {
        dynamicDescFontSize = 0.38;
        maxDescWidth = 25;
        descLineHeight = 1.35;
    } else if (descLength > 100) {
        dynamicDescFontSize = 0.42;
        maxDescWidth = 24;
        descLineHeight = 1.38;
    }

    return (
        <group position={position}>
            {/* Main title - Centered 3D Extrusion */}
            <group position={[0, subtitleText ? 1.2 : 0.6, 0]}>
                <Center key={`title-${titleText}-${dynamicTitleFontSize}`}>
                    <Text3D
                        font={font}
                        size={dynamicTitleFontSize}
                        height={0.25}
                        curveSegments={12}
                        bevelEnabled
                        bevelThickness={0.03}
                        bevelSize={0.02}
                        bevelOffset={0}
                        bevelSegments={5}
                    >
                        {titleText}
                        <meshStandardMaterial
                            color={titleColor}
                            roughness={isCyberpunk ? 0.2 : styleConfig.ui.isLight ? 0.4 : 0.3}
                            metalness={isCyberpunk ? 0.7 : styleConfig.ui.isLight ? 0.2 : 0.3}
                            emissive={isCyberpunk ? titleColor : styleConfig.ui.isLight ? "#000000" : titleColor}
                            emissiveIntensity={isCyberpunk ? 0.7 : styleConfig.ui.isLight ? 0 : 0.08}
                        />
                    </Text3D>
                </Center>
            </group>

            {/* Subtitle - Centered 3D Extrusion */}
            {subtitleText && (
                <group position={[0, -0.1, 0]}>
                    <Center key={`subtitle-${subtitleText}-${dynamicSubtitleFontSize}`}>
                        <Text3D
                            font={font}
                            size={dynamicSubtitleFontSize}
                            height={0.12}
                            curveSegments={8}
                            bevelEnabled
                            bevelThickness={0.015}
                            bevelSize={0.01}
                            bevelOffset={0}
                            bevelSegments={3}
                        >
                            {subtitleText}
                            <meshStandardMaterial
                                color={subtitleColor}
                                roughness={0.3}
                                metalness={isCyberpunk ? 0.6 : 0.2}
                                emissive={isCyberpunk ? subtitleColor : styleConfig.ui.isLight ? "#000000" : subtitleColor}
                                emissiveIntensity={isCyberpunk ? 0.6 : styleConfig.ui.isLight ? 0 : 0.05}
                            />
                        </Text3D>
                    </Center>
                </group>
            )}

            {/* Full Artist / Collection Description with Dynamic Resizing and Word Wrapping */}
            {descText && (
                <group position={[0, subtitleText ? -0.9 : -0.4, 0]}>
                    <Text
                        fontSize={dynamicDescFontSize}
                        maxWidth={maxDescWidth}
                        textAlign="center"
                        anchorX="center"
                        anchorY="top"
                        lineHeight={descLineHeight}
                        color={descColor}
                        outlineWidth={isCyberpunk ? 0.02 : styleConfig.ui.isLight ? 0.005 : 0.015}
                        outlineColor={isCyberpunk ? "#00f0ff" : styleConfig.ui.isLight ? "#ffffff" : "#000000"}
                        fillOpacity={styleConfig.ui.isLight ? 0.95 : 0.9}
                    >
                        {descText}
                    </Text>
                </group>
            )}
        </group>
    );
}
