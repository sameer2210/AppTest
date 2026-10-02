export const paymentsPaths = {
  "/api/payment/order": {
    post: {
      tags: ["Payments & Ticketing"],
      summary: "Create Razorpay payment order",
      description: "Creates an order in Razorpay for gym memberships, tournament tickets, or marketplace purchases.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["amount", "currency"],
              properties: {
                amount: { type: "number", example: 49900, description: "Amount in smallest currency unit (e.g. paise: 49900 = ₹499)" },
                currency: { type: "string", example: "INR" },
                receipt: { type: "string", example: "rcpt_gym_01" },
                notes: { type: "object" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Razorpay order created.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  order: {
                    type: "object",
                    properties: {
                      id: { type: "string", example: "order_K8dJ12f9kL3" },
                      amount: { type: "number", example: 49900 },
                      currency: { type: "string", example: "INR" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/payment/verify": {
    post: {
      tags: ["Payments & Ticketing"],
      summary: "Verify Razorpay signature",
      description: "Cryptographically verifies payment signature received from Razorpay Checkout frontend.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["razorpay_order_id", "razorpay_payment_id", "razorpay_signature"],
              properties: {
                razorpay_order_id: { type: "string", example: "order_K8dJ12f9kL3" },
                razorpay_payment_id: { type: "string", example: "pay_K8dM90f1aB2" },
                razorpay_signature: { type: "string", example: "9ef8120cda456..." },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Payment verified successfully.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StandardSuccess" },
            },
          },
        },
        400: { description: "Invalid signature verification failed." },
      },
    },
  },
  "/api/payment/history": {
    get: {
      tags: ["Payments & Ticketing"],
      summary: "Get user payment transaction history",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Transaction records.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  payments: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
      },
    },
  },
};
