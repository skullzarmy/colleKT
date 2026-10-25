"use client";

import { useViewState } from "@/contexts/ViewStateContext";

export default function GalleryLighting() {
    const { styleConfig } = useViewState();
    const { ambient, directional, fill, point } = styleConfig.lighting;

    return (
        <>
            <ambientLight color={ambient.color} intensity={ambient.intensity} />
            <directionalLight
                position={directional.position}
                color={directional.color}
                intensity={directional.intensity}
                castShadow
            />
            <directionalLight
                position={fill.position}
                color={fill.color}
                intensity={fill.intensity}
            />
            <pointLight
                position={point.position}
                color={point.color}
                intensity={point.intensity}
            />
        </>
    );
}
