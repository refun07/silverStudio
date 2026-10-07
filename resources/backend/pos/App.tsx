import React, {
    ChangeEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import toast from 'react-hot-toast';
import { FaTrashAlt } from 'react-icons/fa';
import { FiSettings, FiEdit2 } from 'react-icons/fi';
import { LiaTimesSolid } from 'react-icons/lia';
import { AiOutlinePlus } from 'react-icons/ai';
import { Drawer } from 'vaul';
import { useSearchParams } from 'react-router-dom';
import {
    currencyFormatter,
    paddedNumber,
} from '../../frontend/utils/numberFormatter';
import Button from '../react/components/inputs/Button';
import Counter from '../react/components/inputs/Counter';
import Image from '../react/components/Image';
import Input from '../react/components/inputs/Input';
import SearchForm from '../react/components/inputs/SearchForm';
import SelectInput from '../react/components/inputs/SelectInput';
import Spinner from '../react/components/loader/Spinner';
import Pagination from '../react/components/pagination/Pagination';
import { IPaginationMeta } from '../react/types';
import { objectToFormData } from '../react/utils/ObjectFormData';
import { translate } from '../react/utils/translate';
import ProductCard from './components/ProductCard';
import InvoiceModal from './components/InvoiceModal';
import CustomerModal from './popup/CustomerModal';
import CustomerSearchModal from './popup/CustomerSearchModal';
import ModalWrapper from './popup/ModalWrapper';
import SubmitOrderModal from './popup/SubmitOrderModal';
import { useScrollIntoViewOnFocus } from './hooks/useScrollIntoViewOnFocus';
import {
    IAddress,
    ICustomer,
    IFilterData,
    IFilters,
    IPosCartGroup,
    IPosProductVariation,
} from './types';
import {
    getAddresses,
    getCustomerFilter,
    getPosFilterData,
    getPosProductsVariations,
    addToPosCartGroup,
    updatePosCartItem,
} from './utils/actions';
import {
    getRemainingStockForVariation,
    getStockBadgeMeta,
    getStockForWarehouse,
} from './utils/helpers';

type ProductViewMode = 'product-first' | 'classic';

type ProductGroup = {
    productId: number;
    productName: string;
    image: string;
    variations: IPosProductVariation[];
};

const PRODUCT_FIRST_VARIATION_LIMIT = 30;

const uniqueCustomersById = (customers: ICustomer[] = []) => {
    const uniqueCustomers = new Map<number, ICustomer>();

    customers.forEach((customer) => {
        if (!uniqueCustomers.has(customer.id)) {
            uniqueCustomers.set(customer.id, customer);
        }
    });

    return Array.from(uniqueCustomers.values());
};

const getVariationDiscountPercent = (variation: IPosProductVariation): number => {
    const regularPrice = Number(variation.basePrice) || 0;
    const offerPrice = Number(variation.discountedBasePrice) || 0;

    if (regularPrice <= 0 || offerPrice >= regularPrice) {
        return 0;
    }

    return Math.round(((regularPrice - offerPrice) / regularPrice) * 100);
};

const getProductGroupDisplayVariation = (
    productGroup: ProductGroup,
): IPosProductVariation | null => {
    if (!productGroup.variations.length) {
        return null;
    }

    return [...productGroup.variations].sort(
        (a, b) => Number(a.discountedBasePrice) - Number(b.discountedBasePrice),
    )[0];
};

const getDefaultWarehouseId = (
    warehouses: IFilterData['warehouses'],
): number | null => {
    if (warehouses.length === 0) {
        return null;
    }

    const defaultWarehouse = warehouses.find(
        (warehouse) => warehouse.name.toLowerCase() === 'default',
    );

    return defaultWarehouse?.id ?? warehouses[0].id;
};

const App = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState({
        loadingProduct: false,
        loadingSelectedProduct: true,
    });

    const [filterData, setFilterData] = useState<IFilterData>({
        warehouses: [],
        brands: [],
        categories: [],
    });
    const [filters, setFilters] = useState<IFilters>({
        page: 1,
        warehouseId: '',
        brandId: '',
        categoryId: '',
        searchKey: '',
    });
    const [posProducts, setPosProducts] = useState<IPosProductVariation[]>([]);
    const [paginationData, setPaginationData] = useState<IPaginationMeta>();

    const [customerFilters, setCustomerFilters] = useState<ICustomer[]>();
    const [customer, setCustomer] = useState<ICustomer>();
    const [address, setAddress] = useState<IAddress | null>(null);
    const [posCartGroup, setPosCartGroup] = useState<IPosCartGroup>();

    // Track pending customer from URL params for auto-selection
    const [pendingCustomerId, setPendingCustomerId] = useState<number | null>(null);
    const hasAutoSelectedCustomer = useRef(false);

    const [discount, setDiscount] = useState<string | number>('');
    const [shipping, setShipping] = useState<string | number>('');
    const [tax, setTax] = useState<string | number>('');

    const handleNumericChange = (
        value: string,
        setter: React.Dispatch<React.SetStateAction<string | number>>,
    ) => {
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setter(value);
        }
    };

    const handleNumericBlur = (
        value: string | number,
        setter: React.Dispatch<React.SetStateAction<string | number>>,
    ) => {
        setter(Number(value) || '');
    };

    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [currentInvoiceData, setCurrentInvoiceData] = useState<any>(null);
    const [searchDraft, setSearchDraft] = useState('');
    const stockOverride = false;
    const productViewMode: ProductViewMode = 'product-first';
    const [selectedProductGroup, setSelectedProductGroup] =
        useState<ProductGroup | null>(null);

    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isCustomerSearchModalOpen, setIsCustomerSearchModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<ICustomer | undefined>(undefined);
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
    const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const cartBodyRef = useRef<HTMLDivElement>(null);
    useScrollIntoViewOnFocus(cartBodyRef, isMobile && isCartDrawerOpen);

    const selectedWarehouseId = filters.warehouseId
        ? Number(filters.warehouseId)
        : null;
    const productGroups = useMemo(() => {
        const groupedProducts = new Map<number, ProductGroup>();

        posProducts.forEach((variation) => {
            const existingGroup = groupedProducts.get(variation.productId);

            if (existingGroup) {
                existingGroup.variations.push(variation);
                return;
            }

            groupedProducts.set(variation.productId, {
                productId: variation.productId,
                productName: variation.product.name,
                image: variation.image || variation.product.thumbnailImg,
                variations: [variation],
            });
        });

        return Array.from(groupedProducts.values());
    }, [posProducts]);
    const customerOptions = useMemo(
        () => uniqueCustomersById(customerFilters || []),
        [customerFilters],
    );

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (!isMobile) return;
        const saved = localStorage.getItem('pos_mobile_filters');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const newParams = new URLSearchParams(searchParams);
                if (parsed.categoryId && !newParams.get('categoryId')) {
                    newParams.set('categoryId', parsed.categoryId);
                }
                if (newParams.toString() !== searchParams.toString()) {
                    setSearchParams(newParams, { replace: true });
                }
            } catch {
                // ignore parse errors
            }
        }
    }, [isMobile]);

    useEffect(() => {
        if (!isMobile) return;
        localStorage.setItem('pos_mobile_filters', JSON.stringify({
            categoryId: filters.categoryId,
        }));
    }, [filters, isMobile]);

    useEffect(() => {
        getPosFilterData().then((data) => setFilterData(data));
        getCustomerFilter().then((data) =>
            setCustomerFilters(uniqueCustomersById(data)),
        );
    }, []);

    useEffect(() => {
        if (!searchParams.get('brandId')) {
            return;
        }

        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('brandId');
        nextSearchParams.set('page', '1');
        setSearchParams(nextSearchParams, { replace: true });
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const defaultWarehouseId = getDefaultWarehouseId(filterData.warehouses);
        if (!defaultWarehouseId || searchParams.get('warehouseId')) {
            return;
        }

        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set('page', '1');
        nextSearchParams.set('warehouseId', String(defaultWarehouseId));
        setSearchParams(nextSearchParams, { replace: true });
    }, [filterData.warehouses, searchParams, setSearchParams]);

    // Handle abandoned cart transfer - load cart from query params
    useEffect(() => {
        const posCartGroupId = searchParams.get('posCartGroupId');
        const customerId = searchParams.get('customerId');

        if (posCartGroupId) {
            // Store customerId for later auto-selection when customerFilters load
            if (customerId) {
                setPendingCustomerId(Number(customerId));
            }

            // Load the cart data
            loadAbandonedCartData(Number(posCartGroupId));

            // Clean up URL params
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('posCartGroupId');
            newSearchParams.delete('customerId');
            setSearchParams(newSearchParams, { replace: true });
        }
    }, []);

    // Auto-select customer when both customerFilters and pendingCustomerId are available
    useEffect(() => {
        if (
            customerOptions.length > 0 &&
            pendingCustomerId !== null &&
            !hasAutoSelectedCustomer.current
        ) {
            const matchedCustomer = customerOptions.find(
                (c) => c.id === pendingCustomerId,
            );
            if (matchedCustomer) {
                getAddresses(matchedCustomer.id)
                    .then((addresses) =>
                        handleCustomerSuccess(matchedCustomer, addresses[0]),
                    )
                    .catch(() => handleCustomerSuccess(matchedCustomer));
                hasAutoSelectedCustomer.current = true;
                setPendingCustomerId(null);
            }
        }
    }, [customerOptions, pendingCustomerId]);

    const loadAbandonedCartData = async (posCartGroupId: number) => {
        try {
            // Fetch the cart group data
            const response = await fetch(`/${window.location.pathname.split('/')[1]}/api/pos/cart/hold`);
            const result = await response.json();

            if (result.success && result.result) {
                // Find the specific cart group
                const cartGroup = result.result.find((group: any) => group.id === posCartGroupId);

                if (cartGroup) {
                    setPosCartGroup(cartGroup);

                    // Set the warehouse from the first cart item
                    if (cartGroup.posCarts && cartGroup.posCarts.length > 0) {
                        const firstCart = cartGroup.posCarts[0];
                        if (firstCart.warehouseId) {
                            // Update filters with warehouse
                            const newFilters = { ...filters, warehouseId: String(firstCart.warehouseId) };
                            setFilters(newFilters);

                            // Update search params
                            const newSearchParams = new URLSearchParams(searchParams);
                            newSearchParams.set('warehouseId', String(firstCart.warehouseId));
                            setSearchParams(newSearchParams);
                        }
                    }

                    toast.success('Cart loaded from abandoned order');
                } else {
                    toast.error('Cart not found');
                }
            }
        } catch (error) {
            console.error('Error loading abandoned cart:', error);
            toast.error('Failed to load cart data');
        }
    };

    useEffect(() => {
        if (!filters.warehouseId) {
            return;
        }
        setIsLoading((currentLoading) => ({
            ...currentLoading,
            loadingProduct: true,
        }));

        const productFilters: IFilters = {
            ...filters,
            limit:
                productViewMode === 'product-first'
                    ? PRODUCT_FIRST_VARIATION_LIMIT
                    : undefined,
        };

        const timerId = setTimeout(() => {
            getPosProductsVariations(productFilters)
                .then((data) => {
                    setPosProducts(data.data);
                    setPaginationData(data.meta);
                })
                .finally(() => {
                    setIsLoading((currentLoading) => ({
                        ...currentLoading,
                        loadingProduct: false,
                    }));
                });
        }, 500);

        return () => clearTimeout(timerId);
    }, [filters, productViewMode]);

    useEffect(() => {
        const filters: IFilters = {
            page: Number(searchParams.get('page')) || 1,
            warehouseId: searchParams.get('warehouseId'),
            brandId: searchParams.get('brandId'),
            categoryId: searchParams.get('categoryId'),
            searchKey: searchParams.get('searchKey'),
        };
        setFilters(filters);
    }, [searchParams]);

    useEffect(() => {
        setSearchDraft(searchParams.get('searchKey') || '');
    }, [searchParams]);

    const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
        setSearchDraft(e.target.value);
    };

    useEffect(() => {
        const timerId = setTimeout(() => {
            const nextSearchParams = new URLSearchParams(searchParams);
            const normalizedSearch = searchDraft.trim();
            const currentSearch = searchParams.get('searchKey')?.trim() || '';

            if (normalizedSearch === currentSearch) {
                return;
            }

            if (normalizedSearch) {
                nextSearchParams.set('searchKey', normalizedSearch);
            } else {
                nextSearchParams.delete('searchKey');
            }

            nextSearchParams.set('page', '1');

            if (nextSearchParams.toString() !== searchParams.toString()) {
                setSearchParams(nextSearchParams, { replace: true });
            }
        }, 350);

        return () => clearTimeout(timerId);
    }, [searchDraft, searchParams, setSearchParams]);

    const handleFilter = (name: string, value: string | number) => {
        const nextSearchParams = new URLSearchParams(searchParams);

        if (value === '' || value === null) {
            nextSearchParams.delete(name);
        } else {
            nextSearchParams.set(name, String(value));
        }

        nextSearchParams.set('page', '1');
        setSearchParams(nextSearchParams);
    };

    const addProductToCart = async (product: IPosProductVariation) => {
        try {
            const productInCart = posCartGroup?.posCarts.find(
                (cart) => cart.productVariationId === product.id,
            );

            if (productInCart) {
                const posCarts = await updatePosCartItem(
                    objectToFormData({
                        id: productInCart.id,
                        action: 'increase',
                        overrideStock: stockOverride ? 1 : 0,
                    }),
                );

                setPosCartGroup({
                    posCartGroupId: posCartGroup!.posCartGroupId,
                    posCarts,
                });
            } else {
                const newPosCartGroup = await addToPosCartGroup(
                    objectToFormData({
                        firstCartProduct: posCartGroup?.posCartGroupId ? null : 1,
                        posCartGroupId: posCartGroup?.posCartGroupId || null,
                        productVariationId: product.id,
                        warehouseId: selectedWarehouseId,
                        qty: 1,
                        overrideStock: stockOverride ? 1 : 0,
                    }),
                );

                setPosCartGroup({
                    posCartGroupId:
                        posCartGroup?.posCartGroupId ||
                        newPosCartGroup.posCartGroupId,
                    posCarts: newPosCartGroup.posCarts,
                });
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : translate('Failed to add product');
            toast.error(message);
        }
    };

    const handleQuantityChange = (
        posCartId: number,
        action: 'increase' | 'decrease' | 'delete',
    ) => {
        updatePosCartItem(
            objectToFormData({
                id: posCartId,
                action,
                overrideStock: stockOverride ? 1 : 0,
            }),
        )
            .then((posCarts) => setPosCartGroup({ ...posCartGroup!, posCarts }))
            .catch((error) => {
                const message =
                    error instanceof Error
                        ? error.message
                        : translate('Failed to update cart');
                toast.error(message);
            });
    };

    const handleSubmitOrderSuccess = (invoiceData?: any) => {
        console.log('handleSubmitOrderSuccess called with:', invoiceData);
        setPosCartGroup(undefined);
        setCustomer(undefined);
        setAddress(null);
        setDiscount('');
        setShipping('');
        setTax('');

        if (invoiceData) {
            console.log('Setting invoice data and showing modal');
            setCurrentInvoiceData(invoiceData);
            setShowInvoiceModal(true);
        } else {
            console.log('No invoice data received');
        }
    };

    const handleResetOrder = () => {
        setPosCartGroup(undefined);
    };

    const handleCustomerFiltersUpdate = useCallback((customers: ICustomer[]) => {
        setCustomerFilters(uniqueCustomersById(customers));
    }, []);

    const handleCustomerSuccess = useCallback((newCustomer: ICustomer, newAddress?: IAddress) => {
        setCustomer(newCustomer);
        setAddress(newAddress || null);
        setCustomerFilters((currentCustomers) =>
            uniqueCustomersById([newCustomer, ...(currentCustomers || [])]),
        );
    }, []);

    const totalPrice =
        (posCartGroup?.posCarts.reduce(
            (acc, posCart) =>
                acc + posCart.variation.discountedBasePrice * posCart.qty,
            0,
        ) || 0) -
        Number(discount) +
        Number(shipping) +
        Number(tax);

    const getCartLineLeftStock = (
        posCart: IPosCartGroup['posCarts'][number],
    ) => {
        return getStockForWarehouse(posCart.variation, posCart.warehouseId) - posCart.qty;
    };

    const getProductGroupStock = (productGroup: ProductGroup) => {
        return productGroup.variations.reduce(
            (total, variation) =>
                total +
                Math.max(
                    getRemainingStockForVariation(
                        variation,
                        selectedWarehouseId,
                        posCartGroup?.posCarts || [],
                        variation.id,
                    ),
                    0,
                ),
            0,
        );
    };

    const hasSelectableVariations = (productGroup: ProductGroup) => {
        return (
            productGroup.variations.length > 1 ||
            productGroup.variations.some(
                (variation) => variation.combinations.length > 0,
            )
        );
    };

    const canSelectProductGroup = (productGroup: ProductGroup) => {
        return stockOverride || getProductGroupStock(productGroup) > 0;
    };

    const handleProductGroupSelect = (productGroup: ProductGroup) => {
        if (!canSelectProductGroup(productGroup)) {
            toast.error(translate('Stock not available for this item'));
            return;
        }

        if (hasSelectableVariations(productGroup)) {
            setSelectedProductGroup(productGroup);
            return;
        }

        void addProductToCart(productGroup.variations[0]);
    };

    return (
        <>
            <InvoiceModal
                isActive={showInvoiceModal}
                onClose={() => setShowInvoiceModal(false)}
                invoiceData={currentInvoiceData}
            />
            <ModalWrapper
                isActive={!!selectedProductGroup}
                size="lg"
                onClose={() => setSelectedProductGroup(null)}
                className="max-sm:w-[calc(100%-16px)]"
            >
                <div className="theme-modal__header">
                    <h5 className="text-muted">
                        {selectedProductGroup?.productName}
                    </h5>
                    <button
                        type="button"
                        className="text-xl text-white sm:text-muted"
                        onClick={() => setSelectedProductGroup(null)}
                    >
                        <LiaTimesSolid />
                    </button>
                </div>

                <div className="theme-modal__body">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {selectedProductGroup?.variations.map((variation) => {
                            const remainingStock = getRemainingStockForVariation(
                                variation,
                                selectedWarehouseId,
                                posCartGroup?.posCarts || [],
                                variation.id,
                            );
                            const stockBadge = getStockBadgeMeta(
                                Math.max(remainingStock, 0),
                            );
                            const canAdd = stockOverride || remainingStock > 0;
                            const handleVariantSelect = async () => {
                                if (!canAdd) {
                                    toast.error(
                                        translate(
                                            'Stock not available for this item',
                                        ),
                                    );
                                    return;
                                }

                                await addProductToCart(variation);
                                setSelectedProductGroup(null);
                            };

                            return (
                                <div
                                    key={variation.id}
                                    className={`rounded-md border border-border p-4 transition-colors ${
                                        canAdd
                                            ? 'cursor-pointer hover:border-primary/40'
                                            : 'cursor-not-allowed opacity-80'
                                    }`}
                                    onClick={() => void handleVariantSelect()}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === 'Enter' ||
                                            event.key === ' '
                                        ) {
                                            event.preventDefault();
                                            void handleVariantSelect();
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    aria-disabled={!canAdd}
                                >
                                    <div className="flex gap-3">
                                        <Image
                                            src={
                                                variation.image ||
                                                variation.product.thumbnailImg
                                            }
                                            alt={variation.product.name}
                                            width={80}
                                            height={80}
                                            className="h-20 w-20 rounded-md object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-muted">
                                                SKU:{' '}
                                                {variation.sku || variation.code}
                                            </p>
                                            <p className="text-sm text-muted">
                                                Code: {variation.code}
                                            </p>
                                            <p className="mt-1 font-bold text-primary">
                                                {currencyFormatter(
                                                    variation.discountedBasePrice,
                                                )}
                                            </p>
                                            <span
                                                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stockBadge.className}`}
                                            >
                                                {stockOverride &&
                                                remainingStock <= 0
                                                    ? translate('Override')
                                                    : stockBadge.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                                        {variation.combinations.map(
                                            (combination) => (
                                                <span
                                                    key={combination.id}
                                                    className="rounded bg-background-hover px-2 py-1 text-xs text-foreground"
                                                >
                                                    {combination.name}
                                                </span>
                                            ),
                                        )}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="primary"
                                        className="mt-4 w-full"
                                        disabled={!canAdd}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            void handleVariantSelect();
                                        }}
                                    >
                                        {canAdd
                                            ? translate('Add to Cart')
                                            : translate('Out of Stock')}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </ModalWrapper>

            <div className="pb-24 lg:pb-0">
                {/* Desktop Header */}
                <div className="hidden lg:flex dashboard-nav pt-6 mb-8 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center">
                        <span className="text-xl mr-3 text-secondary">
                            <i className="fa-light fa-chart-mixed"></i>
                        </span>
                        <span className="text-sm sm:text-base font-bold">
                            {translate('POS (Point Of Sales)')}
                        </span>
                    </div>
                </div>

                <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-5 gap-5">
                    <div className="card xl:col-span-3">
                        <div className="card__content">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(160px,220px)_minmax(0,1fr)] xl:gap-5">
                                <SelectInput
                                    name="categoryId"
                                    placeholder={translate('Category')}
                                    value={filters.categoryId}
                                    options={[
                                        { id: '', name: 'All categories' },
                                        ...filterData.categories,
                                    ]}
                                    getOptionLabel={(category) => category.name}
                                    getOptionValue={(category) => category.id}
                                    onChange={(newValue) => {
                                        handleFilter('categoryId', newValue.id);
                                    }}
                                    groupClassName="w-full"
                                />

                                <SearchForm
                                    placeholder={translate('Search Products...')}
                                    value={searchDraft}
                                    onChange={handleSearch}
                                    classNames={{
                                        form: 'w-full',
                                        input: 'w-full',
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-4 4xl:grid-cols-5 gap-3.5 mt-6 items-stretch">
                                {isLoading.loadingProduct ? (
                                    <div className="col-span-full flex justify-center pt-10">
                                        <Spinner className="w-[50px] h-[50px]" />
                                    </div>
                                ) : !posProducts.length ? (
                                    <div className="col-span-full">
                                        No products Found
                                    </div>
                                ) : productViewMode === 'classic' ? (
                                    posProducts.map((posProduct) => (
                                        <ProductCard
                                            posCartGroup={posCartGroup}
                                            posProduct={posProduct}
                                            warehouseId={selectedWarehouseId}
                                            stockOverride={stockOverride}
                                            onSuccess={setPosCartGroup}
                                            key={posProduct.id}
                                        />
                                    ))
                                ) : (
                                    productGroups.map((productGroup) => {
                                        const stockQty =
                                            getProductGroupStock(productGroup);
                                            const stockBadge = getStockBadgeMeta(
                                                Math.max(stockQty, 0),
                                            );
                                            const canSelect =
                                                canSelectProductGroup(productGroup);
                                            const displayVariation =
                                                getProductGroupDisplayVariation(productGroup);
                                            const discountPercent = displayVariation
                                                ? getVariationDiscountPercent(displayVariation)
                                                : 0;
                                            const hasDiscount =
                                                !!displayVariation && discountPercent > 0;

                                            return (
                                            <div
                                                key={productGroup.productId}
                                                className={`flex h-full flex-col overflow-hidden rounded-md border border-border bg-background transition-colors ${
                                                    canSelect
                                                        ? 'cursor-pointer hover:border-primary/40'
                                                        : 'cursor-not-allowed opacity-80'
                                                }`}
                                                onClick={() =>
                                                    handleProductGroupSelect(
                                                        productGroup,
                                                    )
                                                }
                                                onKeyDown={(event) => {
                                                    if (
                                                        event.key === 'Enter' ||
                                                        event.key === ' '
                                                    ) {
                                                        event.preventDefault();
                                                        handleProductGroupSelect(
                                                            productGroup,
                                                        );
                                                    }
                                                }}
                                                role="button"
                                                tabIndex={0}
                                                aria-disabled={!canSelect}
                                            >
                                                <div className="relative">
                                                    <Image
                                                        className="aspect-[4/3] bg-background-primary-light"
                                                        src={productGroup.image}
                                                        alt={
                                                            productGroup.productName
                                                        }
                                                    />
                                                    <span
                                                        className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold ${stockBadge.className}`}
                                                    >
                                                        {stockOverride &&
                                                        stockQty <= 0
                                                            ? translate(
                                                                  'Override',
                                                              )
                                                            : stockBadge.label}
                                                    </span>
                                                    {discountPercent > 0 ? (
                                                        <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                                                            {discountPercent}% OFF
                                                        </span>
                                                    ) : null}
                                                    {hasSelectableVariations(
                                                        productGroup,
                                                    ) ? (
                                                        <span className="absolute bottom-2 left-2 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                                            {translate(
                                                                'Has Variations',
                                                            )}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <div className="flex grow flex-col p-4">
                                                    <h3 className="line-clamp-2 min-h-[40px] text-sm font-medium">
                                                        {productGroup.productName}
                                                    </h3>
                                                    {displayVariation ? (
                                                        <div className="mt-2 flex flex-col">
                                                            {hasDiscount ? (
                                                                <span className="text-xs font-medium text-muted line-through">
                                                                    {currencyFormatter(displayVariation.basePrice)}
                                                                </span>
                                                            ) : null}
                                                            <span className="text-sm font-bold text-secondary">
                                                                {currencyFormatter(displayVariation.discountedBasePrice)}
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                    <Button
                                                        type="button"
                                                        variant="primary"
                                                        className="mt-4 w-full"
                                                        disabled={!canSelect}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleProductGroupSelect(
                                                                productGroup,
                                                            );
                                                        }}
                                                    >
                                                        {canSelect
                                                            ? translate('Select')
                                                            : translate(
                                                                  'Out of Stock',
                                                              )}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {!isLoading.loadingProduct && filters.warehouseId ? (
                                <Pagination
                                    className="mt-8"
                                    pagination={paginationData}
                                    onPageChange={({ selected }) => {
                                        const nextSearchParams =
                                            new URLSearchParams(searchParams);
                                        nextSearchParams.set(
                                            'page',
                                            String(selected),
                                        );
                                        setSearchParams(nextSearchParams);
                                    }}
                                />
                            ) : null}
                        </div>
                    </div>

                    <div className="hidden lg:block card xl:col-span-2">
                        <div className="card__content flex justify-between font-normal border-none pb-6">
                            <p className="text-muted">
                                {translate('Total Product')}
                                <span className="text-foreground ml-3">
                                    {paddedNumber(
                                        posCartGroup?.posCarts.length || 0,
                                    )}
                                </span>
                            </p>

                            <div className="flex items-center gap-2">
                                {customer ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setIsCustomerSearchModalOpen(true)}
                                            className="flex min-w-[200px] flex-col rounded-md border border-border bg-background-primary-light px-3 py-[7px] text-left text-sm hover:border-primary/40 transition-colors"
                                            title={translate('Change Customer')}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted">
                                                    <i className="fa-light fa-user"></i>
                                                </span>
                                                <span className="font-medium text-foreground truncate">
                                                    {customer.name}
                                                </span>
                                                {customer.phone && (
                                                    <span className="text-xs text-muted truncate">
                                                        ({customer.phone})
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-muted ml-auto shrink-0">
                                                    {translate('Change')}
                                                </span>
                                            </div>
                                            {address && (
                                                <p className="mt-0.5 truncate text-xs text-muted pl-5">
                                                    {address.fullAddress ||
                                                        (address.city?.name || address.state?.name) ||
                                                        ''}
                                                </p>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingCustomer(customer);
                                                setIsCustomerModalOpen(true);
                                            }}
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted hover:text-primary hover:border-primary/40"
                                            title={translate('Edit Customer')}
                                        >
                                            <FiEdit2 className="text-sm" />
                                        </button>
                                    </>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setIsCustomerSearchModalOpen(true)}
                                    >
                                        <span className="mr-2">
                                            <i className="fa-light fa-user-plus"></i>
                                        </span>
                                        {translate('Add Customer')}
                                    </Button>
                                )}
                            </div>
                        </div>

                        <table className="theme-table">
                            <thead className="theme-table__head">
                                <tr>
                                    <th>{translate('Product')}</th>
                                    <th className="min-w-[120px]">
                                        {translate('Qty')}
                                    </th>
                                    <th className="min-w-[80px]">
                                        {translate('Price')}
                                    </th>
                                    <th className="min-w-[80px]">
                                        {translate('Sub Total')}
                                    </th>
                                    <th className="min-w-[50px]"></th>
                                </tr>
                            </thead>

                            <tbody className="theme-table__body">
                                {!posCartGroup?.posCarts.length ? (
                                    <tr>
                                        <td colSpan={5}>
                                            <p className="text-center">
                                                No product selected yet
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    posCartGroup?.posCarts.map((posCart) => (
                                        <tr
                                            className="theme-table__row"
                                            key={posCart.id}
                                        >
                                            <td>
                                                <span className="max-w-[300px] whitespace-normal break-words">
                                                    {posCart.product.name}
                                                </span>
                                            </td>
                                            <td>
                                                <Counter
                                                    value={posCart.qty}
                                                    max={
                                                        stockOverride
                                                            ? undefined
                                                            : getStockForWarehouse(
                                                                  posCart.variation,
                                                                  posCart.warehouseId,
                                                              )
                                                    }
                                                    orientation="horizontal"
                                                    onChange={(newValue) => {
                                                        if (newValue === posCart.qty) {
                                                            return;
                                                        }

                                                        handleQuantityChange(
                                                            posCart.id,
                                                            newValue > posCart.qty
                                                                ? 'increase'
                                                                : 'decrease',
                                                        );
                                                    }}
                                                />
                                                <p className="mt-2 text-[11px] text-muted">
                                                    Left: {getCartLineLeftStock(posCart)}
                                                </p>
                                            </td>
                                            <td>
                                                {currencyFormatter(
                                                    posCart.variation
                                                        .discountedBasePrice,
                                                )}
                                            </td>
                                            <td>
                                                {currencyFormatter(
                                                    posCart.variation
                                                        .discountedBasePrice *
                                                        posCart.qty,
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    className="text-theme-alert h-8 w-8 flex items-center justify-center"
                                                    onClick={() =>
                                                        handleQuantityChange(
                                                            posCart.id,
                                                            'delete',
                                                        )
                                                    }
                                                >
                                                    <FaTrashAlt />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        <div className="card__content">
                            <div className="grid grid-cols-3 gap-3.5">
                                <div>
                                    <label className="mb-2">
                                        {translate('Discount')}
                                    </label>
                                    <Input
                                        name="discount"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={currencyFormatter(0)}
                                        value={discount}
                                        onChange={(e) =>
                                            handleNumericChange(
                                                e.target.value,
                                                setDiscount,
                                            )
                                        }
                                        onBlur={() =>
                                            handleNumericBlur(
                                                discount,
                                                setDiscount,
                                            )
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="mb-2">
                                        {translate('Shipping')}
                                    </label>
                                    <Input
                                        name="shipping"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={currencyFormatter(0)}
                                        value={shipping}
                                        onChange={(e) =>
                                            handleNumericChange(
                                                e.target.value,
                                                setShipping,
                                            )
                                        }
                                        onBlur={() =>
                                            handleNumericBlur(
                                                shipping,
                                                setShipping,
                                            )
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="mb-2">
                                        {translate('Tax')}
                                    </label>
                                    <Input
                                        name="tax"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={currencyFormatter(0)}
                                        value={tax}
                                        onChange={(e) =>
                                            handleNumericChange(
                                                e.target.value,
                                                setTax,
                                            )
                                        }
                                        onBlur={() =>
                                            handleNumericBlur(tax, setTax)
                                        }
                                    />
                                </div>
                            </div>

                            <div className="text-center py-5 text-primary bg-secondary-light/40 dark:text-foreground rounded-md text-xl font-bold mt-5">
                                TOTAL PAYABLE: {currencyFormatter(totalPrice)}
                            </div>
                        </div>

                        <div className="card__footer grid grid-cols-2 gap-3.5 border-t border-border pt-8">
                            <Button variant="danger" onClick={handleResetOrder}>
                                {translate('Rest All')}
                            </Button>
                            <SubmitOrderModal
                                discount={Number(discount) || 0}
                                shippingCharge={Number(shipping) || 0}
                                stockOverride={stockOverride}
                                posCartGroup={posCartGroup}
                                customer={customer}
                                shippingAddress={address || undefined}
                                onSuccess={handleSubmitOrderSuccess}
                                isMobile={isMobile}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE LAYOUT */}
            <div className="lg:hidden fixed left-0 right-0 bottom-0 top-[75px] 2xl:top-[103px] z-30 flex flex-col bg-background-primary-light">
                {/* Mobile Header */}
                <div className="border-b border-border bg-background px-3 py-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-lg text-secondary">
                                <i className="fa-light fa-chart-mixed"></i>
                            </span>
                            <span className="text-sm font-bold">
                                {translate('POS')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Customer Row */}
                <div className="border-b border-border bg-background px-3 py-2">
                    {customer ? (
                        <div className="flex items-start gap-2">
                            <span className="text-lg text-muted shrink-0 mt-2">
                                <i className="fa-light fa-user"></i>
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsCustomerSearchModalOpen(true)}
                                className="flex-1 min-w-0 text-left py-1"
                            >
                                <p className="text-sm font-medium text-foreground truncate">
                                    {customer.name}
                                </p>
                                {customer.phone && (
                                    <p className="text-xs text-muted truncate">{customer.phone}</p>
                                )}
                                <p className="text-xs text-muted mt-0.5 truncate min-h-[16px]">
                                    {address?.fullAddress || (address?.city?.name || address?.state?.name) || ''}
                                </p>
                                <span className="text-[10px] text-primary mt-1 inline-block">
                                    {translate('Tap to change')}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingCustomer(customer);
                                    setIsCustomerModalOpen(true);
                                }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:text-primary mt-1"
                                title={translate('Edit Customer')}
                            >
                                <FiEdit2 className="text-sm" />
                            </button>
                        </div>
                    ) : (
                        <Button
                            type="button"
                            variant="primary"
                            className="w-full"
                            onClick={() => setIsCustomerSearchModalOpen(true)}
                        >
                            <span className="mr-2">
                                <i className="fa-light fa-user-plus"></i>
                            </span>
                            {translate('Add Customer')}
                        </Button>
                    )}
                </div>

                {/* Product Filter Row */}
                <div className="border-b border-border bg-background px-3 py-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                            {translate('Product Filter')}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsFilterDialogOpen(true)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-primary"
                            title={translate('Filters')}
                        >
                            <FiSettings className="text-lg" />
                        </button>
                    </div>
                </div>

                {/* Search Products Row */}
                <div className="border-b border-border bg-background px-3 py-2">
                    <SearchForm
                        placeholder={translate('Search Products')}
                        value={searchDraft}
                        onChange={handleSearch}
                        classNames={{
                            form: 'w-full',
                            input: 'w-full !h-10 !text-base',
                        }}
                    />
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto px-3 pb-28 pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                        {isLoading.loadingProduct ? (
                            <div className="col-span-full flex justify-center pt-10">
                                <Spinner className="w-[50px] h-[50px]" />
                            </div>
                        ) : !posProducts.length ? (
                            <div className="col-span-full text-center text-muted">
                                {translate('No products Found')}
                            </div>
                        ) : productViewMode === 'classic' ? (
                            posProducts.map((posProduct) => (
                                <ProductCard
                                    posCartGroup={posCartGroup}
                                    posProduct={posProduct}
                                    warehouseId={selectedWarehouseId}
                                    stockOverride={stockOverride}
                                    onSuccess={setPosCartGroup}
                                    key={posProduct.id}
                                />
                            ))
                        ) : (
                            productGroups.map((productGroup) => {
                                const stockQty =
                                    getProductGroupStock(productGroup);
                                const stockBadge = getStockBadgeMeta(
                                    Math.max(stockQty, 0),
                                );
                                const canSelect =
                                    canSelectProductGroup(productGroup);
                                const displayVariation =
                                    getProductGroupDisplayVariation(productGroup);
                                const discountPercent = displayVariation
                                    ? getVariationDiscountPercent(displayVariation)
                                    : 0;
                                const hasDiscount =
                                    !!displayVariation && discountPercent > 0;

                                return (
                                    <div
                                        key={productGroup.productId}
                                        className={`flex flex-col overflow-hidden rounded-md border border-border bg-background transition-colors ${
                                            canSelect
                                                ? 'cursor-pointer hover:border-primary/40'
                                                : 'cursor-not-allowed opacity-80'
                                        }`}
                                        onClick={() =>
                                            handleProductGroupSelect(
                                                productGroup,
                                            )
                                        }
                                        onKeyDown={(event) => {
                                            if (
                                                event.key === 'Enter' ||
                                                event.key === ' '
                                            ) {
                                                event.preventDefault();
                                                handleProductGroupSelect(
                                                    productGroup,
                                                );
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        aria-disabled={!canSelect}
                                    >
                                        <div className="relative">
                                            <Image
                                                className="aspect-[4/3] bg-background-primary-light"
                                                src={productGroup.image}
                                                alt={
                                                    productGroup.productName
                                                }
                                            />
                                            <span
                                                className={`absolute right-2 top-2 rounded-full px-2 py-1 text-xs font-semibold ${stockBadge.className}`}
                                            >
                                                {stockOverride &&
                                                stockQty <= 0
                                                    ? translate('Override')
                                                    : stockBadge.label}
                                            </span>
                                            {discountPercent > 0 ? (
                                                <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-[11px] font-bold text-white shadow-sm">
                                                    {discountPercent}% OFF
                                                </span>
                                            ) : null}
                                            {hasSelectableVariations(
                                                productGroup,
                                            ) ? (
                                                <span className="absolute bottom-2 left-2 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                                                    {translate('Has Variations')}
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="flex grow flex-col p-3">
                                            <h3 className="line-clamp-2 text-xs font-medium">
                                                {productGroup.productName}
                                            </h3>
                                            {displayVariation ? (
                                                <div className="mt-2 flex flex-col">
                                                    {hasDiscount ? (
                                                        <span className="text-[11px] font-medium text-muted line-through">
                                                            {currencyFormatter(displayVariation.basePrice)}
                                                        </span>
                                                    ) : null}
                                                    <span className="text-sm font-bold text-secondary">
                                                        {currencyFormatter(displayVariation.discountedBasePrice)}
                                                    </span>
                                                </div>
                                            ) : null}
                                            <Button
                                                type="button"
                                                variant="primary"
                                                className="mt-2 w-full !h-8 !px-2 !text-xs"
                                                disabled={!canSelect}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleProductGroupSelect(
                                                        productGroup,
                                                    );
                                                }}
                                            >
                                                {canSelect
                                                    ? translate('Select')
                                                    : translate('Out of Stock')}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {!isLoading.loadingProduct && filters.warehouseId && (
                        <Pagination
                            className="mt-6"
                            pagination={paginationData}
                            onPageChange={({ selected }) => {
                                const nextSearchParams = new URLSearchParams(
                                    searchParams,
                                );
                                nextSearchParams.set(
                                    'page',
                                    String(selected),
                                );
                                setSearchParams(nextSearchParams);
                            }}
                        />
                    )}
                </div>

                {/* Fixed Bottom Bar */}
                <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background px-3 py-2 shadow-lg">
                    <button
                        type="button"
                        onClick={() => setIsCartDrawerOpen(true)}
                        className="flex w-full items-center justify-between rounded-lg bg-primary px-4 py-3 text-white hover:bg-primary/90"
                    >
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                                {posCartGroup?.posCarts.length || 0}
                            </span>
                            <span className="text-sm font-medium">
                                {translate('items')}
                            </span>
                        </div>
                        <span className="text-lg font-bold">
                            {currencyFormatter(totalPrice)}
                        </span>
                    </button>
                </div>

                {/* Cart Bottom Sheet (Vaul Drawer) */}
                <Drawer.Root
                    open={isCartDrawerOpen}
                    onOpenChange={setIsCartDrawerOpen}
                    repositionInputs={false}
                >
                    <Drawer.Portal>
                        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
                        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[85dvh] flex-col rounded-t-xl bg-background text-foreground outline-none">
                            <div className="mx-auto mt-3 h-1 w-12 shrink-0 rounded-full bg-muted/60" />

                            {/* Cart Header */}
                            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                                <h3 className="text-base font-semibold">
                                    {translate('Cart')}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsCartDrawerOpen(false)}
                                    className="text-xl text-muted hover:text-foreground"
                                >
                                    <LiaTimesSolid />
                                </button>
                            </div>

                            {/* Cart Items */}
                            <div ref={cartBodyRef} className="flex-1 overflow-y-auto px-4 py-3 pb-40">
                                {!posCartGroup?.posCarts.length ? (
                                    <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-muted">
                                        {translate('No product selected yet')}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {posCartGroup.posCarts.map((posCart) => (
                                            <div
                                                key={posCart.id}
                                                className="rounded-md border border-border bg-background-hover/40 p-3"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium">
                                                            {posCart.product.name}
                                                        </div>
                                                        <div className="mt-1 text-xs text-muted">
                                                            {currencyFormatter(
                                                                posCart.variation.discountedBasePrice,
                                                            )}{' '}
                                                            ·{' '}
                                                            <span className="font-bold text-foreground">
                                                                {translate('Left')}: {getCartLineLeftStock(posCart)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="text-theme-alert h-8 w-8 flex shrink-0 items-center justify-center"
                                                        onClick={() =>
                                                            handleQuantityChange(
                                                                posCart.id,
                                                                'delete',
                                                            )
                                                        }
                                                    >
                                                        <FaTrashAlt />
                                                    </button>
                                                </div>
                                                <div className="mt-3 flex items-center justify-between gap-3">
                                                    <Counter
                                                        value={posCart.qty}
                                                        max={
                                                            stockOverride
                                                                ? undefined
                                                                : getStockForWarehouse(
                                                                      posCart.variation,
                                                                      posCart.warehouseId,
                                                                  )
                                                        }
                                                        orientation="horizontal"
                                                        onChange={(newValue) => {
                                                            if (newValue === posCart.qty) {
                                                                return;
                                                            }

                                                            handleQuantityChange(
                                                                posCart.id,
                                                                newValue > posCart.qty
                                                                    ? 'increase'
                                                                    : 'decrease',
                                                            );
                                                        }}
                                                    />
                                                    <div className="text-right">
                                                        <div className="text-xs text-muted">
                                                            {translate('Sub Total')}
                                                        </div>
                                                        <div className="font-semibold">
                                                            {currencyFormatter(
                                                                posCart.variation.discountedBasePrice *
                                                                    posCart.qty,
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Discount/Shipping/Tax */}
                                {posCartGroup?.posCarts.length > 0 && (
                                    <div className="mt-4 space-y-3">
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="mb-1 block text-xs font-medium">
                                                    {translate('Discount')}
                                                </label>
                                                <Input
                                                    name="discount-mobile"
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder={currencyFormatter(0)}
                                                    value={discount}
                                                    onChange={(e) =>
                                                        handleNumericChange(
                                                            e.target.value,
                                                            setDiscount,
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        handleNumericBlur(
                                                            discount,
                                                            setDiscount,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium">
                                                    {translate('Shipping')}
                                                </label>
                                                <Input
                                                    name="shipping-mobile"
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder={currencyFormatter(0)}
                                                    value={shipping}
                                                    onChange={(e) =>
                                                        handleNumericChange(
                                                            e.target.value,
                                                            setShipping,
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        handleNumericBlur(
                                                            shipping,
                                                            setShipping,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium">
                                                    {translate('Tax')}
                                                </label>
                                                <Input
                                                    name="tax-mobile"
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder={currencyFormatter(0)}
                                                    value={tax}
                                                    onChange={(e) =>
                                                        handleNumericChange(
                                                            e.target.value,
                                                            setTax,
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        handleNumericBlur(tax, setTax)
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-md bg-secondary-light/40 px-4 py-3 text-center text-lg font-bold text-primary">
                                            {translate('TOTAL PAYABLE')}: {currencyFormatter(totalPrice)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Cart Actions */}
                            {posCartGroup?.posCarts.length > 0 && (
                                <div className="border-t border-border px-4 py-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="danger"
                                            onClick={() => {
                                                handleResetOrder();
                                                setIsCartDrawerOpen(false);
                                            }}
                                        >
                                            {translate('Reset')}
                                        </Button>
                                        <SubmitOrderModal
                                            discount={Number(discount) || 0}
                                            shippingCharge={Number(shipping) || 0}
                                            stockOverride={stockOverride}
                                            posCartGroup={posCartGroup}
                                            customer={customer}
                                            shippingAddress={address || undefined}
                                            onSuccess={(invoiceData?: any) => {
                                                handleSubmitOrderSuccess(invoiceData);
                                                setIsCartDrawerOpen(false);
                                            }}
                                            isMobile={isMobile}
                                        />
                                    </div>
                                </div>
                            )}
                        </Drawer.Content>
                    </Drawer.Portal>
                </Drawer.Root>

                {/* Filter Dialog */}
                <ModalWrapper
                    isActive={isFilterDialogOpen}
                    onClose={() => setIsFilterDialogOpen(false)}
                    size="md"
                    className="max-sm:w-[calc(100%-16px)]"
                >
                    <div className="theme-modal__header">
                        <h5>{translate('Product Filters')}</h5>
                        <button
                            type="button"
                            className="text-xl text-white sm:text-muted"
                            onClick={() => setIsFilterDialogOpen(false)}
                        >
                            <LiaTimesSolid />
                        </button>
                    </div>

                    <div className="theme-modal__body space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                {translate('Category')}
                            </label>
                            <SelectInput
                                name="filter-category"
                                placeholder={translate('All categories')}
                                value={filters.categoryId}
                                options={[
                                    { id: '', name: translate('All categories') },
                                    ...filterData.categories,
                                ]}
                                getOptionLabel={(category) => category.name}
                                getOptionValue={(category) => category.id}
                                onChange={(newValue) => {
                                    handleFilter('categoryId', newValue.id);
                                }}
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                type="button"
                                variant="light"
                                className="flex-1"
                                onClick={() => {
                                    handleFilter('categoryId', '');
                                }}
                            >
                                {translate('Clear')}
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                className="flex-1"
                                onClick={() => setIsFilterDialogOpen(false)}
                            >
                                {translate('Apply')}
                            </Button>
                        </div>
                    </div>
                </ModalWrapper>
            </div>

            {/* Customer Modal */}
            <CustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => {
                    setEditingCustomer(undefined);
                    setIsCustomerModalOpen(false);
                }}
                customer={editingCustomer}
                onSuccess={handleCustomerSuccess}
                customerFilters={customerOptions}
                onCustomerFiltersUpdate={handleCustomerFiltersUpdate}
                isMobile={isMobile}
            />

            {/* Customer Search Modal */}
            <CustomerSearchModal
                isOpen={isCustomerSearchModalOpen}
                onClose={() => setIsCustomerSearchModalOpen(false)}
                onSuccess={(newCustomer, newAddress) => {
                    handleCustomerSuccess(newCustomer, newAddress);
                    setIsCustomerSearchModalOpen(false);
                }}
                isMobile={isMobile}
            />

        </>
    );
};

export default App;
