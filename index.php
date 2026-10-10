<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$appRoot = __DIR__ . '/demo.silverstudiobd.com';

if (file_exists($maintenance = $appRoot . '/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $appRoot . '/vendor/autoload.php';

$app = require_once $appRoot . '/bootstrap/app.php';

$kernel = $app->make(Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);
