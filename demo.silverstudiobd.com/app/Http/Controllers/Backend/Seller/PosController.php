<?php

namespace App\Http\Controllers\Backend\Seller;

use App\Http\Controllers\Controller;
use App\Models\Country;
use Illuminate\Http\Request;

class PosController extends Controller
{
    # dashboard
    public function index(Request $request)
    {
        $symbolAlignMent = [
            'symbol_first',
            'amount_first',
            'symbol_space',
            'amount_space',
        ];

        $settings = [
            # currency settings
            'currency'      => [
                'code'      => getSetting('currencyCode') ?? 'usd',
                'symbol'    => [
                    'position' => getSetting('currencySymbolAlignment') ? $symbolAlignMent[getSetting('currencySymbolAlignment') ? getSetting('currencySymbolAlignment') - 1  : 0] : 'symbol_first',

                    'show'  => getSetting('currencySymbol') ?? '$'
                ],
                'thousandSeparator' => getSetting('thousandSeparator') ?? null,
                'numOfDecimals'     => getSetting('numOfDecimals') ?? 0,
                'decimalSeparator'  => getSetting('decimalSeparator') ?? '.',
            ],
            'countries'     => Country::where('is_active', 1)->get(),
            'canOverrideStock' => in_array(user()->user_type, ['admin', 'staff'], true),
        ];

        $view = view('backend.seller.pos.index', compact('settings'));

        return $view;
    }
}
