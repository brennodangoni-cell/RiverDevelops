import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

interface SmoothScrollProps {
    isLocked?: boolean;
}

const SmoothScroll = ({ isLocked = false }: SmoothScrollProps) => {
    const lenisRef = useRef<Lenis | null>(null);

    useEffect(() => {
        // Prevent scroll position restoration on refresh
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);

        const lenis = new Lenis({
            duration: 0.6,
            easing: (t: number) => 1 - Math.pow(1 - t, 3),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1.2,
            touchMultiplier: 2,
            lerp: 0.15,
        });

        lenisRef.current = lenis;

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        const rafId = requestAnimationFrame(raf);

        return () => {
            cancelAnimationFrame(rafId);
            lenis.destroy();
            lenisRef.current = null;
        };
    }, []);

    // Effect to toggle scroll lock dynamically from App parent state
    useEffect(() => {
        if (!lenisRef.current) return;

        if (isLocked) {
            lenisRef.current.stop();
        } else {
            lenisRef.current.start();
        }
    }, [isLocked]);

    return null;
};

export default SmoothScroll;
