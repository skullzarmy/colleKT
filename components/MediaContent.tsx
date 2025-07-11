"use client";

import { useState, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { THREE_GetGifTexture } from "threejs-gif-texture";
import { useViewState } from "@/contexts/ViewStateContext";

interface MediaContentProps {
    uri: string;
    mimeType?: string;
    fallbackUris?: string[]; // Multiple URIs to try if primary fails
    initialTexture?: THREE.Texture; // Show this texture first while loading
    onTextureReady?: (texture: THREE.Texture) => void; // Callback when new texture is ready
}

export default function MediaContent({
    uri,
    mimeType,
    fallbackUris = [],
    initialTexture,
    onTextureReady,
}: MediaContentProps) {
    const [texture, setTexture] = useState<THREE.Texture | null>(initialTexture || null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(!initialTexture); // Not loading if we have initial texture
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);
    const { animationsEnabled } = useViewState();

    // Log for videos and GIFs to track instances
    if (mimeType?.startsWith("video/")) {
        console.log("🎬 VIDEO COMPONENT:", uri.substring(0, 50) + "...");
    } else if (mimeType?.includes("gif") || uri.toLowerCase().includes(".gif")) {
        console.log("🎨 GIF COMPONENT DETECTED:", {
            uri: uri.substring(0, 80) + "...",
            mimeType,
            fullUri: uri,
        });
    }

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

                // Notify parent of new texture
                if (onTextureReady) {
                    onTextureReady(htmlTexture);
                }
            } catch (htmlError) {
                createPlaceholderTexture();
            }
        };

        const loadAnimatedGif = async (gifUrl: string) => {
            try {
                console.log("🎨 LOADING GIF WITH LIBRARY:", {
                    url: gifUrl.substring(0, 80) + "...",
                    fullUrl: gifUrl,
                });

                const gifTexture = await THREE_GetGifTexture(gifUrl);

                // Configure texture properties to match our other textures
                gifTexture.minFilter = THREE.LinearFilter;
                gifTexture.magFilter = THREE.LinearFilter;
                gifTexture.generateMipmaps = false;
                gifTexture.flipY = false;
                gifTexture.wrapS = THREE.ClampToEdgeWrapping;
                gifTexture.wrapT = THREE.ClampToEdgeWrapping;

                // Start playing by default
                gifTexture.play = true;

                setTexture(gifTexture);
                setLoading(false);

                if (onTextureReady) {
                    onTextureReady(gifTexture);
                }

                console.log("🎨🔥 GIF TEXTURE LOADED AND PLAYING:", {
                    url: gifUrl.substring(0, 50) + "...",
                    width: gifTexture.gif?.width,
                    height: gifTexture.gif?.height,
                    totalFrames: gifTexture.gif?.totalFrames,
                    playing: gifTexture.play,
                });
            } catch (error) {
                console.warn("❌ GIF LIBRARY ERROR:", error);
                throw error;
            }
        };

        const attemptLoadMedia = async (mediaUrl: string): Promise<boolean> => {
            return new Promise((resolve) => {
                // Convert IPFS URIs to gateway URLs, but leave data URIs unchanged
                let finalUrl = mediaUrl;
                if (mediaUrl.startsWith("ipfs://")) {
                    const withoutProtocol = mediaUrl.replace("ipfs://", "");
                    finalUrl = `https://ipfs.fileship.xyz/${withoutProtocol}`;
                } else if (mediaUrl.startsWith("data:")) {
                    finalUrl = mediaUrl;
                }

                // Determine media type
                const isVideo = mimeType?.startsWith("video/") || finalUrl.match(/\.(mp4|webm|ogg|mov)(\?|$)/i);
                const isGif = mimeType?.includes("gif") || finalUrl.match(/\.gif(\?|$)/i);
                const isHtml = isHtmlContent(mediaUrl, mimeType);

                console.log("🔍 MEDIA TYPE DETECTION:", {
                    url: finalUrl.substring(0, 80) + "...",
                    mimeType,
                    isVideo,
                    isGif,
                    isHtml,
                    fullUrl: finalUrl,
                });

                if (isHtml) {
                    // Load HTML content in iframe and render to canvas
                    loadHtmlAsTexture(finalUrl)
                        .then(() => resolve(true))
                        .catch(() => resolve(false));
                } else if (isGif) {
                    // Always load GIF using the library (animation controlled by shouldAnimate prop)
                    loadAnimatedGif(finalUrl)
                        .then(() => resolve(true))
                        .catch(() => resolve(false));
                } else if (isVideo) {
                    // Load video texture for actual videos only
                    console.log("🎬 LOADING VIDEO:", uri.substring(0, 50) + "...");

                    const video = document.createElement("video");
                    video.crossOrigin = "anonymous";
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    video.autoplay = animationsEnabled; // Respect global setting

                    video.onloadeddata = () => {
                        console.log("🎬 CREATING TEXTURE:", uri.substring(0, 50) + "...");

                        const videoTexture = new THREE.VideoTexture(video);
                        videoTexture.minFilter = THREE.LinearFilter;
                        videoTexture.magFilter = THREE.LinearFilter;
                        videoTexture.generateMipmaps = false;
                        videoTexture.flipY = false;
                        videoTexture.wrapS = THREE.ClampToEdgeWrapping;
                        videoTexture.wrapT = THREE.ClampToEdgeWrapping;

                        setTexture(videoTexture);
                        setLoading(false);

                        // Notify parent of new texture
                        if (onTextureReady) {
                            console.log("🔥 TEXTURE READY:", uri.substring(0, 50) + "...");
                            onTextureReady(videoTexture);
                        }

                        console.log("🎬 STARTING PLAYBACK:", uri.substring(0, 50) + "...");

                        // Only auto-play if animations are enabled
                        if (animationsEnabled) {
                            const playPromise = video.play();

                            if (playPromise !== undefined) {
                                playPromise
                                    .then(() => {
                                        console.log("✅ VIDEO PLAYING:", uri.substring(0, 50) + "...");
                                        resolve(true);
                                    })
                                    .catch((error) => {
                                        console.error("❌ PLAY ERROR:", error.message);
                                        resolve(false);
                                    });
                            } else {
                                resolve(true);
                            }
                        } else {
                            console.log("⏸️ VIDEO LOADED BUT PAUSED (animations disabled)");
                            resolve(true);
                        }
                    };

                    video.onerror = (event) => {
                        console.warn("❌ VIDEO ERROR:", uri.substring(0, 50) + "...");
                        resolve(false);
                    };

                    video.src = finalUrl;
                } else {
                    // Load image texture (static images only, GIFs now go through video path)
                    const loader = new THREE.TextureLoader();
                    loader.setCrossOrigin("anonymous");

                    loader.load(
                        finalUrl,
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

                            // Notify parent of new texture
                            if (onTextureReady) {
                                onTextureReady(loadedTexture);
                            }
                            resolve(true);
                        },
                        undefined, // Remove progress callback
                        (error) => {
                            // Texture loader error - silently continue
                            resolve(false);
                        }
                    );
                }
            });
        };

        async function loadMedia() {
            try {
                setLoading(true);
                setError(false);

                // Build URI chain: primary + fallbacks + IPFS gateway variants
                const uriChain = [uri, ...fallbackUris];
                const allUris: string[] = [];

                for (const testUri of uriChain) {
                    allUris.push(testUri);

                    // Add IPFS gateway variants for IPFS URIs
                    if (testUri.startsWith("ipfs://")) {
                        const cid = testUri.replace("ipfs://", "");
                        allUris.push(
                            `https://ipfs.fileship.xyz/${cid}`,
                            `https://ipfs.io/ipfs/${cid}`,
                            `https://cloudflare-ipfs.com/ipfs/${cid}`
                        );
                    }
                }

                console.log("🎬 LOADING:", allUris.length, "URIs for", mimeType || "unknown type");

                // Try each URI in the chain
                for (let i = 0; i < allUris.length; i++) {
                    const mediaUrl = allUris[i];

                    try {
                        const success = await attemptLoadMedia(mediaUrl);
                        if (success) {
                            console.log("✅ SUCCESS:", mediaUrl.substring(0, 60) + "...");
                            return;
                        }
                    } catch (loadError) {
                        continue;
                    }
                }

                // All URIs failed, create placeholder
                console.error("❌ ALL FAILED, using placeholder");
                createPlaceholderTexture();
            } catch (err) {
                console.error("❌ CRITICAL ERROR:", err);
                createPlaceholderTexture();
            }
        }

        // If we have an initial texture, show it immediately and set up async loading for videos and GIFs
        if (initialTexture) {
            setTexture(initialTexture);
            setLoading(false);

            // For videos and GIFs, start async loading to upgrade from static to animated
            if (mimeType?.startsWith("video/")) {
                console.log("🎬 ASYNC VIDEO LOADING:", uri.substring(0, 50) + "...");
                // Start async video loading but don't block the UI
                setTimeout(() => loadMedia(), 100);
            } else if (mimeType?.includes("gif") || uri.toLowerCase().includes(".gif")) {
                console.log("🎨 ASYNC GIF LOADING:", uri.substring(0, 50) + "...");
                // Start async GIF loading to replace static texture with animated GIF
                setTimeout(() => loadMedia(), 100);
            }
            return;
        }

        // No initial texture, load normally
        loadMedia();
    }, [uri, mimeType, initialTexture, animationsEnabled]);

    // Control GIF and video animations based on global setting
    useEffect(() => {
        if (texture) {
            // Handle GIF textures
            if ("play" in texture && "gif" in texture) {
                const wasPlaying = texture.play;
                texture.play = animationsEnabled;

                if (wasPlaying !== animationsEnabled) {
                    console.log(`🎨 GIF ${animationsEnabled ? "RESUMED" : "PAUSED"}:`, uri.substring(0, 50) + "...");
                }
            }

            // Handle video textures
            if (texture instanceof THREE.VideoTexture) {
                const video = texture.image as HTMLVideoElement;
                if (video) {
                    if (animationsEnabled && video.paused) {
                        video.play().catch(() => {}); // Silently handle play errors
                    } else if (!animationsEnabled && !video.paused) {
                        video.pause();
                    }
                }
            }
        }
    }, [animationsEnabled, texture, uri]);

    // Update material when texture changes
    useFrame(() => {
        if (materialRef.current && texture) {
            if (materialRef.current.map !== texture) {
                materialRef.current.map = texture;
                materialRef.current.needsUpdate = true;
            }

            // For video textures, ensure they update
            if (texture instanceof THREE.VideoTexture) {
                const video = texture.image as HTMLVideoElement;
                if (video && !video.paused && !video.ended) {
                    texture.needsUpdate = true;
                }
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
        // Create a subtle loading texture that blends seamlessly
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d")!;

        // Subtle gray gradient instead of jarring red
        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, "#2a2a2a");
        gradient.addColorStop(1, "#1a1a1a");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);

        // Remove "LOADING" text for seamless experience
        // Add subtle orientation marker only
        ctx.fillStyle = "#333";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("↑", 128, 50);

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
