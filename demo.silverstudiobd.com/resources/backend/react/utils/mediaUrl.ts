import type { MediaFile } from '../types/media';

export const normalizeMediaUrl = (url?: string): string => {
    if (!url) return '';

    if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
    }

    return `/${url.replace(/^\/+/, '')}`;
};

export const getMediaPreviewUrl = (file: MediaFile): string => {
    return normalizeMediaUrl(file.preview_url || file.original_url || file.media_file);
};

export const getMediaOriginalUrl = (file: MediaFile): string => {
    return normalizeMediaUrl(file.original_url || file.preview_url || file.media_file);
};
