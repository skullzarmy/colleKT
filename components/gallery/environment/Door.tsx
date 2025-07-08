"use client";

import { Text, Box, Cylinder, Sphere } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import { Group } from "three";

interface DoorProps {
    position: [number, number, number];
    rotation: [number, number, number];
    label: string;
    onClick?: () => void;
    disabled?: boolean;
}

export default function Door({ position, rotation, label, onClick, disabled }: DoorProps) {
    const doorRef = useRef<Group>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Door is slightly ajar (15 degrees open)
    const doorOpenAngle = Math.PI / 12; // 15 degrees

    // Update cursor style based on hover state
    useEffect(() => {
        if (typeof document !== "undefined") {
            document.body.style.cursor = !disabled && isHovered ? "pointer" : "default";
        }

        // Cleanup on unmount
        return () => {
            if (typeof document !== "undefined") {
                document.body.style.cursor = "default";
            }
        };
    }, [isHovered, disabled]);

    return (
        <group
            position={position}
            rotation={rotation}
            onPointerEnter={() => !disabled && setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            onClick={disabled ? undefined : onClick || (() => {})}
        >
            {/* Invisible clickable area covering entire door assembly */}
            <Box args={[3, 5, 3]} position={[0, 0, 0]} visible={false}>
                <meshBasicMaterial transparent opacity={0} />
            </Box>

            {/* Hover Border Effect */}
            {isHovered && !disabled && (
                <group>
                    {/* Glowing border frame */}
                    <Box args={[2.8, 0.05, 0.05]} position={[0, 2.2, 0]}>
                        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
                    </Box>
                    <Box args={[2.8, 0.05, 0.05]} position={[0, -2.2, 0]}>
                        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
                    </Box>
                    <Box args={[0.05, 4.4, 0.05]} position={[-1.4, 0, 0]}>
                        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
                    </Box>
                    <Box args={[0.05, 4.4, 0.05]} position={[1.4, 0, 0]}>
                        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
                    </Box>

                    {/* Subtle ambient glow */}
                    <pointLight position={[0, 0, 1]} intensity={0.2} color="#ffffff" distance={6} />
                </group>
            )}
            {/* Doorway Frame (recessed into wall) */}
            <group position={[0, 0, 0]}>
                {/* Left Frame */}
                <Box args={[0.15, 4.2, 0.3]} position={[-1.3, 0, 0]}>
                    <meshStandardMaterial color="#654321" roughness={0.6} metalness={0.1} />
                </Box>

                {/* Right Frame */}
                <Box args={[0.15, 4.2, 0.3]} position={[1.3, 0, 0]}>
                    <meshStandardMaterial color="#654321" roughness={0.6} metalness={0.1} />
                </Box>

                {/* Top Frame */}
                <Box args={[2.6, 0.15, 0.3]} position={[0, 2.1, 0]}>
                    <meshStandardMaterial color="#654321" roughness={0.6} metalness={0.1} />
                </Box>

                {/* Door Threshold */}
                <Box args={[2.6, 0.1, 0.3]} position={[0, -2.1, 0]}>
                    <meshStandardMaterial color="#4a3c28" roughness={0.8} metalness={0.05} />
                </Box>
            </group>

            {/* Actual Door Panel (slightly ajar) */}
            <group ref={doorRef} position={[-1.2, 0, -0.05]} rotation={[0, doorOpenAngle, 0]}>
                {/* Main Door Panel */}
                <Box args={[0.08, 3.8, 2.2]} position={[0, 0, 1.1]}>
                    <meshStandardMaterial color={disabled ? "#4a4a4a" : "#6b4423"} roughness={0.7} metalness={0.05} />
                </Box>
                {/* Door Panel Details */}
                {/* Upper Panel Inset */}
                <Box args={[0.02, 1.5, 0.8]} position={[0.05, 0.8, 1.1]}>
                    <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
                </Box>
                {/* Lower Panel Inset */}
                <Box args={[0.02, 1.5, 0.8]} position={[0.05, -0.8, 1.1]}>
                    <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
                </Box>
                {/* Door Knob - Inside */}
                <Sphere args={[0.08]} position={[0.12, 0, 1.8]}>
                    <meshStandardMaterial color="#d4af37" roughness={0.1} metalness={0.9} />
                </Sphere>
                {/* Door Lock */}
                <Box args={[0.02, 0.1, 0.05]} position={[0.09, -0.2, 1.8]}>
                    <meshStandardMaterial color="#2c2c2c" roughness={0.3} metalness={0.7} />
                </Box>
                {/* BACK SIDE OF DOOR (Outside Details) */}
                {/* Back Panel Insets */}
                <Box args={[0.02, 1.5, 0.8]} position={[-0.05, 0.8, 1.1]}>
                    <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
                </Box>
                <Box args={[0.02, 1.5, 0.8]} position={[-0.05, -0.8, 1.1]}>
                    <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
                </Box>{" "}
                {/* Door Knob - Outside */}
                <Sphere args={[0.08]} position={[-0.12, 0, 1.8]}>
                    <meshStandardMaterial color="#d4af37" roughness={0.1} metalness={0.9} />
                </Sphere>
                {/* Back Door Lock */}
                <Box args={[0.02, 0.1, 0.05]} position={[-0.09, -0.2, 1.8]}>
                    <meshStandardMaterial color="#2c2c2c" roughness={0.3} metalness={0.7} />
                </Box>
            </group>

            {/* Hinges */}
            <group position={[-1.35, 0, 0]}>
                {/* Upper Hinge */}
                <group position={[0, 1.2, 0]}>
                    <Cylinder args={[0.03, 0.03, 0.15]} rotation={[0, 0, Math.PI / 2]}>
                        <meshStandardMaterial color="#444444" roughness={0.4} metalness={0.8} />
                    </Cylinder>
                    <Box args={[0.08, 0.15, 0.02]} position={[0, 0, 0.08]}>
                        <meshStandardMaterial color="#444444" roughness={0.4} metalness={0.8} />
                    </Box>
                    <Box args={[0.08, 0.15, 0.02]} position={[0, 0, -0.08]}>
                        <meshStandardMaterial color="#444444" roughness={0.4} metalness={0.8} />
                    </Box>
                </group>

                {/* Lower Hinge */}
                <group position={[0, -1.2, 0]}>
                    <Cylinder args={[0.03, 0.03, 0.15]} rotation={[0, 0, Math.PI / 2]}>
                        <meshStandardMaterial color="#444444" roughness={0.4} metalness={0.8} />
                    </Cylinder>
                    <Box args={[0.08, 0.15, 0.02]} position={[0, 0, 0.08]}>
                        <meshStandardMaterial color="#444444" roughness={0.4} metalness={0.8} />
                    </Box>
                    <Box args={[0.08, 0.15, 0.02]} position={[0, 0, -0.08]}>
                        <meshStandardMaterial color="#444444" roughness={0.4} metalness={0.8} />
                    </Box>
                </group>
            </group>

            {/* Door Sign/Placard */}
            <group position={[0, 2.5, 0.2]}>
                {/* Luminous Exit Sign Text */}
                <Text
                    position={[0, 0, 0.1]}
                    fontSize={0.6}
                    color="#00ff88"
                    anchorX="center"
                    anchorY="middle"
                    fillOpacity={1}
                    outlineWidth={0.04}
                    outlineColor="#ffffff"
                >
                    {label}
                    <meshStandardMaterial
                        color="#00ff88"
                        emissive="#00ff88"
                        emissiveIntensity={0.6}
                        toneMapped={false}
                    />
                </Text>

                {/* Soft glow from sign */}
                <pointLight position={[0, 0, 0.15]} intensity={1.2} color="#00ff88" distance={8} decay={2} />
            </group>

            {/* Soft ambient lighting from doorway */}
            {/* <pointLight position={[0, 1, 0.5]} intensity={0.3} color="#fff8dc" distance={8} /> */}
        </group>
    );
}
