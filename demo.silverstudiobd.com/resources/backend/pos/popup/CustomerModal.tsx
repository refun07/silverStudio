import { useFormik } from 'formik';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { LiaTimesSolid } from 'react-icons/lia';
import { MdArrowBack } from 'react-icons/md';
import { object, string } from 'yup';
import { Drawer } from 'vaul';
import Button from '../../react/components/inputs/Button';
import Input from '../../react/components/inputs/Input';
import Textarea from '../../react/components/inputs/Textarea';
import { objectToFormData } from '../../react/utils/ObjectFormData';
import { translate } from '../../react/utils/translate';
import {
    BANGLADESH_MOBILE_ERROR,
    BANGLADESH_MOBILE_REGEX,
    sanitizeBangladeshMobile,
} from '../../react/utils/bangladeshPhone';
import { IAddress, ICustomer } from '../types';
import {
    addAddress,
    addCustomer,
    getAddresses,
    updateAddress,
    updateCustomer,
} from '../utils/actions';
import { useDrawerViewportHeight } from '../hooks/useDrawerViewportHeight';
import ModalWrapper from './ModalWrapper';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    customer?: ICustomer;
    onSuccess: (customer: ICustomer, address?: IAddress) => void;
    customerFilters: ICustomer[];
    onCustomerFiltersUpdate: (customers: ICustomer[]) => void;
    isMobile?: boolean;
}

interface FormValues {
    name: string;
    phone: string;
    address: string;
}

const initialValues: FormValues = {
    name: '',
    phone: '',
    address: '',
};

const CustomerModal = ({
    isOpen,
    onClose,
    customer,
    onSuccess,
    customerFilters,
    onCustomerFiltersUpdate,
    isMobile = false,
}: Props) => {
    const isEditing = !!customer;
    const drawerHeight = useDrawerViewportHeight(isOpen, isMobile);

    const formik = useFormik<FormValues>({
        initialValues,
        validationSchema: object().shape({
            name: string().required('Name is required'),
            phone: string()
                .required('Phone is required')
                .matches(BANGLADESH_MOBILE_REGEX, BANGLADESH_MOBILE_ERROR),
            address: string(),
        }),
        onSubmit: async (values) => {
            try {
                let savedCustomer: ICustomer;

                if (isEditing) {
                    const result = await updateCustomer(
                        customer.id,
                        objectToFormData({ name: values.name, phone: values.phone }),
                    );
                    savedCustomer = result.customer;
                    onCustomerFiltersUpdate(result.customers);

                    if (values.address) {
                        const addresses = await getAddresses(customer.id);
                        if (addresses.length > 0) {
                            await updateAddress(
                                addresses[0].id,
                                objectToFormData({
                                    ...addresses[0],
                                    address: values.address,
                                    id: customer.id,
                                    addressId: addresses[0].id,
                                }),
                            );
                        } else {
                            await addAddress(
                                objectToFormData({
                                    address: values.address,
                                    type: 'home',
                                    id: customer.id,
                                }),
                            );
                        }
                    }

                    toast.success('Customer updated successfully');
                } else {
                    const result = await addCustomer(
                        objectToFormData({ name: values.name, phone: values.phone }),
                    );
                    savedCustomer = result.newCustomer;
                    onCustomerFiltersUpdate([result.newCustomer, ...customerFilters]);

                    if (values.address) {
                        try {
                            await addAddress(
                                objectToFormData({
                                    address: values.address,
                                    type: 'home',
                                    id: result.newCustomer.id,
                                }),
                            );
                        } catch {
                            toast.error('Customer created, but address failed');
                        }
                    }

                    toast.success('Customer created successfully');
                }

                let address: IAddress | undefined;
                try {
                    const addresses = await getAddresses(savedCustomer.id);
                    address = addresses[0];
                } catch {
                    // keep address undefined
                }
                onSuccess(savedCustomer, address);
                handleClose();
            } catch (error: any) {
                toast.error(error.message || 'Failed to save customer');
            }
        },
    });

    useEffect(() => {
        if (!isOpen) return;
        if (customer) {
            getAddresses(customer.id)
                .then((addresses) => {
                    formik.setValues({
                        name: customer.name,
                        phone: customer.phone || '',
                        address: addresses[0]?.address || '',
                    });
                })
                .catch(() => {
                    formik.setValues({
                        name: customer.name,
                        phone: customer.phone || '',
                        address: '',
                    });
                });
        } else {
            formik.resetForm();
        }
    }, [isOpen, customer]);

    const handleClose = () => {
        formik.resetForm();
        onClose();
    };

    const header = (
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <button type="button" onClick={handleClose} className="text-lg text-muted hover:text-foreground">
                <MdArrowBack />
            </button>
            <h5 className="flex-1 text-base font-semibold">
                {isEditing ? translate('Update Customer') : translate('Add Customer')}
            </h5>
            <button type="button" onClick={handleClose} className="text-xl text-muted hover:text-foreground">
                <LiaTimesSolid />
            </button>
        </div>
    );

    const form = (
        <form onSubmit={formik.handleSubmit} className="p-4 space-y-4">
            <div>
                <label className="mb-1 block text-sm font-medium">
                    {translate('Name')}
                    <span className="ml-1 text-red-500">*</span>
                </label>
                <Input
                    {...formik.getFieldProps('name')}
                    touched={formik.touched.name}
                    error={formik.errors.name}
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    {translate('Phone')}
                    <span className="ml-1 text-red-500">*</span>
                </label>
                <Input
                    {...formik.getFieldProps('phone')}
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    onChange={(event) => {
                        formik.setFieldValue('phone', sanitizeBangladeshMobile(event.target.value));
                    }}
                    touched={formik.touched.phone}
                    error={formik.errors.phone}
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    {translate('Address')}
                </label>
                <Textarea
                    {...formik.getFieldProps('address')}
                    rows={3}
                    touched={formik.touched.address}
                    error={formik.errors.address}
                />
            </div>

            <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={formik.isSubmitting}
            >
                {isEditing ? translate('Update Customer') : translate('Create Customer')}
            </Button>
        </form>
    );

    const modalContent = (
        <div className="flex h-full flex-col bg-background text-foreground">
            {header}
            <div className="flex-1 overflow-y-auto">{form}</div>
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

export default CustomerModal;
