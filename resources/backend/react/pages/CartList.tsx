import axios from 'axios';
import React, { useEffect, useState, useCallback, useRef } from 'react';

import { currencyFormatter } from '../../../frontend/utils/numberFormatter';
import ConfirmOrderModal from '../components/ConfirmOrderModal';
import DateRangePicker from '../../js/bizana/components/DateRangePicker';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface Customer {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    type: 'registered' | 'guest';
}

interface Product {
    id: number;
    name: string;
    thumbnail?: string;
    slug: string;
    description?: string;
}

interface Variation {
    id: number;
    sku?: string;
    image?: string;
    price?: number;
    discount_value?: number;
    discount_type?: string;
}

interface Shop {
    id: number;
    name: string;
    logo?: string;
    address?: string;
    phone?: string;
}

interface CartItem {
    id: number;
    product: Product | null;
    variation: Variation | null;
    shop: Shop | null;
    quantity: number;
    regular_price?: number;
    unit_price: number;
    discount_percentage?: number;
    has_discount?: boolean;
    stock_qty?: number;
    is_published?: boolean;
    is_stock_out?: boolean;
    availability_label?: string;
    total: number;
    created_at: string;
    updated_at: string;
}

interface CheckoutSessionData {
    id?: number;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    customer_note?: string;
    country_id?: number;
    state_id?: number;
    city_id?: number;
    address_line?: string;
    postal_code?: string;
    address_type?: string;
    direction?: string;
    payment_method?: string;
    shipping_charge?: number;
    formatted_address?: string;
    updated_at?: string;
}

interface AssignedAgent {
    id: number;
    name: string;
    email: string;
}

type FollowUpStatus = 'pending' | 'done' | 'on_hold' | 'unreachable';
type CartSortBy = '' | 'follow_up_status';
type SortDirection = 'asc' | 'desc';

interface AgentOption {
    id: number;
    name: string;
    email: string;
}

interface CustomerCart {
    id: string;
    customer: Customer;
    total_qty: number;
    total_amount: number;
    item_count: number;
    last_active: string;
    minutes_inactive: number;
    is_abandoned: boolean;
    is_contactable: boolean;
    assigned_agent: AssignedAgent | null;
    follow_up_status: FollowUpStatus;
    next_follow_up_at: string | null;
    items: CartItem[];
    checkout_session?: CheckoutSessionData | null;
}

interface Pagination {
    current_page: number;
    last_page: number;
    total: number;
}

interface FilterData {
    shops: { id: number; name: string }[];
    agents: AgentOption[];
}

interface CartListProps {
    initialCarts: {
        data: CustomerCart[];
        meta: Pagination;
    } | null;
    filterData: FilterData | null;
}

interface FollowUpDraft {
    status: FollowUpStatus;
    nextFollowUpAt: string;
}

const followUpStatusOptions: { value: FollowUpStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'done', label: 'Done' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'unreachable', label: 'Unreachable' },
];

const filterSelectClassName =
    'theme-input !h-12 !min-h-[48px] !py-0 !pr-12 !leading-[48px] w-full text-base';

const rowSelectClassName =
    'min-h-[36px] rounded border border-border bg-white px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-gray-200';

const getFollowUpStatusLabel = (status?: FollowUpStatus): string =>
    followUpStatusOptions.find((option) => option.value === status)?.label || 'Pending';

const getFollowUpStatusBadgeClassName = (status?: FollowUpStatus): string => {
    const baseClassName =
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold leading-none text-white';

    switch (status) {
        case 'done':
            return `${baseClassName} bg-red-500`;
        case 'on_hold':
            return `${baseClassName} bg-orange-500`;
        case 'unreachable':
            return `${baseClassName} bg-pink-700`;
        case 'pending':
        default:
            return `${baseClassName} bg-green-500`;
    }
};

const FollowUpStatusBadge = ({ status }: { status?: FollowUpStatus }) => (
    <span className={getFollowUpStatusBadgeClassName(status)}>
        {getFollowUpStatusLabel(status)}
    </span>
);

const normalizePagination = (meta?: Partial<Pagination> | null): Pagination => ({
    current_page: Math.max(1, Number(meta?.current_page) || 1),
    last_page: Math.max(1, Number(meta?.last_page) || 1),
    total: Math.max(0, Number(meta?.total) || 0),
});

const toDateTimeLocal = (dateString?: string | null): string => {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';

    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60_000)
        .toISOString()
        .slice(0, 16);
};

const createFollowUpDrafts = (cartList: CustomerCart[]): Record<string, FollowUpDraft> =>
    cartList.reduce<Record<string, FollowUpDraft>>((drafts, cart) => {
        drafts[cart.id] = {
            status: cart.follow_up_status || 'pending',
            nextFollowUpAt: toDateTimeLocal(cart.next_follow_up_at),
        };
        return drafts;
    }, {});

const formatCartDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

const formatInactiveTime = (minutes: number): string => {
    if (minutes < 60) {
        return `${minutes} min ago`;
    } else if (minutes < 1440) {
        const hours = Math.floor(minutes / 60);
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
        const days = Math.floor(minutes / 1440);
        return `${days} day${days === 1 ? '' : 's'} ago`;
    }
};

const CartList: React.FC<CartListProps> = ({ initialCarts, filterData }) => {
    const abandonedFromUrl = new URLSearchParams(window.location.search).get('abandoned') === 'true';
    const [carts, setCarts] = useState<CustomerCart[]>(initialCarts?.data || []);
    const [pagination, setPagination] = useState<Pagination>(
        normalizePagination(initialCarts?.meta)
    );
    const [filters, setFilters] = useState({
        search: '',
        shop_id: '',
        date_from: '',
        date_to: '',
        abandoned: abandonedFromUrl,
        follow_up_status: '',
        sort_by: '' as CartSortBy,
        sort_direction: 'asc' as SortDirection,
    });
    const [selectedCart, setSelectedCart] = useState<CustomerCart | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    const [agents, setAgents] = useState<AgentOption[]>(filterData?.agents || []);
    const [assigningCartId, setAssigningCartId] = useState<string | null>(null);
    const [selectedAgentId, setSelectedAgentId] = useState<number | ''>('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [isChangingAgentInModal, setIsChangingAgentInModal] = useState(false);
    const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, FollowUpDraft>>(
        createFollowUpDrafts(initialCarts?.data || [])
    );
    const [savingFollowUpCartId, setSavingFollowUpCartId] = useState<string | null>(null);
    const [showConfirmOrder, setShowConfirmOrder] = useState(false);
    const [confirmOrderSuccess, setConfirmOrderSuccess] = useState<string | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const filtersInitializedRef = useRef(false);

    const fetchCarts = async (page = 1, searchTerm?: string) => {
        setIsLoading(true);
        try {
            const searchQuery = searchTerm !== undefined ? searchTerm : filters.search;
            const response = await axios.get('/admin/api/carts', {
                params: {
                    search: searchQuery,
                    shop_id: filters.shop_id,
                    date_from: filters.date_from,
                    date_to: filters.date_to,
                    abandoned: filters.abandoned,
                    follow_up_status: filters.follow_up_status,
                    sort_by: filters.sort_by,
                    sort_direction: filters.sort_direction,
                    page,
                },
            });

            if (response.data.success) {
                setCarts(response.data.data);
                const normalizedMeta = normalizePagination(response.data.meta);
                setPagination(normalizedMeta);

                const url = new URL(window.location.href);
                if (normalizedMeta.current_page > 1) {
                    url.searchParams.set('page', String(normalizedMeta.current_page));
                } else {
                    url.searchParams.delete('page');
                }
                window.history.replaceState(null, '', url.toString());
            }
        } catch (error) {
            console.error('Error fetching carts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!filtersInitializedRef.current) {
            filtersInitializedRef.current = true;
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (filters.search !== '') {
            debounceRef.current = setTimeout(() => {
                fetchCarts(1);
            }, 500);
        } else {
            fetchCarts(1);
        }
    }, [filters]);

    useEffect(() => {
        setFollowUpDrafts((prev) => ({
            ...prev,
            ...createFollowUpDrafts(carts),
        }));
    }, [carts]);

    useEffect(() => {
        if (agents.length === 0) {
            axios.get('/admin/api/carts/agents').then(res => {
                if (res.data.success) {
                    setAgents(res.data.data);
                }
            }).catch(() => {});
        }
    }, []);

    const handleChange = (key: string, value: string | boolean) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleDateChange = (startDate: string, endDate: string) => {
        setFilters((prev) => ({ ...prev, date_from: startDate, date_to: endDate }));
    };

    const handlePageChange = (page: number) => {
        const targetPage = Number(page);
        if (targetPage >= 1 && targetPage <= Number(pagination.last_page)) {
            fetchCarts(targetPage);
        }
    };

    const handleStatusSortToggle = () => {
        setFilters((prev) => ({
            ...prev,
            sort_by: 'follow_up_status',
            sort_direction:
                prev.sort_by === 'follow_up_status' && prev.sort_direction === 'asc'
                    ? 'desc'
                    : 'asc',
        }));
    };

    const getStatusSortIcon = () => {
        if (filters.sort_by !== 'follow_up_status') return 'fa-sort';

        return filters.sort_direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
    };

    const handleSaveFollowUp = async (
        cartId: string,
        changes: Partial<FollowUpDraft> = {}
    ) => {
        const draft = {
            status: followUpDrafts[cartId]?.status || 'pending',
            nextFollowUpAt: followUpDrafts[cartId]?.nextFollowUpAt || '',
            ...changes,
        };

        if (draft.status === 'done') {
            draft.nextFollowUpAt = '';
        }

        setFollowUpDrafts((prev) => ({
            ...prev,
            [cartId]: draft,
        }));

        setSavingFollowUpCartId(cartId);
        try {
            const response = await axios.put(`/admin/api/carts/${cartId}/follow-up`, {
                follow_up_status: draft.status,
                next_follow_up_at: null,
            });

            if (!response.data.success) {
                alert(response.data.message || 'Failed to update abandoned status');
                return;
            }

            const tracking = response.data.data;
            setCarts((prev) =>
                prev.map((cart) =>
                    cart.id === cartId
                        ? {
                            ...cart,
                            follow_up_status: tracking.follow_up_status,
                            next_follow_up_at: tracking.next_follow_up_at,
                        }
                        : cart
                )
            );
            setFollowUpDrafts((prev) => ({
                ...prev,
                [cartId]: {
                    status: tracking.follow_up_status,
                    nextFollowUpAt: toDateTimeLocal(tracking.next_follow_up_at),
                },
            }));

            if (
                filters.follow_up_status ||
                filters.sort_by === 'follow_up_status'
            ) {
                fetchCarts(pagination.current_page);
            }
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Failed to update abandoned status');
        } finally {
            setSavingFollowUpCartId(null);
        }
    };

    const handleStatusChange = (cartId: string, status: FollowUpStatus) => {
        handleSaveFollowUp(cartId, {
            status,
            nextFollowUpAt: '',
        });
    };

    const handleViewCart = async (customerId: string) => {
        try {
            const response = await axios.get(`/admin/api/carts/${customerId}`);
            if (response.data.success) {
                setSelectedCart(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching cart details:', error);
        }
    };

    const handleDeleteCart = async (cart: CustomerCart) => {
        if (!cart.is_abandoned) {
            alert('Only abandoned carts can be deleted.');
            return;
        }

        if (!confirm(`Delete the abandoned cart for ${cart.customer.name}? This cannot be undone.`)) {
            return;
        }

        try {
            const response = await axios.delete(`/admin/api/carts/${cart.id}`);
            if (!response.data.success) {
                alert(response.data.message || 'Failed to delete cart');
                return;
            }

            if (selectedCart?.id === cart.id) {
                setSelectedCart(null);
            }
            await fetchCarts(pagination.current_page);
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Failed to delete cart');
        }
    };

    const handleCloseModal = () => {
        setSelectedCart(null);
        setSelectedAgentId('');
        setIsChangingAgentInModal(false);
        setShowConfirmOrder(false);
    };

    const handleConfirmOrderSuccess = (orderCode: string) => {
        setShowConfirmOrder(false);
        setSelectedCart(null);
        setConfirmOrderSuccess(orderCode);
        fetchCarts(1);
        setTimeout(() => setConfirmOrderSuccess(null), 5000);
    };

    const handleTransferToPos = async () => {
        if (!selectedCart) return;

        setIsTransferring(true);

        try {
            const items = selectedCart.items
                .filter(item => item.variation?.id)
                .map(item => ({
                    variation_id: item.variation!.id,
                    quantity: item.quantity
                }));

            if (items.length === 0) {
                alert('No valid items to transfer. Items must have variation IDs.');
                setIsTransferring(false);
                return;
            }

            const response = await fetch('/admin/api/pos/cart/from-abandoned', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customer_id: selectedCart.customer.id,
                    customer_type: selectedCart.customer.type,
                    checkout_session_id: selectedCart.checkout_session?.id,
                    items: items
                })
            });

            const result = await response.json();

            if (result.success) {
                const params = new URLSearchParams();
                params.set('posCartGroupId', result.result.posCartGroupId.toString());

                if (result.result.userId) {
                    params.set('customerId', result.result.userId.toString());
                }

                window.location.href = `/admin/pos?${params.toString()}`;
            } else {
                alert(result.message || 'Failed to transfer cart to POS');
            }
        } catch (error) {
            console.error('Error transferring cart to POS:', error);
            alert('Error transferring cart to POS. Please try again.');
        } finally {
            setIsTransferring(false);
        }
    };

    const handleAssignAgent = async (cartId: string) => {
        if (!selectedAgentId) return;

        setIsAssigning(true);
        try {
            const response = await axios.put(`/admin/api/carts/${cartId}/assign`, {
                agent_id: selectedAgentId,
            });

            if (response.data.success) {
                const updatedAgent = response.data.data.assigned_agent;

                setCarts(prev => prev.map(cart =>
                    cart.id === cartId
                        ? { ...cart, assigned_agent: updatedAgent }
                        : cart
                ));

                if (selectedCart && selectedCart.id === cartId) {
                    setSelectedCart(prev => prev ? { ...prev, assigned_agent: updatedAgent } : prev);
                }

                setSelectedAgentId('');
                setAssigningCartId(null);
                setIsChangingAgentInModal(false);
            } else {
                alert(response.data.message || 'Failed to assign agent');
            }
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Failed to assign agent';
            alert(msg);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleRemoveAgent = async (cartId: string) => {
        if (!confirm('Remove assigned agent from this cart?')) return;

        setIsAssigning(true);
        try {
            const response = await axios.put(`/admin/api/carts/${cartId}/assign`, {
                agent_id: null,
            });

            if (response.data.success) {
                setCarts(prev => prev.map(cart =>
                    cart.id === cartId
                        ? { ...cart, assigned_agent: null }
                        : cart
                ));

                if (selectedCart && selectedCart.id === cartId) {
                    setSelectedCart(prev => prev ? { ...prev, assigned_agent: null } : prev);
                }

                setIsChangingAgentInModal(false);
            } else {
                alert(response.data.message || 'Failed to remove agent');
            }
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Failed to remove agent';
            alert(msg);
        } finally {
            setIsAssigning(false);
        }
    };

    const shops = filterData?.shops || [];

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4 text-foreground">Cart List</h1>

            <div className="card rounded-lg shadow-sm">
                {/* Filters */}
                <div className="p-4 border-b border-border">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Search */}
                        <div className="search-form relative w-72 flex-shrink-0">
                            <input
                                type="text"
                                value={filters.search}
                                className="theme-input w-full"
                                placeholder="Search by customer name/email/phone"
                                onChange={(e) => handleChange('search', e.target.value)}
                                autoComplete="off"
                            />
                            <span className="text-primary dark:text-muted absolute top-0 right-0 h-full flex items-center justify-center px-3 pointer-events-none">
                                <i className="fa-solid fa-magnifying-glass"></i>
                            </span>
                        </div>

                        {/* Date Range */}
                        <div className="flex-shrink-0">
                            <DateRangePicker
                                startDate={filters.date_from}
                                endDate={filters.date_to}
                                onDateChange={handleDateChange}
                            />
                        </div>

                        {/* Abandoned Filter */}
                        <div className="flex items-center space-x-2">
                            <label className="inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.abandoned}
                                    onChange={(e) => handleChange('abandoned', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                                <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                                    Abandoned Only
                                </span>
                            </label>
                        </div>

                        <div className="min-w-[160px]">
                            <label htmlFor="follow-up-status-filter" className="sr-only">
                                Filter by abandoned status
                            </label>
                            <select
                                id="follow-up-status-filter"
                                value={filters.follow_up_status}
                                onChange={(e) => handleChange('follow_up_status', e.target.value)}
                                className={filterSelectClassName}
                            >
                                <option value="">All Abandoned</option>
                                {followUpStatusOptions.map((status) => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="p-8 text-center text-muted">
                        <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
                        <p>Loading carts...</p>
                    </div>
                )}

                {/* Mobile Card View */}
                {!isLoading && (
                    <div className="lg:hidden">
                        <div className="space-y-3 p-3">
                            {carts.map((cart) => (
                                <div key={cart.id} className="card rounded-lg border border-border p-4">
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="text-xs text-muted uppercase mb-1">Customer</div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {cart.customer.name}
                                                    {cart.is_contactable && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-300">
                                                            <i className="fa-solid fa-phone text-[10px]"></i>
                                                            Contactable
                                                        </span>
                                                    )}
                                                    {cart.customer.type === 'guest' && !cart.is_contactable && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full dark:bg-gray-700 dark:text-gray-400">
                                                            No contact
                                                        </span>
                                                    )}
                                                </div>
                                                {cart.customer.email && (
                                                    <div className="text-sm text-muted">{cart.customer.email}</div>
                                                )}
                                                {cart.customer.phone && (
                                                    <div className="text-sm font-medium text-foreground">
                                                        <i className="fa-solid fa-phone mr-1.5 text-green-600"></i>
                                                        {cart.customer.phone}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {cart.is_abandoned && (
                                                    <span className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full">
                                                        Abandoned
                                                    </span>
                                                )}
                                                {!cart.is_abandoned && (
                                                    <span className="px-2 py-1 text-xs font-medium text-white bg-green-500 rounded-full">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {cart.assigned_agent && (
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <i className="fa-solid fa-user-tie text-indigo-500"></i>
                                                <span className="text-muted">Agent:</span>
                                                <span className="font-medium text-indigo-600 dark:text-indigo-400">{cart.assigned_agent.name}</span>
                                            </div>
                                        )}

                                        <div className="rounded-md border border-border bg-muted/5 p-3">
                                            <div className="mb-2 text-xs font-semibold uppercase text-muted">
                                                Abandoned Status
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-[minmax(160px,1fr)]">
                                                <div>
                                                    <div className="mb-2 flex items-center justify-between gap-2">
                                                        <div className="text-[11px] font-medium uppercase text-muted">
                                                            Status
                                                        </div>
                                                        <FollowUpStatusBadge
                                                            status={followUpDrafts[cart.id]?.status || 'pending'}
                                                        />
                                                    </div>
                                                    <select
                                                        aria-label={`Abandoned status for ${cart.customer.name}`}
                                                        value={followUpDrafts[cart.id]?.status || 'pending'}
                                                        disabled={savingFollowUpCartId === cart.id}
                                                        onChange={(e) =>
                                                            handleStatusChange(
                                                                cart.id,
                                                                e.target.value as FollowUpStatus
                                                            )
                                                        }
                                                        className={`${rowSelectClassName} min-h-[44px] w-full`}
                                                    >
                                                        {followUpStatusOptions.map((status) => (
                                                            <option key={status.value} value={status.value}>
                                                                {status.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs text-muted uppercase mb-1">Total Qty</div>
                                                <div className="text-sm font-medium">{cart.total_qty}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted uppercase mb-1">Total Amount</div>
                                                <div className="font-bold text-sky-500">
                                                    {currencyFormatter(cart.total_amount)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs text-muted uppercase mb-1">Last Active</div>
                                                <div className="text-sm text-muted">
                                                    {formatInactiveTime(cart.minutes_inactive)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-border">
                                            <div className="flex items-center gap-2">
                                                {cart.is_contactable && (
                                                    assigningCartId === cart.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <select
                                                                value={selectedAgentId}
                                                                onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                                                                className="text-xs border border-border rounded px-1.5 py-1 bg-white dark:bg-gray-700 dark:text-gray-200"
                                                            >
                                                                <option value="">Select agent...</option>
                                                                {agents.map(a => (
                                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                onClick={() => handleAssignAgent(cart.id)}
                                                                disabled={!selectedAgentId || isAssigning}
                                                                className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                                            >
                                                                {isAssigning ? '...' : 'OK'}
                                                            </button>
                                                            <button
                                                                onClick={() => { setAssigningCartId(null); setSelectedAgentId(''); }}
                                                                className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                                                            >
                                                                <i className="fa-solid fa-xmark"></i>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setAssigningCartId(cart.id)}
                                                            className="text-xs px-2 py-1 border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900"
                                                        >
                                                            <i className="fa-solid fa-user-plus mr-1"></i>
                                                            Assign
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    className="text-primary hover:text-primary/80 text-lg p-2"
                                                    title="View Cart Details"
                                                    onClick={() => handleViewCart(cart.id)}
                                                >
                                                    <i className="fa-solid fa-eye"></i>
                                                </button>
                                                {cart.is_abandoned && (
                                                    <button
                                                        className="p-2 text-lg text-red-500 hover:text-red-700"
                                                        title="Delete Abandoned Cart"
                                                        onClick={() => handleDeleteCart(cart)}
                                                    >
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {carts.length === 0 && (
                                <div className="text-center py-8 text-muted">
                                    No carts found.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Desktop Table View */}
                {!isLoading && (
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="divide-y divide-border product-list-table w-full">
                            <thead>
                                <tr className="theme-table__head">
                                    <th className="px-6 py-4 text-left text-xs font-medium text-muted uppercase">
                                        Customer
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-muted uppercase">
                                        <button
                                            type="button"
                                            onClick={handleStatusSortToggle}
                                            className="inline-flex items-center gap-1 uppercase hover:text-primary"
                                            aria-label="Sort carts by abandoned status"
                                        >
                                            Status
                                            <i className={`fa-solid ${getStatusSortIcon()}`}></i>
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-muted uppercase">
                                        Total Qty
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-muted uppercase">
                                        Total Amount
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-muted uppercase">
                                        Last Active
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-muted uppercase">
                                        Cart Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-muted uppercase">
                                        Agent
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-muted uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="theme-table__body divide-y divide-border">
                                {carts.map((cart) => (
                                    <tr key={cart.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <div className="font-medium flex items-center gap-2">
                                                        {cart.customer.name}
                                                        {cart.is_contactable && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-300">
                                                                <i className="fa-solid fa-phone text-[10px]"></i>
                                                                Contactable
                                                            </span>
                                                        )}
                                                    </div>
                                                    {cart.customer.email && (
                                                        <div className="text-sm text-muted">{cart.customer.email}</div>
                                                    )}
                                                    {cart.customer.phone && (
                                                        <div className="text-sm font-medium text-foreground">
                                                            <i className="fa-solid fa-phone mr-1.5 text-green-600"></i>
                                                            {cart.customer.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="min-w-[190px] px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col items-start gap-2">
                                                <FollowUpStatusBadge
                                                    status={followUpDrafts[cart.id]?.status || 'pending'}
                                                />
                                                <select
                                                    aria-label={`Abandoned status for ${cart.customer.name}`}
                                                    value={followUpDrafts[cart.id]?.status || 'pending'}
                                                    disabled={savingFollowUpCartId === cart.id}
                                                    onChange={(e) =>
                                                        handleStatusChange(
                                                            cart.id,
                                                            e.target.value as FollowUpStatus
                                                        )
                                                    }
                                                    className={`${rowSelectClassName} w-full`}
                                                >
                                                    {followUpStatusOptions.map((status) => (
                                                        <option key={status.value} value={status.value}>
                                                            {status.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {savingFollowUpCartId === cart.id && (
                                                <div className="mt-1 text-[11px] font-medium text-primary">
                                                    Saving...
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-medium">{cart.total_qty}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-bold text-sky-500">{currencyFormatter(cart.total_amount)}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                                            {formatInactiveTime(cart.minutes_inactive)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {cart.is_abandoned ? (
                                                <span className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full">
                                                    Abandoned
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-medium text-white bg-green-500 rounded-full">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {cart.assigned_agent ? (
                                                <span className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400">
                                                    <i className="fa-solid fa-user-tie text-xs"></i>
                                                    {cart.assigned_agent.name}
                                                </span>
                                            ) : cart.is_contactable ? (
                                                assigningCartId === cart.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <select
                                                            value={selectedAgentId}
                                                            onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                                                            className="text-xs border border-border rounded px-1.5 py-1 bg-white dark:bg-gray-700 dark:text-gray-200"
                                                        >
                                                            <option value="">Select...</option>
                                                            {agents.map(a => (
                                                                <option key={a.id} value={a.id}>{a.name}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => handleAssignAgent(cart.id)}
                                                            disabled={!selectedAgentId || isAssigning}
                                                            className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                                        >
                                                            {isAssigning ? '...' : 'OK'}
                                                        </button>
                                                        <button
                                                            onClick={() => { setAssigningCartId(null); setSelectedAgentId(''); }}
                                                            className="text-xs px-1 py-1 text-gray-500 hover:text-gray-700"
                                                        >
                                                            <i className="fa-solid fa-xmark"></i>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setAssigningCartId(cart.id)}
                                                        className="text-xs px-2 py-1 border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900"
                                                    >
                                                        <i className="fa-solid fa-user-plus mr-1"></i>
                                                        Assign
                                                    </button>
                                                )
                                            ) : (
                                                <span className="text-xs text-muted">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    className="text-primary hover:text-primary/80 text-lg p-2"
                                                    title="View Cart Details"
                                                    onClick={() => handleViewCart(cart.id)}
                                                >
                                                    <i className="fa-solid fa-eye"></i>
                                                </button>
                                                {cart.is_abandoned && (
                                                    <button
                                                        className="p-2 text-lg text-red-500 hover:text-red-700"
                                                        title="Delete Abandoned Cart"
                                                        onClick={() => handleDeleteCart(cart)}
                                                    >
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {carts.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-muted">
                                            No carts found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && carts.length > 0 && (
                    <div className="p-4 border-t border-border">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted">
                                Showing page {pagination.current_page} of {pagination.last_page} ({pagination.total} customers)
                            </p>
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(pagination.current_page - 1)}
                                    disabled={pagination.current_page <= 1}
                                    aria-label="Go to previous cart page"
                                    className={`min-h-[44px] px-4 py-2 rounded ${
                                        pagination.current_page <= 1
                                            ? 'bg-muted/20 text-muted cursor-not-allowed'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(pagination.current_page + 1)}
                                    disabled={pagination.current_page >= pagination.last_page}
                                    aria-label="Go to next cart page"
                                    className={`min-h-[44px] px-4 py-2 rounded ${
                                        pagination.current_page >= pagination.last_page
                                            ? 'bg-muted/20 text-muted cursor-not-allowed'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Cart Detail Modal */}
            {selectedCart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-foreground">Cart Details</h2>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-muted hover:text-foreground text-xl"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Customer Info */}
                                <div className="border-b border-border pb-4">
                                    <h3 className="text-sm font-medium text-muted uppercase mb-2">Customer</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <i className="fa-solid fa-user text-indigo-600"></i>
                                        </div>
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {selectedCart.customer.name}
                                                {selectedCart.is_contactable && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-300">
                                                        <i className="fa-solid fa-phone text-[10px]"></i>
                                                        Contactable
                                                    </span>
                                                )}
                                            </div>
                                            {selectedCart.customer.type === 'registered' && (
                                                <>
                                                    {selectedCart.customer.email && (
                                                        <div className="text-sm text-muted">{selectedCart.customer.email}</div>
                                                    )}
                                                    {selectedCart.customer.phone && (
                                                        <div className="text-sm text-muted">{selectedCart.customer.phone}</div>
                                                    )}
                                                </>
                                            )}
                                            <div className="text-xs text-muted mt-1">
                                                {selectedCart.customer.type === 'registered' ? 'Registered User' : 'Guest User'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Cart Summary */}
                                <div className="border-b border-border pb-4">
                                    <h3 className="text-sm font-medium text-muted uppercase mb-2">Cart Summary</h3>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div>
                                            <div className="text-xs text-muted">Total Qty</div>
                                            <div className="font-medium">{selectedCart.total_qty}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted">Items</div>
                                            <div className="font-medium">{selectedCart.item_count}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted">Total Amount</div>
                                            <div className="font-bold text-sky-500">{currencyFormatter(selectedCart.total_amount)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted">Last Active</div>
                                            <div className="text-sm">{formatInactiveTime(selectedCart.minutes_inactive)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Checkout Session Data */}
                                {selectedCart.checkout_session && (
                                    <div className="border-b border-border pb-4">
                                        <h3 className="text-sm font-medium text-muted uppercase mb-2">Checkout Contact Info</h3>
                                        <div className="space-y-2">
                                            {selectedCart.checkout_session.customer_name && (
                                                <div className="flex">
                                                    <span className="text-xs text-muted w-20">Name:</span>
                                                    <span className="text-sm">{selectedCart.checkout_session.customer_name}</span>
                                                </div>
                                            )}
                                            {selectedCart.checkout_session.customer_email && (
                                                <div className="flex">
                                                    <span className="text-xs text-muted w-20">Email:</span>
                                                    <span className="text-sm">{selectedCart.checkout_session.customer_email}</span>
                                                </div>
                                            )}
                                            {selectedCart.checkout_session.customer_phone && (
                                                <div className="flex">
                                                    <span className="text-xs text-muted w-20">Phone:</span>
                                                    <span className="text-sm">{selectedCart.checkout_session.customer_phone}</span>
                                                </div>
                                            )}
                                            {selectedCart.checkout_session.formatted_address && (
                                                <div className="flex">
                                                    <span className="text-xs text-muted w-20">Address:</span>
                                                    <span className="text-sm">{selectedCart.checkout_session.formatted_address}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Agent Assignment */}
                                <div className="border-b border-border pb-4">
                                    <h3 className="text-sm font-medium text-muted uppercase mb-2">Assigned Agent</h3>
                                    {selectedCart.assigned_agent && !isChangingAgentInModal ? (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                                    <i className="fa-solid fa-user-tie text-indigo-600 text-sm"></i>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-indigo-600 dark:text-indigo-400">{selectedCart.assigned_agent.name}</div>
                                                    <div className="text-xs text-muted">{selectedCart.assigned_agent.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {selectedCart.is_contactable && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAgentId('');
                                                            setIsChangingAgentInModal(true);
                                                        }}
                                                        className="text-xs px-3 py-1.5 border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900"
                                                    >
                                                        Change Agent
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleRemoveAgent(selectedCart.id)}
                                                    disabled={isAssigning}
                                                    className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900 disabled:opacity-50"
                                                >
                                                    {isAssigning ? 'Removing...' : 'Remove'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : isChangingAgentInModal && selectedCart.is_contactable ? (
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={selectedAgentId}
                                                onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                                                className="text-sm border border-border rounded px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-200"
                                            >
                                                <option value="">Select an agent...</option>
                                                {agents.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleAssignAgent(selectedCart.id)}
                                                disabled={!selectedAgentId || isAssigning}
                                                className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {isAssigning ? 'Assigning...' : 'Assign'}
                                            </button>
                                            <button
                                                onClick={() => { setIsChangingAgentInModal(false); setSelectedAgentId(''); }}
                                                className="text-sm px-3 py-1.5 border border-gray-300 text-gray-600 rounded hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : !selectedCart.assigned_agent && selectedCart.is_contactable ? (
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={selectedAgentId}
                                                onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                                                className="text-sm border border-border rounded px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-200"
                                            >
                                                <option value="">Select an agent...</option>
                                                {agents.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleAssignAgent(selectedCart.id)}
                                                disabled={!selectedAgentId || isAssigning}
                                                className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {isAssigning ? 'Assigning...' : 'Assign'}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted italic">Not available - customer has no contact info</p>
                                    )}
                                </div>

                                {/* Cart Items - Card View */}
                                <div>
                                    <h3 className="text-sm font-medium text-muted uppercase mb-4">Cart Items</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedCart.items.map((item) => (
                                            <div key={item.id} className="border border-border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                                                <div className="flex items-start gap-3">
                                                    <div className="relative shrink-0">
                                                        {item.product?.thumbnail && (
                                                            <img
                                                                src={item.product.thumbnail}
                                                                alt={item.product.name}
                                                                className="w-16 h-16 object-cover rounded"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = '/images/image-error.png';
                                                                }}
                                                            />
                                                        )}
                                                        {item.has_discount && Number(item.discount_percentage) > 0 && (
                                                            <span className="absolute -top-2 -right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                                                                {item.discount_percentage}% OFF
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="font-medium">{item.product?.name}</div>
                                                            {item.is_stock_out ? (
                                                                <span className="inline-flex rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                                                                    Stock Out
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
                                                                    Available
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.variation?.sku && (
                                                            <div className="text-sm text-muted">SKU: {item.variation.sku}</div>
                                                        )}
                                                        {item.shop && (
                                                            <div className="text-sm text-muted">Shop: {item.shop.name}</div>
                                                        )}
                                                        {item.is_stock_out && (
                                                            <div className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300">
                                                                {item.is_published === false
                                                                    ? 'Product is unpublished'
                                                                    : 'Product stock is unavailable'}
                                                            </div>
                                                        )}
                                                        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                                                            <div>
                                                                <span className="text-muted">Qty:</span> {item.quantity}
                                                            </div>
                                                            <div>
                                                                <span className="text-muted">Price:</span>{' '}
                                                                {item.has_discount ? (
                                                                    <span>
                                                                        <span className="text-muted line-through">
                                                                            {currencyFormatter(item.regular_price || item.unit_price)}
                                                                        </span>{' '}
                                                                        <span className="font-semibold text-red-600">
                                                                            {currencyFormatter(item.unit_price)}
                                                                        </span>
                                                                    </span>
                                                                ) : (
                                                                    currencyFormatter(item.unit_price)
                                                                )}
                                                            </div>
                                                            <div>
                                                                <span className="text-muted">Total:</span> <span className="font-medium text-sky-500">{currencyFormatter(item.total)}</span>
                                                            </div>
                                                        </div>
                                                        {item.has_discount && (
                                                            <div className="mt-2 inline-flex rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-200">
                                                                Discount price: {currencyFormatter(item.unit_price)} ({item.discount_percentage}% OFF)
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Cart Status */}
                                <div>
                                    <h3 className="text-sm font-medium text-muted uppercase mb-2">Cart Status</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-xs text-muted">Created At</div>
                                            <div className="text-sm">{formatCartDate(selectedCart.items[0]?.created_at || selectedCart.last_active)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted">Last Updated</div>
                                            <div className="text-sm">{formatCartDate(selectedCart.last_active)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted">Inactive Time</div>
                                            <div className="text-sm">{formatInactiveTime(selectedCart.minutes_inactive)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted">Status</div>
                                            <div>
                                                {selectedCart.is_abandoned ? (
                                                    <span className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full">
                                                        Abandoned
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 text-xs font-medium text-white bg-green-500 rounded-full">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-border flex justify-end gap-3">
                                <button
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => setShowConfirmOrder(true)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                    <i className="fa-solid fa-check mr-2"></i>
                                    Confirm Order
                                </button>
                                <button
                                    onClick={handleTransferToPos}
                                    disabled={isTransferring}
                                    className={`px-4 py-2 rounded ${
                                        isTransferring
                                            ? 'bg-green-400 cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-700'
                                    } text-white`}
                                >
                                    {isTransferring ? (
                                        <>
                                            <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
                                            Transferring...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-cash-register mr-2"></i>
                                            Complete Order in POS
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmOrder && selectedCart && (
                <ConfirmOrderModal
                    cart={selectedCart}
                    onClose={() => setShowConfirmOrder(false)}
                    onSuccess={handleConfirmOrderSuccess}
                />
            )}

            {confirmOrderSuccess && (
                <div className="fixed top-4 right-4 z-[70] bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
                    <i className="fa-solid fa-check-circle"></i>
                    <span>Order {confirmOrderSuccess} confirmed successfully!</span>
                    <button onClick={() => setConfirmOrderSuccess(null)} className="ml-2 hover:text-green-200">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
            )}
        </div>
    );
};

export default CartList;
