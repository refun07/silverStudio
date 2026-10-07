import { useLayoutEffect, useState } from 'react';

export function useDrawerViewportHeight(isOpen: boolean, isMobile: boolean): string | null {
    const [drawerHeight, setDrawerHeight] = useState<string | null>(null);

    useLayoutEffect(() => {
        if (!isMobile || !isOpen) return;

        let blurTimeout: ReturnType<typeof setTimeout> | null = null;

        const handleResize = () => {
            if (window.visualViewport) {
                setDrawerHeight(`${window.visualViewport.height}px`);
            }
        };

        // Initialize immediately so the drawer doesn't jump from 95dvh to a
        // pixel value on the first focus event.
        handleResize();

        const handleFocusIn = () => {
            if (blurTimeout) {
                clearTimeout(blurTimeout);
                blurTimeout = null;
            }
            handleResize();
        };

        const handleFocusOut = () => {
            if (blurTimeout) clearTimeout(blurTimeout);
            blurTimeout = setTimeout(() => {
                setDrawerHeight(null);
            }, 150);
        };

        const viewport = window.visualViewport;
        if (viewport) {
            viewport.addEventListener('resize', handleResize);
        }

        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);

        return () => {
            if (viewport) {
                viewport.removeEventListener('resize', handleResize);
            }
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('focusout', handleFocusOut);
            if (blurTimeout) clearTimeout(blurTimeout);
        };
    }, [isMobile, isOpen]);

    return drawerHeight;
}
