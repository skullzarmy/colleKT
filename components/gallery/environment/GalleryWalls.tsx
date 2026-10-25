"use client";

import { useViewState } from "@/contexts/ViewStateContext";

interface GalleryWallsProps {
    wallColor?: string;
    floorColor?: string;
    ceilingColor?: string;
    roughness?: number;
    metalness?: number;
    hallwayLength?: number;
    hallwayWidth?: number;
}

export default function GalleryWalls({
    wallColor: propWallColor,
    floorColor: propFloorColor,
    ceilingColor: propCeilingColor,
    roughness: propRoughness,
    metalness: propMetalness,
    hallwayLength = 30,
    hallwayWidth = 12,
}: GalleryWallsProps) {
    const { styleConfig } = useViewState();

    const wallColor = propWallColor ?? styleConfig.walls.wallColor;
    const floorColor = propFloorColor ?? styleConfig.walls.floorColor;
    const ceilingColor = propCeilingColor ?? styleConfig.walls.ceilingColor;
    const roughness = propRoughness ?? styleConfig.walls.roughness;
    const metalness = propMetalness ?? styleConfig.walls.metalness;

    const wallHeight = 8;
    const wallY = wallHeight / 2;

    return (
        <>
            {/* Gallery Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, hallwayLength / 2]} receiveShadow>
                <planeGeometry args={[hallwayWidth * 2, hallwayLength]} />
                <meshStandardMaterial
                    color={floorColor}
                    roughness={roughness}
                    metalness={metalness}
                />
            </mesh>

            {/* Gallery Ceiling */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallHeight, hallwayLength / 2]}>
                <planeGeometry args={[hallwayWidth * 2, hallwayLength]} />
                <meshStandardMaterial
                    color={ceilingColor}
                    roughness={Math.max(0.6, roughness)}
                    metalness={0.1}
                />
            </mesh>

            {/* Hallway Walls */}
            {/* North Wall (far end with next door) */}
            <mesh position={[0, wallY, hallwayLength]} receiveShadow>
                <planeGeometry args={[hallwayWidth * 2, wallHeight]} />
                <meshStandardMaterial color={wallColor} roughness={0.8} />
            </mesh>

            {/* East Wall (right wall for artwork) */}
            <mesh
                position={[hallwayWidth, wallY, hallwayLength / 2]}
                rotation={[0, -Math.PI / 2, 0]}
                receiveShadow
            >
                <planeGeometry args={[hallwayLength, wallHeight]} />
                <meshStandardMaterial color={wallColor} roughness={0.8} />
            </mesh>

            {/* West Wall (left wall for artwork) */}
            <mesh
                position={[-hallwayWidth, wallY, hallwayLength / 2]}
                rotation={[0, Math.PI / 2, 0]}
                receiveShadow
            >
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

            {/* Architectural Baseboards & Neon Accent Runners */}
            {styleConfig.id === "cyberpunk-neon" ? (
                <>
                    {/* West (Left) Wall Floor Neon Runner - Electric Cyan */}
                    <mesh position={[-hallwayWidth + 0.05, 0.05, hallwayLength / 2]}>
                        <boxGeometry args={[0.08, 0.08, hallwayLength]} />
                        <meshBasicMaterial color="#00f0ff" />
                    </mesh>
                    <pointLight
                        position={[-hallwayWidth + 1, 0.3, hallwayLength / 2]}
                        color="#00f0ff"
                        intensity={0.4}
                        distance={hallwayWidth}
                    />

                    {/* East (Right) Wall Floor Neon Runner - Hot Magenta */}
                    <mesh position={[hallwayWidth - 0.05, 0.05, hallwayLength / 2]}>
                        <boxGeometry args={[0.08, 0.08, hallwayLength]} />
                        <meshBasicMaterial color="#ff007f" />
                    </mesh>
                    <pointLight
                        position={[hallwayWidth - 1, 0.3, hallwayLength / 2]}
                        color="#ff007f"
                        intensity={0.4}
                        distance={hallwayWidth}
                    />

                    {/* Ceiling Neon Runners */}
                    <mesh position={[-hallwayWidth + 0.05, wallHeight - 0.04, hallwayLength / 2]}>
                        <boxGeometry args={[0.06, 0.06, hallwayLength]} />
                        <meshBasicMaterial color="#00f0ff" />
                    </mesh>
                    <mesh position={[hallwayWidth - 0.05, wallHeight - 0.04, hallwayLength / 2]}>
                        <boxGeometry args={[0.06, 0.06, hallwayLength]} />
                        <meshBasicMaterial color="#ff007f" />
                    </mesh>
                </>
            ) : (
                <>
                    {/* Architectural Baseboard Moldings */}
                    <mesh position={[-hallwayWidth + 0.03, 0.08, hallwayLength / 2]}>
                        <boxGeometry args={[0.06, 0.16, hallwayLength]} />
                        <meshStandardMaterial
                            color={styleConfig.door.frameColor}
                            roughness={0.7}
                            metalness={0.1}
                        />
                    </mesh>
                    <mesh position={[hallwayWidth - 0.03, 0.08, hallwayLength / 2]}>
                        <boxGeometry args={[0.06, 0.16, hallwayLength]} />
                        <meshStandardMaterial
                            color={styleConfig.door.frameColor}
                            roughness={0.7}
                            metalness={0.1}
                        />
                    </mesh>
                </>
            )}
        </>
    );
}
