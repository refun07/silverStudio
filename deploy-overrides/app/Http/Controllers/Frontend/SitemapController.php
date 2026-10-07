<?php

namespace App\Http\Controllers\Frontend;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class SitemapController extends Controller
{
    public function __invoke()
    {
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
            try {
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

                foreach ($query->select($columns)->orderBy('slug')->limit(50000)->get() as $row) {
                    $urls[] = [
                        'loc' => url($resource['path'].'/'.rawurlencode($row->slug)),
                        'lastmod' => isset($row->updated_at) && $row->updated_at
                            ? date('c', strtotime($row->updated_at))
                            : null,
                        'changefreq' => $resource['frequency'],
                        'priority' => $resource['priority'],
                    ];
                }
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach ($urls as $url) {
            $xml .= "  <url>\n";
            $xml .= '    <loc>'.htmlspecialchars($url['loc'], ENT_XML1, 'UTF-8')."</loc>\n";
            if ($url['lastmod']) {
                $xml .= '    <lastmod>'.htmlspecialchars($url['lastmod'], ENT_XML1, 'UTF-8')."</lastmod>\n";
            }
            $xml .= '    <changefreq>'.$url['changefreq']."</changefreq>\n";
            $xml .= '    <priority>'.$url['priority']."</priority>\n";
            $xml .= "  </url>\n";
        }

        $xml .= '</urlset>';

        return response($xml, 200)->header('Content-Type', 'application/xml; charset=UTF-8');
    }
}
