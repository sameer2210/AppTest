export type PolicyPageId =
  "privacy-policy" | "terms-and-conditions" | "refund-cancellation" | "contact-us";

export type PolicyPage = {
  id: PolicyPageId;
  title: string;
  url: string;
};

export const POLICY_PAGES: Record<PolicyPageId, PolicyPage> = {
  "privacy-policy": {
    id: "privacy-policy",
    title: "Privacy Policy",
    url: "https://stron.in/privacy",
  },
  "terms-and-conditions": {
    id: "terms-and-conditions",
    title: "Terms & Conditions",
    url: "https://stron.in/terms",
  },
  "refund-cancellation": {
    id: "refund-cancellation",
    title: "Refund & Cancellation Policy",
    url: "https://stron.in/refund-policy",
  },
  "contact-us": {
    id: "contact-us",
    title: "Contact Us",
    url: "https://stron.in/contact",
  },
};

export const SETTINGS_POLICY_LINKS: PolicyPageId[] = [
  "privacy-policy",
  "terms-and-conditions",
  "refund-cancellation",
  "contact-us",
];

export const isPolicyPageId = (value: string): value is PolicyPageId => value in POLICY_PAGES;
