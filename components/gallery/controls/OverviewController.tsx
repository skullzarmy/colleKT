import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

interface OverviewControllerProps {
    hallwayLength?: number;
}

export default function OverviewController({ hallwayLength = 30 }: OverviewControllerProps) {
    const { camera } = useThree();

    useEffect(() => {
        // Calculate camera position based on hallway length
        const cameraHeight = Math.max(12, hallwayLength * 0.4); // Scale height with length
        const cameraZ = Math.max(8, hallwayLength * 0.3); // Position back from center

        // Reset to overview position - angled overhead looking down at the hallway
        camera.position.set(0, cameraHeight, cameraZ);
        camera.lookAt(0, 4, 0); // Look at the middle of the hallway at wall height
        camera.updateProjectionMatrix();
    }, [camera, hallwayLength]);

    return null;
}
