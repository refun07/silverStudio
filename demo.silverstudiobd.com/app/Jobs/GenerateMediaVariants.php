<?php

namespace App\Jobs;

use App\Models\MediaFile;
use App\Services\MediaImageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class GenerateMediaVariants implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 75;

    public int $uniqueFor = 3600;

    public function __construct(
        public int $mediaFileId,
        public array $variants,
    ) {
        $this->onConnection(config('media.queue_connection', 'database'));
        $this->onQueue('media');
    }

    public function uniqueId(): string
    {
        $variants = $this->variants;
        sort($variants);

        return $this->mediaFileId.':'.implode(',', $variants);
    }

    public function backoff(): array
    {
        return [10, 60, 180];
    }

    public function handle(MediaImageService $imageService): void
    {
        $mediaFile = MediaFile::find($this->mediaFileId);

        if (! $mediaFile || $mediaFile->trashed()) {
            return;
        }

        $imageService->generateVariants($mediaFile, $this->variants);
    }

    public function failed(Throwable $exception): void
    {
        MediaFile::withTrashed()->whereKey($this->mediaFileId)->update([
            'processing_status' => 'failed',
            'processing_error' => mb_substr($exception->getMessage(), 0, 1000),
        ]);
    }
}
