@extends('layouts.admin')

@section('title')
    {{ translate('Stock Requests') }} | {{ getSetting('systemName') }}
@endsection

@section('content')
    <div class="dashboard-nav pt-6 flex items-center justify-between mb-9">
        <div class="flex items-center">
            <span class="text-xl mr-3 text-secondary">
                <i class="fa-regular fa-bell"></i>
            </span>
            <span class="text-sm sm:text-base font-bold">
                {{ translate('Stock Requests') }}
            </span>
        </div>

        <div class="max-sm:hidden flex items-center gap-2">
            <a href="{{ route('admin.dashboard') }}" class="font-bold ">{{ translate('Dashboard') }}</a>
            <span class="text-primary dark:text-muted">
                <i class="fa-solid fa-chevron-right"></i>
            </span>
            <p class="text-muted">{{ translate('Stock Requests') }}</p>
        </div>
    </div>

    <div class="card">
        <div class="theme-table">
            <div class="card__title border-none theme-table__filter flex flex-col lg:flex-row xl:items-center justify-between gap-3">
                <div></div>
                <div class="flex items-center gap-2">
                    @php($pendingCount = \App\Models\StockRequest::pending()->count())
                    @if($pendingCount > 0)
                        <span class="inline-block px-3 py-1 rounded text-sm font-medium text-white bg-badge-warning">
                            {{ $pendingCount }} {{ translate('Pending Requests') }}
                        </span>
                    @endif
                </div>
            </div>

            <table class="product-list-table footable w-full">
                <thead class="uppercase text-left bg-primary/10">
                    <tr>
                        <th data-breakpoints="xs sm md">{{ translate('Product DETAILS') }}</th>
                        <th data-breakpoints="xs sm">{{ translate('Customer') }}</th>
                        <th data-breakpoints="xs sm">{{ translate('Qty') }}</th>
                        <th data-breakpoints="xs sm">{{ translate('Status') }}</th>
                        <th data-breakpoints="xs sm">{{ translate('Date') }}</th>
                        <th data-breakpoints="xs sm md" class="w-[130px]">
                            {{ translate('Options') }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($items as $item)
                        <tr>
                            <td>
                                <div class="inline-flex items-center gap-4">
                                    <div class="max-xs:hidden">
                                        @if($item->product_image_url)
                                            <img src="{{ $item->product_image_url }}" alt=""
                                                class="w-12 h-12 lg:w-[70px] lg:h-[80px] rounded-md"
                                                onerror="this.onerror=null;this.src='{{ asset('images/image-error.png') }}';" />
                                        @else
                                            <div class="w-12 h-12 lg:w-[70px] lg:h-[80px] rounded-md bg-gray-100 flex items-center justify-center">
                                                <i class="fa-solid fa-image text-gray-400"></i>
                                            </div>
                                        @endif
                                    </div>
                                    <div class="line-clamp-2 max-w-[250px]">
                                        {{ $item->product_name }}
                                        @if($item->product_sku)
                                            <p class="text-xs text-gray-500">SKU: {{ $item->product_sku }}</p>
                                        @endif
                                        @if(isset($item->product_details['variation_name']))
                                            <p class="text-xs text-info">{{ $item->product_details['variation_name'] }}</p>
                                        @endif
                                    </div>
                                </div>
                            </td>
                            <td>
                                @if($item->user_id && $item->user)
                                    <div>
                                        {{ $item->user->name }}
                                        <p class="text-xs text-gray-500">{{ $item->user->email }}</p>
                                    </div>
                                @else
                                    <div>
                                    <span class="inline-block px-2 py-0.5 rounded text-xs font-medium text-white bg-badge-info">
                                        {{ translate('Guest') }}
                                    </span>
                                        <p class="text-xs text-gray-500 mt-1">{{ $item->email ?? '-' }}</p>
                                    </div>
                                @endif
                            </td>
                            <td>
                                {{ $item->quantity }}
                            </td>
                            <td>
                                @can('edit_stock_requests')
                                    <div class="flex items-center gap-2 stock-request-status-control">
                                        <select
                                            class="stock-request-status-select min-w-[120px] rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                                            data-current-status="{{ $item->status }}"
                                            aria-label="{{ translate('Stock request status') }}">
                                            <option value="0" {{ $item->status == 0 ? 'selected' : '' }}>
                                                {{ translate('Pending') }}
                                            </option>
                                            <option value="1" {{ $item->status == 1 ? 'selected' : '' }}>
                                                {{ translate('Fulfilled') }}
                                            </option>
                                            <option value="2" {{ $item->status == 2 ? 'selected' : '' }}>
                                                {{ translate('Cancelled') }}
                                            </option>
                                        </select>
                                        <button type="button"
                                            class="stock-request-status-save w-8 h-8 inline-flex items-center justify-center rounded bg-primary text-white"
                                            data-update-url="{{ route('admin.stock-requests.updateStatus', $item->id) }}"
                                            data-admin-note="{{ $item->admin_note }}"
                                            title="{{ translate('Update Status') }}">
                                            <i class="fa-solid fa-check text-xs"></i>
                                        </button>
                                    </div>
                                @else
                                    @if($item->status == 0)
                                        <span class="inline-block px-2 py-0.5 rounded text-xs font-medium text-white bg-badge-warning">
                                            {{ translate('Pending') }}
                                        </span>
                                    @elseif($item->status == 1)
                                        <span class="inline-block px-2 py-0.5 rounded text-xs font-medium text-white bg-badge-success">
                                            {{ translate('Fulfilled') }}
                                        </span>
                                    @else
                                        <span class="inline-block px-2 py-0.5 rounded text-xs font-medium text-white bg-badge-danger">
                                            {{ translate('Cancelled') }}
                                        </span>
                                    @endif
                                @endcan
                            </td>
                            <td>
                                {{ date('d M, Y', strtotime($item->created_at)) }}
                            </td>
                            <td>
                                <div class="option-dropdown w-[130px]" tabindex="0">
                                    <div class="option-dropdown__toggler bg-secondary/10 text-secondary">
                                        <span>{{ translate('Actions') }}</span>
                                    </div>

                                    <div class="option-dropdown__options">
                                        <ul>
                                            <li>
                                                <a href="{{ route('admin.stock-requests.show', $item->id) }}"
                                                    class="option-dropdown__option">
                                                    <i class="fa-solid fa-eye mr-1"></i>{{ translate('View') }}
                                                </a>
                                            </li>
                                            @can('delete_stock_requests')
                                                <li>
                                                    <form action="{{ route('admin.stock-requests.destroy', $item->id) }}" method="POST"
                                                          onsubmit="return confirm('Are you sure?');" class="m-0">
                                                        @csrf
                                                        @method('DELETE')
                                                        <button type="submit" class="option-dropdown__option w-full text-start border-0 bg-transparent cursor-pointer">
                                                            <i class="fa-solid fa-trash mr-1"></i>{{ translate('Delete') }}
                                                        </button>
                                                    </form>
                                                </li>
                                            @endcan
                                        </ul>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="text-center py-8 text-muted">
                                {{ translate('No stock requests found') }}
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>

            <div class="card__footer">
                {{ $items->appends(request()->except('page'))->links() }}
            </div>
        </div>
    </div>
@endsection

@section('scripts')
    <script>
        $(document).on('click', '.stock-request-status-save', function() {
            const $button = $(this);
            const $control = $button.closest('.stock-request-status-control');
            const $select = $control.find('.stock-request-status-select');
            const status = $select.val();

            if (status === String($select.data('current-status'))) {
                notifyMe('warning', '{{ translate('Please select a different status') }}');
                return;
            }

            const $modal = $('#confirm-modal');
            const $form = $modal.find('form');
            const adminNote = $button.data('admin-note') || '';

            $form.attr('action', $button.data('update-url'));
            $('#confirm-modal-method').val('PUT');
            $('#confirm-modal-title').html('{{ translate('Update Stock Request Status') }}');
            $('#confirm-modal-text').html('{{ translate('Are you sure you want to update this stock request status?') }}');

            $form.find('.stock-request-confirm-field').remove();
            $form.append($('<input>', {
                type: 'hidden',
                class: 'stock-request-confirm-field',
                name: 'status',
                value: status
            }));
            $form.append($('<input>', {
                type: 'hidden',
                class: 'stock-request-confirm-field',
                name: 'admin_note',
                value: adminNote
            }));

            const $submitBtn = $('#confirm-modal-submit');
            $submitBtn.text('{{ translate('Update') }}');
            $submitBtn.removeClass().addClass(
                'modal__btn leading-none text-white px-10 py-2.5 rounded uppercase button--primary'
            );

            MicroModal.show('confirm-modal');
        });
    </script>
@endsection
