"use client";

import React, { useRef, useEffect, useState } from "react";

interface ScrollRevealProps {
    children: React.ReactNode;
    /**
     * Direction of the reveal animation.
     * @default 'up'
     */
    direction?: "up" | "down" | "left" | "right" | "none";
    /**
     * Delay in milliseconds before the animation starts.
     * @default 0
     */
    delay?: number;
    /**
     * Duration of the animation in milliseconds.
     * @default 600
     */
    duration?: number;
    /**
     * Intersection observer threshold (0 to 1).
     * @default 0.1
     */
    threshold?: number;
    /**
     * Additional CSS classes.
     */
    className?: string;
    /**
     * Whether to trigger the animation only once.
     * @default false
     */
    once?: boolean;
}

export default function ScrollReveal({
    children,
    direction = "up",
    delay = 0,
    duration = 600,
    threshold = 0.1,
    className = "",
    once = false,
}: ScrollRevealProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry) return;

                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (once) {
                        observer.disconnect();
                    }
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            {
                threshold,
                rootMargin: "0px 0px -50px 0px", // Trigger slightly before element is fully in view
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [threshold, once]);

    // Determine initial transform based on direction
    const getInitialTransform = () => {
        switch (direction) {
            case "up":
                return "translateY(30px)";
            case "down":
                return "translateY(-30px)";
            case "left":
                return "translateX(30px)";
            case "right":
                return "translateX(-30px)";
            case "none":
            default:
                return "none";
        }
    };

    const style: React.CSSProperties = {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "none" : getInitialTransform(),
        transition: `opacity ${duration}ms cubic-bezier(0.5, 0, 0, 1), transform ${duration}ms cubic-bezier(0.5, 0, 0, 1)`,
        transitionDelay: `${delay}ms`,
    };

    return (
        <div ref={ref} className={className} style={style}>
            {children}
        </div>
    );
}
