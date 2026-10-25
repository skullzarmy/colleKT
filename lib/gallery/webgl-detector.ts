/**
 * WebGL Support Detector
 *
 * Verifies whether WebGL (WebGL 2 or WebGL 1) is supported and active in the user's browser.
 * Prevents three.js / @react-three/fiber crashes in environments where hardware acceleration
 * is disabled (e.g. GL_VENDOR = Disabled, GL_RENDERER = Disabled) or sandboxed without GPU.
 */

export function isWebGLAvailable(): boolean {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return false;
    }

    try {
        const canvas = document.createElement("canvas");
        const gl =
            canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
            canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
            canvas.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: false });

        if (!gl) {
            return false;
        }

        if ("isContextLost" in gl && typeof (gl as WebGLRenderingContext).isContextLost === "function") {
            if ((gl as WebGLRenderingContext).isContextLost()) {
                return false;
            }
        }

        return true;
    } catch {
        return false;
    }
}
