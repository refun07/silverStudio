import type { MediaFile } from '../types/media';

export const normalizeMediaUrl = (url?: string): string => {
    if (!url) return '';

    if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
    }

    return `/${url.replace(/^\/+/, '')}`;
};

export const getManagedMediaDownloadUrl = (file: MediaFile): string => {
    const path = file.media_file || file.original_url || file.preview_url || '';
    const normalizedPath = path.replace(/^https?:\/\/[^/]+\//i, '').replace(/^\/+/, '');

    if (file.id && normalizedPath.startsWith('uploads/media/')) {
        return `/file-manager/download/${file.id}`;
    }

    return '';
};

export const getMediaPreviewUrl = (file: MediaFile): string => {
    return getManagedMediaDownloadUrl(file) || normalizeMediaUrl(file.preview_url || file.original_url || file.media_file);
};

export const getMediaOriginalUrl = (file: MediaFile): string => {
    return getManagedMediaDownloadUrl(file) || normalizeMediaUrl(file.original_url || file.preview_url || file.media_file);
};
