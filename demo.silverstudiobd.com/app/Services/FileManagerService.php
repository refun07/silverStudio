<?php

namespace App\Services;

use App\Models\MediaFile;
use App\Models\User;
use File;
use Http;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Storage;

class FileManagerService
{
    // add new data
    public static function upload($request)
    {
        $user = self::authorizeCurrentUser();

        $data = [
            'status' => 200,
            'message' => '',
            'result' => [],
        ];

        try {
            if ($request->hasFile('media_file')) {
                $mediaFile = self::ingestUploadedFile(
                    $request->file('media_file'),
                    (int) $user->id,
                    (string) $request->input('usage', 'generic'),
                );

                $data = [
                    'status' => 200,
                    'message' => '',
                    'result' => $mediaFile->fresh(),
                ];
            } else {
                $data = [
                    'status' => 200,
                    'message' => '',
                    'result' => null,
                ];
            }

            return $data;
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (\Throwable $th) {
            Log::error('Media upload failed', ['error' => $th->getMessage()]);

            $data = [
                'status' => 403,
                'message' => translate('Something went wrong'),
                'result' => [],
            ];

            return $data;
        }
    }

    public static function ingestUploadedFile(
        UploadedFile $uploadedFile,
        int $userId,
        string $usage = 'generic',
        string $validationKey = 'media_file',
    ): MediaFile {
        $disk = config('media.disk', config('filesystems.default', 'local'));
        $storedPath = null;
        $mediaFile = null;

        try {
            if (! $uploadedFile->isValid()) {
                throw ValidationException::withMessages([
                    $validationKey => __('The file could not be uploaded.'),
                ]);
            }

            $maxBytes = max(1, (int) config('media.max_upload_kilobytes', 20 * 1024)) * 1024;
            if ((int) $uploadedFile->getSize() > $maxBytes) {
                throw ValidationException::withMessages([
                    $validationKey => __('The uploaded file is too large.'),
                ]);
            }

            $types = self::supportedTypes();
            $extension = strtolower($uploadedFile->getClientOriginalExtension() ?: $uploadedFile->extension() ?: 'bin');
            $detectedMimeType = strtolower((string) ($uploadedFile->getMimeType() ?: 'application/octet-stream'));
            $usage = in_array($usage, MediaImageService::USAGES, true) ? $usage : 'generic';

            if (! isset($types[$extension])) {
                throw ValidationException::withMessages([
                    $validationKey => __('This file type is not supported.'),
                ]);
            }

            if (! self::mimeMatchesType($detectedMimeType, $types[$extension], $extension)) {
                throw ValidationException::withMessages([
                    $validationKey => __('The file content does not match its extension.'),
                ]);
            }

            if (in_array($usage, ['product', 'banner'], true) && $types[$extension] !== 'image') {
                throw ValidationException::withMessages([
                    $validationKey => __('Only images can be used as product or banner media.'),
                ]);
            }

            if (in_array($extension, ['heic', 'heif'], true) && ! app(MediaImageService::class)->supportsHeic()) {
                throw ValidationException::withMessages([
                    $validationKey => __('HEIC images require ImageMagick with HEIC support on the server.'),
                ]);
            }

            $directory = 'uploads/media/'.Str::uuid();
            $storedPath = $uploadedFile->storeAs($directory, 'original.'.$extension, $disk);

            if (! $storedPath) {
                throw new \RuntimeException('Unable to store uploaded media.');
            }

            $mediaFile = new MediaFile;
            $mediaFile->media_name = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
            $mediaFile->media_file = $storedPath;
            $mediaFile->original_path = $storedPath;
            $mediaFile->disk = $disk;
            $mediaFile->user_id = $userId;
            $mediaFile->media_extension = $extension;
            $mediaFile->original_extension = $extension;
            $mediaFile->mime_type = $detectedMimeType;
            $mediaFile->media_type = $types[$extension];
            $mediaFile->media_size = $uploadedFile->getSize();
            $mediaFile->processing_status = $mediaFile->media_type === 'image' ? 'processing' : 'ready';
            $mediaFile->save();

            $imageService = app(MediaImageService::class);
            $imageService->initialize($mediaFile);
            $mediaFile->refresh();

            try {
                $imageService->prepareUsage($mediaFile, $usage);
            } catch (\Throwable $exception) {
                Log::warning('Media variants were skipped after upload', [
                    'media_file_id' => $mediaFile->id,
                    'error' => $exception->getMessage(),
                ]);
            }

            return $mediaFile->fresh();
        } catch (\Throwable $exception) {
            self::cleanupFailedIngestion($mediaFile, $storedPath, $disk);

            throw $exception;
        }
    }

    // get uploaded files
    public static function getUploadedFiles($request)
    {
        $data = [
            'status' => 200,
            'message' => '',
            'result' => [],
        ];

        $mediaFiles = self::queryForCurrentUser();
        if ($request->search != null) {
            $mediaFiles->where('media_name', 'like', '%'.$request->search.'%');
        }
        if ($request->type && $request->type !== 'all') {
            $mediaFiles->where('media_type', $request->type);
        }
        if ($request->sort != null) {
            switch ($request->sort) {
                case 'newest':
                    $mediaFiles->orderBy('created_at', 'desc');
                    break;
                case 'oldest':
                    $mediaFiles->orderBy('created_at', 'asc');
                    break;
                case 'smallest':
                    $mediaFiles->orderBy('media_size', 'asc');
                    break;
                case 'largest':
                    $mediaFiles->orderBy('media_size', 'desc');
                    break;
                default:
                    // code...
                    break;
            }
        }

        $data = [
            'status' => 200,
            'message' => '',
            'result' => $mediaFiles->paginate(max(1, min((int) $request->limit ?: 44, 100)))->appends(request()->query()),
        ];

        return $data;
    }

    public static function deleteMediaFile(MediaFile $mediaFile): void
    {
        Cache::lock(MediaImageService::lockName($mediaFile->id), 120)->block(15, function () use ($mediaFile): void {
            $activeMediaFile = MediaFile::find($mediaFile->id);
            if (! $activeMediaFile) {
                return;
            }

            try {
                app(MediaImageService::class)->deleteFiles($activeMediaFile->loadMissing('variants'));
            } catch (\Throwable $exception) {
                Log::warning('Media cleanup failed; database record retained', [
                    'media_file_id' => $activeMediaFile->id,
                    'error' => $exception->getMessage(),
                ]);

                throw $exception;
            }

            $activeMediaFile->delete();
        });
    }

    // delete files
    public static function destroy($request, $id)
    {
        $data = [
            'status' => 200,
            'message' => '',
            'result' => [],
        ];

        $ids = collect(explode(',', (string) $id))
            ->map(fn ($mediaId) => (int) trim($mediaId))
            ->filter()
            ->unique()
            ->values();
        $mediaFiles = self::queryForCurrentUser()->whereKey($ids)->get();

        if ($mediaFiles->count() !== $ids->count()) {
            abort(403, translate("You don't have permission for deleting this!"));
        }

        $blockedReferences = [];
        foreach ($mediaFiles as $mediaFile) {
            $references = app(MediaReferenceService::class)->referencesFor($mediaFile);
            if ($references !== []) {
                $blockedReferences[$mediaFile->media_name ?: $mediaFile->id] = $references;
            }
        }

        if ($blockedReferences !== []) {
            $details = collect($blockedReferences)
                ->map(fn (array $references, $name) => $name.' ('.implode(', ', $references).')')
                ->implode('; ');

            throw ValidationException::withMessages([
                'media_file' => __('One or more files are currently in use: ').$details.'.',
            ]);
        }

        try {
            foreach ($mediaFiles as $mediaFile) {
                self::deleteMediaFile($mediaFile);
            }
        } catch (\Throwable $exception) {
            throw ValidationException::withMessages([
                'media_file' => __('The file could not be deleted from storage. Please try again.'),
            ]);
        }

        $data = [
            'status' => 200,
            'message' => translate('File deleted successfully'),
            'result' => FileManagerService::getUploadedFiles($request),
        ];

        return $data;
    }

    public static function prepareUsage(array $ids, string $usage): void
    {
        app(MediaImageService::class)->prepareIds($ids, $usage);
    }

    public static function queryForCurrentUser()
    {
        $user = self::authorizeCurrentUser();

        if ($user->user_type === 'admin' || $user->user_type === 'staff') {
            $userIds = User::where('shop_id', $user->shop_id)->pluck('id');

            return MediaFile::whereIn('user_id', $userIds);
        }

        return MediaFile::where('user_id', $user->id);
    }

    public static function authorizeCurrentUser()
    {
        $user = user();

        if (! $user || ! in_array($user->user_type, ['admin', 'staff', 'seller'], true)) {
            abort(403);
        }

        if (in_array($user->user_type, ['admin', 'staff'], true) && ! $user->can('file_manager')) {
            abort(403);
        }

        return $user;
    }

    private static function supportedTypes(): array
    {
        return [
            'jpg' => 'image',
            'jpeg' => 'image',
            'png' => 'image',
            'webp' => 'image',
            'gif' => 'image',
            'heic' => 'image',
            'heif' => 'image',
            'mp4' => 'video',
            'mpg' => 'video',
            'mpeg' => 'video',
            'webm' => 'video',
            'ogg' => 'video',
            'avi' => 'video',
            'mov' => 'video',
            'flv' => 'video',
            'swf' => 'video',
            'mkv' => 'video',
            'wmv' => 'video',
            'wma' => 'audio',
            'aac' => 'audio',
            'wav' => 'audio',
            'mp3' => 'audio',
            'zip' => 'archive',
            'rar' => 'archive',
            '7z' => 'archive',
            'doc' => 'document',
            'txt' => 'document',
            'docx' => 'document',
            'pdf' => 'document',
            'csv' => 'document',
            'xml' => 'document',
            'ods' => 'document',
            'xlr' => 'document',
            'xls' => 'document',
            'xlsx' => 'document',
        ];
    }

    private static function cleanupFailedIngestion(?MediaFile $mediaFile, ?string $storedPath, string $disk): void
    {
        if ($mediaFile?->exists) {
            try {
                app(MediaImageService::class)->deleteFiles($mediaFile->loadMissing('variants'));
            } catch (\Throwable $cleanupException) {
                Log::warning('Failed to clean generated media after upload error', [
                    'media_file_id' => $mediaFile->id,
                    'error' => $cleanupException->getMessage(),
                ]);

                $mediaFile->forceFill([
                    'processing_status' => 'failed',
                    'processing_error' => mb_substr($cleanupException->getMessage(), 0, 1000),
                ])->save();

                return;
            }

            $mediaFile->forceDelete();

            return;
        }

        if ($storedPath) {
            try {
                if (! Storage::disk($disk)->delete($storedPath)) {
                    throw new \RuntimeException("Unable to delete failed media upload from disk [{$disk}].");
                }
            } catch (\Throwable $cleanupException) {
                Log::warning('Failed to remove original media after upload error', [
                    'path' => $storedPath,
                    'disk' => $disk,
                    'error' => $cleanupException->getMessage(),
                ]);
            }
        }
    }

    private static function mimeMatchesType(string $mimeType, string $mediaType, string $extension): bool
    {
        if ($mimeType === 'application/octet-stream') {
            return true;
        }

        return match ($mediaType) {
            'image' => str_starts_with($mimeType, 'image/'),
            'video' => str_starts_with($mimeType, 'video/')
                || ($extension === 'swf' && $mimeType === 'application/x-shockwave-flash'),
            'audio' => str_starts_with($mimeType, 'audio/')
                || in_array($mimeType, ['video/x-ms-asf', 'application/vnd.ms-asf'], true),
            'archive' => str_contains($mimeType, 'zip')
                || str_contains($mimeType, 'rar')
                || str_contains($mimeType, '7z'),
            'document' => str_starts_with($mimeType, 'text/')
                || str_contains($mimeType, 'pdf')
                || str_contains($mimeType, 'word')
                || str_contains($mimeType, 'excel')
                || str_contains($mimeType, 'spreadsheet')
                || str_contains($mimeType, 'opendocument')
                || str_contains($mimeType, 'officedocument')
                || str_contains($mimeType, 'xml')
                || str_contains($mimeType, 'zip'),
            default => false,
        };
    }

    // remove background
    public static function backgroundRemove($request, $id)
    {
        $data = [
            'status' => 200,
            'message' => '',
            'result' => [],
        ];

        $mediaFile = self::queryForCurrentUser()->findOrFail($id);

        if ($mediaFile->media_type == 'image') {
            $disk = $mediaFile->storageDisk();
            $sourcePath = $mediaFile->original_path ?: $mediaFile->media_file;
            $temporaryPath = tempnam(sys_get_temp_dir(), 'media-bg-');

            try {
                $response = Http::timeout(300)
                    ->sink($temporaryPath)
                    ->withHeaders([
                        'X-Api-Key' => 'token1',
                    ])
                    ->attach(
                        'image_file',
                        Storage::disk($disk)->get($sourcePath),
                        $mediaFile->media_name.'.'.($mediaFile->original_extension ?: $mediaFile->media_extension)
                    )->post('https://bg-remover.epikcoders.com/api/removebg');

                if (! $response->successful()) {
                    throw new \RuntimeException('Background removal failed.');
                }

                $newPath = 'uploads/media/'.Str::uuid().'/original.png';
                Storage::disk($disk)->put($newPath, File::get($temporaryPath));

                $newMediaFile = $mediaFile->replicate();
                $newMediaFile->media_file = $newPath;
                $newMediaFile->original_path = $newPath;
                $newMediaFile->preview_path = null;
                $newMediaFile->disk = $disk;
                $newMediaFile->media_extension = 'png';
                $newMediaFile->original_extension = 'png';
                $newMediaFile->mime_type = 'image/png';
                $newMediaFile->width = null;
                $newMediaFile->height = null;
                $newMediaFile->checksum = null;
                $newMediaFile->processing_status = 'processing';
                $newMediaFile->processing_error = null;
                $newMediaFile->media_name = $mediaFile->media_name.'-transparent';
                $newMediaFile->media_size = Storage::disk($disk)->size($newPath);
                $newMediaFile->save();

                app(MediaImageService::class)->initialize($newMediaFile);
            } finally {
                if ($temporaryPath && file_exists($temporaryPath)) {
                    @unlink($temporaryPath);
                }
            }
        }

        $data = [
            'status' => 200,
            'message' => translate('Background removed successfully'),
            'result' => FileManagerService::getUploadedFiles($request),
        ];

        return $data;
    }

    // alt text
    public static function altText($request, $id)
    {
        $data = [
            'status' => 200,
            'message' => '',
            'result' => [],
        ];

        $mediaFile = self::queryForCurrentUser()->findOrFail($id);
        if ($mediaFile->media_type == 'image') {
            $mediaFile->alt_text = $request->alt_text;
            $mediaFile->save();
        }

        $data = [
            'status' => 200,
            'message' => translate('Alternative text updated successfully'),
            'result' => FileManagerService::getUploadedFiles($request),
        ];

        return $data;
    }
}
