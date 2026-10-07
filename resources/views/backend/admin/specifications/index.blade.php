@extends('layouts.admin')

@section('title')
    {{ translate('Specification List') }} | {{ getSetting('systemName') }}
@endsection

@section('content')
    <!-- start::dashboard breadcrumb -->
    <div class="dashboard-nav pt-6 flex items-center justify-between mb-9">
        <div class="flex items-center">
            <span class="text-xl mr-3 text-secondary">
                <i class="fa-regular fa-folder"></i>
            </span>
            <span class="text-sm sm:text-base font-bold">
                {{ translate('Specification List') }}
            </span>
        </div>

        <div class="max-sm:hidden flex items-center gap-2">
            <a href="{{ route('admin.dashboard') }}" class="font-bold ">{{ translate('Dashboard') }}</a>
            <span class="text-primary dark:text-muted">
                <i class="fa-solid fa-chevron-right"></i>
            </span>
            <p class="text-muted">{{ translate('Specification List') }}</p>
        </div>
    </div>
    <!-- end::dashboard breadcrumb -->

    <div class="grid md:grid-cols-6 gap-3">
        <div class="md:col-span-4 card theme-table">
            <div
                class="card__title border-none theme-table__filter flex flex-col md:flex-row xl:items-center justify-between gap-3">

                <div></div>

                <x-backend.forms.search-form searchKey="{{ $searchKey }}" class="max-w-[380px]" />
            </div>

            <table class="product-list-table footable w-full">
                <thead class="uppercase text-left bg-primary/10">
                    <tr>
                        <th>
                            #
                        </th>
                        <th>
                            {{ translate('Specification Name') }}
                        </th>
                        <th>{{ translate('Show/Hide') }}</th>
                        <th data-breakpoints="xs sm" class="w-[130px]">
                            {{ translate('Options') }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($specifications as $key => $specification)
                        <tr>
                            <td>{{ $key + 1 + ($specifications->currentPage() - 1) * $specifications->perPage() }}
                            </td>

                            <td>
                                <div class=" line-clamp-2">
                                    {{ $specification->name }}
                                </div>
                            </td>

                            <td>
                                @can('edit_specifications')
                                    <x-backend.inputs.checkbox toggler="true"
                                        data-route="{{ route('admin.specifications.status') }}" name="isActiveCheckbox"
                                        value="{{ $specification->id }}" data-status="{{ $specification->is_active }}"
                                        isChecked="{{ (int) $specification->is_active == 1 }}" />
                                @endcan
                            </td>

                            <td>
                                <div class="option-dropdown w-[130px]" tabindex="0">
                                    <div class="option-dropdown__toggler bg-secondary/10 text-secondary">
                                        <span>{{ translate('Actions') }}</span>
                                    </div>

                                    <div class="option-dropdown__options">
                                        <ul>
                                            @can('edit_specifications')
                                                <li>
                                                    <a href="{{ route('admin.specifications.edit', ['specification' => $specification->id, 'lang_key' => config('app.default_language')]) }}&translate"
                                                        class="option-dropdown__option">
                                                        {{ translate('Edit') }}
                                                    </a>
                                                </li>
                                            @endcan

                                            @can('delete_specifications')
                                                <li>
                                                    <x-backend.inputs.delete-link
                                                        href="{{ route('admin.specifications.destroy', ['specification' => $specification->id]) }}" />
                                                </li>
                                            @endcan
                                        </ul>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>

            <div class="card__footer">
                {{ $specifications->links() }}
            </div>
        </div>
        <div class="md:col-span-2">
            @can('create_specifications')
                <div class="card">
                    <h4 class="card__title">{{ translate('Add New Specification') }}</h4>
                    <div class="card__content">
                        <x-backend.forms.specification-form />
                    </div>
                </div>
            @endcan
        </div>
    </div>
@endsection
