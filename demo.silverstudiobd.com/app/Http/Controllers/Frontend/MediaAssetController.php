<?php

namespace App\Http\Controllers\Frontend;

use App\Http\Controllers\Controller;
use App\Models\MediaFile;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaAssetController extends Controller
{
    public function show(MediaFile $mediaFile, string $variant): StreamedResponse|Response
    {
        $path = match ($variant) {
            'original' => $mediaFile->original_path ?: $mediaFile->media_file,
            'preview' => $mediaFile->preview_path ?: $mediaFile->original_path ?: $mediaFile->media_file,
            default => $mediaFile->variants()
                ->where('variant', $variant)
                ->where('status', 'ready')
                ->value('path'),
        };

        abort_unless($path && $mediaFile->isManagedUploadPath($path), 404);

        $disk = $mediaFile->storageDisk();
        abort_unless(Storage::disk($disk)->exists($path), 404);

        return Storage::disk($disk)->response($path, null, [
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
