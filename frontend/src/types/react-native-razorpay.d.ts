declare module "react-native-razorpay" {
  export type RazorpayOpenOptions = {
    description?: string;
    image?: string;
    currency?: string;
    key: string;
    amount: number;
    name?: string;
    order_id?: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
      backdrop_color?: string;
    };
    modal?: {
      backdropclose?: boolean;
      handleback?: boolean;
      confirm_close?: boolean;
    };
  };

  export type RazorpaySuccessData = {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  };

  export type RazorpayError = {
    code?: number;
    description?: string;
  };

  const RazorpayCheckout: {
    open(options: RazorpayOpenOptions): Promise<RazorpaySuccessData>;
  };

  export default RazorpayCheckout;
}
