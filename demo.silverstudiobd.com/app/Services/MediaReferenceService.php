<?php

namespace App\Services;

use App\Models\MediaFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MediaReferenceService
{
    private array $references = [
        'products' => ['thumbnail_image', 'gallery_images', 'meta_image', 'chart_image', 'recipe_image'],
        'product_variations' => ['image'],
        'product_variation_combinations' => ['image'],
        'product_reviews' => ['images'],
        'return_request_items' => ['media_path'],
        'exchange_items' => ['media_path'],
        'categories' => ['thumbnail_image', 'meta_image'],
        'category_translations' => ['thumbnail_image', 'meta_image'],
        'brands' => ['thumbnail_image', 'meta_image'],
        'brand_translations' => ['thumbnail_image', 'meta_image'],
        'campaigns' => ['thumbnail_image', 'banner'],
        'coupons' => ['banner'],
        'blogs' => ['thumbnail_image', 'banner', 'meta_image'],
        'warehouses' => ['thumbnail_image'],
        'zones' => ['banner'],
        'pages' => ['meta_image'],
        'users' => ['avatar'],
        'shops' => ['logo', 'banner', 'meta_image'],
    ];

    public function referencesFor(MediaFile $mediaFile): array
    {
        $found = [];

        foreach ($this->references as $table => $columns) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            foreach ($columns as $column) {
                if ($this->columnContainsMediaId($table, $column, $mediaFile->id)) {
                    $found[] = $table;
                    break;
                }
            }
        }

        if ($this->jsonColumnContainsMediaId('shop_sections', 'section_values', $mediaFile->id)) {
            $found[] = 'shop sections';
        }

        if ($this->jsonColumnContainsMediaId('system_settings', 'value', $mediaFile->id)) {
            $found[] = 'site settings';
        }

        $path = $mediaFile->original_path ?: $mediaFile->media_file;
        if ($path && $this->jsonColumnContains('website_landing_sections', 'section_data', ltrim($path, '/'))) {
            $found[] = 'landing pages';
        }

        if ($this->jsonColumnContainsMediaId('website_landings', 'seo_data', $mediaFile->id)
            || ($path && $this->jsonColumnContains('website_landings', 'seo_data', ltrim($path, '/')))) {
            $found[] = 'landing page SEO';
        }

        return array_values(array_unique($found));
    }

    private function columnContainsMediaId(string $table, string $column, int $mediaId): bool
    {
        if (! Schema::hasColumn($table, $column)) {
            return false;
        }

        $id = (string) $mediaId;
        $query = DB::table($table)->where(function ($query) use ($column, $id): void {
            $query->where($column, $id)
                ->orWhere($column, 'like', $id.',%')
                ->orWhere($column, 'like', '%,'.$id)
                ->orWhere($column, 'like', '%,'.$id.',%');
        });

        if (Schema::hasColumn($table, 'deleted_at')) {
            $query->whereNull('deleted_at');
        }

        return $query->exists();
    }

    private function jsonColumnContains(string $table, string $column, string $needle): bool
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
            return false;
        }

        $query = DB::table($table)->where($column, 'like', '%'.$this->escapeLike($needle).'%');
        if (Schema::hasColumn($table, 'deleted_at')) {
            $query->whereNull('deleted_at');
        }

        return $query->exists();
    }

    private function jsonColumnContainsMediaId(string $table, string $column, int $mediaId): bool
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
            return false;
        }

        $id = (string) $mediaId;
        $query = DB::table($table)->where(function ($query) use ($column, $id): void {
            $query->where($column, $id)
                ->orWhere($column, 'like', '%"'.$id.'"%')
                ->orWhere($column, 'like', '%"'.$id.',%')
                ->orWhere($column, 'like', '%,'.$id.'"%')
                ->orWhere($column, 'like', '%,'.$id.',%')
                ->orWhere($column, 'like', '%:'.$id.',%')
                ->orWhere($column, 'like', '%:'.$id.'}%');
        });

        if (Schema::hasColumn($table, 'deleted_at')) {
            $query->whereNull('deleted_at');
        }

        return $query->exists();
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
