import { Text3D, Center } from "@react-three/drei";
import { suspend } from "suspend-react";

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
}: RoomTitleProps) {
    // Position in center of hallway if not specified
    const titlePosition: [number, number, number] = position || [0, 7, hallwayLength / 2];

    // Load font using suspend
    const font = suspend(async () => {
        const response = await fetch(fontUrl);
        return response.json();
    }, [fontUrl]);

    // Create the title text
    const ownerName = domain || displayName || `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`;
    const titleText = `${ownerName}'s ColleKT`;
    const pageText = `Page ${roomNumber + 1} of ${totalRooms}`;

    return (
        <group position={titlePosition} rotation={[0, Math.PI, 0]}>
            <Center>
                {/* Main title */}
                <Text3D
                    font={font}
                    size={fontSize}
                    height={0.2} // 3D depth
                    curveSegments={12}
                    bevelEnabled
                    bevelThickness={0.02}
                    bevelSize={0.01}
                    bevelOffset={0}
                    bevelSegments={5}
                    position={[0, 0.5, 0]} // Offset up for main title
                >
                    {titleText}
                    <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
                </Text3D>

                {/* Page info - smaller text below */}
                <Text3D
                    font={font}
                    size={fontSize * 0.6} // Smaller size
                    height={0.1} // Less depth
                    curveSegments={8}
                    bevelEnabled
                    bevelThickness={0.01}
                    bevelSize={0.005}
                    bevelOffset={0}
                    bevelSegments={3}
                    position={[0, -0.5, 0]} // Offset down for page info
                >
                    {pageText}
                    <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
                </Text3D>
            </Center>
        </group>
    );
}
