<?php

namespace App\Http\Controllers\Backend\Api\POS;

use App\Http\Controllers\Controller;
use App\Http\Resources\AddressResource;
use App\Http\Resources\Pos\PosBrandResource;
use App\Http\Resources\Pos\PosCartGroupResource;
use App\Http\Resources\Pos\PosCartResource;
use App\Http\Resources\Pos\PosCategoryResource;
use App\Http\Resources\Pos\PosProductVariationResource;
use App\Http\Resources\Pos\PosWarehouseResource;
use App\Models\Brand;
use App\Models\Cart;
use App\Models\Category;
use App\Models\CheckoutSession;
use App\Models\Country;
use App\Models\MediaFile;
use App\Models\Order;
use App\Models\OrderGroup;
use App\Models\OrderItem;
use App\Models\OrderUpdate;
use App\Models\PosCart;
use App\Models\PosCartGroup;
use App\Models\ProductVariation;
use App\Models\ProductVariationStock;
use App\Models\Transaction;
use App\Models\User;
use App\Models\UserAddress;
use App\Models\Warehouse;
use App\Rules\BangladeshMobileNumber;
use App\Services\OrderService;
use App\Traits\CategoryTrait;
use DB;
use Endroid\QrCode\Color\Color;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Hash;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PosController extends Controller
{
    private const MAX_PRODUCTS_PER_PAGE = 30;

    private function canOverrideStock(): bool
    {
        return in_array(user()?->user_type, ['admin', 'staff'], true);
    }

    private function getWarehouseStockQty(int $productVariationId, int $warehouseId): int
    {
        return (int) ProductVariationStock::where('product_variation_id', $productVariationId)
            ->where('warehouse_id', $warehouseId)
            ->value('stock_qty');
    }

    private function makeStockErrorResponse(int $availableStock): JsonResponse
    {
        return response()->json([
            'success' => false,
            'status' => 422,
            'message' => translate('Not enough stock available'),
            'result' => [
                'availableStock' => $availableStock,
            ],
        ], 422);
    }

    // warehouses, categories, brands
    public function filterData(Request $request)
    {
        $warehouses = Warehouse::shop()->where('is_active', 1)->get(['id', 'name']);
        $brands = Brand::isActive()->get(['id', 'name']);
        $categories = Category::get(['id', 'name']);

        return response()->json([
            'success' => true,
            'status' => 200,
            'message' => '',
            'result' => [
                'warehouses' => PosWarehouseResource::collection($warehouses),
                'brands' => PosBrandResource::collection($brands),
                'categories' => PosCategoryResource::collection($categories),
            ],
        ], 200);
    }

    // get data
    public function index(Request $request)
    {
        $requestedLimit = (int) ($request->limit ?? self::MAX_PRODUCTS_PER_PAGE);
        $limit = max(1, min($requestedLimit, self::MAX_PRODUCTS_PER_PAGE));
        $warehouseId = $request->warehouseId;

        $productVariations = ProductVariation::whereHas('product', function ($q) use ($request) {
            $q->shop()->isPublished();

            if ($request->brandId) {
                $q->where('brand_id', $request->brandId);
            }

            if ($request->categoryId) {
                $q->whereHas('productCategories', function ($query) use ($request) {
                    return $query->where('category_id', $request->categoryId);
                });
            }
        });

        $productVariations->with([
            'product.productTranslations',
            'product.taxes.tax',
            'productVariationStocks' => function ($query) use ($warehouseId) {
                $query->where('warehouse_id', $warehouseId);
            },
            'combinations' => function ($query) {
                $query->withoutTrashed();
            },
            'combinations.variationValue',
        ]);

        if ($request->searchKey != null) {
            $productVariations = $productVariations->where(function ($query) use ($request) {
                $query->whereHas('product', function ($productQuery) use ($request) {
                    $productQuery->where('name', 'like', '%'.$request->searchKey.'%');
                })
                    ->orWhere('code', 'like', '%'.$request->searchKey.'%')
                    ->orWhere('sku', 'like', '%'.$request->searchKey.'%');
            });
        }

        $productVariations = $productVariations->paginate($limit);

        return response()->json([
            'success' => true,
            'status' => 200,
            'message' => '',
            'result' => PosProductVariationResource::collection($productVariations)->response()->getData(true),
        ], 200);
    }

    // customers
    public function customers(Request $request)
    {
        if (user()->user_type != 'admin') {
            $query = User::customers()->where('shop_id', shopId());
        } else {
            $query = User::customers();
        }

        if ($request->phone) {
            $query->where('phone', 'like', '%'.$request->phone.'%');
        }

        $customers = $query->get(['id', 'name', 'email', 'phone']);

        return response()->json([
            'success' => true,
            'status' => 200,
            'message' => '',
            'result' => $customers,
        ], 200);
    }

    // store customer
    public function storeCustomer(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', new BangladeshMobileNumber],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $customer = null;
        if ($request->email) {
            $customer = User::where('email', $request->email)->first();
        }

        if (is_null($customer) && $request->phone) {
            $customer = User::where('phone', $request->phone)->first();
        }

        if (is_null($customer)) {
            $customer = new User;
            $customer->password = Hash::make($request->password ?? '123456');
            $customer->shop_id = shopId();
            $customer->verification_code = rand(100000, 999999);
            $customer->email_or_otp_verified = 1;
            $customer->email_verified_at = date('Y-m-d H:m:s');
        }

        $customer->name = $request->name;
        $customer->email = $request->email;
        $customer->phone = $request->phone;
        $customer->save();

        $this->__newAddresses($request, $customer->id);

        $customers = User::customers()->get(['id', 'name', 'email', 'phone']);

        return response()->json([
            'success' => true,
            'status' => 200,
            'message' => '',
            'result' => [
                'customers' => $customers,
                'newCustomer' => $customer,
            ],
        ], 200);
    }

    // customer addresses
    public function customerAddresses($id)
    {
        $customer = User::whereId($id)->first();

        return response()->json([
            'success' => true,
            'status' => 200,
            'message' => '',
            'result' => [
                'addresses' => AddressResource::collection($customer->addresses()->latest()->get()),
                'countries' => Country::where('is_active', 1)->get(['id', 'name']),
            ],
        ], 200);
    }

    // store address
    public function storeAddress(Request $request)
    {
        $customer = User::where('id', $request->id)->first();
        $this->__newAddresses($request, $customer->id);

        return $this->customerAddresses($customer->id);
    }

    // update customer
    public function updateCustomer(Request $request, $id)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', new BangladeshMobileNumber],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $customer = User::where('id', $id)->where('user_type', 'customer')->first();

        if (! $customer) {
            return response()->json([
                'success' => false,
                'status' => 404,
                'message' => 'Customer not found',
            ], 404);
        }

        $customer->name = $request->name;
        $customer->email = $request->email;
        $customer->phone = $request->phone;
        $customer->save();

        if ($request->address != null) {
            if ($request->addressId) {
                $address = UserAddress::where('id', $request->addressId)->where('user_id', $customer->id)->first();
                if ($address) {
                    $address->country_id = $request->countryId;
                    $address->state_id = $request->stateId ?: null;
                    $address->city_id = $request->cityId ?: null;
                    $address->postal_code = $request->postalCode;
                    $address->address = $request->address;
                    $address->type = $request->type;
                    $address->direction = $request->direction;
                    $address->save();
                }
            } else {
                $this->__newAddresses($request, $customer->id);
            }
        }

        $customers = User::customers()->get(['id', 'name', 'email', 'phone']);

        return response()->json([
            'success' => true,
            'status' => 200,
            'message' => 'Customer updated successfully',
            'result' => [
                'customers' => $customers,
                'customer' => $customer,
            ],
        ], 200);
    }

    // update address
    public function updateAddress(Request $request, $addressId)
    {
        $address = UserAddress::where('id', $addressId)->first();

        if (! $address) {
            return response()->json([
                'success' => false,
                'status' => 404,
                'message' => 'Address not found',
            ], 404);
        }

        $address->country_id = $request->countryId;
        $address->state_id = $request->stateId ?: null;
        $address->city_id = $request->cityId ?: null;
        $address->postal_code = $request->postalCode;
        $address->address = $request->address;
        $address->type = $request->type;
        $address->direction = $request->direction;
        $address->save();

        return response()->json([
            'success' => true,
            'status' => 200,
            'message' => 'Address updated successfully',
            'result' => [
                'address' => new AddressResource($address),
            ],
        ], 200);
    }

    // delete address
    public function deleteAddress($addressId)
    {
        $address = UserAddress::where('id', $addressId)->first();

        if (! $address) {
            return response()->json([
                'success' => false,
                'status' => 404,
                'message' => 'Address not found',
            ], 404);
        }

        $customerId = $address->user_id;
        $address->delete();

        return $this->customerAddresses($customerId);
    }

    // new address
    private function __newAddresses(Request $request, $customerId)
    {
        if ($request->address != null) {
            $address = new UserAddress;
            $address->user_id = $customerId;
            $address->country_id = $request->countryId ?? Country::where('is_active', 1)->value('id') ?? 1;
            $address->state_id = $request->stateId ?: null;
            $address->city_id = $request->cityId ?: null;
            $address->postal_code = $request->postalCode;
            $address->address = $request->address;
            $address->type = $request->type;
            $address->direction = $request->direction;
            $address->is_default = 0;
            $address->save();
        }
    }

    // add to pos cart
    public function addToPosCart(Request $request)
    {
        $warehouseId = (int) $request->warehouseId;
        $requestedQty = max(1, (int) ($request->qty ?? 1));
        $overrideStock = $this->canOverrideStock() && (int) $request->overrideStock === 1;

        $data = [
            'success' => true,
            'status' => 200,
            'message' => '',
            'result' => null,
        ];

        if ($request->firstCartProduct) {
            $posCartGroup = new PosCartGroup;
            $posCartGroup->user_id = userId();
            $posCartGroup->save();
            $data['result']['posCartGroupId'] = $posCartGroup->id;
            $posCartGroupId = $posCartGroup->id;
        } else {
            $posCartGroupId = (int) $request->posCartGroupId;
        }

        $existingCart = PosCart::where('pos_cart_group_id', $posCartGroupId)
            ->where('product_variation_id', $request->productVariationId)
            ->where('warehouse_id', $warehouseId)
            ->first();

        $targetQty = $existingCart ? $existingCart->qty + $requestedQty : $requestedQty;
        $availableStock = $this->getWarehouseStockQty((int) $request->productVariationId, $warehouseId);

        if (! $overrideStock && $targetQty > $availableStock) {
            return $this->makeStockErrorResponse($availableStock);
        }

        if ($existingCart) {
            $existingCart->qty = $targetQty;
            $existingCart->save();
            $posCart = $existingCart;
        } else {
            $posCart = new PosCart;
            $posCart->warehouse_id = $warehouseId;
            $posCart->qty = $requestedQty;
            $posCart->product_variation_id = $request->productVariationId;
            $posCart->pos_cart_group_id = $posCartGroupId;
            $posCart->save();
        }

        $posCarts = PosCart::where('pos_cart_group_id', $posCart->pos_cart_group_id)->get();

        $data['result']['posCarts'] = PosCartResource::collection($posCarts);

        return response()->json($data, 200);
    }

    // Transfer abandoned cart to POS
    public function transferAbandonedCartToPos(Request $request)
    {
        $data = [
            'success' => true,
            'status' => 200,
            'message' => '',
            'result' => null,
        ];

        $customerId = $request->input('customer_id');
        $items = $request->input('items', []);
        $customerType = $request->input('customer_type', 'registered');
        $checkoutSessionId = $request->input('checkout_session_id');

        // Handle guest-to-user conversion
        $resolvedUserId = null;
        if ($customerType === 'guest' && $checkoutSessionId) {
            $checkoutSession = CheckoutSession::find($checkoutSessionId);
            if ($checkoutSession && $checkoutSession->customer_phone) {
                // Check if user with same phone already exists
                $existingUser = User::where('phone', $checkoutSession->customer_phone)->first();

                if ($existingUser) {
                    $resolvedUserId = $existingUser->id;
                } else {
                    // Create new user from checkout session data
                    $newUser = User::create([
                        'name' => $checkoutSession->customer_name ?? 'Guest',
                        'email' => $checkoutSession->customer_email ?? null,
                        'phone' => $checkoutSession->customer_phone,
                        'password' => Hash::make('123456'),
                    ]);
                    $resolvedUserId = $newUser->id;
                }

                // Transfer guest carts to the resolved user
                Cart::where('guest_user_id', $customerId)
                    ->update([
                        'user_id' => $resolvedUserId,
                        'guest_user_id' => null,
                    ]);
            }
        }

        if (empty($items)) {
            return response()->json([
                'success' => false,
                'status' => 400,
                'message' => translate('No items to transfer'),
                'result' => null,
            ], 400);
        }

        // Get default warehouse (first active one)
        $defaultWarehouse = Warehouse::shop()->where('is_active', 1)->first();

        // Create new POS cart group
        $posCartGroup = new PosCartGroup;
        $posCartGroup->user_id = userId();
        $posCartGroup->save();

        $addedItems = [];
        $skippedItems = [];

        foreach ($items as $item) {
            $variationId = $item['variation_id'] ?? null;
            $quantity = $item['quantity'] ?? 1;

            if (! $variationId) {
                $skippedItems[] = [
                    'variation_id' => $variationId,
                    'reason' => 'No variation ID provided',
                ];

                continue;
            }

            // Check if product variation exists
            $productVariation = ProductVariation::find($variationId);
            if (! $productVariation) {
                $skippedItems[] = [
                    'variation_id' => $variationId,
                    'reason' => 'Product variation not found',
                ];

                continue;
            }

            // Find warehouse with stock for this variation
            $warehouseId = null;

            // First try to find a warehouse that has stock
            $stock = ProductVariationStock::where('product_variation_id', $variationId)
                ->where('stock_qty', '>', 0)
                ->first();

            if ($stock) {
                $warehouseId = $stock->warehouse_id;
            } elseif ($defaultWarehouse) {
                // Use default warehouse if no stock found
                $warehouseId = $defaultWarehouse->id;
            } else {
                $skippedItems[] = [
                    'variation_id' => $variationId,
                    'reason' => 'No warehouse available',
                ];

                continue;
            }

            // Create POS cart item
            $posCart = new PosCart;
            $posCart->pos_cart_group_id = $posCartGroup->id;
            $posCart->warehouse_id = $warehouseId;
            $posCart->product_variation_id = $variationId;
            $posCart->qty = $quantity;
            $posCart->save();

            $addedItems[] = [
                'variation_id' => $variationId,
                'quantity' => $quantity,
                'warehouse_id' => $warehouseId,
            ];
        }

        // Get the created cart items
        $posCarts = PosCart::where('pos_cart_group_id', $posCartGroup->id)->get();

        $data['result'] = [
            'posCartGroupId' => $posCartGroup->id,
            'posCarts' => PosCartResource::collection($posCarts),
            'userId' => $resolvedUserId ?? $customerId,
            'added_items_count' => count($addedItems),
            'skipped_items_count' => count($skippedItems),
            'skipped_items' => $skippedItems,
        ];

        if (count($addedItems) === 0) {
            // No items were added, delete the empty cart group
            $posCartGroup->delete();

            return response()->json([
                'success' => false,
                'status' => 400,
                'message' => translate('No items could be transferred to POS'),
                'result' => [
                    'skipped_items' => $skippedItems,
                ],
            ], 400);
        }

        return response()->json($data, 200);
    }

    // updatePosCart
    public function updatePosCart(Request $request)
    {
        $overrideStock = $this->canOverrideStock() && (int) $request->overrideStock === 1;
        $data = [
            'success' => true,
            'status' => 200,
            'message' => '',
            'result' => null,
        ];

        $posCart = PosCart::whereId($request->id)->first();
        if ($posCart) {
            if ($request->action == 'increase') {
                $availableStock = $this->getWarehouseStockQty((int) $posCart->product_variation_id, (int) $posCart->warehouse_id);
                $targetQty = $posCart->qty + 1;

                if (! $overrideStock && $targetQty > $availableStock) {
                    return $this->makeStockErrorResponse($availableStock);
                }

                $posCart->qty = $targetQty;
                $posCart->save();
            } elseif ($request->action == 'decrease') {
                if ($posCart->qty > 1) {
                    $posCart->qty -= 1;
                    $posCart->save();
                }
            } else {
                $posCart->delete();
            }
        }

        if ($posCart) {
            $posCarts = PosCart::where('pos_cart_group_id', $posCart->pos_cart_group_id)->get();
            $data['result']['posCarts'] = PosCartResource::collection($posCarts);
        } else {
            $data['result']['posCarts'] = [];
        }

        return response()->json($data, 200);
    }

    // indexHoldPosCartGroup
    public function indexHoldPosCartGroup(Request $request)
    {
        $data = [
            'success' => true,
            'status' => 200,
            'message' => '',
            'result' => null,
        ];

        $posCartGroups = PosCartGroup::where('user_id', userId())->where('on_hold', 1)->get();

        $data['result'] = PosCartGroupResource::collection($posCartGroups);

        return response()->json($data, 200);
    }

    // holdPosCartGroup
    public function holdPosCartGroup(Request $request)
    {
        $data = [
            'success' => true,
            'status' => 200,
            'message' => '',
            'result' => null,
        ];

        $posCartGroup = PosCartGroup::whereId($request->posCartGroupId)->first();
        if ($posCartGroup) {
            $posCartGroup->on_hold = 1;
            $posCartGroup->save();
        }

        return response()->json($data, 200);
    }

    // deleteHoldPosCartGroup
    public function deleteHoldPosCartGroup($id)
    {
        $data = [
            'success' => true,
            'status' => 200,
            'message' => '',
            'result' => null,
        ];

        $posCartGroup = PosCartGroup::whereId($id)->first();
        if ($posCartGroup) {
            $posCartGroup->posCarts()->delete();
            $posCartGroup->delete();
        }

        return response()->json($data, 200);
    }

    // storeOrder
    public function storeOrder(Request $request)
    {
        $posCartGroup = PosCartGroup::where('id', $request->posCartGroupId)->first();
        $posCarts = $posCartGroup->posCarts;

        // empty cart
        if (count($posCarts) == 0) {
            return response()->json([
                'success' => false,
                'status' => 403,
                'message' => translate('Your cart is empty. Please select a product'),
                'result' => null,
            ], 403);
        }

        // validate payment method
        $validationRules = [
            'paymentMethod' => 'required|string|in:cash_on_delivery,bkash',
            'payingAmount' => 'nullable|numeric|min:0',
        ];

        if ($request->paymentMethod === 'bkash') {
            $validationRules['bkash_amount'] = 'required|numeric|gt:0';
        } else {
            $validationRules['bkash_amount'] = 'nullable|numeric|min:0';
        }

        $request->validate($validationRules);

        // start order submission
        DB::beginTransaction();

        try {

            $customer = null;

            if ($request->customerId) {
                $customer = User::where('id', $request->customerId)->first();
            }

            if ($request->customerId && ! $customer) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'status' => 422,
                    'message' => translate('Selected customer was not found'),
                    'result' => null,
                ], 422);
            }

            if ($customer && ! BangladeshMobileNumber::isValid($customer->phone)) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'status' => 422,
                    'message' => translate('Update the customer phone to a valid 11-digit Bangladesh mobile number before placing the order'),
                    'result' => null,
                ], 422);
            }

            $orderGroup = new OrderGroup;
            $orderGroup->user_id = $request->customerId;
            $orderGroup->name = $customer?->name;
            $orderGroup->email = $customer?->email;
            $orderGroup->phone = $customer?->phone;
            $orderGroup->note = $request->note;
            $orderGroup->shipping_address_id = $request->shippingAddressId;
            $orderGroup->save();

            if ($orderGroup->shippingAddress) {
                $address = $orderGroup->shippingAddress;
                $orderGroup->shipping_address_type = $address->type;
                $orderGroup->direction = $address->direction;
                $orderGroup->shipping_address = implode(', ', array_filter([
                    $address->address,
                    $address->area?->name,
                    $address->city?->name,
                    $address->state?->name,
                    $address->postal_code,
                    $address->country?->name,
                ]));
            }

            $grandTotal = 0;

            $grandSubtotal = 0;
            $grandTax = 0;
            $grandShippingCharge = 0;
            $grandDiscount = 0;
            $grandCouponDiscount = 0;

            // store order here
            $order = new Order;
            $order->user_id = $request->customerId;
            $order->ip_address = getClientIp();
            $order->pos_order = 1;
            $order->order_group_id = $orderGroup->id;
            $order->shop_id = shopId();
            $order->warehouse_id = $request->warehouse_id;
            $order->delivery_status = 'processing';
            $order->memo_date = date('Y-m-d', strtotime($request->memo_date));
            $order->memo_no = $request->memo_no;
            $order->mushak_challan_no = $request->mushak_challan_no;
            $order->source = $request->source;
            if (auth()->user()->user_type === 'staff') {
                $order->agent_id = auth()->id();
            }
            $order->save();

            $shopSubTotal = 0;
            $shopTax = 0;
            $shopShippingCharge = $request->shippingCharge ?? 0;
            $shopDiscount = $request->discount ?? 0;
            $shopCouponDiscount = 0;

            foreach ($posCarts as $posCart) {
                $productVariation = $posCart->productVariation;
                $product = $productVariation->product;
                $availableStock = $this->getWarehouseStockQty((int) $posCart->product_variation_id, (int) $posCart->warehouse_id);
                $overrideStock = $this->canOverrideStock() && (int) $request->overrideStock === 1;

                if (! $overrideStock && $posCart->qty > $availableStock) {
                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'status' => 422,
                        'message' => translate('Stock changed while preparing the order. Please review the cart quantities.'),
                        'result' => [
                            'productVariationId' => (int) $posCart->product_variation_id,
                            'availableStock' => $availableStock,
                        ],
                    ], 422);
                }

                $itemTotalPriceWithoutTax = variationPrice($product, $productVariation, false) * $posCart->qty;
                $itemTotalTax = (variationPrice($product, $productVariation) * $posCart->qty) - $itemTotalPriceWithoutTax;
                $itemTotalDiscount = $itemTotalPriceWithoutTax - (variationDiscountedPrice($product, $productVariation, false) * $posCart->qty);

                $shopSubTotal += $itemTotalPriceWithoutTax;
                $shopTax += $itemTotalTax;
                $shopDiscount += $itemTotalDiscount;

                // add order item [done]
                $orderItem = new OrderItem;
                $orderItem->order_id = $order->id;
                $orderItem->product_variation_id = $posCart->product_variation_id;
                $orderItem->qty = $posCart->qty;
                $orderItem->unit_price = variationPrice($product, $productVariation, false);
                $orderItem->total_tax = $itemTotalTax;
                $orderItem->total_discount = $itemTotalDiscount;
                $orderItem->total_price = $itemTotalPriceWithoutTax + $itemTotalTax - $itemTotalDiscount;
                $orderItem->unit_cost_price = getAvgPurchasePrice($posCart->product_variation_id);
                $orderItem->total_cost = $orderItem->unit_cost_price * $orderItem->qty;
                $orderItem->save();

                // manage stock and sales
                $product->total_sale_count += $orderItem->qty;
                $product->stock_qty -= $orderItem->qty;
                $product->save();

                // product variation stock
                $stock = $productVariation->productVariationStocks()->where('warehouse_id', $posCart->warehouse_id)->first();
                if ($stock) {
                    $stock->stock_qty -= $orderItem->qty;
                    $stock->save();
                }

                // category sales count for only root category
                $categories = $product->categories;
                $added = [];
                foreach ($categories as $cat) {
                    $rootParentCategory = CategoryTrait::getRootParentCategory($cat);
                    if (! in_array($rootParentCategory->id, $added)) {
                        $rootParentCategory->total_sale_count += $orderItem->qty;
                        $rootParentCategory->total_sale_amount += $orderItem->total_price;
                        $rootParentCategory->save();
                        array_push($added, $rootParentCategory->id);
                    }
                }

                // sales brands count
                $brand = $product->brand;
                if ($brand) {
                    $brand->total_sale_count += $orderItem->qty;
                    $brand->total_sale_amount += $orderItem->total_price;
                    $brand->save();
                }
            }

            $order->amount = $shopSubTotal;
            $order->tax_amount = $shopTax;
            $order->shipping_charge_amount = $shopShippingCharge;
            $order->discount_amount = $shopDiscount;
            $order->coupon_discount_amount = $shopCouponDiscount;
            $orderTotal = $shopSubTotal + $shopTax + $shopShippingCharge - $shopDiscount - $shopCouponDiscount;
            $order->total_amount = $orderTotal;

            // Set paid/due amounts for POS orders
            $paymentMethod = $request->paymentMethod ?? 'cash_on_delivery';
            $bkashAmount = $request->filled('bkash_amount') ? (float) $request->bkash_amount : 0;
            $isCod = $paymentMethod === 'cash_on_delivery';

            if (! $isCod && $bkashAmount > $orderTotal) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'status' => 422,
                    'message' => translate('bKash amount cannot exceed the order total'),
                    'result' => null,
                ], 422);
            }

            if ($isCod) {
                $order->paid_amount = 0;
                $order->due_amount = $orderTotal;
                $order->payment_status = 'unpaid';
            } else {
                $order->paid_amount = $bkashAmount;
                $order->due_amount = $orderTotal - $order->paid_amount;
                $order->payment_status = $order->due_amount > 0 ? 'partial' : 'paid';
            }

            $order->save();

            OrderUpdate::create([
                'order_id' => $order->id,
                'user_id' => userId(),
                'status' => 'Processing',
                'type' => 'default',
                'note' => 'Order has been placed.',
                'created_by' => userId(),
            ]);

            // grand summary
            $grandSubtotal += $shopSubTotal;
            $grandTax += $shopTax;
            $grandShippingCharge += $shopShippingCharge;
            $grandDiscount += $shopDiscount;
            $grandCouponDiscount += $shopCouponDiscount;

            $grandTotal = $grandSubtotal + $grandTax + $grandShippingCharge - $grandDiscount - $grandCouponDiscount;

            // transaction
            $transaction = new Transaction;
            $transaction->amount = $grandSubtotal;
            $transaction->tax_amount = $grandTax;
            $transaction->shipping_charge_amount = $grandShippingCharge;
            $transaction->discount_amount = $grandDiscount;
            $transaction->coupon_discount_amount = $grandCouponDiscount;
            $transaction->total_amount = $grandTotal;
            $transaction->payment_method = $paymentMethod;

            if ($isCod) {
                $transaction->status = 'unpaid';
            } elseif ($paymentMethod === 'bkash') {
                $transaction->payment_details = json_encode([
                    'payment_method' => 'bkash',
                    'paid_amount' => $order->paid_amount,
                    'due_amount' => $order->due_amount,
                ]);
                $transaction->status = $order->due_amount > 0 ? 'partial' : 'paid';
            }

            $transaction->save();

            $orderGroup->transaction_id = $transaction->id;
            $orderGroup->save();

            // Record commission/profit log and payment updates
            calculateCommission($order);
            syncOrderProfitLog($order);

            if ($isCod) {
                // COD orders remain unpaid until payment is collected on delivery
            } elseif ($paymentMethod === 'bkash') {
                $orderNote = 'bKash payment received: '.formatPrice($order->paid_amount).'.';
                if ($order->due_amount > 0) {
                    $orderNote .= ' Due amount: '.formatPrice($order->due_amount).'.';
                }

                OrderUpdate::create([
                    'order_id' => $order->id,
                    'user_id' => userId(),
                    'status' => $order->payment_status === 'paid' ? 'Paid' : 'Partially Paid',
                    'note' => $orderNote,
                    'created_by' => userId(),
                ]);
            }

            // clear cart
            $posCartGroup->posCarts()->delete();
            $posCartGroup->delete();

            // complete transaction
            DB::commit();

            // Send order-placed SMS to the customer (no-op when no phone, e.g. walk-in)
            OrderService::sendOrderPlacedSms($orderGroup);

            // Load relationships for invoice data
            $order->load(['orderItems.productVariation.product', 'orderGroup.transaction', 'user']);

            // Get warehouse separately (no relationship defined on Order model)
            $warehouse = Warehouse::find($order->warehouse_id);

            // Prepare invoice data
            $invoiceData = $this->__prepareInvoiceData($order, $warehouse);

            return response()->json([
                'success' => true,
                'status' => 200,
                'message' => translate('Order has been placed successfully'),
                'result' => $invoiceData,
            ], 200);
        } catch (\Throwable $th) {
            DB::rollback();
            \Log::error('POS Order Error: '.$th->getMessage().' - '.$th->getTraceAsString());

            return response()->json([
                'success' => false,
                'status' => 500,
                'message' => translate('Something went wrong'),
                'result' => null,
            ], 500);
        }
    }

    // Prepare invoice data
    private function __prepareInvoiceData($order, $warehouse = null)
    {
        try {
            // Calculate tax rate (simplified - assumes single rate)
            $taxRate = $order->amount > 0 ? (($order->tax_amount / $order->amount) * 100) : 0;

            // Format order items
            $items = $order->orderItems->map(function ($item) {
                $product = $item->productVariation->product ?? null;

                return [
                    'name' => $product ? $product->collectTranslation('name') : 'Product not found',
                    'unit_price' => (float) $item->unit_price,
                    'quantity' => (int) $item->qty,
                    'amount' => (float) $item->total_price,
                ];
            });

            // Get business info from settings
            $systemName = getSetting('systemName') ?? (function_exists('shopName') ? shopName() : 'Business Name');
            $systemAddress = getSetting('systemAddress') ?? '';
            $businessPhone = getSetting('phone') ?? '';
            $businessEmail = getSetting('email') ?? '';

            // Get logo from media files
            $logo = null;
            $logoFileId = getSetting('websiteHeaderLogo');
            if ($logoFileId) {
                $mediaFile = MediaFile::find($logoFileId);
                if ($mediaFile && $mediaFile->media_file) {
                    $logo = $mediaFile->media_file;
                }
            }

            $businessAddress = '';
            if ($warehouse) {
                $addressParts = array_filter([
                    $warehouse->name ?? '',
                    $warehouse->address ?? '',
                    $warehouse->city ?? '',
                    $warehouse->state ?? '',
                    $warehouse->postal_code ?? '',
                ]);
                $businessAddress = implode(', ', $addressParts);
            } else {
                $businessAddress = function_exists('getSetting') ? (getSetting('location') ?? '') : '';
            }

            // Get customer info safely
            $orderGroup = $order->orderGroup;
            $transaction = $orderGroup->transaction ?? null;

            // Prepare payment details for invoice
            $paymentSplits = [];
            $totalPaid = (float) $order->total_amount;
            $dueAmount = 0.0;
            $changeReturn = 0;

            if ($transaction && $transaction->payment_details) {
                $paymentDetails = json_decode($transaction->payment_details, true) ?: [];
                if (array_key_exists('paid_amount', $paymentDetails)) {
                    $totalPaid = (float) $paymentDetails['paid_amount'];
                    $dueAmount = (float) ($paymentDetails['due_amount'] ?? 0);
                } else {
                    $totalPaid = $paymentDetails['received_amount'] ?? (float) $order->total_amount;
                    $changeReturn = $paymentDetails['change_return'] ?? 0;
                }
            } elseif ($transaction && $transaction->payment_method === 'bkash') {
                $totalPaid = (float) $order->paid_amount;
                $dueAmount = (float) $order->due_amount;
            } elseif ($transaction && in_array($transaction->payment_method, ['cash_on_delivery', 'card_on_delivery'])) {
                $totalPaid = 0;
                $dueAmount = (float) $order->total_amount;
            }

            $qrCodeImage = null;
            $qrCodeUrl = null;
            $invoiceQrCodeEnabled = getSetting('invoiceQrCodeEnabled') != '0';
            if ($invoiceQrCodeEnabled) {
                try {
                    $orderHash = encodeInvoiceId($order->id);
                    $qrCodeUrl = route('invoice.public.verify', ['hash' => $orderHash]);

                    $qrCode = new QrCode(
                        data: $qrCodeUrl,
                        size: 150,
                        margin: 5,
                        foregroundColor: new Color(0, 0, 0)
                    );

                    $writer = new PngWriter;
                    $result = $writer->write($qrCode);
                    $qrCodeImage = 'data:image/png;base64,'.base64_encode($result->getString());
                } catch (\Exception $e) {
                    Log::error('Failed to generate QR code for POS invoice: '.$e->getMessage());
                    $qrCodeImage = null;
                    $qrCodeUrl = null;
                }
            }

            return [
                'order_number' => ($order->order_code ? getSetting('order_code_prefix') : '').($order->order_code ?? ''),
                'order_date' => date('d/m/Y', strtotime($order->created_at)),
                'business' => [
                    'name' => $systemName,
                    'address' => $businessAddress ?: $systemAddress,
                    'phone' => $businessPhone,
                    'email' => $businessEmail,
                    'logo' => $logo,
                ],
                'customer' => [
                    'name' => $orderGroup->name ?? '',
                    'address' => $orderGroup->shipping_address ?? '',
                    'phone' => $orderGroup->phone ?? '',
                    'email' => $orderGroup->email ?? '',
                ],
                'items' => $items->toArray(),
                'subtotal' => (float) $order->amount,
                'tax_rate' => round((float) $taxRate, 2),
                'tax_amount' => (float) $order->tax_amount,
                'shipping' => (float) $order->shipping_charge_amount,
                'discount' => (float) $order->discount_amount,
                'total' => (float) $order->total_amount,
                'notes' => $orderGroup->note ?? '',
                'payment_method' => $transaction->payment_method ?? '',
                'payment_splits' => $paymentSplits,
                'total_paid' => (float) $totalPaid,
                'due_amount' => (float) $dueAmount,
                'change_return' => (float) $changeReturn,
                'qr_code_image' => $qrCodeImage,
                'qr_code_url' => $qrCodeUrl,
            ];
        } catch (\Throwable $e) {
            \Log::error('Invoice Data Preparation Error: '.$e->getMessage().' - '.$e->getTraceAsString());
            throw $e;
        }
    }

    // Get recent orders for POS
    public function recentOrders(Request $request)
    {
        try {
            $limit = 10;

            $orders = Order::where('pos_order', 1)
                ->with(['orderGroup.transaction'])
                ->orderBy('created_at', 'desc')
                ->take($limit)
                ->get();

            $recentOrders = $orders->map(function ($order) {
                $orderGroup = $order->orderGroup;
                $transaction = $orderGroup->transaction ?? null;

                return [
                    'id' => $order->id,
                    'order_code' => ($order->order_code ? getSetting('order_code_prefix') : '').($order->order_code ?? ''),
                    'created_at' => date('d M Y, h:i A', strtotime($order->created_at)),
                    'customer_name' => $orderGroup->name ?? '',
                    'total_amount' => (float) $order->total_amount,
                    'payment_method' => $transaction->payment_method ?? '',
                ];
            });

            return response()->json([
                'success' => true,
                'status' => 200,
                'message' => '',
                'result' => $recentOrders,
            ], 200);
        } catch (\Throwable $e) {
            \Log::error('Recent Orders Error: '.$e->getMessage().' - '.$e->getTraceAsString());

            return response()->json([
                'success' => false,
                'status' => 500,
                'message' => translate('Something went wrong'),
                'result' => null,
            ], 500);
        }
    }

    // Get order invoice data for printing
    public function getOrderInvoice(Request $request, $orderId)
    {
        try {
            $warehouseId = $request->warehouseId;

            $warehouse = null;
            if ($warehouseId) {
                $warehouse = Warehouse::find($warehouseId);
            }

            $order = Order::with(['orderItems.productVariation.product', 'orderGroup.transaction'])
                ->where('id', $orderId)
                ->first();

            if (! $order) {
                return response()->json([
                    'success' => false,
                    'status' => 404,
                    'message' => translate('Order not found'),
                    'result' => null,
                ], 404);
            }

            $invoiceData = $this->__prepareInvoiceData($order, $warehouse);

            return response()->json([
                'success' => true,
                'status' => 200,
                'message' => '',
                'result' => $invoiceData,
            ], 200);
        } catch (\Throwable $e) {
            \Log::error('Get Order Invoice Error: '.$e->getMessage().' - '.$e->getTraceAsString());

            return response()->json([
                'success' => false,
                'status' => 500,
                'message' => translate('Something went wrong'),
                'result' => null,
            ], 500);
        }
    }
}
