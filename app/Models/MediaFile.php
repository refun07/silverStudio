<?php

namespace App\Models;

use App\Traits\CreatedUpdatedDeletedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class MediaFile extends Model
{
    use CreatedUpdatedDeletedBy, HasFactory, SoftDeletes;

    protected $guarded = [];

    protected $appends = [
        'original_url',
        'preview_url',
    ];

    protected $casts = [
        'media_size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    public function variants()
    {
        return $this->hasMany(MediaVariant::class);
    }

    public function getOriginalUrlAttribute(): string
    {
        $path = $this->original_path ?: $this->media_file;

        return $this->deliveryUrl('original', $path) ?: $this->urlForPath($path);
    }

    public function getPreviewUrlAttribute(): string
    {
        $path = $this->preview_path ?: $this->original_path ?: $this->media_file;

        return $this->deliveryUrl('preview', $path) ?: $this->urlForPath($path);
    }

    public function variantUrl(string $variant, bool $fallback = true): string
    {
        if ($variant === 'preview') {
            return $this->preview_url;
        }

        $mediaVariant = $this->relationLoaded('variants')
            ? $this->variants->firstWhere('variant', $variant)
            : $this->variants()->where('variant', $variant)->where('status', 'ready')->first();

        if ($mediaVariant && $mediaVariant->status === 'ready') {
            return $this->deliveryUrl($variant, $mediaVariant->path)
                ?: $this->urlForPath($mediaVariant->path, $mediaVariant->disk);
        }

        return $fallback ? $this->original_url : '';
    }

    public function storageDisk(): string
    {
        return $this->disk ?: config('media.disk', config('filesystems.default', 'local'));
    }

    public function urlForPath(?string $path, ?string $disk = null): string
    {
        if (! $path) {
            return '';
        }

        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        $disk ??= $this->storageDisk();

        if ($disk === 'local') {
            return asset(ltrim($path, '/'));
        }

        return Storage::disk($disk)->url($path);
    }

    public function isManagedUploadPath(?string $path): bool
    {
        return $path && str_starts_with(ltrim($path, '/'), 'uploads/media/');
    }

    private function deliveryUrl(string $variant, ?string $path): string
    {
        if (! $this->exists || ! $this->isManagedUploadPath($path)) {
            return '';
        }

        if (! \Illuminate\Support\Facades\Route::has('media-assets.show')) {
            return '';
        }

        return route('media-assets.show', [
            'mediaFile' => $this->getKey(),
            'variant' => $variant,
        ]);
    }
}
