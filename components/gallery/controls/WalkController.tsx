import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface WalkControllerProps {
    hallwayLength?: number;
    hallwayWidth?: number;
}

export default function WalkController({ hallwayLength = 30, hallwayWidth = 12 }: WalkControllerProps) {
    const { camera } = useThree();
    const keysRef = useRef({
        w: false,
        a: false,
        s: false,
        d: false,
        r: false,
        f: false,
        q: false,
        e: false,
        arrowUp: false,
        arrowDown: false,
        arrowLeft: false,
        arrowRight: false,
    });

    const velocityRef = useRef(new THREE.Vector3());
    const directionRef = useRef(new THREE.Vector3());

    // Reset camera to walk position when component mounts
    useEffect(() => {
        // Start near the previous door (close to z=0) looking forward into the hallway
        camera.position.set(0, 4, 2);
        camera.lookAt(0, 4, hallwayLength / 2);
        camera.updateProjectionMatrix();
    }, [camera, hallwayLength]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            switch (key) {
                case "w":
                    keysRef.current.w = true;
                    break;
                case "a":
                    keysRef.current.a = true;
                    break;
                case "s":
                    keysRef.current.s = true;
                    break;
                case "d":
                    keysRef.current.d = true;
                    break;
                case "r":
                    keysRef.current.r = true;
                    break;
                case "f":
                    keysRef.current.f = true;
                    break;
                case "q":
                    keysRef.current.q = true;
                    break;
                case "e":
                    keysRef.current.e = true;
                    break;
                case "arrowup":
                    keysRef.current.arrowUp = true;
                    break;
                case "arrowdown":
                    keysRef.current.arrowDown = true;
                    break;
                case "arrowleft":
                    keysRef.current.arrowLeft = true;
                    break;
                case "arrowright":
                    keysRef.current.arrowRight = true;
                    break;
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            switch (key) {
                case "w":
                    keysRef.current.w = false;
                    break;
                case "a":
                    keysRef.current.a = false;
                    break;
                case "s":
                    keysRef.current.s = false;
                    break;
                case "d":
                    keysRef.current.d = false;
                    break;
                case "r":
                    keysRef.current.r = false;
                    break;
                case "f":
                    keysRef.current.f = false;
                    break;
                case "q":
                    keysRef.current.q = false;
                    break;
                case "e":
                    keysRef.current.e = false;
                    break;
                case "arrowup":
                    keysRef.current.arrowUp = false;
                    break;
                case "arrowdown":
                    keysRef.current.arrowDown = false;
                    break;
                case "arrowleft":
                    keysRef.current.arrowLeft = false;
                    break;
                case "arrowright":
                    keysRef.current.arrowRight = false;
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    useFrame((state, delta) => {
        const keys = keysRef.current;
        const velocity = velocityRef.current;
        const direction = directionRef.current;

        // Movement speed
        const moveSpeed = 8;
        const turnSpeed = 1.2;

        // Reset velocity
        velocity.set(0, 0, 0);

        // Get camera direction (forward/back)
        camera.getWorldDirection(direction);
        direction.y = 0; // Keep movement horizontal
        direction.normalize();

        // Calculate right vector for sideways movement
        const right = new THREE.Vector3();
        right.crossVectors(direction, camera.up).normalize();

        // Forward/backward movement (W/S or Arrow Up/Down)
        if (keys.w || keys.arrowUp) {
            velocity.add(direction.clone().multiplyScalar(moveSpeed));
        }
        if (keys.s || keys.arrowDown) {
            velocity.add(direction.clone().multiplyScalar(-moveSpeed));
        }

        // Sideways movement (A/D)
        if (keys.a) {
            velocity.add(right.clone().multiplyScalar(-moveSpeed));
        }
        if (keys.d) {
            velocity.add(right.clone().multiplyScalar(moveSpeed));
        }

        // Vertical movement (R/F)
        if (keys.r) {
            velocity.y += moveSpeed;
        }
        if (keys.f) {
            velocity.y -= moveSpeed;
        }

        // Apply movement with collision detection
        const newPosition = camera.position.clone().add(velocity.clone().multiplyScalar(delta));

        // Collision boundaries - keep camera inside the hallway
        const wallPadding = 1; // Keep some distance from walls
        const boundaryMinX = -hallwayWidth + wallPadding;
        const boundaryMaxX = hallwayWidth - wallPadding;
        const boundaryMinZ = wallPadding; // Start from near the previous door
        const boundaryMaxZ = hallwayLength - wallPadding; // End near the next door

        // Clamp position to boundaries
        newPosition.x = Math.max(boundaryMinX, Math.min(boundaryMaxX, newPosition.x));
        newPosition.z = Math.max(boundaryMinZ, Math.min(boundaryMaxZ, newPosition.z));

        camera.position.copy(newPosition);

        // Turning (Q/E or Arrow Left/Right) - always rotate around world Y-axis
        if (keys.q || keys.arrowLeft) {
            camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), turnSpeed * delta);
        }
        if (keys.e || keys.arrowRight) {
            camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -turnSpeed * delta);
        }

        // Keep camera at reasonable height
        camera.position.y = Math.max(1, Math.min(6, camera.position.y));
    });

    return null;
}
