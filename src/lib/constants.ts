export const SKIN_TYPES = ["dry", "oily", "combination", "normal", "sensitive"] as const;
export const CONCERNS = ["acne", "pigmentation", "ageing", "dryness", "redness", "dullness", "pores"] as const;
export const KEY_INGREDIENTS = [
  "Niacinamide",
  "Hyaluronic Acid",
  "Retinol",
  "Vitamin C",
  "Ceramides",
  "Salicylic Acid",
  "Centella Asiatica",
  "Peptides",
  "Azelaic Acid",
  "Glycolic Acid",
  "Squalane",
  "Rice Extract",
  "Snail Mucin",
  "PDRN",
] as const;

export const FREE_SHIPPING_THRESHOLD = 15000;
export const GIFT_WRAP_FEE = 750;
export const LOYALTY_EARN_PER_LKR = 100; // 1 point per LKR 100 spent
export const LOYALTY_POINT_VALUE = 1; // 1 point = LKR 1 at redemption

export const PAYMENT_METHODS = [
  { id: "PAYHERE", label: "Card", detail: "Visa, Mastercard, Amex via PayHere. Secure 3-D Secure checkout." },
  { id: "KOKO", label: "Koko", detail: "Pay in 3 interest-free instalments." },
  { id: "MINTPAY", label: "Mintpay", detail: "Pay in 3 interest-free instalments." },
  { id: "BANK_TRANSFER", label: "Bank transfer", detail: "We confirm your order once the transfer clears." },
  { id: "COD", label: "Cash on delivery", detail: "Pay the courier in cash on arrival. Up to LKR 75,000." },
] as const;

export const COD_LIMIT = 75000;

export const BANK_DETAILS = {
  bank: "Commercial Bank of Ceylon",
  branch: "Kollupitiya",
  accountName: "Skinora Imports (Pvt) Ltd",
  accountNumber: "1000 4567 8910",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

export const PAYMENT_LABEL: Record<string, string> = {
  PAYHERE: "Card (PayHere)",
  KOKO: "Koko",
  MINTPAY: "Mintpay",
  BANK_TRANSFER: "Bank transfer",
  COD: "Cash on delivery",
};
