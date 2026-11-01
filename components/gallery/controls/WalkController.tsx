"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useViewState } from "@/contexts/ViewStateContext";

interface WalkControllerProps {
    hallwayLength?: number;
    hallwayWidth?: number;
}

export default function WalkController({ hallwayLength = 30, hallwayWidth = 12 }: WalkControllerProps) {
    const { camera, gl } = useThree();
    const { moveInputRef, resetViewSignalRef } = useViewState();

    // Yaw (horizontal) and pitch (vertical) angles in radians
    const yawRef = useRef<number>(Math.PI);
    const pitchRef = useRef<number>(0);
    const lastResetSignalRef = useRef<number>(0);

    // Keyboard state
    const keysRef = useRef({
        w: false,
        a: false,
        s: false,
        d: false,
        r: false,
        f: false,
        q: false,
        e: false,
        arrowUp: false,
        arrowDown: false,
        arrowLeft: false,
        arrowRight: false,
    });

    const velocityRef = useRef(new THREE.Vector3());

    // Reset camera to walk position and forward view when component mounts or hallwayLength changes
    useEffect(() => {
        camera.position.set(0, 4, 2);
        camera.lookAt(0, 4, hallwayLength / 2);
        camera.updateProjectionMatrix();

        // Extract initial yaw and pitch from camera orientation
        const initialEuler = new THREE.Euler(0, 0, 0, "YXZ").setFromQuaternion(camera.quaternion);
        yawRef.current = initialEuler.y;
        pitchRef.current = initialEuler.x;
        camera.rotation.order = "YXZ";
    }, [camera, hallwayLength]);

    // Keyboard listeners
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            switch (key) {
                case "w":
                    keysRef.current.w = true;
                    break;
                case "a":
                    keysRef.current.a = true;
                    break;
                case "s":
                    keysRef.current.s = true;
                    break;
                case "d":
                    keysRef.current.d = true;
                    break;
                case "r":
                    keysRef.current.r = true;
                    break;
                case "f":
                    keysRef.current.f = true;
                    break;
                case "q":
                    keysRef.current.q = true;
                    break;
                case "e":
                    keysRef.current.e = true;
                    break;
                case "arrowup":
                    keysRef.current.arrowUp = true;
                    break;
                case "arrowdown":
                    keysRef.current.arrowDown = true;
                    break;
                case "arrowleft":
                    keysRef.current.arrowLeft = true;
                    break;
                case "arrowright":
                    keysRef.current.arrowRight = true;
                    break;
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            switch (key) {
                case "w":
                    keysRef.current.w = false;
                    break;
                case "a":
                    keysRef.current.a = false;
                    break;
                case "s":
                    keysRef.current.s = false;
                    break;
                case "d":
                    keysRef.current.d = false;
                    break;
                case "r":
                    keysRef.current.r = false;
                    break;
                case "f":
                    keysRef.current.f = false;
                    break;
                case "q":
                    keysRef.current.q = false;
                    break;
                case "e":
                    keysRef.current.e = false;
                    break;
                case "arrowup":
                    keysRef.current.arrowUp = false;
                    break;
                case "arrowdown":
                    keysRef.current.arrowDown = false;
                    break;
                case "arrowleft":
                    keysRef.current.arrowLeft = false;
                    break;
                case "arrowright":
                    keysRef.current.arrowRight = false;
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    // Touch & Mouse Drag to Look Around
    useEffect(() => {
        const domElement = gl.domElement;
        if (!domElement) return;

        let activeLookTouchId: number | null = null;
        let lastTouchPos = { x: 0, y: 0 };
        let isMouseDown = false;
        let lastMousePos = { x: 0, y: 0 };

        const lookSensitivity = 0.0035;
        const maxPitch = 1.15; // ~66 degrees up/down

        // Check if an event target is an interactive UI overlay (button, input, joystick)
        const isInteractiveElement = (target: EventTarget | null) => {
            if (!target || !(target instanceof HTMLElement)) return false;
            return !!target.closest("button, a, input, [role='button'], [data-joystick='true']");
        };

        // --- Touch Listeners ---
        const handleTouchStart = (e: TouchEvent) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                // Check if touch starts on UI element or joystick
                const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
                if (isInteractiveElement(touch.target) || isInteractiveElement(elementUnderTouch)) {
                    continue;
                }

                if (activeLookTouchId === null) {
                    activeLookTouchId = touch.identifier;
                    lastTouchPos = { x: touch.clientX, y: touch.clientY };
                    break;
                }
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (activeLookTouchId === null) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === activeLookTouchId) {
                    const deltaX = touch.clientX - lastTouchPos.x;
                    const deltaY = touch.clientY - lastTouchPos.y;
                    lastTouchPos = { x: touch.clientX, y: touch.clientY };

                    // Natural "Grab the World" touch drag: the room follows the direction of the finger
                    yawRef.current += deltaX * lookSensitivity;
                    pitchRef.current += deltaY * lookSensitivity;
                    pitchRef.current = Math.max(-maxPitch, Math.min(maxPitch, pitchRef.current));
                    break;
                }
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (activeLookTouchId === null) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === activeLookTouchId) {
                    activeLookTouchId = null;
                    break;
                }
            }
        };

        // --- Mouse Listeners ---
        const handleMouseDown = (e: MouseEvent) => {
            if (e.button !== 0 || isInteractiveElement(e.target)) return;
            isMouseDown = true;
            lastMousePos = { x: e.clientX, y: e.clientY };
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isMouseDown) return;
            const deltaX = e.clientX - lastMousePos.x;
            const deltaY = e.clientY - lastMousePos.y;
            lastMousePos = { x: e.clientX, y: e.clientY };

            // Natural "Grab the World" mouse drag: the room follows the cursor
            yawRef.current += deltaX * (lookSensitivity * 0.9);
            pitchRef.current += deltaY * (lookSensitivity * 0.9);
            pitchRef.current = Math.max(-maxPitch, Math.min(maxPitch, pitchRef.current));
        };

        const handleMouseUp = () => {
            isMouseDown = false;
        };

        // Attach listeners
        domElement.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: true });
        window.addEventListener("touchend", handleTouchEnd, { passive: true });
        window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

        domElement.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            domElement.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
            window.removeEventListener("touchcancel", handleTouchEnd);

            domElement.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [gl]);

    useFrame((state, delta) => {
        // Check for view reset signal
        if (resetViewSignalRef.current !== lastResetSignalRef.current) {
            lastResetSignalRef.current = resetViewSignalRef.current;
            yawRef.current = Math.PI; // Look straight forward into the gallery (+Z)
            pitchRef.current = 0;
            camera.position.y = 4.0;
        }

        const keys = keysRef.current;
        const joy = moveInputRef.current;
        const velocity = velocityRef.current;

        // Base movement & turning speeds
        const moveSpeed = 8;
        const turnSpeed = 1.3;

        // Turning keys (Q/E or ArrowLeft/ArrowRight)
        if (keys.q || keys.arrowLeft) {
            yawRef.current -= turnSpeed * delta; // Turn Left towards left wall (-X)
        }
        if (keys.e || keys.arrowRight) {
            yawRef.current += turnSpeed * delta; // Turn Right towards right wall (+X)
        }

        // Apply camera rotation using Euler order YXZ (pitch then yaw, roll=0)
        camera.rotation.order = "YXZ";
        camera.rotation.y = yawRef.current;
        camera.rotation.x = pitchRef.current;
        camera.rotation.z = 0;

        // Reset velocity
        velocity.set(0, 0, 0);

        // Calculate horizontal forward and right directions based on yaw
        const forward = new THREE.Vector3(
            -Math.sin(yawRef.current),
            0,
            -Math.cos(yawRef.current)
        ).normalize();

        // Right vector: forward x camera.up (camera's relative right)
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

        // 1. Forward / Backward (Keyboard W/S, Arrow Up/Down, or Joystick Y)
        if (keys.w || keys.arrowUp) {
            velocity.add(forward.clone().multiplyScalar(moveSpeed));
        }
        if (keys.s || keys.arrowDown) {
            velocity.add(forward.clone().multiplyScalar(-moveSpeed));
        }
        if (Math.abs(joy.y) > 0.08) {
            // joy.y is negative when pushed up/forward, positive when pushed down/backward
            velocity.add(forward.clone().multiplyScalar(-moveSpeed * joy.y));
        }

        // 2. Strafe Left / Right (Keyboard A/D, or Joystick X)
        if (keys.a) {
            velocity.add(right.clone().multiplyScalar(-moveSpeed));
        }
        if (keys.d) {
            velocity.add(right.clone().multiplyScalar(moveSpeed));
        }
        if (Math.abs(joy.x) > 0.08) {
            velocity.add(right.clone().multiplyScalar(moveSpeed * joy.x));
        }

        // 3. Vertical Height Adjust (Keyboard R/F, or Joystick Up/Down buttons)
        if (keys.r || joy.up) {
            velocity.y += moveSpeed * 0.8;
        }
        if (keys.f || joy.down) {
            velocity.y -= moveSpeed * 0.8;
        }

        // Apply movement vector with delta time
        const newPosition = camera.position.clone().add(velocity.clone().multiplyScalar(delta));

        // Hallway collision boundaries
        const wallPadding = 1.0;
        const boundaryMinX = -hallwayWidth + wallPadding;
        const boundaryMaxX = hallwayWidth - wallPadding;
        const boundaryMinZ = wallPadding;
        const boundaryMaxZ = hallwayLength - wallPadding;

        newPosition.x = Math.max(boundaryMinX, Math.min(boundaryMaxX, newPosition.x));
        newPosition.z = Math.max(boundaryMinZ, Math.min(boundaryMaxZ, newPosition.z));
        newPosition.y = Math.max(1.5, Math.min(6.0, newPosition.y));

        camera.position.copy(newPosition);
    });

    return null;
}
