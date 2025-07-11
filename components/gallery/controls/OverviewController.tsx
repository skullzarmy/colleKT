"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

interface OverviewControllerProps {
    hallwayLength?: number;
}

export default function OverviewController({ hallwayLength = 30 }: OverviewControllerProps) {
    const { camera } = useThree();

    useEffect(() => {
        // Fixed overview position - user-tested coordinates
        camera.position.set(0, 15.6, -2.6);
        camera.lookAt(0, 4, hallwayLength / 2); // Look towards the exit door at far end
        camera.updateProjectionMatrix();
    }, [camera, hallwayLength]);

    return null;
}
