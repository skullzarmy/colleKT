"use client";

import { useGLTF, Text, Sphere, Box, Cone } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import { Group } from "three";

interface ReggieProps {
    position?: [number, number, number];
    scale?: number | [number, number, number];
    rotation?: [number, number, number];
    audioSrc?: string;
    speechText?: string;
}

export default function Reggie({
    position = [0, 0, 0],
    scale = 1,
    rotation = [0, 0, 0],
    audioSrc,
    speechText = "Hi, I'm Reggie!",
}: ReggieProps) {
    const groupRef = useRef<Group>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [showSpeechBubble, setShowSpeechBubble] = useState(false);

    // Load the GLB model
    const { scene } = useGLTF("/ReggieSmol.glb");

    // Initialize audio
    useEffect(() => {
        if (audioSrc && typeof window !== "undefined") {
            audioRef.current = new Audio(audioSrc);
            audioRef.current.preload = "auto";
        }

        return () => {
            if (audioRef.current) {
                audioRef.current = null;
            }
        };
    }, [audioSrc]);

    // Update cursor style based on hover state
    useEffect(() => {
        if (typeof document !== "undefined") {
            document.body.style.cursor = isHovered ? "pointer" : "default";
        }

        return () => {
            if (typeof document !== "undefined") {
                document.body.style.cursor = "default";
            }
        };
    }, [isHovered]);

    // Clone and scale the scene
    const clonedScene = scene.clone();

    // Apply scale directly to the cloned scene
    if (Array.isArray(scale)) {
        clonedScene.scale.set(scale[0], scale[1], scale[2]);
    } else {
        clonedScene.scale.setScalar(scale);
    }

    const handleClick = () => {
        // Play audio if available
        if (audioRef.current) {
            audioRef.current.currentTime = 0; // Reset to start
            audioRef.current.play().catch(console.warn);
        }

        // Show speech bubble
        setShowSpeechBubble(true);

        // Hide speech bubble after 3 seconds
        setTimeout(() => {
            setShowSpeechBubble(false);
        }, 3000);
    };

    return (
        <>
            <group
                ref={groupRef}
                position={position}
                rotation={rotation}
                onPointerEnter={() => setIsHovered(true)}
                onPointerLeave={() => setIsHovered(false)}
                onClick={handleClick}
            >
                {/* Invisible clickable area around Reggie */}
                <Sphere args={[1.5]} visible={false}>
                    <meshBasicMaterial transparent opacity={0} />
                </Sphere>

                {/* Hover glow effect */}
                {isHovered && (
                    <group>
                        {/* Soft circular glow under Reggie */}
                        <Sphere args={[1.2]} position={[0, -0.5, 0]}>
                            <meshStandardMaterial
                                color="#ffffff"
                                emissive="#ffffff"
                                emissiveIntensity={0.2}
                                transparent
                                opacity={0.3}
                            />
                        </Sphere>

                        {/* Point light for ambient glow */}
                        <pointLight position={[0, 0.5, 0]} intensity={0.3} color="#ffffff" distance={4} />
                    </group>
                )}

                {/* The actual Reggie model */}
                <primitive object={clonedScene} />
            </group>

            {/* Speech Bubble - positioned in world space, not rotated with Reggie */}
            {showSpeechBubble && (
                <group
                    position={[position[0], position[1] + 3, position[2] - 1]}
                    rotation={[0, -100 * (Math.PI / 180), 0]}
                >
                    {/* Bubble background */}
                    <Box args={[3, 1, 0.1]} position={[0, 0, 0]}>
                        <meshStandardMaterial color="#ffffff" transparent opacity={0.95} />
                    </Box>

                    {/* Bubble border */}
                    <Box args={[3.1, 1.1, 0.05]} position={[0, 0, -0.05]}>
                        <meshStandardMaterial color="#000000" />
                    </Box>

                    {/* Speech bubble tail pointing down to Reggie */}
                    <Box args={[0.2, 0.4, 0.1]} position={[0, -0.7, 0]} rotation={[0, 0, Math.PI / 4]}>
                        <meshStandardMaterial color="#ffffff" />
                    </Box>

                    {/* Speech text */}
                    <Text
                        position={[0, 0, 0.1]}
                        fontSize={0.3}
                        color="#000000"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={2.5}
                        textAlign="center"
                    >
                        {speechText}
                    </Text>
                </group>
            )}
        </>
    );
}

// Preload the model
useGLTF.preload("/ReggieSmol.glb");
