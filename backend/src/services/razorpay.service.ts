import Razorpay from 'razorpay';
import crypto from 'crypto';
import { logger } from '../utils/logger.util.js';
import { codedError } from '../utils/stronHttpError.util.js';
import { getErrorMessage } from '../types/mongo.util.js';
import type { ServiceParams } from '../types/service.util.js';
import type {
  RazorpayApiError,
  RefundOptions,
  CreateRazorpayPlanParams,
  CreateSubscriptionParams,
} from '../types/razorpay.types.js';

export type { CreateRazorpayPlanParams, CreateSubscriptionParams };


// Initialize razorpay instance
// It's a good practice to initialize it only if keys are present, 
// but we will throw an error if they are missing when needed.
let razorpayInstance: Razorpay | null = null;

const getRazorpayKeys = () => ({
    keyId: (process.env.RAZORPAY_KEY_ID || '').trim(),
    keySecret: (process.env.RAZORPAY_KEY_SECRET || '').trim(),
});

const getRazorpayInstance = (): Razorpay => {
    const { keyId, keySecret } = getRazorpayKeys();
    if (!keyId || !keySecret) {
        throw codedError(
            'payment_not_configured',
            'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the backend .env, then restart the server.',
        );
    }
    if (!razorpayInstance) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables.');
        }
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return razorpayInstance;
};

const mapRazorpayError = (error: unknown) => {
    const err = error as RazorpayApiError;
    const description =
        err?.error?.description ||
        err?.description ||
        err?.message ||
        'Razorpay request failed.';
    const statusCode = Number(err?.statusCode || err?.status || 0);
    const isAuthFailure =
        statusCode === 401 ||
        /authentication failed/i.test(String(description));

    if (isAuthFailure) {
        return codedError(
            'payment_auth_failed',
            'Razorpay authentication failed. RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are invalid or do not match. Generate a fresh Key Id + Secret pair from the Razorpay Dashboard (Test mode) and restart the backend.',
        );
    }

    return codedError('payment_failed', description);
};

/**
 * Create a new Razorpay order
 * @param {number} amount Amount in smallest currency unit (e.g. paise for INR)
 * @param {string} currency Currency code (e.g. 'INR')
 * @param {string} receipt Unique receipt ID
 * @param {object} notes Additional metadata
 * @returns {Promise<object>} The created order
 */
export const createOrder = async (
    amount: number,
    currency = 'INR',
    receipt: string,
    notes: Record<string, unknown> = {},
) => {
    try {
        const isTestMode = process.env.NODE_ENV === 'test' || process.env.MOCK_RAZORPAY === 'true';
        if (isTestMode) {
            const mockOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            return {
                id: mockOrderId,
                entity: 'order',
                amount: Math.round(amount),
                amount_paid: 0,
                amount_due: Math.round(amount),
                currency,
                receipt: receipt || `receipt_${Date.now()}`,
                offer_id: null as string | null,
                status: 'created',
                attempts: 0,
                notes: notes || {},
                created_at: Math.floor(Date.now() / 1000),
            };
        }

        const options = {
            amount: Math.round(amount), // ensure it's an integer
            currency,
            receipt,
            notes
        };
        const order = await getRazorpayInstance().orders.create(
            options as Parameters<ReturnType<typeof getRazorpayInstance>['orders']['create']>[0],
        );
        return order;
    } catch (error: unknown) {
        logger.error('Error creating Razorpay order:', error);
        throw mapRazorpayError(error);
    }
};

/**
 * Verify payment signature
 * @param {string} orderId 
 * @param {string} paymentId 
 * @param {string} signature 
 * @returns {boolean} True if signature is valid
 */
export const verifySignature = (orderId: string, paymentId: string, signature: string) => {
    try {
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not defined");
        if (!signature || typeof signature !== "string") return false;

        const body = orderId + "|" + paymentId;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body.toString())
            .digest('hex');

        const expectedBuf = Buffer.from(expectedSignature, 'hex');
        const sigBuf = Buffer.from(signature, 'hex');
        if (expectedBuf.length !== sigBuf.length) return false;

        // Use timing-safe comparison to prevent timing-oracle attacks
        return crypto.timingSafeEqual(expectedBuf, sigBuf);
    } catch (error: unknown) {
        logger.error('Error verifying signature:', error);
        return false;
    }
};

/**
 * Verify webhook signature
 * @param {string} payload Raw stringified body of the request
 * @param {string} signature x-razorpay-signature header
 * @returns {boolean}
 */
export const verifyWebhookSignature = (
    payload: string | Buffer | unknown,
    signature: string,
    customSecret: string | null = null,
) => {
    try {
        const secret =
            customSecret ||
            process.env.RAZORPAY_WEBHOOK_SECRET ||
            (process.env.NODE_ENV === "test" ? "default_mock_webhook_secret_for_tests" : null);
        if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not defined");
        if (!signature || typeof signature !== "string") return false;

        const bodyString = typeof payload === "string" || Buffer.isBuffer(payload)
            ? payload
            : JSON.stringify(payload);

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(bodyString)
            .digest('hex');

        const expectedBuf = Buffer.from(expectedSignature, 'hex');
        const sigBuf = Buffer.from(signature, 'hex');
        if (expectedBuf.length !== sigBuf.length) return false;

        // Use timing-safe comparison to prevent timing-oracle attacks
        return crypto.timingSafeEqual(expectedBuf, sigBuf);
    } catch (error: unknown) {
        logger.error('Error verifying webhook signature:', error);
        return false;
    }
};

/**
 * Fetch payment details
 * @param {string} paymentId 
 */
export const fetchPayment = async (paymentId: string) => {
    try {
        return await getRazorpayInstance().payments.fetch(paymentId);
    } catch (error: unknown) {
        logger.error('Error fetching Razorpay payment:', error);
        throw error;
    }
};

/**
 * Refund a payment
 * @param {string} paymentId 
 * @param {number} amount Amount to refund in smallest unit. If omitted, full refund.
 * @param {object} notes 
 */
export const refundPayment = async (
    paymentId: string,
    amount: number | undefined,
    notes: Record<string, unknown> = {},
) => {
    try {
        const isTestMode = process.env.NODE_ENV === 'test' || process.env.MOCK_RAZORPAY === 'true';
        if (isTestMode) {
            return {
                id: `rfnd_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                entity: 'refund',
                amount: amount ? Math.round(amount) : 100,
                currency: 'INR',
                payment_id: paymentId,
                status: 'processed',
                notes: notes || {},
                created_at: Math.floor(Date.now() / 1000),
            };
        }

        const options: RefundOptions = {};
        if (amount) options.amount = Math.round(amount);
        if (Object.keys(notes).length > 0) options.notes = notes;
        
        return await getRazorpayInstance().payments.refund(
            paymentId,
            options as Parameters<ReturnType<typeof getRazorpayInstance>['payments']['refund']>[1],
        );
    } catch (error: unknown) {
        logger.error('Error refunding Razorpay payment:', error);
        throw mapRazorpayError(error);
    }
};

/**
 * Fetch order details
 * @param {string} orderId
 */
export const fetchOrder = async (orderId: string) => {
    try {
        return await getRazorpayInstance().orders.fetch(orderId);
    } catch (error: unknown) {
        logger.error('Error fetching Razorpay order:', error);
        throw error;
    }
};

/**
 * Capture an authorized payment
 * @param {string} paymentId
 * @param {number} amount Amount in smallest currency unit
 */
export const capturePayment = async (paymentId: string, amount: number) => {
    try {
        return await getRazorpayInstance().payments.capture(
            paymentId,
            Math.round(amount),
            'INR',
        );
    } catch (error: unknown) {
        logger.error('Error capturing Razorpay payment:', error);
        throw error;
    }
};

/**
 * Validate PAN format
 * Standard format: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)
 */
export const validatePan = (pan: unknown) => {
    if (!pan || typeof pan !== 'string') {
        return { valid: false, reason: 'PAN number is required.' };
    }
    const cleanPan = pan.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(cleanPan)) {
        return {
            valid: false,
            reason: 'Invalid PAN format. PAN must be a valid 10-character alphanumeric Indian Tax ID (e.g. ABCDE1234F).',
        };
    }
    return {
        valid: true,
        pan: cleanPan,
        entityType: cleanPan[3],
    };
};

/**
 * Validate bank account details and perform automated penny-drop verification via RazorpayX Fund Account Validation (FAV).
 * Transfers ₹1.00 (100 paise) and verifies bank account status and registered name.
 * 
 * @param {object} params
 * @param {string} params.accountNumber Bank account number
 * @param {string} params.ifsc Bank IFSC code
 * @param {string} params.accountHolderName Expected account holder name
 * @param {string} [params.businessId] Business ID for KYC correlation
 * @param {object} [params.notes] Extra notes
 * @returns {Promise<{ valid: boolean, status: string, registeredName?: string, favId?: string, message: string }>}
 */
export const validateBankAccountWithPennyDrop = async ({
    accountNumber,
    ifsc,
    accountHolderName,
    businessId,
    notes = {},
}: ServiceParams) => {
    const extraNotes = (notes ?? {}) as Record<string, unknown>;
    const cleanAcc = String(accountNumber || '').trim();
    const cleanIfsc = String(ifsc || '').trim().toUpperCase();
    const cleanName = String(accountHolderName || '').trim();

    if (!cleanAcc || cleanAcc.length < 8 || cleanAcc.length > 20 || !/^\d+$/.test(cleanAcc)) {
        return {
            valid: false,
            status: 'FAILED',
            message: 'Invalid bank account number. Account number must be 8-20 numeric digits.',
        };
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        return {
            valid: false,
            status: 'FAILED',
            message: 'Invalid IFSC code format (e.g. HDFC0001234).',
        };
    }

    const { keyId, keySecret } = getRazorpayKeys();
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.MOCK_PENNY_DROP === 'true';

    // In isolated test runner or explicit mock flag, perform test verification
    if (isTestMode) {
        const mockFavId = `fav_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        return {
            valid: true,
            status: 'VERIFIED',
            registeredName: cleanName,
            favId: mockFavId,
            message: 'Bank account verified successfully via Razorpay penny drop.',
        };
    }

    if (!keyId || !keySecret) {
        logger.warn('[Razorpay Penny Drop] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Failing closed.');
        return {
            valid: false,
            status: 'PENDING',
            message: 'Razorpay credentials not configured. Bank verification is pending.',
        };
    }

    const razorpayXAccount = (process.env.RAZORPAYX_ACCOUNT_NUMBER || '').trim();
    if (!razorpayXAccount) {
        logger.warn('[Razorpay Penny Drop] RAZORPAYX_ACCOUNT_NUMBER is missing. Failing closed.');
        return {
            valid: false,
            status: 'PENDING',
            message: 'RazorpayX source account not configured. Bank verification is pending.',
        };
    }

    try {
        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

        const payload = {
            account_number: razorpayXAccount,
            fund_account: {
                account_type: 'bank_account',
                bank_account: {
                    name: cleanName,
                    ifsc: cleanIfsc,
                    account_number: cleanAcc,
                },
            },
            amount: 100, // 100 paise = ₹1.00 penny drop
            currency: 'INR',
            notes: {
                businessId: businessId ? String(businessId) : undefined,
                purpose: 'kyc_penny_drop_verification',
                ...extraNotes,
            },
        };

        const response = await fetch('https://api.razorpay.com/v1/fund_accounts/validations', {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            const errDesc = data?.error?.description || data?.message || 'Razorpay Fund Account Validation failed.';
            logger.error('[Razorpay FAV Error]:', data);
            return {
                valid: false,
                status: 'FAILED',
                message: errDesc,
            };
        }

        const favId = data.id;
        const favStatus = data.status; // created, completed, failed
        const accountStatus = data.results?.account_status; // active, invalid
        const registeredName = data.results?.registered_name || cleanName;

        if (favStatus === 'completed' || favStatus === 'valid' || accountStatus === 'active') {
            return {
                valid: true,
                status: 'VERIFIED',
                registeredName,
                favId,
                message: 'Bank account verified successfully via Razorpay penny drop.',
            };
        }

        if (favStatus === 'created' || favStatus === 'pending') {
            return {
                valid: false,
                status: 'PENDING',
                favId,
                message: 'Penny drop initiated. Awaiting bank confirmation via Razorpay.',
            };
        }

        return {
            valid: false,
            status: 'FAILED',
            favId,
            message: data.failure_reason || (accountStatus === 'invalid' ? 'Bank account is inactive or invalid.' : 'Penny drop verification failed.'),
        };
    } catch (err: unknown) {
        logger.error('[Razorpay FAV Exception]:', err);
        return {
            valid: false,
            status: 'FAILED',
            message: getErrorMessage(err) || 'Unable to connect to Razorpay KYC service.',
        };
    }
};

/**
 * Create a new Razorpay Plan (for auto-renewing gym plans / PRO)
 * @param {object} params
 * @param {string} params.name Plan name
 * @param {number} params.amount Amount in paise
 * @param {string} [params.currency='INR'] Currency code
 * @param {string} [params.period='monthly'] 'daily' | 'weekly' | 'monthly' | 'yearly'
 * @param {number} [params.interval=1] Cycle multiplier (e.g. 1 for monthly, 3 for quarterly)
 * @param {string} [params.description]
 * @param {object} [params.notes]
 * @returns {Promise<object>}
 */
export const createRazorpayPlan = async ({
    name,
    amount,
    currency = 'INR',
    period = 'monthly',
    interval = 1,
    description = '',
    notes = {},
}: CreateRazorpayPlanParams) => {
    try {
        const isTestMode = process.env.NODE_ENV === 'test' || process.env.MOCK_RAZORPAY === 'true';
        // Only mock in explicit test/mock mode — never silently when keys are merely absent in prod/staging
        if (isTestMode) {
            return {
                id: `plan_rzp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                entity: 'plan',
                interval,
                period,
                item: {
                    id: `item_${Date.now()}`,
                    active: true,
                    name,
                    description,
                    amount: Number(amount) || 0,
                    unit_amount: Number(amount) || 0,
                    currency,
                    type: 'plan',
                },
                notes,
                created_at: Math.floor(Date.now() / 1000),
            };
        }

        const instance = getRazorpayInstance(); // throws payment_not_configured if keys missing
        return await instance.plans.create({
            period: period as 'daily' | 'weekly' | 'monthly' | 'yearly',
            interval,
            item: {
                name,
                amount: Number(amount) || 0,
                currency,
                description: description || undefined,
            },
            notes: notes as Record<string, string | number>,
        });
    } catch (error: unknown) {
        logger.error('Error creating Razorpay plan:', error);
        throw mapRazorpayError(error);
    }
};

/**
 * Create a new Razorpay subscription (for auto-renewing gym plans / PRO)
 * @param {object} params
 * @param {string} [params.planId] Razorpay Plan ID
 * @param {number} [params.totalCount] Total count of cycles (default 12)
 * @param {number} [params.startAt] Unix timestamp for subscription start
 * @param {string} [params.customerId] Razorpay Customer ID
 * @param {number} [params.customerNotify] 1 or 0
 * @param {object} [params.notes] Metadata
 * @returns {Promise<object>}
 */
export const createSubscription = async ({
    planId,
    totalCount = 12,
    startAt,
    customerId,
    customerNotify = 1,
    notes = {},
}: CreateSubscriptionParams = {}) => {
    try {
        const isTestMode = process.env.NODE_ENV === 'test' || process.env.MOCK_RAZORPAY === 'true';
        // Only mock in explicit test/mock mode — never silently when keys are merely absent in prod/staging
        if (isTestMode) {
            const chargeAt = startAt || Math.floor(Date.now() / 1000) + 86400;
            return {
                id: `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                entity: 'subscription',
                plan_id: planId || `plan_${Date.now()}`,
                status: 'created',
                current_start: null as number | null,
                current_end: null as number | null,
                ended_at: null as number | null,
                quantity: 1,
                notes,
                charge_at: chargeAt,
                start_at: chargeAt,
                end_at: null as number | null,
                auth_attempts: 0,
                total_count: totalCount,
                paid_count: 0,
                customer_notify: customerNotify,
                created_at: Math.floor(Date.now() / 1000),
                expire_by: null as number | null,
                short_url: `https://rzp.io/i/sub_${Date.now()}`,
                has_scheduled_changes: false,
                change_scheduled_at: null as number | null,
                source: 'api',
                payment_method: null as string | null,
                customer_id: customerId || null,
            };
        }

        const instance = getRazorpayInstance(); // throws payment_not_configured if keys missing
        const payload: Record<string, unknown> = {
            plan_id: planId,
            total_count: totalCount,
            customer_notify: customerNotify,
            notes,
        };
        if (startAt) {
            payload.start_at = startAt;
        }
        if (customerId) {
            payload.customer_id = customerId;
        }

        return await instance.subscriptions.create(
            payload as unknown as Parameters<typeof instance.subscriptions.create>[0],
        );
    } catch (error: unknown) {
        logger.error('Error creating Razorpay subscription:', error);
        throw mapRazorpayError(error);
    }
};

/**
 * Cancel a Razorpay subscription
 * @param {string} subscriptionId
 * @param {boolean} [cancelAtCycleEnd=false]
 * @returns {Promise<object>}
 */
export const cancelSubscription = async (subscriptionId: string, cancelAtCycleEnd = false) => {
    try {
        if (!subscriptionId) {
            throw new Error('Subscription ID is required to cancel.');
        }
        const isTestMode = process.env.NODE_ENV === 'test' || process.env.MOCK_RAZORPAY === 'true';
        // Only mock in explicit test/mock mode — never silently when keys are merely absent in prod/staging
        if (isTestMode) {
            return {
                id: subscriptionId,
                entity: 'subscription',
                status: cancelAtCycleEnd ? 'active' : 'cancelled',
                cancel_at_cycle_end: Boolean(cancelAtCycleEnd),
                ended_at: cancelAtCycleEnd ? null : Math.floor(Date.now() / 1000),
            };
        }

        const instance = getRazorpayInstance(); // throws payment_not_configured if keys missing
        return await instance.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
    } catch (error: unknown) {
        logger.error('Error cancelling Razorpay subscription:', error);
        throw mapRazorpayError(error);
    }
};

/**
 * Fetch details of a Razorpay subscription
 * @param {string} subscriptionId
 * @returns {Promise<object>}
 */
export const fetchSubscription = async (subscriptionId: string) => {
    try {
        if (!subscriptionId) {
            throw new Error('Subscription ID is required.');
        }
        const isTestMode = process.env.NODE_ENV === 'test' || process.env.MOCK_RAZORPAY === 'true';
        // Only mock in explicit test/mock mode — never silently when keys are merely absent in prod/staging
        if (isTestMode) {
            return {
                id: subscriptionId,
                entity: 'subscription',
                status: 'active',
                plan_id: 'plan_rzp_mock',
                total_count: 12,
                paid_count: 1,
                start_at: Math.floor(Date.now() / 1000),
            };
        }

        const instance = getRazorpayInstance(); // throws payment_not_configured if keys missing
        return await instance.subscriptions.fetch(subscriptionId);
    } catch (error: unknown) {
        logger.error('Error fetching Razorpay subscription:', error);
        throw mapRazorpayError(error);
    }
};

export default {
    createOrder,
    createRazorpayPlan,
    createSubscription,
    cancelSubscription,
    fetchSubscription,
    verifySignature,
    verifyWebhookSignature,
    fetchPayment,
    refundPayment,
    fetchOrder,
    capturePayment,
    validatePan,
    validateBankAccountWithPennyDrop,
};
