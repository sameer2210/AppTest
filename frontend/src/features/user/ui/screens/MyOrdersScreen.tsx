import { useEffect, useState, useCallback } from "react";
import { View, ScrollView, StatusBar, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import {
  SCREEN_HORIZONTAL_PADDING,
  SCREEN_CONTENT_PADDING_TOP,
  SCREEN_CONTENT_PADDING_BOTTOM,
  screenContentContainerStyle,
} from "@/utils/screen-layout";
import { showToastMessage } from "@/utils/app-utils";
import { useAppDispatch } from "@/store/hooks";
import { fetchMyActivity } from "@/features/managedEvents";
import { shareHtmlAsPdfThunk } from "@/features/payments";
import { href } from "@/navigation/href";
import { captureEvent } from "@/analytics/posthog/events";
import { logError } from "@/config/devLogger";
import type { RootState } from "@/store/store";

type OrderItem = {
  id: string;
  title: string;
  date: string;
  eventKey?: string;
  priceLabel?: string;
  rawPrice: number;
  isFree: boolean;
  ticketLabel?: string;
  paymentMethod?: string;
};

const formatDateLabel = (rawDate?: string | null) => {
  if (!rawDate) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear());
    return `${day}/${month}/${year}`;
  }
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear());
    return `${day}/${month}/${year}`;
  } catch {
    return String(rawDate);
  }
};

export const MyOrdersScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const user = useSelector(
    (state: RootState) => (state as any).auth?.user || (state as any).user?.user,
  );
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);

  const userName = user?.name || user?.username || "STRON Member";

  const loadMyOrders = useCallback(async () => {
    setLoading(true);
    try {
      const activities = await dispatch(fetchMyActivity()).unwrap();
      if (Array.isArray(activities) && activities.length > 0) {
        const mapped = activities.map((item) => {
          const matchedTicket = Array.isArray(item.ticketTypes)
            ? item.ticketTypes.find((t: any) => t && String(t.id) === String(item.ticketTypeId)) ||
              item.ticketTypes[0]
            : undefined;
          const rawPrice = matchedTicket?.price != null ? Number(matchedTicket.price) : 0;
          const isFree = rawPrice <= 0;

          return {
            id: item.id || item.eventKey,
            title: item.title || "STRON Event Ticket",
            date: formatDateLabel(item.dateIso || item.startDate || item.completedAt || item.date),
            eventKey: item.eventKey,
            priceLabel: isFree ? "Free Pass" : `₹${rawPrice}`,
            rawPrice,
            isFree,
            ticketLabel: matchedTicket?.label || undefined,
            paymentMethod: isFree ? "Free Registration Pass" : "Razorpay Online",
          };
        });
        setOrders(mapped);
      } else {
        setOrders([]);
      }
    } catch (error) {
      logError("Failed to load my orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadMyOrders();
  }, [loadMyOrders]);

  const handleDownloadInvoice = async (order: OrderItem) => {
    if (order.isFree || order.rawPrice <= 0) {
      showToastMessage("Invoices are only issued for paid transactions.");
      return;
    }
    if (invoiceOrderId) return;

    captureEvent("invoice_tapped", { event_key: order.eventKey });
    setInvoiceOrderId(order.id);
    try {
      showToastMessage(`Generating tax invoice for ${order.title}...`);

      const invoiceNum = order.id ? String(order.id).toUpperCase() : `STRON-${Date.now()}`;

      const priceNum = order.rawPrice;
      const basePrice = Math.round((priceNum / 1.18) * 100) / 100;
      const totalGst = Math.round((priceNum - basePrice) * 100) / 100;
      const cgst = Math.round((totalGst / 2) * 100) / 100;
      const sgst = Math.round((totalGst - cgst) * 100) / 100;

      const formattedTotal = `₹${priceNum.toFixed(2)}`;
      const formattedBase = `₹${basePrice.toFixed(2)}`;
      const formattedCgst = `₹${cgst.toFixed(2)}`;
      const formattedSgst = `₹${sgst.toFixed(2)}`;
      const formattedTotalGst = `₹${totalGst.toFixed(2)}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Tax Invoice - ${invoiceNum}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #1f2937;
              background-color: #ffffff;
              margin: 0;
              padding: 48px 40px;
              font-size: 13px;
              line-height: 1.4;
            }
            .top-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 32px;
            }
            .logo-container {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .brand-logo {
              width: 54px;
              height: 54px;
              object-fit: contain;
            }
            .brand-name {
              font-size: 28px;
              font-weight: 900;
              letter-spacing: 2px;
              color: #0f172a;
              margin: 0;
              line-height: 1;
            }
            .brand-tag {
              font-size: 11px;
              color: #64748b;
              font-weight: 600;
              letter-spacing: 0.5px;
              margin-top: 4px;
            }
            .invoice-title-box {
              text-align: right;
            }
            .invoice-title {
              font-size: 24px;
              font-weight: 700;
              color: #0f172a;
              margin: 0;
            }
            .invoice-subtitle {
              font-size: 12px;
              color: #64748b;
              margin-top: 2px;
            }

            .info-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 28px;
            }
            .bill-to h4 {
              font-size: 11px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              margin: 0 0 6px 0;
            }
            .bill-to p {
              margin: 0 0 3px 0;
              color: #334155;
              font-size: 13px;
            }
            .meta-table {
              text-align: right;
            }
            .meta-row {
              display: flex;
              justify-content: flex-end;
              gap: 20px;
              margin-bottom: 5px;
            }
            .meta-label {
              color: #64748b;
              font-weight: 500;
            }
            .meta-value {
              font-weight: 700;
              color: #0f172a;
              min-width: 90px;
            }

            .summary-bar {
              display: flex;
              border-radius: 4px;
              overflow: hidden;
              margin-bottom: 32px;
            }
            .bar-col {
              flex: 1;
              background-color: #2563eb;
              color: #ffffff;
              padding: 12px 16px;
            }
            .bar-col-dark {
              flex: 1.2;
              background-color: #1e293b;
              color: #ffffff;
              padding: 12px 16px;
              text-align: right;
            }
            .bar-label {
              font-size: 11px;
              font-weight: 600;
              opacity: 0.9;
              display: block;
              margin-bottom: 2px;
            }
            .bar-val {
              font-size: 15px;
              font-weight: 800;
            }
            .bar-val-lg {
              font-size: 20px;
              font-weight: 900;
            }

            .table-container {
              margin-bottom: 24px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th {
              border-top: 1px solid #0f172a;
              border-bottom: 2px solid #0f172a;
              padding: 10px 8px;
              text-align: left;
              font-size: 12px;
              font-weight: 700;
              color: #0f172a;
            }
            td {
              padding: 14px 8px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 13px;
              color: #334155;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }

            .totals-wrapper {
              display: flex;
              justify-content: flex-end;
              margin-top: 12px;
              margin-bottom: 40px;
            }
            .totals-table {
              width: 340px;
              border-collapse: collapse;
            }
            .totals-table td {
              padding: 6px 8px;
              border-bottom: none;
              font-size: 13px;
            }
            .totals-table .label {
              color: #475569;
              text-align: left;
            }
            .totals-table .val {
              color: #0f172a;
              font-weight: 600;
              text-align: right;
            }
            .totals-table .grand-row td {
              border-top: 1px solid #0f172a;
              font-size: 16px;
              font-weight: 800;
              color: #0f172a;
              padding-top: 10px;
            }

            .signature-section {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 60px;
            }
            .sig-box {
              text-align: right;
            }
            .sig-caption {
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 4px;
            }
            .sig-img {
              height: 64px;
              object-fit: contain;
            }

            .footer {
              position: fixed;
              bottom: 30px;
              left: 40px;
              right: 40px;
              border-top: 1px solid #cbd5e1;
              padding-top: 12px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 11px;
              color: #64748b;
            }
            .footer-col strong {
              color: #0f172a;
            }
          </style>
        </head>
        <body>
          <div class="top-header">
            <div class="logo-container">
              <div class="brand-logo" style="display:flex;align-items:center;justify-content:center;background:#0f172a;color:#fff;font-weight:900;font-size:18px;border-radius:8px;">S</div>
              <div>
                <div class="brand-name">STRON</div>
                <div class="brand-tag">Managed Events &amp; Fitness Technologies</div>
              </div>
            </div>
            <div class="invoice-title-box">
              <div class="invoice-title">Invoice #${invoiceNum}</div>
              <div class="invoice-subtitle">Tax invoice</div>
            </div>
          </div>

          <div class="info-section">
            <div class="bill-to">
              <h4>BILL TO</h4>
              <p><strong>${userName}</strong></p>
              <p>Registered STRON Participant</p>
            </div>
            <div class="meta-table">
              <div class="meta-row">
                <span class="meta-label">Issue date:</span>
                <span class="meta-value">${order.date}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Due date:</span>
                <span class="meta-value">${order.date}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Reference:</span>
                <span class="meta-value">${invoiceNum}</span>
              </div>
            </div>
          </div>

          <div class="summary-bar">
            <div class="bar-col">
              <span class="bar-label">Invoice No.</span>
              <span class="bar-val">${invoiceNum}</span>
            </div>
            <div class="bar-col">
              <span class="bar-label">Issue date</span>
              <span class="bar-val">${order.date}</span>
            </div>
            <div class="bar-col">
              <span class="bar-label">Due date</span>
              <span class="bar-val">${order.date}</span>
            </div>
            <div class="bar-col-dark">
              <span class="bar-label">Total paid (INR)</span>
              <span class="bar-val-lg">${formattedTotal}</span>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-center" style="width: 70px;">Qty</th>
                  <th class="text-right" style="width: 110px;">Base Price (₹)</th>
                  <th class="text-right" style="width: 90px;">GST (18%)</th>
                  <th class="text-right" style="width: 110px;">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>${order.title}</strong><br>
                    <span style="font-size: 11px; color: #64748b;">${order.ticketLabel ? `Tier: ${order.ticketLabel}` : "Participant Registration Pass"}</span>
                  </td>
                  <td class="text-center">1</td>
                  <td class="text-right">${formattedBase}</td>
                  <td class="text-right">${formattedTotalGst}</td>
                  <td class="text-right"><strong>${formattedTotal}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="totals-wrapper">
            <table class="totals-table">
              <tr>
                <td class="label">Base Amount (Taxable Value):</td>
                <td class="val">${formattedBase}</td>
              </tr>
              <tr>
                <td class="label">Central GST (CGST 9%):</td>
                <td class="val">${formattedCgst}</td>
              </tr>
              <tr>
                <td class="label">State GST (SGST 9%):</td>
                <td class="val">${formattedSgst}</td>
              </tr>
              <tr>
                <td class="label">Convenience Fee:</td>
                <td class="val">₹0.00</td>
              </tr>
              <tr class="grand-row">
                <td class="label">Total Amount Paid (INR):</td>
                <td class="val">${formattedTotal}</td>
              </tr>
            </table>
          </div>

          <div class="signature-section">
            <div class="sig-box">
              <div class="sig-caption">Issued by, signature:</div>
              <p style="margin:8px 0 0;font-size:18px;font-style:italic;color:#0f172a;">STRON Technologies</p>
            </div>
          </div>

          <div class="footer">
            <div>
              <strong>STRON Technologies &amp; Managed Events</strong><br>
              India &bull; contact@stron.in
            </div>
            <div>
              www.stron.in
            </div>
            <div>
              support@stron.in
            </div>
          </div>
        </body>
        </html>
      `;

      const shared = await dispatch(
        shareHtmlAsPdfThunk({
          html,
          dialogTitle: `STRON Tax Invoice - ${order.title}`,
        }),
      ).unwrap();
      if (shared) {
        showToastMessage("Invoice ready — choose Save or share from the menu.");
      }
    } catch (error) {
      logError("Failed to generate tax invoice PDF:", error);
      showToastMessage(
        error instanceof Error ? error.message : "Failed to download tax invoice PDF.",
      );
    } finally {
      setInvoiceOrderId(null);
    }
  };

  const handleExplore = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(href.app.tabs as never);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090909" translucent />

      {/* Navigation Header — matching MyRewardsScreen pattern */}
      <View
        style={[
          styles.headerBar,
          { paddingTop: topInset + 8 },
        ]}
      >
        <PressableScale
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(href.app.tabs as never);
            }
          }}
          style={styles.backButton}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </PressableScale>

        <View style={styles.headerTitleCol}>
          <CustomText
            style={[
              headingTextStyles.h1,
              styles.headerTitle,
            ]}
          >
            My Orders
          </CustomText>
        </View>
      </View>

      <View style={styles.content}>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <CustomText
              style={[
                fontTextStyles.fourteenNormalBlack,
                styles.loadingText,
              ]}
            >
              Loading orders...
            </CustomText>
          </View>
        ) : orders.length > 0 ? (
          <ScrollView
            contentContainerStyle={[
              screenContentContainerStyle,
              {
                paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 24,
              },
            ]}
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
          >
            <CustomText
              style={[
                fontTextStyles.sixteenMediumBlack,
                styles.recentSectionTitle,
              ]}
            >
              Recent
            </CustomText>

            {orders.map((order) => (
              <View
                key={order.id}
                style={styles.orderCard}
              >
                <View style={styles.orderCardLeft}>
                  <CustomText
                    style={[
                      fontTextStyles.sixteenMediumBlack,
                      styles.orderTitle,
                    ]}
                    numberOfLines={1}
                  >
                    {order.title}
                  </CustomText>
                  <View style={styles.orderMetaRow}>
                    <CustomText
                      style={[
                        fontTextStyles.twelveNormalBlack,
                        styles.orderDate,
                      ]}
                    >
                      {order.date}
                    </CustomText>
                    {order.priceLabel && (
                      <CustomText
                        style={[
                          fontTextStyles.twelveMediumBlack,
                          { color: order.isFree ? "rgba(255, 255, 255, 0.4)" : "#71BAFF" },
                        ]}
                      >
                        {order.priceLabel}
                      </CustomText>
                    )}
                  </View>
                </View>

                {order.isFree ? (
                  <View style={styles.freePassBadge}>
                    <CustomText
                      style={[
                        fontTextStyles.twelveNormalBlack,
                        styles.freePassText,
                      ]}
                    >
                      Free Pass
                    </CustomText>
                  </View>
                ) : (
                  <PressableScale
                    onPress={() => void handleDownloadInvoice(order)}
                    disabled={invoiceOrderId != null}
                    style={styles.invoiceButton}
                  >
                    {invoiceOrderId === order.id ? (
                      <ActivityIndicator size="small" color="#3897FF" />
                    ) : (
                      <>
                        <CustomText
                          style={[
                            fontTextStyles.fourteenMediumBlack,
                            styles.invoiceButtonText,
                          ]}
                        >
                          Invoice
                        </CustomText>
                        <Ionicons name="download-outline" size={16} color="#3897FF" />
                      </>
                    )}
                  </PressableScale>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="receipt-outline" size={32} color="#71BAFF" />
            </View>
            <CustomText
              style={[
                headingTextStyles.twentyBoldWhite,
                styles.emptyTitle,
              ]}
            >
              No Orders Found
            </CustomText>
            <CustomText
              style={[
                fontTextStyles.fourteenNormalBlack,
                styles.emptySubtitle,
              ]}
            >
              Your registered event tickets, invoices, and memberships will appear here.
            </CustomText>
            <PressableScale
              onPress={handleExplore}
              style={styles.exploreButton}
            >
              <CustomText
                style={[
                  fontTextStyles.sixteenBoldBlack,
                  styles.exploreButtonText,
                ]}
              >
                Explore Events
              </CustomText>
            </PressableScale>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090909",
  },
  content: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: 12,
    zIndex: 20,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleCol: {
    flex: 1,
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textAlign: "right",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 12,
  },
  scrollView: {
    zIndex: 20,
  },
  recentSectionTitle: {
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 12,
    marginLeft: 4,
  },
  orderCard: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    backgroundColor: "rgba(18, 18, 20, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  orderCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  orderTitle: {
    color: "#FFFFFF",
  },
  orderMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  orderDate: {
    color: "rgba(255, 255, 255, 0.5)",
  },
  freePassBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  freePassText: {
    color: "rgba(255, 255, 255, 0.4)",
  },
  invoiceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0, 112, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(0, 112, 255, 0.4)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  invoiceButtonText: {
    color: "#FFFFFF",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 80,
    zIndex: 20,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 4,
  },
  emptySubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 24,
  },
  exploreButton: {
    borderRadius: 999,
    backgroundColor: "#0070FF",
    paddingHorizontal: 32,
    paddingVertical: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  exploreButtonText: {
    color: "#FFFFFF",
  },
});

export default MyOrdersScreen;
