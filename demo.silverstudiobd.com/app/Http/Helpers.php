<?php

use App\Models\AgentCommissionHistory;
use App\Models\CommissionHistory;
use App\Models\FeatureFlag;
use App\Models\MediaFile;
use App\Models\OrderProfitLog;
use App\Models\SystemSetting;
use App\Models\Translation;
use App\Models\Variation;
use App\Models\VariationValue;
use Illuminate\Support\Facades\Schema;

// apiUserId
if (! function_exists('apiUserId')) {
    function apiUserId()
    {
        return auth('sanctum')->user()->id;
    }
}
if (! function_exists('extractTrackingNumber')) {
    function extractTrackingNumber(string $partner, array $response): ?string
    {
        return match ($partner) {
            'pathao' => $response['data']['consignment_id'] ?? null,
            'redx' => $response['tracking_id'] ?? null,
            'steadfast' => $response['consignment']['tracking_code'] ?? null,
            default => null,
        };
    }
}
if (! function_exists('extractDeliveryStatus')) {
    function extractDeliveryStatus(string $partner, array $response): ?string
    {
        return match ($partner) {
            'pathao' => $response['data']['order_status'] ?? null,
            'redx' => 'pickup-pending',
            'steadfast' => $response['consignment']['status'] ?? null,
            default => null,
        };
    }
}

// apiUser
if (! function_exists('apiUser')) {
    function apiUser()
    {
        return auth('sanctum')->user();
    }
}

// userId
if (! function_exists('userId')) {
    function userId()
    {
        return auth()->user()->id;
    }
}
// user
if (! function_exists('user')) {
    function user()
    {
        return auth()->user();
    }
}

// getClientIp - Get client IP address (supports proxies, CloudFlare, etc.)
if (! function_exists('getClientIp')) {
    function getClientIp()
    {
        $request = request();

        // Check for forwarded IP (when behind load balancer/proxy)
        $ip = $request->header('X-Forwarded-For');
        if ($ip) {
            // X-Forwarded-For can contain multiple IPs, get the first one
            $ips = explode(',', $ip);
            $ip = trim($ips[0]);
        }

        // Check for CloudFlare
        if (! $ip) {
            $ip = $request->header('CF-Connecting-IP');
        }

        // Check for other common headers
        if (! $ip) {
            $ip = $request->header('X-Real-IP');
        }

        // Fall back to Laravel's default method
        if (! $ip) {
            $ip = $request->ip();
        }

        // Validate IP address
        if ($ip && ! filter_var($ip, FILTER_VALIDATE_IP)) {
            $ip = null;
        }

        return $ip;
    }
}

// shopId
if (! function_exists('shopId')) {
    function shopId()
    {
        return auth()->user()->shop_id;
    }
}

// shop
if (! function_exists('shop')) {
    function shop()
    {
        return auth()->user()->shop;
    }
}

// adminShopId
if (! function_exists('adminShopId')) {
    function adminShopId()
    {
        return 1;
    }
}

// routePrefix
if (! function_exists('routePrefix')) {
    function routePrefix()
    {
        $routePrefix = 'admin';
        if (auth()->check() && user()->user_type == 'seller') {
            $routePrefix = 'seller';
        }

        return $routePrefix;
    }
}

// adminApiUrl
if (! function_exists('adminApiUrl')) {
    function adminApiUrl()
    {
        $apiUrl = config('app.url').'/admin/api';

        // $apiUrl = 'https://4e45-103-176-19-44.ngrok-free.app/armtech/multivendor-ecommerce/admin/api';
        return $apiUrl;
    }
}

// sellerApiUrl
if (! function_exists('sellerApiUrl')) {
    function sellerApiUrl()
    {
        $apiUrl = config('app.url').'/seller/api';

        // $apiUrl = 'https://4e45-103-176-19-44.ngrok-free.app/armtech/multivendor-ecommerce/admin/api';
        return $apiUrl;
    }
}

// useInventory
if (! function_exists('useInventory')) {
    function useInventory()
    {
        return shop()->manage_stock_by == 'default' ? false : true; // or inventory
    }
}

// clear server cache
if (! function_exists('cacheClear')) {
    function cacheClear()
    {
        try {
            Artisan::call('cache:forget spatie.permission.cache');
        } catch (Throwable $th) {
            // throw $th;
        }

        Artisan::call('cache:clear');
        Artisan::call('view:clear');
        Artisan::call('config:clear');
    }
}

// get specific setting value
if (! function_exists('getSetting')) {
    function getSetting($key, $default = null, $lang = false)
    {
        $settings = Cache::remember('settings', 86400, function () {
            return SystemSetting::all();
        });

        if ($lang == false) {
            $setting = $settings->where('type', $key)->first();
        } else {
            $setting = $settings->where('type', $key)->where('lang', $lang)->first();
            $setting = ! $setting ? $settings->where('type', $key)->first() : $setting;
        }

        return $setting == null ? $default : $setting->value;
    }
}

// overwrite env file
if (! function_exists('overWriteEnvFile')) {
    function overWriteEnvFile($type, $val)
    {
        $path = base_path('.env');
        if (file_exists($path)) {
            $envContent = file_get_contents($path);
            $trimmedVal = trim($val);

            if (! preg_match('/^".*"$/', $trimmedVal) && (
                strpos($trimmedVal, ' ') !== false ||
                strpos($trimmedVal, '$') !== false ||
                strpos($trimmedVal, '#') !== false ||
                strpos($trimmedVal, ',') !== false ||
                strpos($trimmedVal, "'") !== false
            )) {
                $trimmedVal = '"'.$trimmedVal.'"';
            }

            if (strpos($envContent, $type) !== false) {
                $pattern = '/^'.preg_quote($type, '/').'=.*$/m';
                $replacement = $type.'='.$trimmedVal;
                $envContent = preg_replace($pattern, $replacement, $envContent);
            } else {
                $envContent .= "\n".$type.'='.$trimmedVal."\n";
            }

            file_put_contents($path, $envContent);
        }
    }
}

// file delete
if (! function_exists('file_delete')) {
    function file_delete($file)
    {
        if (File::exists('public/'.$file)) {
            File::delete('public/'.$file);
        }
    }
}

// per page pagination
if (! function_exists('perPage')) {
    function perPage($limit = 15)
    {
        return $limit;
    }
}

// Generate an asset path for the application.
if (! function_exists('staticAsset')) {
    function staticAsset($path, $secure = null)
    {
        return app('url')->asset($path, $secure);
    }
}

// highlights the selected navigation on admin panel
if (! function_exists('areActiveRoutes')) {
    function areActiveRoutes(array $routes, $output = 'active')
    {
        foreach ($routes as $route) {
            if (str_contains($route, '.*')) {
                if (str_contains(Route::currentRouteName(), str_replace('.*', '', $route))) {
                    return $output;
                }
            } else {
                if (Route::currentRouteName() == $route) {
                    return $output;
                }
            }
        }
    }
}

// timezones
function timezones()
{
    return [
        '(GMT-12:00) International Date Line West' => 'Pacific/Kwajalein',
        '(GMT-11:00) Midway Island' => 'Pacific/Midway',
        '(GMT-11:00) Samoa' => 'Pacific/Apia',
        '(GMT-10:00) Hawaii' => 'Pacific/Honolulu',
        '(GMT-09:00) Alaska' => 'America/Anchorage',
        '(GMT-08:00) Pacific Time (US & Canada)' => 'America/Los_Angeles',
        '(GMT-08:00) Tijuana' => 'America/Tijuana',
        '(GMT-07:00) Arizona' => 'America/Phoenix',
        '(GMT-07:00) Mountain Time (US & Canada)' => 'America/Denver',
        '(GMT-07:00) Chihuahua' => 'America/Chihuahua',
        '(GMT-07:00) La Paz' => 'America/Chihuahua',
        '(GMT-07:00) Mazatlan' => 'America/Mazatlan',
        '(GMT-06:00) Central Time (US & Canada)' => 'America/Chicago',
        '(GMT-06:00) Central America' => 'America/Managua',
        '(GMT-06:00) Guadalajara' => 'America/Mexico_City',
        '(GMT-06:00) Mexico City' => 'America/Mexico_City',
        '(GMT-06:00) Monterrey' => 'America/Monterrey',
        '(GMT-06:00) Saskatchewan' => 'America/Regina',
        '(GMT-05:00) Eastern Time (US & Canada)' => 'America/New_York',
        '(GMT-05:00) Indiana (East)' => 'America/Indiana/Indianapolis',
        '(GMT-05:00) Bogota' => 'America/Bogota',
        '(GMT-05:00) Lima' => 'America/Lima',
        '(GMT-05:00) Quito' => 'America/Bogota',
        '(GMT-04:00) Atlantic Time (Canada)' => 'America/Halifax',
        '(GMT-04:00) Caracas' => 'America/Caracas',
        '(GMT-04:00) La Paz' => 'America/La_Paz',
        '(GMT-04:00) Santiago' => 'America/Santiago',
        '(GMT-03:30) Newfoundland' => 'America/St_Johns',
        '(GMT-03:00) Brasilia' => 'America/Sao_Paulo',
        '(GMT-03:00) Buenos Aires' => 'America/Argentina/Buenos_Aires',
        '(GMT-03:00) Georgetown' => 'America/Argentina/Buenos_Aires',
        '(GMT-03:00) Greenland' => 'America/Godthab',
        '(GMT-02:00) Mid-Atlantic' => 'America/Noronha',
        '(GMT-01:00) Azores' => 'Atlantic/Azores',
        '(GMT-01:00) Cape Verde Is.' => 'Atlantic/Cape_Verde',
        '(GMT) Casablanca' => 'Africa/Casablanca',
        '(GMT) Dublin' => 'Europe/London',
        '(GMT) Edinburgh' => 'Europe/London',
        '(GMT) Lisbon' => 'Europe/Lisbon',
        '(GMT) London' => 'Europe/London',
        '(GMT) UTC' => 'UTC',
        '(GMT) Monrovia' => 'Africa/Monrovia',
        '(GMT+01:00) Amsterdam' => 'Europe/Amsterdam',
        '(GMT+01:00) Belgrade' => 'Europe/Belgrade',
        '(GMT+01:00) Berlin' => 'Europe/Berlin',
        '(GMT+01:00) Bern' => 'Europe/Berlin',
        '(GMT+01:00) Bratislava' => 'Europe/Bratislava',
        '(GMT+01:00) Brussels' => 'Europe/Brussels',
        '(GMT+01:00) Budapest' => 'Europe/Budapest',
        '(GMT+01:00) Copenhagen' => 'Europe/Copenhagen',
        '(GMT+01:00) Ljubljana' => 'Europe/Ljubljana',
        '(GMT+01:00) Madrid' => 'Europe/Madrid',
        '(GMT+01:00) Paris' => 'Europe/Paris',
        '(GMT+01:00) Prague' => 'Europe/Prague',
        '(GMT+01:00) Rome' => 'Europe/Rome',
        '(GMT+01:00) Sarajevo' => 'Europe/Sarajevo',
        '(GMT+01:00) Skopje' => 'Europe/Skopje',
        '(GMT+01:00) Stockholm' => 'Europe/Stockholm',
        '(GMT+01:00) Vienna' => 'Europe/Vienna',
        '(GMT+01:00) Warsaw' => 'Europe/Warsaw',
        '(GMT+01:00) West Central Africa' => 'Africa/Lagos',
        '(GMT+01:00) Zagreb' => 'Europe/Zagreb',
        '(GMT+02:00) Athens' => 'Europe/Athens',
        '(GMT+02:00) Bucharest' => 'Europe/Bucharest',
        '(GMT+02:00) Cairo' => 'Africa/Cairo',
        '(GMT+02:00) Harare' => 'Africa/Harare',
        '(GMT+02:00) Helsinki' => 'Europe/Helsinki',
        '(GMT+02:00) Istanbul' => 'Europe/Istanbul',
        '(GMT+02:00) Jerusalem' => 'Asia/Jerusalem',
        '(GMT+02:00) Kyev' => 'Europe/Kiev',
        '(GMT+02:00) Minsk' => 'Europe/Minsk',
        '(GMT+02:00) Pretoria' => 'Africa/Johannesburg',
        '(GMT+02:00) Riga' => 'Europe/Riga',
        '(GMT+02:00) Sofia' => 'Europe/Sofia',
        '(GMT+02:00) Tallinn' => 'Europe/Tallinn',
        '(GMT+02:00) Vilnius' => 'Europe/Vilnius',
        '(GMT+03:00) Baghdad' => 'Asia/Baghdad',
        '(GMT+03:00) Kuwait' => 'Asia/Kuwait',
        '(GMT+03:00) Moscow' => 'Europe/Moscow',
        '(GMT+03:00) Nairobi' => 'Africa/Nairobi',
        '(GMT+03:00) Riyadh' => 'Asia/Riyadh',
        '(GMT+03:00) St. Petersburg' => 'Europe/Moscow',
        '(GMT+03:00) Volgograd' => 'Europe/Volgograd',
        '(GMT+03:30) Tehran' => 'Asia/Tehran',
        '(GMT+04:00) Abu Dhabi' => 'Asia/Muscat',
        '(GMT+04:00) Baku' => 'Asia/Baku',
        '(GMT+04:00) Muscat' => 'Asia/Muscat',
        '(GMT+04:00) Tbilisi' => 'Asia/Tbilisi',
        '(GMT+04:00) Yerevan' => 'Asia/Yerevan',
        '(GMT+04:30) Kabul' => 'Asia/Kabul',
        '(GMT+05:00) Ekaterinburg' => 'Asia/Yekaterinburg',
        '(GMT+05:00) Islamabad' => 'Asia/Karachi',
        '(GMT+05:00) Karachi' => 'Asia/Karachi',
        '(GMT+05:00) Tashkent' => 'Asia/Tashkent',
        '(GMT+05:30) Chennai' => 'Asia/Kolkata',
        '(GMT+05:30) Kolkata' => 'Asia/Kolkata',
        '(GMT+05:30) Mumbai' => 'Asia/Kolkata',
        '(GMT+05:30) New Delhi' => 'Asia/Kolkata',
        '(GMT+05:45) Kathmandu' => 'Asia/Kathmandu',
        '(GMT+06:00) Almaty' => 'Asia/Almaty',
        '(GMT+06:00) Astana' => 'Asia/Dhaka',
        '(GMT+06:00) Dhaka' => 'Asia/Dhaka',
        '(GMT+06:00) Novosibirsk' => 'Asia/Novosibirsk',
        '(GMT+06:00) Sri Jayawardenepura' => 'Asia/Colombo',
        '(GMT+06:30) Rangoon' => 'Asia/Rangoon',
        '(GMT+07:00) Bangkok' => 'Asia/Bangkok',
        '(GMT+07:00) Hanoi' => 'Asia/Bangkok',
        '(GMT+07:00) Jakarta' => 'Asia/Jakarta',
        '(GMT+07:00) Krasnoyarsk' => 'Asia/Krasnoyarsk',
        '(GMT+08:00) Beijing' => 'Asia/Hong_Kong',
        '(GMT+08:00) Chongqing' => 'Asia/Chongqing',
        '(GMT+08:00) Hong Kong' => 'Asia/Hong_Kong',
        '(GMT+08:00) Irkutsk' => 'Asia/Irkutsk',
        '(GMT+08:00) Kuala Lumpur' => 'Asia/Kuala_Lumpur',
        '(GMT+08:00) Perth' => 'Australia/Perth',
        '(GMT+08:00) Singapore' => 'Asia/Singapore',
        '(GMT+08:00) Taipei' => 'Asia/Taipei',
        '(GMT+08:00) Ulaan Bataar' => 'Asia/Irkutsk',
        '(GMT+08:00) Urumqi' => 'Asia/Urumqi',
        '(GMT+09:00) Osaka' => 'Asia/Tokyo',
        '(GMT+09:00) Sapporo' => 'Asia/Tokyo',
        '(GMT+09:00) Seoul' => 'Asia/Seoul',
        '(GMT+09:00) Tokyo' => 'Asia/Tokyo',
        '(GMT+09:00) Yakutsk' => 'Asia/Yakutsk',
        '(GMT+09:30) Adelaide' => 'Australia/Adelaide',
        '(GMT+09:30) Darwin' => 'Australia/Darwin',
        '(GMT+10:00) Brisbane' => 'Australia/Brisbane',
        '(GMT+10:00) Canberra' => 'Australia/Sydney',
        '(GMT+10:00) Guam' => 'Pacific/Guam',
        '(GMT+10:00) Hobart' => 'Australia/Hobart',
        '(GMT+10:00) Melbourne' => 'Australia/Melbourne',
        '(GMT+10:00) Port Moresby' => 'Pacific/Port_Moresby',
        '(GMT+10:00) Sydney' => 'Australia/Sydney',
        '(GMT+10:00) Vladivostok' => 'Asia/Vladivostok',
        '(GMT+11:00) Magadan' => 'Asia/Magadan',
        '(GMT+11:00) New Caledonia' => 'Asia/Magadan',
        '(GMT+11:00) Solomon Is.' => 'Asia/Magadan',
        '(GMT+12:00) Auckland' => 'Pacific/Auckland',
        '(GMT+12:00) Fiji' => 'Pacific/Fiji',
        '(GMT+12:00) Kamchatka' => 'Asia/Kamchatka',
        '(GMT+12:00) Marshall Is.' => 'Pacific/Fiji',
        '(GMT+12:00) Wellington' => 'Pacific/Auckland',
        '(GMT+13:00) Nuku\'alofa' => 'Pacific/Tongatapu',
    ];
}

// return application timezone
if (! function_exists('appTimezone')) {
    function appTimezone()
    {
        return config('app.timezone');
    }
}

// generate translation key from text
if (! function_exists('generateTranslationKey')) {
    function generateTranslationKey($text)
    {
        if (empty($text)) {
            return null;
        }

        // Convert to lowercase
        $key = strtolower($text);
        // Replace spaces with underscores
        $key = str_replace(' ', '_', $key);
        // Remove non-alphanumeric characters (except underscores)
        $key = preg_replace('/[^a-z0-9_]/', '', $key);

        // Return null if key is empty after sanitization
        return empty($key) ? null : $key;
    }
}

// add or return translation
if (! function_exists('translate')) {
    function translate($key, $lang = null)
    {
        if ($lang == null) {
            $lang = Session::get('locale', Config::get('app.locale'));
        }

        $t_key = preg_replace('/[^A-Za-z0-9\_]/', '', str_replace(' ', '_', strtolower($key)));

        $englishTranslation = Cache::rememberForever('translations-en-US', function () {
            return Translation::where('lang_key', 'en-US')->pluck('t_value', 't_key');
        });

        if (! isset($englishTranslation[$t_key])) {
            // add new translation
            $t_key ? newTranslation('en-US', $t_key, $key) : null;
        }

        // return user session lang
        $localTranslations = Cache::rememberForever("translations-{$lang}", function () use ($lang) {
            return Translation::where('lang_key', $lang)->pluck('t_value', 't_key')->toArray();
        });

        // dd($localTranslations);
        if (isset($localTranslations[$t_key])) {
            return trim($localTranslations[$t_key]);
        }

        return isset($englishTranslation[$t_key]) ? trim($englishTranslation[$t_key]) : $key;
    }
}

// new translation
if (! function_exists('newTranslation')) {
    function newTranslation($lang, $t_key, $key)
    {
        $translation = new Translation;
        $translation->lang_key = $lang;
        $translation->t_key = $t_key;
        $translation->t_value = str_replace(["\r", "\n", "\r\n"], '', $key);
        $translation->save();

        // clear cache
        Cache::forget('translations-en-US');
        Cache::forget('translations-'.$lang);

        return trim($key);
    }
}

//  Generate an asset path for the uploaded files.
if (! function_exists('uploadedAsset')) {
    function uploadedAsset($fileId, ?string $variant = null)
    {
        static $assetUrls = [];
        static $variantSchemaAvailable;
        static $variantVersions = [];

        if (! $fileId) {
            return '';
        }

        $requestedVariant = $variant ?: 'optimized';
        $cacheKey = $fileId.'|'.$requestedVariant;
        if (array_key_exists($cacheKey, $assetUrls)) {
            return $assetUrls[$cacheKey];
        }

        $variantSchemaAvailable ??= Schema::hasTable('media_variants')
            && Schema::hasColumns('media_variants', ['variant', 'status', 'path', 'disk']);

        if ($requestedVariant !== 'preview' && $variantSchemaAvailable) {
            $mediaFile = MediaFile::query()
                ->leftJoin('media_variants as requested_variant', function ($join) use ($requestedVariant) {
                    $join->on('requested_variant.media_file_id', '=', 'media_files.id')
                        ->where('requested_variant.variant', '=', $requestedVariant)
                        ->where('requested_variant.status', '=', 'ready');
                })
                ->where('media_files.id', $fileId)
                ->first([
                    'media_files.*',
                    'requested_variant.path as requested_variant_path',
                    'requested_variant.disk as requested_variant_disk',
                ]);
        } else {
            $mediaFile = MediaFile::find($fileId);
        }

        if (! $mediaFile) {
            return $assetUrls[$cacheKey] = '';
        }

        $versionedVariantUrl = static function (string $url, string $variant) use (&$variantVersions): string {
            $definition = config("media.variants.{$variant}");
            if ($url === '' || ! is_array($definition)) {
                return $url;
            }

            $variantVersions[$variant] ??= substr(hash('sha256', json_encode($definition)), 0, 12);

            return $url.(str_contains($url, '?') ? '&' : '?').'v='.$variantVersions[$variant];
        };

        if ($variant === 'preview') {
            return $assetUrls[$cacheKey] = $versionedVariantUrl($mediaFile->preview_url, 'preview');
        }

        if ($mediaFile->requested_variant_path) {
            $variantUrl = $mediaFile->isManagedUploadPath($mediaFile->requested_variant_path)
                ? route('media-assets.show', [
                    'mediaFile' => $mediaFile->getKey(),
                    'variant' => $requestedVariant,
                ])
                : $mediaFile->urlForPath(
                    $mediaFile->requested_variant_path,
                    $mediaFile->requested_variant_disk,
                );

            return $assetUrls[$cacheKey] = $versionedVariantUrl(
                $variantUrl,
                $requestedVariant,
            );
        }

        // Product listings and POS should never download a multi-megabyte
        // original while their optimized variant is still being generated.
        if (in_array($variant, ['product_grid', 'pos_thumbnail'], true) && $mediaFile->preview_path) {
            return $assetUrls[$cacheKey] = $versionedVariantUrl($mediaFile->preview_url, 'preview');
        }

        return $assetUrls[$cacheKey] = $mediaFile->original_url;
    }
}

if (! function_exists('optimizedMediaAsset')) {
    function optimizedMediaAsset($value, string $variant = 'banner'): string
    {
        static $mediaFilesByPath = [];
        static $originalPathColumnAvailable;

        if (! $value) {
            return '';
        }

        if (is_numeric($value)) {
            return uploadedAsset($value, $variant);
        }

        $urlPath = parse_url((string) $value, PHP_URL_PATH) ?: (string) $value;
        $path = ltrim(urldecode($urlPath), '/');

        $originalPathColumnAvailable ??= Schema::hasColumn('media_files', 'original_path');

        if (! array_key_exists($path, $mediaFilesByPath)) {
            $mediaFilesByPath[$path] = MediaFile::query()
                ->where('media_file', $path)
                ->when($originalPathColumnAvailable, fn ($query) => $query->orWhere('original_path', $path))
                ->first();
        }

        $mediaFile = $mediaFilesByPath[$path];

        return $mediaFile ? uploadedAsset($mediaFile->id, $variant) : (string) $value;
    }
}

// formats price
if (! function_exists('formatPrice')) {
    function formatPrice($price, $truncate = false, $addSymbol = true, $numberFormat = true)
    {
        if ($numberFormat) {
            $numOfDecimals = getSetting('numOfDecimals') ?? 0;

            // truncate price
            $negativeCheck = $price < 0 ? true : false;
            $price = abs($price);

            if ($price < 1000000) {
                // less than a million
                // decimals
                if ($numOfDecimals > 0) {
                    $price = number_format($price, $numOfDecimals);
                } else {
                    $price = number_format($price, $numOfDecimals, '.', ',');
                }
            } elseif ($price < 1000000000) {
                // less than a billion
                $price = number_format($price / 1000000, $numOfDecimals).'M';
            } else {
                // at least a billion
                $price = number_format($price / 1000000000, $numOfDecimals).'B';
            }
            if ($negativeCheck) {
                $price = '-'.$price;
            }
        }

        if ($addSymbol) {
            $symbol = getSetting('currencySymbol') ?? '$';
            $symbolAlignment = (int) getSetting('currencySymbolAlignment') ?? 0;
            switch ($symbolAlignment) {
                case 1:
                    $price = $symbol.$price;
                    break;
                case 2:
                    $price = $price.$symbol;
                    break;
                case 3:
                    $price = $symbol.' '.$price; // symbol left & space
                    break;
                default:
                    $price = $price.' '.$symbol; // symbol right & space
                    break;
            }
        }

        return $price;
    }
}

// product base price
if (! function_exists('productBasePrice')) {
    function productBasePrice($product, $formatted = true, $addTax = true)
    {
        $price = $product->min_price;
        $tax = 0;

        if ($addTax && getSetting('productSettingTaxesEnabled', '1') !== '0') {
            foreach ($product->taxes as $product_tax) {
                if ($product_tax->tax->status) {
                    $tax += ($price * $product_tax->tax_percentage) / 100;
                }
            }
        }

        $price += $tax;

        return $formatted ? formatPrice($price) : $price;
    }
}

// generate variation name
if (! function_exists('generateVariationName')) {
    function generateVariationName($code)
    {
        $name = '';
        $code_array = array_filter(explode('/', $code));
        $lstKey = array_key_last($code_array);

        foreach ($code_array as $key2 => $comb) {
            $comb = explode(':', $comb);
            $choice_name = VariationValue::withTrashed()->find($comb[1])->collectTranslation('name');

            $name .= $choice_name;

            if ($lstKey != $key2) {
                $name .= '-';
            }
        }

        return $name;
    }
}

// variation price
if (! function_exists('variationPrice')) {
    function variationPrice($product, $variation, $incTax = true)
    {
        $price = $variation->price;
        $tax = 0;

        // calculate tax
        if ($incTax && getSetting('productSettingTaxesEnabled', '1') !== '0') {
            foreach ($product->taxes as $productTax) {
                if ($productTax->tax->is_active) {
                    if ($productTax->tax_type == 'amount') {
                        $tax += $productTax->tax_value;
                    } else {
                        $tax += ($price * $productTax->tax_value) / 100;
                    }
                }
            }
        }

        $price += $tax;

        return (float) $price;
    }
}

// discounted variation price
if (! function_exists('variationDiscountedPrice')) {
    function variationDiscountedPrice($product, $variation, $incTax = true, $campaignId = null)
    {
        $price = $variation->price;
        $tax = 0;

        $discount_applicable = false;
        $discountType = $variation->discount_type;
        $discountValue = $variation->discount_value;

        // check if discount dates are valid
        if ($product->discount_start_date != null &&
            strtotime(date('d-m-Y H:i:s')) >= $product->discount_start_date &&
            strtotime(date('d-m-Y H:i:s')) <= $product->discount_end_date
        ) {
            $discount_applicable = true;
        }

        // check campaign
        $campaignProductQuery = $variation->campaignProducts();

        if ($campaignId !== null) {
            // A campaign details page must use the discount configured for that
            // campaign, even when the campaign has no active date window.
            $campaignProductQuery
                ->where('campaign_id', (int) $campaignId)
                ->whereHas('campaign', function ($q) {
                    $q->isPublished();
                });
        } else {
            // Outside a campaign page, retain the normal active-campaign rule.
            $campaignProductQuery->whereHas('campaign', function ($q) {
                $timestamp = now()->timestamp;
                $q->isPublished()
                    ->where(function ($query) use ($timestamp) {
                        $query->whereNull('start_date')
                            ->orWhere('start_date', '')
                            ->orWhere('start_date', '<=', $timestamp);
                    })
                    ->where(function ($query) use ($timestamp) {
                        $query->whereNull('end_date')
                            ->orWhere('end_date', '')
                            ->orWhere('end_date', '>=', $timestamp);
                    });
            });
        }

        if ($campaignId !== null) {
            $campaignProduct = $campaignProductQuery->with('campaign')->first();
        } else {
            // A variation can belong to more than one active campaign. Do not
            // let the first (possibly zero-discount) record mask another valid
            // campaign discount. Use the campaign that gives the customer the
            // lowest price.
            $campaignProduct = $campaignProductQuery
                ->with('campaign')
                ->get()
                ->filter(function ($campaignProduct) {
                    $campaign = $campaignProduct->campaign;
                    $discountValue = (float) $campaignProduct->discount_value > 0
                        ? (float) $campaignProduct->discount_value
                        : (float) ($campaign?->default_discount_value ?? 0);

                    return $discountValue > 0;
                })
                ->sortBy(function ($campaignProduct) use ($price) {
                    $campaign = $campaignProduct->campaign;
                    $hasOverride = (float) $campaignProduct->discount_value > 0;
                    $type = $hasOverride
                        ? $campaignProduct->discount_type
                        : $campaign?->default_discount_type;
                    $value = $hasOverride
                        ? (float) $campaignProduct->discount_value
                        : (float) ($campaign?->default_discount_value ?? 0);

                    return ($type === 'amount' || $type === 'flat')
                        ? max(0, $price - $value)
                        : max(0, $price - (($price * $value) / 100));
                })
                ->first();
        }

        if ($campaignProduct) {
            $discount_applicable = true;
            $campaign = $campaignProduct->campaign;

            // Campaign default is the fallback. Any non-zero discount entered
            // for this campaign product explicitly overrides that default.
            if ((float) $campaignProduct->discount_value > 0) {
                $discountType = $campaignProduct->discount_type;
                $discountValue = (float) $campaignProduct->discount_value;
            } elseif ($campaign) {
                $discountType = $campaign->default_discount_type;
                $discountValue = (float) $campaign->default_discount_value;
            }
        }

        // apply discount
        if ($discount_applicable) {
            if ($discountType == 'amount' || $discountType == 'flat') {
                $price -= $discountValue;
            } else {
                $price = $price - (($price * $discountValue) / 100);
            }
        }

        // calculate tax
        if ($incTax && getSetting('productSettingTaxesEnabled', '1') !== '0') {
            foreach ($product->taxes as $productTax) {
                if ($productTax->tax->is_active) {
                    if ($productTax->tax_type == 'amount') {
                        $tax += $productTax->tax_value;
                    } else {
                        $tax += ($price * $productTax->tax_value) / 100;
                    }
                }
            }
        }

        $price += $tax;

        return (float) max(0, $price);
    }
}

// generate variation combinations
if (! function_exists('generateVariationCombinations')) {
    function generateVariationCombinations($productVariationCombinations)
    {
        if (count($productVariationCombinations) == 0) {
            return $productVariationCombinations;
        }

        // fetching ids of variation values from product variation combinations table
        $variationValueIds = [];
        foreach ($productVariationCombinations as $combination) {
            $valueIds = [];

            if (isset($variationValueIds[$combination->variation_id])) {
                $valueIds = $variationValueIds[$combination->variation_id];
            }

            // push to array if not already exists
            if (! in_array($combination->variation_value_id, $valueIds)) {
                array_push($valueIds, $combination->variation_value_id);
            }

            $variationValueIds[$combination->variation_id] = $valueIds;
        }

        // preparing variation & variation values in same object
        $result = [];
        foreach ($variationValueIds as $id => $values) {
            $variationValues = [];
            $useCombinationImage = FeatureFlag::isEnabled('color_image_enabled');

            foreach ($values as $value) {
                $variationValue = VariationValue::find($value);

                // Get product-scoped combination image
                $colorImage = null;
                if ($useCombinationImage) {
                    $combination = $productVariationCombinations->where('variation_id', $id)
                        ->where('variation_value_id', $value)
                        ->first();
                    if ($combination && $combination->image_url) {
                        $colorImage = $combination->image_url;
                    }
                }

                if ($variationValue) {
                    $val = [
                        'id' => (int) $value,
                        'name' => $variationValue?->collectTranslation('name') ?? '',
                        'colorCode' => $variationValue->color_code,
                        'colorImage' => $colorImage,
                        'matchVariationCode' => $id.':'.$value,
                    ];

                    array_push($variationValues, $val);
                }
            }

            $variation = Variation::find($id);
            $variationObjectWithValues = [
                'id' => (int) $id,
                'name' => $variation?->collectTranslation('name') ?? '',
                'isColor' => (bool) $variation?->is_color,
                'values' => $variationValues,
            ];

            array_push($result, $variationObjectWithValues);
        }

        return $result;
    }
}

// color variation id
if (! function_exists('colorVariationId')) {
    function colorVariationId()
    {
        // Query the database for the color variation
        return Variation::where('is_color', 1)->first()?->id ?? 1;
    }
}

// PO status badge
if (! function_exists('poStatusBadge')) {
    function poStatusBadge($status)
    {
        $className = 'bg-orange-500';
        switch ($status) {
            case 'pending':
                $className = 'bg-primary';
                break;
            case 'received':
                $className = 'bg-green-500';
                break;
            case 'cancelled':
                $className = 'bg-red-500';
                break;
            case 'completed':
                $className = 'bg-green-500';
                break;
            default:
                break;
        }

        return $className;
    }
}

// get shop wise subtotal of cart items
if (! function_exists('getSubtotal')) {
    function getSubtotal($carts, $incTax = true)
    {
        $price = 0;
        foreach ($carts as $cart) {
            $product = $cart->productVariation->product;
            $variation = $cart->productVariation;
            $discountedVariationPriceIncTax = variationDiscountedPrice($product, $variation, $incTax);
            $price += (float) $discountedVariationPriceIncTax * $cart->qty;
        }

        return $price;
    }
}

if (! function_exists('validateCouponForProductsAndCategories')) {
    // check coupon for products & categories
    function validateCouponForProductsAndCategories($cartItems, $coupon)
    {
        if ($coupon->couponProducts()->count() > 0) {
            $productIds = $coupon->couponProducts()->pluck('product_id')->all();
            foreach ($cartItems as $cartItem) {
                if (in_array($cartItem->productVariation->product->id, $productIds, true)) {
                    return true;
                }
            }
        }

        if ($coupon->couponCategories()->count() > 0) {
            $categoryIds = $coupon->couponCategories()->pluck('category_id')->all();
            foreach ($cartItems as $cartItem) {
                $productCategories = $cartItem->productVariation->product->productCategories;
                foreach ($productCategories as $productCategory) {
                    if (in_array($productCategory->category_id, $categoryIds, true)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}

// get shop ratings
if (! function_exists('getShopRatings')) {
    function getShopRatings($reviewQuery)
    {
        $dividedBy = 1;
        $total = $reviewQuery->count();
        if ($total > 0) {
            $dividedBy = $total;
        }
        $sum = $reviewQuery->sum('rating');

        $review5Query = clone $reviewQuery;
        $review4Query = clone $reviewQuery;
        $review3Query = clone $reviewQuery;
        $review2Query = clone $reviewQuery;
        $review1Query = clone $reviewQuery;

        $fiveStarsCount = $review5Query->where('rating', 5)->count();
        $fourStarsCount = $review4Query->where('rating', 4)->count();
        $threeStarsCount = $review3Query->where('rating', 3)->count();
        $twoStarsCount = $review2Query->where('rating', 2)->count();
        $oneStarsCount = $review1Query->where('rating', 1)->count();

        $data = [
            'average' => $sum / $dividedBy,
            'total' => $total,
            'fiveStarsCount' => $fiveStarsCount,
            'fourStarsCount' => $fourStarsCount,
            'threeStarsCount' => $threeStarsCount,
            'twoStarsCount' => $twoStarsCount,
            'oneStarsCount' => $oneStarsCount,
        ];

        return $data;
    }
}

// calculateCommission of seller on order
if (! function_exists('calculateCommission')) {
    function calculateCommission($order)
    {
        $shop = $order->shop;

        $adminCommissionRate = $shop->admin_commission_percentage;
        $adminCommission = 0;
        $sellerEarning = $order->total_amount;

        if ($adminCommissionRate > 0) {
            $adminCommission = ($adminCommissionRate * $sellerEarning) / 100;
            $sellerEarning -= $adminCommission;
        }

        $commission = $order->commissionHistory;
        if (is_null($commission)) {
            $commission = new CommissionHistory;
            $commission->shop_id = $shop->id;
            $commission->order_id = $order->id;
            $commission->admin_commission_percentage = $adminCommissionRate;
            $commission->amount = $order->total_amount;
            $commission->admin_earning_amount = $adminCommission;
            $commission->shop_earning_amount = $sellerEarning;
            $commission->save();
        }

        // shop balance
        $orderGroup = $order->orderGroup;
        $transaction = $orderGroup->transaction;

        if ($transaction->payment_method == 'cash_on_delivery' || $transaction->payment_method == 'card_on_delivery') {
            $shop->current_balance -= $adminCommission; // all money is received by seller, so balance is reduced to give admin commission
        } else {
            $shop->current_balance += $sellerEarning;
        }
        $shop->save();
    }
}

// calculateAgentCommissionFromSession on order
if (! function_exists('calculateAgentCommissionFromSession')) {
    function calculateAgentCommissionFromSession($order, $checkoutSession)
    {
        $existing = $order->agentCommissionHistory;
        if (! is_null($existing)) {
            return;
        }

        $agent = $checkoutSession->assignedTo;

        if (! $agent) {
            return;
        }

        $mode = $agent->agent_commission_mode ?? 'percentage';
        $percentageRate = $agent->agent_commission_percentage ?? 0;
        $fixedAmount = $agent->agent_commission_fixed_amount ?? 0;
        $percentageAmount = ($percentageRate * $order->total_amount) / 100;

        $commissionAmount = 0;
        $modeUsed = $mode;

        switch ($mode) {
            case 'percentage':
                if ($percentageRate <= 0) {
                    return;
                }
                $commissionAmount = $percentageAmount;
                break;
            case 'fixed':
                if ($fixedAmount <= 0) {
                    return;
                }
                $commissionAmount = $fixedAmount;
                break;
            case 'both_highest':
                if ($percentageRate <= 0 && $fixedAmount <= 0) {
                    return;
                }
                $commissionAmount = max($percentageAmount, $fixedAmount);
                break;
            case 'both_additive':
                if ($percentageRate <= 0 && $fixedAmount <= 0) {
                    return;
                }
                $commissionAmount = $percentageAmount + $fixedAmount;
                break;
            default:
                if ($percentageRate <= 0) {
                    return;
                }
                $commissionAmount = $percentageAmount;
                $modeUsed = 'percentage';
        }

        $agentCommission = new AgentCommissionHistory;
        $agentCommission->order_id = $order->id;
        $agentCommission->agent_id = $agent->id;
        $agentCommission->order_amount = $order->total_amount;
        $agentCommission->commission_percentage = $percentageRate;
        $agentCommission->commission_fixed_amount = $fixedAmount;
        $agentCommission->commission_mode_used = $modeUsed;
        $agentCommission->commission_amount = $commissionAmount;
        $agentCommission->status = 'pending';
        $agentCommission->save();
    }
}

// earnAgentCommission on order delivery
if (! function_exists('earnAgentCommission')) {
    function earnAgentCommission($order)
    {
        $agentCommission = $order->agentCommissionHistory;

        if (is_null($agentCommission) || $agentCommission->status !== 'pending') {
            return;
        }

        $agent = $agentCommission->agent;
        $agent->agent_current_balance += $agentCommission->commission_amount;
        $agent->save();

        $agentCommission->status = 'earned';
        $agentCommission->save();
    }
}

// cancelAgentCommission on order cancellation
if (! function_exists('cancelAgentCommission')) {
    function cancelAgentCommission($order)
    {
        $agentCommission = $order->agentCommissionHistory;

        if (is_null($agentCommission) || $agentCommission->status === 'cancelled') {
            return;
        }

        $agent = $agentCommission->agent;

        if ($agentCommission->status === 'earned') {
            $agent->agent_current_balance -= $agentCommission->commission_amount;
            $agent->save();
        }

        if ($agentCommission->status === 'paid') {
            $agent->agent_current_balance += $agentCommission->commission_amount;
            $agent->save();
        }

        $agentCommission->status = 'cancelled';
        $agentCommission->save();
    }
}

// get product ratings
if (! function_exists('getProductRatings')) {
    function getProductRatings($productQuery)
    {
        $avgQuery = clone $productQuery;
        $data = [
            'average' => (float) $avgQuery->avg('rating'),
            'total' => $productQuery->count(),
        ];

        return $data;
    }
}

// get order bg-class
if (! function_exists('getOrderBgClass')) {
    function getOrderBgClass($status)
    {
        switch ($status) {
            case 'processing':
                $class = 'bg-badge-processing';
                break;
            case 'picked_up':
                $class = 'bg-badge-picked-up';
                break;
            case 'on_hold':
                $class = 'bg-badge-on-hold';
                break;
            case 'shipped':
                $class = 'bg-badge-shipped';
                break;
            case 'unbilled':
                $class = 'bg-badge-unbilled';
                break;
            case 'completed':
                $class = 'bg-badge-completed';
                break;
            case 'cancelled':
                $class = 'bg-badge-cancelled';
                break;
            default:
                $class = 'bg-badge-default';
                break;
        }

        return $class;
    }
}

// get order text-class
if (! function_exists('getOrderTextClass')) {
    function getOrderTextClass($status)
    {
        switch ($status) {
            case 'processing':
            case 'picked_up':
            case 'on_hold':
            case 'shipped':
            case 'unbilled':
                $class = 'text-slate-900';
                break;
            default:
                $class = 'text-white';
                break;
        }

        return $class;
    }
}

// get notification text
if (! function_exists('getNotificationText')) {
    function getNotificationText($notification)
    {
        $type = $notification->type;
        $text = '';
        switch ($type) {
            case 'order':
                $text = 'New Order - '.$notification->text;
                break;
            case 'payout-request':
                $text = 'Payout Request - '.formatPrice($notification->text);
                break;
            case 'payout':
                $text = 'Payout Received - '.formatPrice($notification->text);
                break;
            case 'stock':
                $text = 'Low Stock - '.$notification->text;
                break;
            case 'seller-registration':
                $text = 'New Seller';
                break;
            case 'customer-registration':
                $text = 'New Customer';
                break;
            default:
                $text = '';
                break;
        }

        return $text;
    }
}

// get notification icon
if (! function_exists('getNotificationIcon')) {
    function getNotificationIcon($notification, $for = 'icon')
    {
        $type = $notification->type;
        $class = '';
        $icon = '';
        switch ($type) {
            case 'order':
                $icon = 'far fa-shopping-cart';
                $class = 'text-green-500 bg-green-200';
                break;
            case 'payout-request':
                $icon = 'far fa-dollar-sign';
                $class = 'text-indigo-500 bg-indigo-100';
                break;
            case 'payout':
                $icon = 'far fa-dollar-sign';
                $class = 'text-indigo-500 bg-indigo-100';
                break;
            case 'stock':
                $icon = 'far fa-exclamation-triangle';
                $class = 'text-red-500 bg-red-100';
                break;
            case 'seller-registration':
                $icon = 'far fa-user';
                $class = 'text-green-500 bg-green-200';
                break;
            case 'customer-registration':
                $icon = 'far fa-user';
                $class = 'text-green-500 bg-green-200';
                break;
            default:
                break;
        }
        if ($for == 'icon') {
            return $icon;
        }

        return $class;
    }
}

// get notification icon
if (! function_exists('getNotificationLink')) {
    function getNotificationLink($notification, $for = 'admin')
    {
        $type = $notification->type;
        $link = '';
        switch ($type) {
            case 'order':
                if ($for == 'admin') {
                    $link = route('admin.orders.show', $notification->link_info);
                } else {
                    $link = route('seller.orders.show', $notification->link_info);
                }
                break;
            case 'payout-request':
                $link = route('admin.sellers.payoutRequests').'?shopId='.$notification->link_info;
                break;
            case 'payout':
                $link = route('seller.earnings.payouts');
                break;
            case 'stock':
                if ($for == 'admin') {
                    $link = route('admin.products.edit', $notification->link_info);
                } else {
                    $link = route('seller.products.edit', $notification->link_info);
                }
                break;
            case 'seller-registration':
                if ($for == 'admin') {
                    $link = route('admin.sellers.index').'?search='.$notification->link_info;
                }
                break;
            case 'customer-registration':
                if ($for == 'admin') {
                    $link = route('admin.customers.index').'?search='.$notification->link_info;
                }
                break;
            default:
                break;
        }

        return $link;
    }
}

// clearPaymentSession
if (! function_exists('clearPaymentSession')) {
    function clearPaymentSession()
    {
        session()->forget('order_group_id');
        session()->forget('amount');
        session()->forget('currency');
        session()->forget('temp_user');
    }
}

// getSecondaryColor
if (! function_exists('getSecondaryColor')) {
    function getSecondaryColor($primaryColor, $ratio = 1)
    {
        // Convert hexadecimal color string to RGB components
        [$r, $g, $b] = sscanf($primaryColor, '#%02x%02x%02x');

        // Calculate secondary color by blending with white
        $r = (1 - $ratio) * 255 + $ratio * $r;
        $g = (1 - $ratio) * 255 + $ratio * $g;
        $b = (1 - $ratio) * 255 + $ratio * $b;

        // Combine RGB values into a single color
        $secondaryColor = sprintf('#%02x%02x%02x', $r, $g, $b);

        return $secondaryColor;
    }
}

if (! function_exists('normalizeBangladeshiNumber')) {
    function normalizeBangladeshiNumber(string $number): string
    {
        // Remove whitespace and non-digit characters (except +)
        $number = trim($number);
        $number = preg_replace('/[^0-9+]/', '', $number);

        // If number starts with +880 or 880, replace with 880
        if (preg_match('/^\+?880/', $number)) {
            $number = preg_replace('/^\+?880/', '880', $number);
        }
        // If number starts with 01, convert to 8801
        elseif (preg_match('/^01[0-9]{9}$/', $number)) {
            $number = '880'.substr($number, 1);
        }

        return $number;
    }
}

// Normalize phone to local format (01XXXXXXXXX) for DB storage
if (! function_exists('normalizePhoneToLocal')) {
    function normalizePhoneToLocal(string $number): string
    {
        $number = trim($number);
        $number = preg_replace('/[^0-9+]/', '', $number);

        // If number starts with +880 or 880, convert to 01
        if (preg_match('/^\+?8801/', $number)) {
            return preg_replace('/^\+?880/', '0', $number);
        }

        // If already in 01 format, return as is
        if (preg_match('/^01[0-9]{9}$/', $number)) {
            return $number;
        }

        return $number;
    }
}

// Validate Bangladeshi phone number
if (! function_exists('validateBangladeshiPhone')) {
    function validateBangladeshiPhone(string $number): bool
    {
        $number = trim($number);
        // Remove all non-digit characters except +
        $number = preg_replace('/[^0-9+]/', '', $number);

        // Valid patterns:
        // 880XXXXXXXXXXX (13 digits starting with 880)
        // 01XXXXXXXXX (11 digits starting with 01)
        if (preg_match('/^8801[0-9]{9}$/', $number)) {
            return true;
        }
        if (preg_match('/^01[0-9]{9}$/', $number)) {
            return true;
        }

        return false;
    }
}

// for crm
if (! function_exists('getCustomerSegment')) {
    function getCustomerSegment($orders, $segments)
    {
        // COD orders are commonly still marked unpaid after purchase. Customer
        // value therefore follows valid orders, excluding cancelled orders,
        // instead of relying only on the payment-status flag.
        $totalOrderValue = (clone $orders)
            ->where('delivery_status', '!=', 'cancelled')
            ->sum('total_amount');
        $selectedSegment = null;
        $segmentBadge = 'badge bg-blue-200 text-blue-800';
        foreach ($segments as $segment) {
            if ($totalOrderValue >= $segment->value) {
                $selectedSegment = $segment;
                break;
            }
        }

        switch ($selectedSegment->name ?? '') {
            case 'Silver':
                $segmentBadge = 'badge bg-blue-200 text-blue-800';
                break;
            case 'Golden':
                $segmentBadge = 'badge bg-yellow-100 text-yellow-800';
                break;
            case 'Vip':
                $segmentBadge = 'badge bg-indigo-200 text-indigo-800';
                break;
            case 'VIP':
                $segmentBadge = 'badge bg-indigo-200 text-indigo-800';
                break;
            default:
                $segmentBadge = 'badge bg-red-200 text-red-800';
                break;
        }

        return [$selectedSegment, $segmentBadge, $totalOrderValue];
    }
}

// Convert hex color to RGB string for CSS
if (! function_exists('hexToRgb')) {
    function hexToRgb($hex)
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) == 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));

        return "$r, $g, $b";
    }
}

// Get average purchase price for a product variation from purchase orders
if (! function_exists('getAvgPurchasePrice')) {
    function getAvgPurchasePrice($productVariationId)
    {
        return DB::table('purchase_order_product_variations')
            ->where('product_variation_id', $productVariationId)
            ->avg('unit_price') ?? 0;
    }
}

// Get average purchase prices for multiple product variations (batch)
if (! function_exists('getAvgPurchasePricesBatch')) {
    function getAvgPurchasePricesBatch(array $productVariationIds)
    {
        return DB::table('purchase_order_product_variations')
            ->select('product_variation_id', DB::raw('AVG(unit_price) as avg_price'))
            ->whereIn('product_variation_id', $productVariationIds)
            ->groupBy('product_variation_id')
            ->pluck('avg_price', 'product_variation_id')
            ->toArray();
    }
}

// Sync order profit log
if (! function_exists('syncOrderProfitLog')) {
    function syncOrderProfitLog($order)
    {
        OrderProfitLog::calculateForOrder($order);
    }
}

// Encode invoice ID to hash for QR codes
if (! function_exists('encodeInvoiceId')) {
    function encodeInvoiceId($id)
    {
        return app('hashids')->encode($id);
    }
}

// Decode invoice hash back to ID
if (! function_exists('decodeInvoiceHash')) {
    function decodeInvoiceHash($hash)
    {
        $decoded = app('hashids')->decode($hash);

        return ! empty($decoded) ? $decoded[0] : null;
    }
}
