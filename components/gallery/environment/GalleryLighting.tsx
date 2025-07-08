"use client";

export default function GalleryLighting() {
    return (
        <>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
            <directionalLight position={[-10, 10, -5]} intensity={0.4} />
            <pointLight position={[0, 8, 0]} intensity={0.6} />
        </>
    );
}
