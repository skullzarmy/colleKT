"use client";

import * as THREE from "three";

interface PreloadedMediaContentProps {
    nftId: string;
    preloadedTextures: Map<string, THREE.Texture>;
    mimeType?: string;
}

export default function PreloadedMediaContent({ nftId, preloadedTextures, mimeType }: PreloadedMediaContentProps) {
    const texture = preloadedTextures.get(nftId);

    if (!texture) {
        // Create placeholder if texture not found
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d")!;

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, "#2a2a2a");
        gradient.addColorStop(1, "#1a1a1a");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        // Add border
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 510, 510);

        // Add icon
        ctx.fillStyle = "#00bcd4";
        ctx.font = "64px Arial";
        ctx.textAlign = "center";
        ctx.fillText("🖼", 256, 200);

        ctx.font = "24px Arial";
        ctx.fillText("NFT", 256, 280);

        const placeholderTexture = new THREE.CanvasTexture(canvas);
        return (
            <meshStandardMaterial map={placeholderTexture} roughness={0.8} metalness={0.1} side={THREE.DoubleSide} />
        );
    }

    return (
        <meshStandardMaterial
            map={texture}
            roughness={0.1}
            metalness={0.1}
            transparent={false}
            side={THREE.DoubleSide}
        />
    );
}
