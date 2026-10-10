import { RefObject, useEffect } from 'react';

const focusableInputTypes = new Set([
    'text',
    'number',
    'tel',
    'email',
    'url',
    'search',
    'password',
]);

export function useScrollIntoViewOnFocus(
    containerRef: RefObject<HTMLElement>,
    isEnabled: boolean,
): void {
    useEffect(() => {
        if (!isEnabled || !containerRef.current) return;

        const container = containerRef.current;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;

            const tagName = target.tagName.toLowerCase();
            const inputType = target.getAttribute('type')?.toLowerCase() || 'text';
            const inputMode = target.getAttribute('inputmode')?.toLowerCase() || '';

            const isTextInput =
                tagName === 'textarea' ||
                (tagName === 'input' &&
                    (focusableInputTypes.has(inputType) ||
                        ['decimal', 'numeric', 'tel'].includes(inputMode)));

            if (!isTextInput) return;

            if (timeoutId) clearTimeout(timeoutId);

            timeoutId = setTimeout(() => {
                const containerRect = container.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();

                const isAbove = targetRect.top < containerRect.top;
                const isBelow = targetRect.bottom > containerRect.bottom;

                if (isAbove || isBelow) {
                    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            }, 150);
        };

        container.addEventListener('focusin', handleFocusIn);

        return () => {
            container.removeEventListener('focusin', handleFocusIn);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [containerRef, isEnabled]);
}
