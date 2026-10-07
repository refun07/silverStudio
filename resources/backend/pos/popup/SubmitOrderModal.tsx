import { useFormik } from 'formik';
import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { LiaTimesSolid } from 'react-icons/lia';
import { number, object, string } from 'yup';
import { Drawer } from 'vaul';
import { useDrawerViewportHeight } from '../hooks/useDrawerViewportHeight';
import { useScrollIntoViewOnFocus } from '../hooks/useScrollIntoViewOnFocus';
import {
    currencyFormatter,
    paddedNumber,
} from '../../../frontend/utils/numberFormatter';
import Image from '../../react/components/Image';
import Button from '../../react/components/inputs/Button';
import Input from '../../react/components/inputs/Input';
import SelectInput from '../../react/components/inputs/SelectInput';
import Textarea from '../../react/components/inputs/Textarea';
import { objectToFormData } from '../../react/utils/ObjectFormData';
import { translate } from '../../react/utils/translate';
import { IAddress, ICustomer, IPosCartGroup, InvoiceData } from '../types';
import { submitOrder } from '../utils/actions';
import ModalWrapper from './ModalWrapper';

interface Props {
    discount: number;
    shippingCharge: number;
    posCartGroup?: IPosCartGroup;
    stockOverride?: boolean;

    shippingAddress?: IAddress;
    customer?: ICustomer;

    onSuccess: (invoiceData?: InvoiceData) => void;
    isMobile?: boolean;
}

interface FormValues {
    posCartGroupId: number | null;
    discount: number;
    shippingCharge: number;

    shippingAddressId?: number;
    customerId?: number;
    memo_date?: string;
    memo_no?: string;
    mushak_challan_no?: string;
    note?: string;
    source?: string;

    paymentMethod: string;
    bkashAmount: string | number;
}

const paymentMethods = [
    { label: 'bKash', value: 'bkash' },
    { label: 'Cash on Delivery', value: 'cash_on_delivery' },
];

const SubmitOrderModal = ({
    discount,
    posCartGroup,
    shippingCharge,
    stockOverride = false,
    customer,
    shippingAddress,
    onSuccess,
    isMobile = false,
}: Props) => {
    const [isActive, setIsActive] = useState(false);
    const drawerHeight = useDrawerViewportHeight(isActive, isMobile);
    const bodyRef = useRef<HTMLDivElement>(null);
    useScrollIntoViewOnFocus(bodyRef, isMobile);

    const handleClose = () => setIsActive(false);

    const calculatePayingAmount = useCallback(() => {
        if (!posCartGroup) return 0;
        return (
            posCartGroup.posCarts.reduce(
                (total, cart) =>
                    total + cart.qty * cart.variation.discountedBasePrice,
                0,
            ) -
            discount +
            shippingCharge
        );
    }, [posCartGroup, discount, shippingCharge]);

    const initialValues: FormValues = {
        posCartGroupId: null,
        discount: 0,
        shippingCharge: 0,
        memo_date: new Date().toISOString().split('T')[0],
        memo_no: '',
        mushak_challan_no: '',
        note: '',
        source: 'Others',
        paymentMethod: 'cash_on_delivery',
        bkashAmount: '',
    };

    const validationSchema = object().shape({
        posCartGroupId: number().required('Cart is required'),
        paymentMethod: string().required('Payment method is required'),
        bkashAmount: number()
            .transform((value, originalValue) =>
                originalValue === '' ? undefined : value,
            )
            .when('paymentMethod', {
                is: 'bkash',
                then: (schema) =>
                    schema
                        .required('bKash amount is required')
                        .moreThan(0, 'bKash amount must be greater than 0'),
                otherwise: (schema) => schema.notRequired(),
            }),
    });

    const formik = useFormik({
        initialValues,
        validationSchema,
        onSubmit: async (values, helpers) => {
            const numericBkashAmount =
                values.paymentMethod === 'bkash'
                    ? Number(values.bkashAmount)
                    : 0;

            if (
                values.paymentMethod === 'bkash' &&
                numericBkashAmount > payingAmount
            ) {
                helpers.setFieldError(
                    'bkashAmount',
                    'bKash amount cannot exceed the total amount',
                );
                helpers.setSubmitting(false);
                return;
            }

            try {
                const paymentData: Record<string, unknown> = {
                    posCartGroupId: values.posCartGroupId,
                    discount: values.discount,
                    shippingCharge: values.shippingCharge,
                    shippingAddressId: values.shippingAddressId,
                    customerId: values.customerId,
                    memo_date: values.memo_date,
                    memo_no: values.memo_no,
                    mushak_challan_no: values.mushak_challan_no,
                    note: values.note,
                    source: values.source,
                    overrideStock: stockOverride ? 1 : 0,
                    paymentMethod: values.paymentMethod,
                    bkash_amount:
                        values.paymentMethod === 'bkash' ? numericBkashAmount : 0,
                };

                const response = await submitOrder(objectToFormData(paymentData));
                toast.success('Order submitted successfully');
                helpers.resetForm();
                onSuccess(response);
                handleClose();
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Failed to submit order',
                );
            }
        },
    });

    useEffect(() => {
        if (!posCartGroup) return;

        formik.setValues({
            ...formik.values,
            posCartGroupId: posCartGroup.posCartGroupId,
            discount,
            shippingCharge,
            customerId: customer?.id,
            shippingAddressId: shippingAddress?.id,
            paymentMethod: 'cash_on_delivery',
            bkashAmount: '',
        });
    }, [posCartGroup, customer, discount, shippingCharge, shippingAddress]);

    const payingAmount = calculatePayingAmount();
    const numericBkashAmount = Number(formik.values.bkashAmount) || 0;
    const dueAmount =
        formik.values.paymentMethod === 'bkash'
            ? Math.max(0, payingAmount - numericBkashAmount)
            : payingAmount;

    const formContent = (
        <form
            onSubmit={formik.handleSubmit}
            className="flex max-h-[inherit] flex-col"
        >
            <div className="theme-modal__header sticky top-0 z-[1] px-3 py-3 sm:px-5">
                <h5>{translate('Create Payment')}</h5>

                <button
                    type="button"
                    className="text-xl text-white sm:text-secondary-light"
                    onClick={handleClose}
                >
                    <LiaTimesSolid />
                </button>
            </div>

            <div
                ref={bodyRef}
                className={`theme-modal__body space-y-3 overflow-y-auto px-3 py-3 sm:px-5 ${isMobile ? 'pb-40' : ''}`}
            >
                {customer ? (
                    <h3 className="mb-5 text-center text-xl font-medium sm:text-2xl">
                        {customer.name}
                    </h3>
                ) : null}

                <div className="grid lg:grid-cols-2 gap-8">
                    <div className="max-lg:order-2 space-y-3">
                        {/* Total Amount Display */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
                            <label className="text-sm font-medium sm:min-w-[150px] sm:py-2">
                                {translate('Total Amount')}
                            </label>
                            <div className="grow rounded-md border border-border bg-background-primary-light px-3 py-2 text-right font-semibold text-foreground">
                                {currencyFormatter(payingAmount)}
                            </div>
                        </div>

                        {/* Payment Summary */}
                        {formik.values.paymentMethod === 'bkash' &&
                            numericBkashAmount > 0 && (
                                <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
                                    <label className="text-sm font-medium sm:min-w-[150px] sm:py-2">
                                        {translate('Payment Summary')}
                                    </label>
                                    <div className="grow space-y-1 rounded-md border border-border bg-background-primary-light px-3 py-2">
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>{translate('Paid (bKash)')}</span>
                                            <span>
                                                {currencyFormatter(
                                                    numericBkashAmount,
                                                )}
                                            </span>
                                        </div>
                                        {dueAmount > 0 && (
                                            <div className="flex justify-between text-sm text-red-600">
                                                <span>
                                                    {translate('Due on Delivery')}
                                                </span>
                                                <span>
                                                    {currencyFormatter(dueAmount)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        {formik.values.paymentMethod === 'cash_on_delivery' && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
                                <label className="text-sm font-medium sm:min-w-[150px] sm:py-2">
                                    {translate('Payment Summary')}
                                </label>
                                <div className="grow rounded-md border border-border bg-background-primary-light px-3 py-2 text-right text-sm text-red-600">
                                    {translate('Collect on Delivery')}:{' '}
                                    {currencyFormatter(payingAmount)}
                                </div>
                            </div>
                        )}

                        {/* Payment Method */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
                            <label className="text-sm font-medium sm:min-w-[150px] sm:py-2">
                                {translate('Payment Method')}
                                <span className="text-theme-alert ml-1">*</span>
                            </label>
                            <div className="grow">
                                <SelectInput
                                    value={formik.values.paymentMethod}
                                    options={paymentMethods}
                                    onChange={(option) =>
                                        formik.setFieldValue('paymentMethod', option.value)
                                    }
                                    isSearchable={false}
                                    menuPortalTarget={isMobile ? null : undefined}
                                />
                            </div>
                        </div>

                        {/* bKash Amount */}
                        {formik.values.paymentMethod === 'bkash' && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
                                <label className="text-sm font-medium sm:min-w-[150px] sm:py-2">
                                    {translate('bKash Amount')}
                                    <span className="text-theme-alert ml-1">*</span>
                                </label>
                                <div className="grow space-y-1">
                                    <Input
                                        type="number"
                                        name="bkashAmount"
                                        value={formik.values.bkashAmount}
                                        onChange={(e) =>
                                            formik.setFieldValue(
                                                'bkashAmount',
                                                e.target.value,
                                            )
                                        }
                                        min={0}
                                        step={0.01}
                                        placeholder={translate(
                                            'Enter bKash amount received',
                                        )}
                                        classNames={{
                                            group: 'grow',
                                            inputWrapper: 'max-w-none',
                                        }}
                                        error={formik.errors.bkashAmount}
                                        touched={formik.touched.bkashAmount}
                                    />
                                    {dueAmount > 0 && (
                                        <div className="text-xs text-red-600">
                                            {translate('Due')}:{' '}
                                            {currencyFormatter(dueAmount)}
                                        </div>
                                    )}
                                    {dueAmount === 0 && numericBkashAmount > 0 && (
                                            <div className="text-xs text-green-600">
                                                {translate('Fully paid via bKash')}
                                            </div>
                                        )}
                                </div>
                            </div>
                        )}

                        {/* Note */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
                            <label className="text-sm font-medium sm:min-w-[150px] sm:py-2">
                                {translate('Note')}
                            </label>
                            <Textarea
                                {...formik.getFieldProps('note')}
                                classNames={{
                                    group: 'grow',
                                    inputWrapper: 'max-w-none',
                                }}
                                rows={4}
                                placeholder={translate('Note')}
                            />
                        </div>
                    </div>

                    <div className="max-lg:order-1">
                        <h5 className="mb-3 text-lg">
                            {translate('Products')} (
                            {paddedNumber(posCartGroup?.posCarts.length)})
                        </h5>
                        <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                            {posCartGroup?.posCarts.map((cart) => (
                                <div
                                    key={cart.id}
                                    className="mb-2 flex gap-3"
                                >
                                    <div>
                                        <Image
                                            src={cart.product.thumbnailImg}
                                            alt={cart.product.name}
                                            width={50}
                                            height={50}
                                            className="min-w-[50px]"
                                        />
                                    </div>
                                    <div>
                                        <span className="line-clamp-2">
                                            {cart.product.name}
                                        </span>
                                        <p className="text-muted">
                                            {currencyFormatter(
                                                cart.variation
                                                    .discountedBasePrice,
                                            )}
                                            <span className="ml-3">
                                                {cart.qty}x
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {shippingAddress ? (
                            <>
                                <h5 className="mt-6 mb-3 text-lg">
                                    {translate('Shipping Address')}
                                </h5>
                                <div className="rounded-md border border-border px-4 py-3 sm:px-5 sm:py-4">
                                    <div>
                                        <p>{shippingAddress.fullAddress}</p>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
            <div className={`theme-modal__footer flex-col gap-2 px-3 py-3 sm:flex-row sm:justify-end sm:px-5 ${isMobile ? '' : 'sticky bottom-0'}`}>
                <Button
                    as="button"
                    type="button"
                    variant="light"
                    onClick={handleClose}
                    className="w-full sm:mr-3 sm:w-auto"
                >
                    {translate('Cancel')}
                </Button>
                <Button
                    variant="primary"
                    as="button"
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={formik.isSubmitting}
                >
                    {formik.isSubmitting
                        ? translate('Submitting...')
                        : translate('Submit')}
                </Button>
            </div>
        </form>
    );

    return (
        <>
            <Button
                variant="primary"
                onClick={() => setIsActive(true)}
                disabled={!posCartGroup}
            >
                {translate('Pay Now')}
            </Button>

            {isMobile ? (
                <Drawer.Root
                    open={isActive}
                    onOpenChange={(open) => !open && handleClose()}
                    repositionInputs={false}
                >
                    <Drawer.Portal>
                        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
                        <Drawer.Content
                            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-xl bg-background text-foreground outline-none"
                            style={{ maxHeight: drawerHeight ?? '95dvh' }}
                        >
                            <div className="mx-auto mt-3 h-1 w-12 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
                            {formContent}
                        </Drawer.Content>
                    </Drawer.Portal>
                </Drawer.Root>
            ) : (
                <ModalWrapper
                    isActive={isActive}
                    size="lg"
                    onClose={handleClose}
                    className="max-sm:w-[calc(100%-16px)] max-sm:max-h-[calc(100%-16px)]"
                >
                    {formContent}
                </ModalWrapper>
            )}
        </>
    );
};

export default SubmitOrderModal;
