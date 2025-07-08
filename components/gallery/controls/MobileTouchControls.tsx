import { useState, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function MobileTouchControls() {
    const { camera } = useThree();
    const [isMobile, setIsMobile] = useState(false);
    const moveStateRef = useRef({
        forward: false,
        backward: false,
        left: false,
        right: false,
        turnLeft: false,
        turnRight: false,
        up: false,
        down: false,
    });

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useFrame((state, delta) => {
        const moveState = moveStateRef.current;
        const moveSpeed = 6;
        const turnSpeed = 1.2;

        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();

        // Get camera direction
        camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(direction, camera.up).normalize();

        // Apply movements
        if (moveState.forward) {
            velocity.add(direction.clone().multiplyScalar(moveSpeed));
        }
        if (moveState.backward) {
            velocity.add(direction.clone().multiplyScalar(-moveSpeed));
        }
        if (moveState.left) {
            velocity.add(right.clone().multiplyScalar(-moveSpeed));
        }
        if (moveState.right) {
            velocity.add(right.clone().multiplyScalar(moveSpeed));
        }
        if (moveState.up) {
            velocity.y += moveSpeed;
        }
        if (moveState.down) {
            velocity.y -= moveSpeed;
        }

        camera.position.add(velocity.clone().multiplyScalar(delta));

        // Apply turning - always rotate around world Y-axis
        if (moveState.turnLeft) {
            camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), turnSpeed * delta);
        }
        if (moveState.turnRight) {
            camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -turnSpeed * delta);
        }

        // Keep camera constraints
        camera.position.y = Math.max(1, Math.min(6, camera.position.y));
    });

    if (!isMobile) return null;

    const handleTouchStart = (action: keyof typeof moveStateRef.current) => {
        moveStateRef.current[action] = true;
    };

    const handleTouchEnd = (action: keyof typeof moveStateRef.current) => {
        moveStateRef.current[action] = false;
    };

    return (
        <div className="fixed inset-0 pointer-events-none">
            {/* Movement Pad (Left Side) */}
            <div className="absolute pointer-events-auto bottom-4 left-4">
                <div className="relative w-32 h-32">
                    {/* Center circle */}
                    <div className="absolute w-8 h-8 -mt-4 -ml-4 rounded-full top-1/2 left-1/2 bg-white/20"></div>

                    {/* Movement buttons */}
                    <button
                        className="absolute top-0 flex items-center justify-center w-12 h-12 -ml-6 text-lg text-white border rounded-full left-1/2 bg-black/50 border-white/30"
                        onTouchStart={() => handleTouchStart("forward")}
                        onTouchEnd={() => handleTouchEnd("forward")}
                        onMouseDown={() => handleTouchStart("forward")}
                        onMouseUp={() => handleTouchEnd("forward")}
                    >
                        ↑
                    </button>
                    <button
                        className="absolute bottom-0 flex items-center justify-center w-12 h-12 -ml-6 text-lg text-white border rounded-full left-1/2 bg-black/50 border-white/30"
                        onTouchStart={() => handleTouchStart("backward")}
                        onTouchEnd={() => handleTouchEnd("backward")}
                        onMouseDown={() => handleTouchStart("backward")}
                        onMouseUp={() => handleTouchEnd("backward")}
                    >
                        ↓
                    </button>
                    <button
                        className="absolute left-0 flex items-center justify-center w-12 h-12 -mt-6 text-lg text-white border rounded-full top-1/2 bg-black/50 border-white/30"
                        onTouchStart={() => handleTouchStart("left")}
                        onTouchEnd={() => handleTouchEnd("left")}
                        onMouseDown={() => handleTouchStart("left")}
                        onMouseUp={() => handleTouchEnd("left")}
                    >
                        ←
                    </button>
                    <button
                        className="absolute right-0 flex items-center justify-center w-12 h-12 -mt-6 text-lg text-white border rounded-full top-1/2 bg-black/50 border-white/30"
                        onTouchStart={() => handleTouchStart("right")}
                        onTouchEnd={() => handleTouchEnd("right")}
                        onMouseDown={() => handleTouchStart("right")}
                        onMouseUp={() => handleTouchEnd("right")}
                    >
                        →
                    </button>
                </div>
            </div>

            {/* Turn Controls (Right Side) */}
            <div className="absolute pointer-events-auto bottom-4 right-4">
                <div className="flex flex-col gap-2">
                    {/* Vertical movement */}
                    <div className="flex gap-2">
                        <button
                            className="flex items-center justify-center w-12 h-12 text-sm text-white border rounded-full bg-black/50 border-white/30"
                            onTouchStart={() => handleTouchStart("up")}
                            onTouchEnd={() => handleTouchEnd("up")}
                            onMouseDown={() => handleTouchStart("up")}
                            onMouseUp={() => handleTouchEnd("up")}
                        >
                            R
                        </button>
                        <button
                            className="flex items-center justify-center w-12 h-12 text-sm text-white border rounded-full bg-black/50 border-white/30"
                            onTouchStart={() => handleTouchStart("down")}
                            onTouchEnd={() => handleTouchEnd("down")}
                            onMouseDown={() => handleTouchStart("down")}
                            onMouseUp={() => handleTouchEnd("down")}
                        >
                            F
                        </button>
                    </div>

                    {/* Turn controls */}
                    <div className="flex gap-2">
                        <button
                            className="flex items-center justify-center w-12 h-12 text-sm text-white border rounded-full bg-black/50 border-white/30"
                            onTouchStart={() => handleTouchStart("turnLeft")}
                            onTouchEnd={() => handleTouchEnd("turnLeft")}
                            onMouseDown={() => handleTouchStart("turnLeft")}
                            onMouseUp={() => handleTouchEnd("turnLeft")}
                        >
                            Q
                        </button>
                        <button
                            className="flex items-center justify-center w-12 h-12 text-sm text-white border rounded-full bg-black/50 border-white/30"
                            onTouchStart={() => handleTouchStart("turnRight")}
                            onTouchEnd={() => handleTouchEnd("turnRight")}
                            onMouseDown={() => handleTouchStart("turnRight")}
                            onMouseUp={() => handleTouchEnd("turnRight")}
                        >
                            E
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
