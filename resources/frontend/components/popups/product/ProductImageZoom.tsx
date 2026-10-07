import { KeyboardEvent, MouseEvent, useRef, useState } from 'react';
import Image from '../../Image';

interface Props {
    src: string;
    alt: string;
    zoomFactor?: number;
    className?: string;
    onClick?: () => void;
}

const ProductImageZoom = ({
    src,
    alt,
    zoomFactor = 1.8,
    className = '',
    onClick,
}: Props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isZooming, setIsZooming] = useState(false);

    const updateOrigin = (event: MouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        const image = containerRef.current?.querySelector('img');

        if (image) {
            image.style.transformOrigin = `${x}% ${y}%`;
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;

        event.preventDefault();
        onClick();
    };

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden cursor-zoom-in ${className}`}
            onMouseEnter={() => setIsZooming(true)}
            onMouseLeave={() => setIsZooming(false)}
            onMouseMove={updateOrigin}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={onClick ? `View ${alt} image gallery` : undefined}
        >
            <Image
                src={src}
                alt={alt}
                className="block h-full w-full select-none object-contain transition-transform duration-300 ease-out motion-reduce:transition-none"
                draggable={false}
                style={{
                    transform: `scale(${isZooming ? zoomFactor : 1})`,
                }}
            />
        </div>
    );
};

export default ProductImageZoom;
