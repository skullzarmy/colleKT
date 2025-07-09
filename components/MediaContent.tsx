"use client";

import { useState, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface MediaContentProps {
    uri: string;
    mimeType?: string;
}

export default function MediaContent({ uri, mimeType }: MediaContentProps) {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    // Helper function to detect if URI contains HTML content
    const isHtmlContent = (uri: string, mimeType?: string): boolean => {
        if (mimeType?.includes("text/html")) return true;

        const lowerUri = uri.toLowerCase();
        const htmlIndicators = [".html", "<html", "<!doctype"];
        return htmlIndicators.some((indicator) => lowerUri.includes(indicator));
    };

    useEffect(() => {
        if (!uri) {
            setLoading(false);
            return;
        }

        const loadMedia = async () => {
            try {
                setLoading(true);
                setError(false);

                // Convert IPFS URIs to gateway URLs, but leave data URIs unchanged
                let mediaUrl = uri;
                if (uri.startsWith("ipfs://")) {
                    // Extract CID and preserve any query parameters
                    const withoutProtocol = uri.replace("ipfs://", "");
                    mediaUrl = `https://ipfs.fileship.xyz/${withoutProtocol}`;
                } else if (uri.startsWith("data:")) {
                    // Keep base64 data URIs as-is
                    mediaUrl = uri;
                }

                // Determine media type
                const isVideo = mimeType?.startsWith("video/") || mediaUrl.match(/\.(mp4|webm|ogg|mov)(\?|$)/i);
                const isHtml = isHtmlContent(uri, mimeType);

                if (isHtml) {
                    // Load HTML content in iframe and render to canvas
                    await loadHtmlAsTexture(mediaUrl);
                } else if (isVideo) {
                    // Load video texture
                    const video = document.createElement("video");
                    video.crossOrigin = "anonymous";
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    video.autoplay = true;

                    video.onloadeddata = () => {
                        const videoTexture = new THREE.VideoTexture(video);
                        videoTexture.minFilter = THREE.LinearFilter;
                        videoTexture.magFilter = THREE.LinearFilter;
                        videoTexture.generateMipmaps = false;
                        videoTexture.flipY = false;
                        videoTexture.wrapS = THREE.ClampToEdgeWrapping;
                        videoTexture.wrapT = THREE.ClampToEdgeWrapping;

                        setTexture(videoTexture);
                        setLoading(false);
                        video.play().catch(console.error);
                    };

                    video.onerror = () => createPlaceholderTexture();
                    video.src = mediaUrl;
                } else {
                    // Load image texture (includes GIFs)
                    const loader = new THREE.TextureLoader();
                    loader.setCrossOrigin("anonymous");

                    loader.load(
                        mediaUrl,
                        (loadedTexture) => {
                            // Configure texture properties
                            loadedTexture.minFilter = THREE.LinearFilter;
                            loadedTexture.magFilter = THREE.LinearFilter;
                            loadedTexture.generateMipmaps = false;
                            loadedTexture.flipY = false;
                            loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
                            loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
                            loadedTexture.needsUpdate = true;

                            setTexture(loadedTexture);
                            setLoading(false);
                        },
                        undefined, // Remove progress callback
                        (error) => {
                            // Texture loader error - silently continue
                            createPlaceholderTexture();
                        }
                    );
                }
            } catch (err) {
                createPlaceholderTexture();
            }
        };

        const loadHtmlAsTexture = async (htmlUrl: string) => {
            try {
                // Create hidden iframe
                const iframe = document.createElement("iframe");
                iframe.style.position = "absolute";
                iframe.style.left = "-9999px";
                iframe.style.width = "1024px";
                iframe.style.height = "1024px";
                iframe.style.border = "none";
                iframe.sandbox = "allow-scripts allow-same-origin";

                document.body.appendChild(iframe);

                // Set up promise to wait for iframe load
                const iframeLoaded = new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error("Iframe load timeout"));
                    }, 10000); // 10 second timeout

                    iframe.onload = () => {
                        clearTimeout(timeout);
                        // Wait a bit more for content to render
                        setTimeout(resolve, 2000);
                    };

                    iframe.onerror = () => {
                        clearTimeout(timeout);
                        reject(new Error("Iframe load error"));
                    };
                });

                // Load the HTML content
                iframe.src = htmlUrl;

                await iframeLoaded;

                // Capture iframe content to canvas
                const canvas = document.createElement("canvas");
                canvas.width = 1024;
                canvas.height = 1024;
                const ctx = canvas.getContext("2d")!;

                // Use html2canvas-like approach or fallback to screenshot
                try {
                    // Create a snapshot of the iframe content
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDoc) {
                        // Draw a representation of the HTML content
                        ctx.fillStyle = "#ffffff";
                        ctx.fillRect(0, 0, 1024, 1024);

                        // Add iframe indicator
                        ctx.fillStyle = "#00bcd4";
                        ctx.font = "32px Arial";
                        ctx.textAlign = "center";
                        ctx.fillText("🌐 Interactive Content", 512, 100);

                        ctx.fillStyle = "#333";
                        ctx.font = "24px Arial";
                        ctx.fillText("fxhash Generative Art", 512, 200);

                        ctx.font = "18px Arial";
                        ctx.fillStyle = "#666";
                        ctx.fillText("Click to view full interactive version", 512, 900);

                        // Add a border to indicate it's interactive
                        ctx.strokeStyle = "#00bcd4";
                        ctx.lineWidth = 8;
                        ctx.strokeRect(4, 4, 1016, 1016);

                        // Add some visual elements to make it look dynamic
                        for (let i = 0; i < 10; i++) {
                            ctx.beginPath();
                            ctx.arc(
                                Math.random() * 800 + 112,
                                Math.random() * 600 + 300,
                                Math.random() * 20 + 5,
                                0,
                                Math.PI * 2
                            );
                            ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 60%)`;
                            ctx.fill();
                        }
                    }
                } catch (captureError) {
                    // Fallback placeholder for HTML content
                    ctx.fillStyle = "#1a1a1a";
                    ctx.fillRect(0, 0, 1024, 1024);

                    ctx.fillStyle = "#00bcd4";
                    ctx.font = "48px Arial";
                    ctx.textAlign = "center";
                    ctx.fillText("🎨", 512, 200);

                    ctx.fillStyle = "#ffffff";
                    ctx.font = "32px Arial";
                    ctx.fillText("Interactive Art", 512, 300);

                    ctx.font = "24px Arial";
                    ctx.fillStyle = "#aaa";
                    ctx.fillText("HTML/JS Content Detected", 512, 400);

                    ctx.font = "18px Arial";
                    ctx.fillText("Full version available in metadata panel", 512, 800);
                }

                // Clean up iframe
                document.body.removeChild(iframe);

                // Create texture from canvas
                const htmlTexture = new THREE.CanvasTexture(canvas);
                htmlTexture.flipY = false;
                htmlTexture.needsUpdate = true;

                setTexture(htmlTexture);
                setLoading(false);
            } catch (htmlError) {
                createPlaceholderTexture();
            }
        };

        const createPlaceholderTexture = () => {
            try {
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

                // Add orientation marker at top
                ctx.fillStyle = "#00ff00";
                ctx.font = "24px Arial";
                ctx.textAlign = "center";
                ctx.fillText("↑ TOP", 256, 100);

                // Add icon
                ctx.fillStyle = "#00bcd4";
                ctx.font = "64px Arial";
                ctx.fillText("🖼", 256, 200);

                // Add label
                ctx.font = "24px Arial";
                ctx.fillText("NFT", 256, 280);

                ctx.font = "16px Arial";
                ctx.fillStyle = "#888";
                ctx.fillText("Loading...", 256, 320);

                const placeholderTexture = new THREE.CanvasTexture(canvas);
                placeholderTexture.flipY = false;
                placeholderTexture.needsUpdate = true;
                setTexture(placeholderTexture);
                setLoading(false);
            } catch (err) {
                setError(true);
                setLoading(false);
            }
        };

        loadMedia();
    }, [uri, mimeType]);

    // Update material when texture changes
    useFrame(() => {
        if (materialRef.current && texture) {
            if (materialRef.current.map !== texture) {
                materialRef.current.map = texture;
                materialRef.current.needsUpdate = true;
            }
        }
    });

    // Cleanup texture on unmount
    useEffect(() => {
        return () => {
            if (texture) {
                texture.dispose();
            }
        };
    }, [texture]);

    if (loading) {
        // Create a visible loading texture to test geometry
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ff0000"; // Bright red for testing
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = "#ffffff";
        ctx.font = "32px Arial";
        ctx.textAlign = "center";
        ctx.fillText("LOADING", 128, 128);
        // Add orientation marker
        ctx.fillStyle = "#00ff00";
        ctx.fillText("↑ TOP", 128, 60);

        const testTexture = new THREE.CanvasTexture(canvas);
        testTexture.flipY = false;
        testTexture.needsUpdate = true;
        return <meshStandardMaterial map={testTexture} roughness={0.8} metalness={0.1} side={THREE.DoubleSide} />;
    }

    if (!texture) {
        return <meshStandardMaterial color="#222" roughness={0.8} metalness={0.1} />;
    }

    return (
        <meshStandardMaterial
            ref={materialRef}
            map={texture}
            roughness={0.1}
            metalness={0.1}
            transparent={false}
            alphaTest={0.1}
            side={THREE.DoubleSide}
            needsUpdate={true}
        />
    );
}
