import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { LiaTimesSolid } from 'react-icons/lia';
import { MdArrowBack } from 'react-icons/md';
import { Drawer } from 'vaul';
import { useFormik } from 'formik';
import { object, string } from 'yup';
import Button from '../../react/components/inputs/Button';
import Input from '../../react/components/inputs/Input';
import Textarea from '../../react/components/inputs/Textarea';
import Spinner from '../../react/components/loader/Spinner';
import { objectToFormData } from '../../react/utils/ObjectFormData';
import { translate } from '../../react/utils/translate';
import {
    BANGLADESH_MOBILE_ERROR,
    BANGLADESH_MOBILE_REGEX,
    sanitizeBangladeshMobile,
} from '../../react/utils/bangladeshPhone';
import { IAddress, ICustomer } from '../types';
import { searchCustomers, addCustomer, getAddresses } from '../utils/actions';
import { useDrawerViewportHeight } from '../hooks/useDrawerViewportHeight';
import ModalWrapper from './ModalWrapper';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (customer: ICustomer, address?: IAddress) => void;
    isMobile?: boolean;
}

const CustomerSearchModal = ({ isOpen, onClose, onSuccess, isMobile = false }: Props) => {
    const [phone, setPhone] = useState('');
    const [results, setResults] = useState<ICustomer[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const drawerHeight = useDrawerViewportHeight(isOpen, isMobile);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const normalizePhone = (phone: string): string => phone.replace(/\D/g, '');

    const handleSelectCustomer = (customer: ICustomer) => {
        if (!BANGLADESH_MOBILE_REGEX.test(normalizePhone(customer.phone || ''))) {
            toast.error(translate('Update this customer with a valid 11-digit phone number before placing an order'));
            return;
        }

        getAddresses(customer.id)
            .then((addresses) => onSuccess(customer, addresses[0]))
            .catch(() => onSuccess(customer));
        handleClose();
    };

    const handleClose = () => {
        setPhone('');
        setResults([]);
        setShowCreateForm(false);
        createFormik.resetForm();
        onClose();
    };

    const createFormik = useFormik({
        initialValues: { name: '', address: '' },
        validationSchema: object().shape({
            name: string().required(translate('Name is required')),
            address: string(),
        }),
        onSubmit: async (values, helpers) => {
            if (!BANGLADESH_MOBILE_REGEX.test(phone)) {
                toast.error(translate(BANGLADESH_MOBILE_ERROR));
                helpers.setSubmitting(false);
                return;
            }

            try {
                const result = await addCustomer(
                    objectToFormData({ name: values.name, phone, address: values.address }),
                );
                toast.success(translate('Customer created successfully'));
                getAddresses(result.newCustomer.id)
                    .then((addresses) => onSuccess(result.newCustomer, addresses[0]))
                    .catch(() => onSuccess(result.newCustomer));
                handleClose();
                helpers.resetForm();
            } catch (error: any) {
                toast.error(error.message || translate('Failed to create customer'));
            }
        },
    });

    useEffect(() => {
        if (!isOpen) return;
        setPhone('');
        setResults([]);
        setShowCreateForm(false);
        createFormik.resetForm();
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [isOpen]);

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (!phone.trim() || phone.trim().length < 2) {
            setResults([]);
            setShowCreateForm(false);
            return;
        }

        setIsSearching(true);
        debounceRef.current = setTimeout(() => {
            searchCustomers(phone.trim())
                .then((data) => {
                    const customers = data || [];
                    const normalizedSearch = normalizePhone(phone.trim());

                    const exactMatches = customers.filter(customer =>
                        customer.phone && normalizePhone(customer.phone) === normalizedSearch
                    );

                    if (exactMatches.length === 1) {
                        handleSelectCustomer(exactMatches[0]);
                    } else {
                        setResults(customers);
                        setShowCreateForm(
                            customers.length === 0 && BANGLADESH_MOBILE_REGEX.test(phone),
                        );
                    }
                })
                .catch(() => {
                    toast.error(translate('Failed to search customers'));
                })
                .finally(() => setIsSearching(false));
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [phone]);

    const header = (
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <button type="button" onClick={handleClose} className="text-lg text-muted hover:text-foreground">
                <MdArrowBack />
            </button>
            <h5 className="flex-1 text-base font-semibold">
                {translate('Search Customer')}
            </h5>
            <button type="button" onClick={handleClose} className="text-xl text-muted hover:text-foreground">
                <LiaTimesSolid />
            </button>
        </div>
    );

    const body = (
        <div className="p-4 space-y-4">
            <div>
                <label className="mb-1 block text-sm font-medium">
                    {translate('Phone Number')}
                </label>
                <input
                    ref={inputRef}
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    value={phone}
                    onChange={(e) => {
                        setPhone(sanitizeBangladeshMobile(e.target.value));
                        setShowCreateForm(false);
                    }}
                    placeholder={translate('Enter customer phone number...')}
                    className="w-full rounded-md border border-border bg-background-primary-light px-3 py-2 text-base text-foreground placeholder:text-muted focus:border-primary/40 focus:outline-none"
                />
                {phone.length > 0 && !BANGLADESH_MOBILE_REGEX.test(phone) && (
                    <p className="mt-1 text-xs text-theme-alert">
                        {translate(BANGLADESH_MOBILE_ERROR)}
                    </p>
                )}
            </div>

            {isSearching ? (
                <div className="flex justify-center py-6">
                    <Spinner className="w-[30px] h-[30px]" />
                </div>
            ) : results.length > 0 ? (
                <div className="space-y-1 max-h-[280px] overflow-y-auto">
                    {results.map((customer) => (
                        <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleSelectCustomer(customer)}
                            className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left hover:bg-background-hover transition-colors"
                        >
                            <div>
                                <p className="text-sm font-medium text-foreground">{customer.name}</p>
                                {customer.phone && (
                                    <p className="text-xs text-muted">{customer.phone}</p>
                                )}
                            </div>
                            <span className="text-xs text-muted shrink-0">
                                {translate('Select')}
                            </span>
                        </button>
                    ))}
                </div>
            ) : showCreateForm ? (
                <div className="rounded-md border border-border bg-background-primary-light p-4">
                    <p className="text-sm text-muted mb-3">
                        {translate('No customer found with this phone number. Create a new customer?')}
                    </p>
                    <form onSubmit={createFormik.handleSubmit} className="space-y-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                {translate('Name')}
                                <span className="ml-1 text-red-500">*</span>
                            </label>
                            <Input
                                {...createFormik.getFieldProps('name')}
                                touched={createFormik.touched.name}
                                error={createFormik.errors.name}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                {translate('Address')}
                            </label>
                            <Textarea
                                {...createFormik.getFieldProps('address')}
                                rows={2}
                                touched={createFormik.touched.address}
                                error={createFormik.errors.address}
                            />
                        </div>
                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            isLoading={createFormik.isSubmitting}
                            disabled={!BANGLADESH_MOBILE_REGEX.test(phone)}
                        >
                            {translate('Create Customer')}
                        </Button>
                    </form>
                </div>
            ) : BANGLADESH_MOBILE_REGEX.test(phone) ? (
                <div className="text-center py-4 text-sm text-muted">
                    {translate('Searching...')}
                </div>
            ) : null}
        </div>
    );

    const modalContent = (
        <div className="flex h-full flex-col bg-background text-foreground">
            {header}
            <div className="flex-1 overflow-y-auto">{body}</div>
        </div>
    );

    return isMobile ? (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
                <Drawer.Content
                    className="fixed inset-x-0 top-0 z-50 flex h-full flex-col bg-background text-foreground outline-none"
                    style={drawerHeight ? { height: drawerHeight } : { height: '100dvh' }}
                >
                    <div className="mx-auto mt-3 h-1 w-12 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
                    {modalContent}
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    ) : (
        <ModalWrapper isActive={isOpen} onClose={handleClose} size="md">
            {modalContent}
        </ModalWrapper>
    );
};

export default CustomerSearchModal;
