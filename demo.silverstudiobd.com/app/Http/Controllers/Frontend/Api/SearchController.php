<?php

namespace App\Http\Controllers\Frontend\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BrandResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ShopResource;
use App\Http\Services\ProductService;
use App\Models\Brand;
use App\Models\Product;
use App\Models\Shop;
use Illuminate\Http\Request;
use App\Services\FacebookConversionService;


class SearchController extends Controller
{
    protected $facebook;

    public function __construct(FacebookConversionService $facebook)
    {
        $this->facebook = $facebook;
    }
    # get all products with pagination
    public function index(Request $request)
    {
        $products = Product::fromPublishedShops()->isPublished()->hideOnEcom()->with('variations');
        $brands   = Brand::isActive();
        $shops    = Shop::isApproved()->isPublished();

        // by search keyword
        if ($request->searchKey != null) {
            $products   = $products->where('name', 'like', '%' . $request->searchKey . '%');
            $brands     = $brands->where('name', 'like', '%' . $request->searchKey . '%');
            $shops      = $shops->where('name', 'like', '%' . $request->searchKey . '%');
        }

        // Send Facebook Search event
        try{

            $user = apiUser();
            if($user && config('app.FACEBOOK_PIXEL_ACTIVATION') == '1'){
                $this->facebook->sendEvent('Search', [
                    'email' => $user->email,
                    'phone' => $user->phone
                    // 'order_id' => $order->id,
                ], [
                    'search_string' => $request->searchKey
                ]);

            }

        }catch (\Exception $e) {

            dd($e);
        }

        $columns    = (new ProductService)->getSpecificColumns();
        $products   = $products->take(5)->get($columns);

        return [
            'success'   => true,
            'status'    => 200,
            'message'   => '',
            'result'    => [
                'products'         => ProductResource::collection($products),
                'brands'           => BrandResource::collection($brands->take(3)->get()),
                'shops'            => ShopResource::collection($shops->take(3)->get()),
            ]
        ];
    }
}
