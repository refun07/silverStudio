<?php

namespace App\Services;

use App\Jobs\GenerateMediaVariants;
use App\Models\MediaFile;
use App\Models\MediaVariant;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Intervention\Image\Laravel\Facades\Image;
use RuntimeException;
use Throwable;

class MediaImageService
{
    public const USAGES = ['generic', 'product', 'banner'];

    public const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'];

    public static function recognizesImageExtension(?string $extension): bool
    {
        return in_array(strtolower((string) $extension), self::IMAGE_EXTENSIONS, true);
    }

    public function initialize(MediaFile $mediaFile): void
    {
        $this->withMediaLock($mediaFile->id, function () use ($mediaFile): void {
            $activeMediaFile = MediaFile::find($mediaFile->id);
            if (! $activeMediaFile) {
                return;
            }

            $this->initializeUnlocked($activeMediaFile);
        });
    }

    private function initializeUnlocked(MediaFile $mediaFile): void
    {
        if ($mediaFile->media_type !== 'image') {
            $mediaFile->forceFill([
                'processing_status' => 'ready',
                'processing_error' => null,
            ])->save();

            return;
        }

        try {
            $this->captureMetadata($mediaFile);

            $mediaFile->preview_path = $mediaFile->original_path ?: $mediaFile->media_file;

            $mediaFile->forceFill([
                'processing_status' => 'ready',
                'processing_error' => null,
            ])->save();
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            report($exception);

            // The untouched original remains usable even when optimization is
            // unavailable on a particular server/image format.
            $mediaFile->forceFill([
                'preview_path' => $mediaFile->original_path ?: $mediaFile->media_file,
                'processing_status' => 'failed',
                'processing_error' => mb_substr($exception->getMessage(), 0, 1000),
            ])->save();
        }
    }

    public function prepareUsage(MediaFile $mediaFile, string $usage): void
    {
        if ($mediaFile->media_type === 'image' && (! $mediaFile->width || ! $mediaFile->height)) {
            try {
                $this->captureMetadata($mediaFile);
            } catch (ValidationException $exception) {
                $mediaFile->forceFill([
                    'processing_status' => 'failed',
                    'processing_error' => mb_substr($exception->getMessage(), 0, 1000),
                ])->save();

                return;
            }
        }

        $usage = in_array($usage, self::USAGES, true) ? $usage : 'generic';
        if ($mediaFile->processing_status === 'failed') {
            return;
        }

        $variants = array_values(array_filter(
            config("media.usage_variants.{$usage}", []),
            fn (string $variant) => $variant !== 'preview' && config("media.variants.{$variant}")
        ));

        if (! $this->supportsVariants($mediaFile) || $variants === []) {
            return;
        }

        $readyVariants = $mediaFile->variants()
            ->whereIn('variant', $variants)
            ->where('status', 'ready')
            ->pluck('variant')
            ->all();
        $variants = array_values(array_diff($variants, $readyVariants));

        if ($variants === []) {
            return;
        }

        $mediaFile->forceFill([
            'processing_status' => 'pending',
            'processing_error' => null,
        ])->save();

        GenerateMediaVariants::dispatch($mediaFile->id, $variants);
    }

    public function prepareIds(array|string|int|null $ids, string $usage): void
    {
        $usage = in_array($usage, self::USAGES, true) ? $usage : 'generic';
        $ids = is_array($ids) ? $ids : explode(',', (string) $ids);
        $ids = collect($ids)
            ->flatten()
            ->flatMap(fn ($id) => explode(',', (string) $id))
            ->map(fn ($id) => (int) trim((string) $id))
            ->filter()
            ->unique();

        if ($ids->isEmpty()) {
            return;
        }

        $query = user() ? FileManagerService::queryForCurrentUser() : MediaFile::query();
        $mediaFiles = $query->whereKey($ids)->get();

        if ($mediaFiles->count() !== $ids->count()) {
            abort(403, __('You do not have permission to use one or more selected files.'));
        }

        if (in_array($usage, ['product', 'banner'], true)
            && $mediaFiles->contains(fn (MediaFile $mediaFile) => $mediaFile->media_type !== 'image')) {
            throw ValidationException::withMessages([
                'ids' => __('Only images can be used as product or banner media.'),
            ]);
        }

        $mediaFiles->each(
            fn (MediaFile $mediaFile) => $this->prepareUsage($mediaFile, $usage)
        );
    }

    public function generateVariants(MediaFile $mediaFile, array $variants): void
    {
        $this->withMediaLock($mediaFile->id, function () use ($mediaFile, $variants): void {
            $activeMediaFile = MediaFile::find($mediaFile->id);
            if (! $activeMediaFile) {
                return;
            }

            $activeMediaFile->forceFill([
                'processing_status' => 'processing',
                'processing_error' => null,
            ])->save();

            foreach (array_unique($variants) as $variant) {
                if ($variant !== 'preview' && config("media.variants.{$variant}")) {
                    $this->generateVariant($activeMediaFile, $variant);
                }
            }

            $activeMediaFile->forceFill([
                'processing_status' => 'ready',
                'processing_error' => null,
            ])->save();
        });
    }

    private function generateVariant(MediaFile $mediaFile, string $variant): MediaVariant
    {
        $definition = config("media.variants.{$variant}");

        if (! is_array($definition) || empty($definition['max_width'])) {
            throw new RuntimeException("Unknown media variant [{$variant}].");
        }

        $disk = $mediaFile->storageDisk();
        $originalPath = $mediaFile->original_path ?: $mediaFile->media_file;

        if (! $originalPath || ! Storage::disk($disk)->exists($originalPath)) {
            throw new RuntimeException('The original media file is missing.');
        }

        if ($mediaFile->width && $mediaFile->height
            && ($mediaFile->width * $mediaFile->height) > $this->safePixelLimit()) {
            throw new RuntimeException('The image dimensions exceed the safe processing limit.');
        }

        $variantRecord = MediaVariant::updateOrCreate(
            ['media_file_id' => $mediaFile->id, 'variant' => $variant],
            [
                'disk' => $disk,
                'path' => $this->variantPath($originalPath, $variant),
                'format' => 'webp',
                'status' => 'processing',
                'error' => null,
            ]
        );

        try {
            $original = Storage::disk($disk)->get($originalPath);
            if (in_array(strtolower((string) $mediaFile->media_extension), ['heic', 'heif'], true)) {
                [$encoded, $width, $height] = $this->encodeHeic($original, $definition);
            } else {
                $image = Image::read($original);
                if (! empty($definition['max_height'])) {
                    $image->scaleDown(
                        width: (int) $definition['max_width'],
                        height: (int) $definition['max_height'],
                    );
                } else {
                    $image->scaleDown(width: (int) $definition['max_width']);
                }
                $encoded = (string) $image->toWebp((int) ($definition['quality'] ?? config('media.webp_quality', 82)));
                $width = $image->width();
                $height = $image->height();
            }
            $path = $variantRecord->path;

            if (! Storage::disk($disk)->put($path, $encoded)) {
                throw new RuntimeException("Unable to store media variant [{$variant}].");
            }

            $variantRecord->forceFill([
                'width' => $width,
                'height' => $height,
                'size' => Storage::disk($disk)->size($path),
                'status' => 'ready',
                'error' => null,
            ])->save();

            if ($variant === 'preview') {
                $mediaFile->forceFill(['preview_path' => $path])->save();
            }

            return $variantRecord;
        } catch (Throwable $exception) {
            $variantRecord->forceFill([
                'status' => 'failed',
                'error' => mb_substr($exception->getMessage(), 0, 1000),
            ])->save();

            throw $exception;
        }
    }

    public function captureMetadata(MediaFile $mediaFile): void
    {
        $disk = $mediaFile->storageDisk();
        $path = $mediaFile->original_path ?: $mediaFile->media_file;

        if (! $path || ! Storage::disk($disk)->exists($path)) {
            throw new RuntimeException('The original media file is missing.');
        }

        $contents = Storage::disk($disk)->get($path);
        $dimensions = @getimagesizefromstring($contents);
        $extension = strtolower((string) $mediaFile->media_extension);

        if (is_array($dimensions)) {
            [$width, $height] = $dimensions;
        } elseif (in_array($extension, ['heic', 'heif'], true) && $this->supportsHeic()) {
            $imagick = new \Imagick;
            try {
                $imagick->readImageBlob($contents);
                $imagick->setIteratorIndex(0);
                $width = $imagick->getImageWidth();
                $height = $imagick->getImageHeight();
            } finally {
                $imagick->clear();
                $imagick->destroy();
            }
        } elseif ($extension !== 'svg') {
            throw ValidationException::withMessages([
                'media_file' => __('The uploaded image is invalid or corrupted.'),
            ]);
        }

        if (isset($width, $height)) {
            $pixels = $width * $height;
            $maxPixels = $this->safePixelLimit();

            if ($maxPixels > 0 && $pixels > $maxPixels) {
                throw ValidationException::withMessages([
                    'media_file' => __('The image dimensions are too large to process safely.'),
                ]);
            }

            $mediaFile->width = $width;
            $mediaFile->height = $height;
        }

        $mediaFile->checksum = hash('sha256', $contents);
        $mediaFile->save();
    }

    public function deleteFiles(MediaFile $mediaFile): void
    {
        $defaultDisk = $mediaFile->storageDisk();
        $originalPath = $mediaFile->original_path ?: $mediaFile->media_file;
        $canonicalPaths = array_values(array_unique(array_filter([
            $mediaFile->media_file,
            $originalPath,
        ])));
        $derivedPathsByDisk = [];

        if ($mediaFile->preview_path && ! in_array($mediaFile->preview_path, $canonicalPaths, true)) {
            $derivedPathsByDisk[$defaultDisk][] = $mediaFile->preview_path;
        }

        foreach ($mediaFile->variants as $variant) {
            if ($variant->path && ! in_array($variant->path, $canonicalPaths, true)) {
                $derivedPathsByDisk[$variant->disk ?: $defaultDisk][] = $variant->path;
            }
        }

        // Remove reproducible derivatives first. If that fails, the untouched
        // original remains available and the database record is retained.
        foreach ($derivedPathsByDisk as $disk => $paths) {
            $paths = array_values(array_unique($paths));
            if ($paths !== [] && ! Storage::disk($disk)->delete($paths)) {
                throw new RuntimeException("Unable to delete one or more media files from disk [{$disk}].");
            }
        }

        // A legacy canonical media_file can differ from original_path. Delete
        // it immediately before the untouched original, which is always last.
        foreach ($canonicalPaths as $canonicalPath) {
            if ($canonicalPath === $originalPath) {
                continue;
            }

            if (! Storage::disk($defaultDisk)->delete($canonicalPath)) {
                throw new RuntimeException("Unable to delete canonical media from disk [{$defaultDisk}].");
            }
        }

        if ($originalPath && ! Storage::disk($defaultDisk)->delete($originalPath)) {
            throw new RuntimeException("Unable to delete original media from disk [{$defaultDisk}].");
        }
    }

    public static function lockName(int $mediaFileId): string
    {
        return "media-file:{$mediaFileId}";
    }

    public function supportsVariants(MediaFile $mediaFile): bool
    {
        return $mediaFile->media_type === 'image' && $this->canRasterize($mediaFile);
    }

    private function canRasterize(MediaFile $mediaFile): bool
    {
        $extension = strtolower((string) $mediaFile->media_extension);

        if ($extension === 'svg') {
            return false;
        }

        return ! in_array($extension, ['heic', 'heif'], true) || $this->supportsHeic();
    }

    public function supportsHeic(): bool
    {
        if (! extension_loaded('imagick')) {
            return false;
        }

        $formats = \Imagick::queryFormats();

        return in_array('HEIC', $formats, true) || in_array('HEIF', $formats, true);
    }

    private function encodeHeic(string $contents, array $definition): array
    {
        if (! $this->supportsHeic()) {
            throw new RuntimeException('HEIC images require ImageMagick with HEIC support.');
        }

        $imagick = new \Imagick;
        try {
            $imagick->readImageBlob($contents);
            $imagick->setIteratorIndex(0);
            $originalWidth = $imagick->getImageWidth();
            $originalHeight = $imagick->getImageHeight();
            $maxWidth = (int) $definition['max_width'];
            $maxHeight = ! empty($definition['max_height']) ? (int) $definition['max_height'] : PHP_INT_MAX;
            $scale = min(1, $maxWidth / $originalWidth, $maxHeight / $originalHeight);
            $width = max(1, (int) round($originalWidth * $scale));
            $height = max(1, (int) round($originalHeight * $scale));

            if ($scale < 1) {
                $imagick->resizeImage($width, $height, \Imagick::FILTER_LANCZOS, 1);
            }

            $imagick->setImageFormat('webp');
            $imagick->setImageCompressionQuality((int) ($definition['quality'] ?? config('media.webp_quality', 82)));

            return [$imagick->getImageBlob(), $width, $height];
        } finally {
            $imagick->clear();
            $imagick->destroy();
        }
    }

    private function safePixelLimit(): int
    {
        $configuredLimit = max(1, (int) config('media.max_image_pixels', 60_000_000));
        $memoryLimit = ini_get('memory_limit');

        if (! $memoryLimit || $memoryLimit === '-1') {
            return $configuredLimit;
        }

        $unit = strtolower(substr($memoryLimit, -1));
        $bytes = (int) $memoryLimit;
        $bytes *= match ($unit) {
            'g' => 1024 ** 3,
            'm' => 1024 ** 2,
            'k' => 1024,
            default => 1,
        };

        // GD can require several bytes per source pixel plus encoded input and
        // framework overhead. Keep a 24 MB reserve and estimate 8 bytes/pixel.
        $available = max(0, $bytes - memory_get_usage(true) - (24 * 1024 * 1024));
        $runtimeLimit = max(1, (int) floor($available / 8));

        return min($configuredLimit, $runtimeLimit);
    }

    private function variantPath(string $originalPath, string $variant): string
    {
        $directory = trim(dirname($originalPath), '.');
        $baseName = pathinfo($originalPath, PATHINFO_FILENAME);
        $fileName = str_replace('_', '-', $variant).'.webp';

        if ($baseName !== 'original') {
            $fileName = $baseName.'--'.$fileName;
        }

        return ($directory ? $directory.'/' : '').$fileName;
    }

    private function withMediaLock(int $mediaFileId, callable $callback): void
    {
        Cache::lock(self::lockName($mediaFileId), 120)->block(15, $callback);
    }
}
