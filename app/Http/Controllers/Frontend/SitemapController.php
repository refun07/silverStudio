<?php

namespace App\Http\Controllers\Frontend;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SitemapController extends Controller
{
    public function __invoke()
    {
        $urls = Cache::remember('seo.sitemap.urls', now()->addHour(), function () {
            $urls = [[
                'loc' => url('/'),
                'lastmod' => null,
                'changefreq' => 'daily',
                'priority' => '1.0',
            ]];

            $resources = [
                ['table' => 'products', 'path' => 'products', 'frequency' => 'daily', 'priority' => '0.9'],
                ['table' => 'categories', 'path' => 'categories', 'frequency' => 'weekly', 'priority' => '0.8'],
                ['table' => 'brands', 'path' => 'brands', 'frequency' => 'weekly', 'priority' => '0.7'],
                ['table' => 'shops', 'path' => 'shops', 'frequency' => 'weekly', 'priority' => '0.7'],
                ['table' => 'pages', 'path' => 'pages', 'frequency' => 'monthly', 'priority' => '0.6'],
                ['table' => 'blogs', 'path' => 'blogs', 'frequency' => 'weekly', 'priority' => '0.6'],
            ];

            foreach ($resources as $resource) {
                if (!Schema::hasTable($resource['table']) || !Schema::hasColumn($resource['table'], 'slug')) {
                    continue;
                }

                $query = DB::table($resource['table'])->whereNotNull('slug')->where('slug', '<>', '');

                if (Schema::hasColumn($resource['table'], 'deleted_at')) {
                    $query->whereNull('deleted_at');
                }
                if (Schema::hasColumn($resource['table'], 'is_active')) {
                    $query->where('is_active', 1);
                }
                if (Schema::hasColumn($resource['table'], 'is_published')) {
                    $query->where('is_published', 1);
                }
                if (Schema::hasColumn($resource['table'], 'published')) {
                    $query->where('published', 1);
                }

                $columns = ['slug'];
                if (Schema::hasColumn($resource['table'], 'updated_at')) {
                    $columns[] = 'updated_at';
                }

                $query->select($columns)->orderBy('slug')->chunk(1000, function ($rows) use (&$urls, $resource) {
                    foreach ($rows as $row) {
                        $urls[] = [
                            'loc' => url($resource['path'].'/'.rawurlencode($row->slug)),
                            'lastmod' => isset($row->updated_at) && $row->updated_at
                                ? date('c', strtotime($row->updated_at))
                                : null,
                            'changefreq' => $resource['frequency'],
                            'priority' => $resource['priority'],
                        ];
                    }
                });
            }

            return $urls;
        });

        return response()
            ->view('frontend.sitemap', compact('urls'))
            ->header('Content-Type', 'application/xml; charset=UTF-8');
    }
}
