"use client";

interface AleatoryLogoProps {
    size?: number;
    className?: string;
    alt?: string;
}

export default function AleatoryLogo({
    size = 18,
    className = "",
    alt = "Aleatory",
}: AleatoryLogoProps) {
    return (
        <img
            src="/aleatory-logo.png"
            alt={alt}
            width={size}
            height={size}
            className={`inline-block shrink-0 rounded-full object-contain ${className}`}
            style={{ width: size, height: size }}
        />
    );
}
