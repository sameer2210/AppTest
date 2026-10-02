// Ticket money math. The participant pays ticketPrice + gatewayFee; the platform keeps
// a commission on the ticketPrice and the organizer nets the remainder. All amounts in INR.

import { getStronConfig } from "../config/stronConfig.js";
import { codedError } from "./stronHttpError.util.js";

export const computeMoneySplit = (
  ticketPrice: number | string,
  couponDiscountRupees: number | string = 0,
) => {
  const price = Number(ticketPrice);
  if (!Number.isFinite(price) || price < 0) {
    throw codedError("invalid_price", "Invalid ticket price.");
  }

  const couponDiscount = Math.max(
    0,
    Math.min(price, Math.round(Number(couponDiscountRupees) || 0)),
  );
  const netTicketPrice = Math.max(0, price - couponDiscount);

  const { platformCommissionPct, gatewayFeePct } = getStronConfig();
  const gatewayFee = Math.round(netTicketPrice * (gatewayFeePct / 100));
  const platformCommission = Math.round(netTicketPrice * (platformCommissionPct / 100));
  const totalCharged = netTicketPrice + gatewayFee;
  // Organizer net is exact against the discounted ticket so settlement never drifts.
  const organizerNet = netTicketPrice - platformCommission;

  return {
    ticketPrice: netTicketPrice,
    originalTicketPrice: price,
    couponDiscount,
    gatewayFee,
    totalCharged,
    platformCommission,
    organizerNet,
  };
};
