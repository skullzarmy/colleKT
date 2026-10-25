"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { buildAleatoryHarnessHtml } from "@/lib/aleatory/harness";
import { Loader2 } from "lucide-react";

interface AleatoryFrameProps {
    code: string;
    seed?: string;
    params?: Record<string, unknown>;
    title?: string;
    freezeClock?: boolean;
    onFeaturesReady?: (features: Record<string, string | number | boolean>) => void;
}

export default function AleatoryFrame({
    code,
    seed,
    params,
    title = "ALEATORY-001 Generative Artwork",
    freezeClock = false,
    onFeaturesReady,
}: AleatoryFrameProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);

    const htmlContent = useMemo(() => {
        return buildAleatoryHarnessHtml(code, seed, params, { freezeClock });
    }, [code, seed, params, freezeClock]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === "alea:ready") {
                setIsLoading(false);
                if (event.data.features && onFeaturesReady) {
                    onFeaturesReady(event.data.features);
                }
            }
        };

        window.addEventListener("message", handleMessage);
        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, [onFeaturesReady]);

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-lg">
            {isLoading && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-white"
                    aria-live="polite"
                >
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
                    <p className="text-xs text-zinc-300 font-mono">Initializing $alea PRNG...</p>
                </div>
            )}
            <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                title={title}
                sandbox="allow-scripts"
                className="w-full h-full max-h-full aspect-square border-0 mx-auto"
                onLoad={() => {
                    // Fallback timeout if piece does not explicitly call $alea.ready()
                    setTimeout(() => setIsLoading(false), 2000);
                }}
            />
        </div>
    );
}
