"use client";

interface GalleryWallsProps {
    wallColor?: string;
    floorColor?: string;
    ceilingColor?: string;
    hallwayLength?: number; // Dynamic length for hallway
    hallwayWidth?: number; // Width of the hallway
}

export default function GalleryWalls({
    wallColor = "#2a2a2a",
    floorColor = "#1a1a1a",
    ceilingColor = "#0a0a0a",
    hallwayLength = 30, // Default length
    hallwayWidth = 12, // Default width
}: GalleryWallsProps) {
    const wallHeight = 8;
    const wallY = wallHeight / 2; // Center walls vertically

    return (
        <>
            {/* Gallery Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, hallwayLength / 2]} receiveShadow>
                <planeGeometry args={[hallwayWidth * 2, hallwayLength]} />
                <meshStandardMaterial color={floorColor} roughness={0.9} metalness={0.1} />
            </mesh>

            {/* Gallery Ceiling */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallHeight, hallwayLength / 2]}>
                <planeGeometry args={[hallwayWidth * 2, hallwayLength]} />
                <meshStandardMaterial color={ceilingColor} roughness={0.8} metalness={0.2} />
            </mesh>

            {/* Hallway Walls */}
            {/* North Wall (far end with next door) */}
            <mesh position={[0, wallY, hallwayLength]} receiveShadow>
                <planeGeometry args={[hallwayWidth * 2, wallHeight]} />
                <meshStandardMaterial color={wallColor} roughness={0.8} />
            </mesh>

            {/* East Wall (right wall for artwork) */}
            <mesh position={[hallwayWidth, wallY, hallwayLength / 2]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[hallwayLength, wallHeight]} />
                <meshStandardMaterial color={wallColor} roughness={0.8} />
            </mesh>

            {/* West Wall (left wall for artwork) */}
            <mesh position={[-hallwayWidth, wallY, hallwayLength / 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[hallwayLength, wallHeight]} />
                <meshStandardMaterial color={wallColor} roughness={0.8} />
            </mesh>

            {/* South Wall (back wall with previous door, split for doorway) */}
            <mesh position={[-hallwayWidth / 2, wallY, 0]} rotation={[0, Math.PI, 0]} receiveShadow>
                <planeGeometry args={[hallwayWidth, wallHeight]} />
                <meshStandardMaterial color={wallColor} roughness={0.8} />
            </mesh>
            <mesh position={[hallwayWidth / 2, wallY, 0]} rotation={[0, Math.PI, 0]} receiveShadow>
                <planeGeometry args={[hallwayWidth, wallHeight]} />
                <meshStandardMaterial color={wallColor} roughness={0.8} />
            </mesh>
        </>
    );
}
