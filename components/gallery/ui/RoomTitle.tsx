"use client";

import { Text3D, Center } from "@react-three/drei";
import { suspend } from "suspend-react";
import { useGalleryMetadata } from "@/hooks/use-gallery-metadata";

interface RoomTitleProps {
    roomNumber: number;
    totalRooms: number;
    walletAddress: string;
    domain?: string | null;
    displayName?: string;
    position?: [number, number, number];
    fontSize?: number;
    color?: string;
    hallwayLength?: number;
    hallwayWidth?: number; // Add hallway width prop
}

// Load font for 3D text
const fontUrl = "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json";

export default function RoomTitle({
    roomNumber,
    totalRooms,
    walletAddress,
    domain,
    displayName,
    position,
    fontSize = 0.8,
    color = "#00bcd4",
    hallwayLength = 30,
    hallwayWidth = 12, // Default hallway width
}: RoomTitleProps) {
    // Position in center of hallway if not specified
    const titlePosition: [number, number, number] = position || [0, 7, hallwayLength / 2];

    // Use the gallery metadata hook
    const galleryMetadata = useGalleryMetadata(walletAddress, domain, displayName);

    // Load font using suspend
    const font = suspend(async () => {
        const response = await fetch(fontUrl);
        return response.json();
    }, [fontUrl]);

    // Generate title text based on gallery type and metadata
    const getTitleText = () => {
        if (galleryMetadata.isLoading) {
            return "Loading Gallery...";
        }

        switch (galleryMetadata.type) {
            case "USER":
                return `${galleryMetadata.name}'s ColleKT`;
            case "CURATION":
                return galleryMetadata.name;
            case "COLLECTION":
                // Format as "[Collection Name] by [Creator]"
                const creatorName =
                    galleryMetadata.creator_domain ||
                    (galleryMetadata.creator_address
                        ? `${galleryMetadata.creator_address.slice(0, 8)}...${galleryMetadata.creator_address.slice(
                              -4
                          )}`
                        : "Unknown Creator");
                return `${galleryMetadata.name} by ${creatorName}`;
            default:
                return "ColleKT Gallery";
        }
    };

    const titleText = getTitleText();
    const roomText = `Room ${roomNumber + 1} of ${totalRooms}`;
    const titleColor = galleryMetadata.isLoading ? "#888888" : color;

    // Calculate dynamic font size based on text length and room width
    const calculateFontSize = (text: string, maxWidth: number, baseFontSize: number = 0.8) => {
        // Rough estimate: each character is about 0.6 units wide at size 1.0
        const estimatedTextWidth = text.length * 0.6 * baseFontSize;

        if (estimatedTextWidth <= maxWidth) {
            return baseFontSize;
        }

        // Scale down proportionally
        const scaleFactor = maxWidth / estimatedTextWidth;
        return Math.max(0.3, baseFontSize * scaleFactor); // Minimum font size of 0.3
    };

    // Available width is hallway width minus padding (about 80% of hallway width)
    const availableWidth = hallwayWidth * 0.8;
    const dynamicTitleFontSize = calculateFontSize(titleText, availableWidth, fontSize);

    // Room text should be smaller: max 40% of title size, but also respect dynamic sizing
    const baseRoomFontSize = Math.min(fontSize * 0.4, dynamicTitleFontSize * 0.5);
    const dynamicRoomFontSize = calculateFontSize(roomText, availableWidth, baseRoomFontSize);

    return (
        <group position={titlePosition} rotation={[0, Math.PI, 0]}>
            {/* Main title - centered */}
            <group position={[0, 0.5, 0]}>
                <Center key={`title-${titleText}-${dynamicTitleFontSize}`}>
                    <Text3D
                        font={font}
                        size={dynamicTitleFontSize}
                        height={0.2} // 3D depth
                        curveSegments={12}
                        bevelEnabled
                        bevelThickness={0.02}
                        bevelSize={0.01}
                        bevelOffset={0}
                        bevelSegments={5}
                    >
                        {titleText}
                        <meshStandardMaterial color={titleColor} roughness={0.3} metalness={0.1} />
                    </Text3D>
                </Center>
            </group>

            {/* Room info - smaller text below, separately centered */}
            <group position={[0, -0.4, 0]}>
                <Center key={`room-${roomText}-${dynamicRoomFontSize}`}>
                    <Text3D
                        font={font}
                        size={dynamicRoomFontSize} // Use dynamic size
                        height={0.1} // Less depth
                        curveSegments={8}
                        bevelEnabled
                        bevelThickness={0.01}
                        bevelSize={0.005}
                        bevelOffset={0}
                        bevelSegments={3}
                    >
                        {roomText}
                        <meshStandardMaterial color={titleColor} roughness={0.5} metalness={0.05} />
                    </Text3D>
                </Center>
            </group>
        </group>
    );
}
