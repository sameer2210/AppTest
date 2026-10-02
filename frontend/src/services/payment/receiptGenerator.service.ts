import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, PermissionsAndroid, Platform } from "react-native";
import { logError, logWarn } from "@/config/devLogger";
import { showToastMessage } from "@/utils/app-utils";

export interface ReceiptData {
  planName: string;
  eventTitle?: string;
  ticketNumber?: string;
  paymentMethod: string;
  dateTime: string;
  transactionId: string;
  totalPaid: string;
  userName?: string;
}

const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") {
    return true; // iOS handles document permissions via native Share/Save sheet automatically
  }

  try {
    const hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
    if (hasPermission) return true;

    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: "Storage Permission Required",
        message:
          "STRON requires storage access to download and save your payment receipt PDF to your device.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "Allow",
      },
    );

    // Note: On Android 13+ (API level 33+), traditional WRITE_EXTERNAL_STORAGE is deprecated by Google
    // in favor of system file intents (Sharing/Media Store), so we allow proceeding if API >= 33.
    if (status === PermissionsAndroid.RESULTS.GRANTED || (Platform.Version as number) >= 33) {
      return true;
    } else {
      Alert.alert(
        "Permission Denied",
        "Storage permission is needed to download your receipt PDF. Please enable it in your device settings.",
      );
      return false;
    }
  } catch (err) {
    logWarn("Error requesting storage permission:", err);
    return true;
  }
};

const generateReceiptHtml = (data: ReceiptData): string => {
  const invoiceNum =
    data.transactionId && data.transactionId !== "—"
      ? data.transactionId.toUpperCase()
      : `STRON-${Date.now()}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Receipt - ${invoiceNum}</title>
      <style>
        @page {
          margin: 40px;
        }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1a1a1f;
          margin: 0;
          padding: 20px;
          background-color: #ffffff;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #000000;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .brand {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #000000;
          margin: 0;
        }
        .brand-subtitle {
          font-size: 13px;
          color: #666666;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .receipt-title {
          text-align: right;
        }
        .receipt-title h1 {
          font-size: 24px;
          color: #1a1a1f;
          margin: 0 0 6px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .status-badge {
          display: inline-block;
          background-color: #dcfce7;
          color: #166534;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 4px;
          border: 1px solid #bbf7d0;
          text-transform: uppercase;
        }
        .section-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 35px;
        }
        .info-block h3 {
          font-size: 11px;
          text-transform: uppercase;
          color: #888888;
          margin: 0 0 6px 0;
          letter-spacing: 0.5px;
        }
        .info-block p {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #1a1a1f;
        }
        .info-block span {
          font-size: 13px;
          color: #555555;
        }
        .table-container {
          margin-bottom: 35px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        th {
          background-color: #f8f9fa;
          color: #555555;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 12px 14px;
          border-top: 1px solid #e2e8f0;
          border-bottom: 2px solid #cbd5e1;
        }
        td {
          padding: 16px 14px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
          color: #1e293b;
        }
        .col-qty {
          text-align: center;
          width: 80px;
        }
        .col-price {
          text-align: right;
          width: 120px;
        }
        .totals-section {
          width: 100%;
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
        }
        .totals-table {
          width: 280px;
          border-collapse: collapse;
        }
        .totals-table td {
          padding: 8px 14px;
          border: none;
          font-size: 14px;
        }
        .totals-table .label {
          color: #64748b;
          text-align: left;
        }
        .totals-table .value {
          text-align: right;
          font-weight: 600;
          color: #1e293b;
        }
        .totals-table .grand-total td {
          border-top: 2px solid #0f172a;
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          padding-top: 12px;
        }
        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #64748b;
          text-align: center;
        }
        .footer p {
          margin: 4px 0;
        }
        .highlight-secure {
          font-weight: 600;
          color: #334155;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">STRON</div>
          <div class="brand-subtitle">Managed Events &amp; Experiences</div>
        </div>
        <div class="receipt-title">
          <h1>PAYMENT RECEIPT</h1>
          <span class="status-badge">PAID IN FULL</span>
        </div>
      </div>

      <div class="section-grid">
        <div class="info-block">
          <h3>Billed For / Event</h3>
          <p>${data.planName || data.eventTitle || "STRON Event Plan"}</p>
          ${data.ticketNumber ? `<span>Ticket Ref: #${data.ticketNumber}</span><br>` : ""}
          <span>Status: Confirmed &amp; Active</span>
        </div>
        <div class="info-block" style="text-align: right;">
          <h3>Transaction Information</h3>
          <p>Receipt #${invoiceNum}</p>
          <span>Date: ${data.dateTime}</span><br>
          <span>Payment Method: ${data.paymentMethod || "Razorpay Online"}</span>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="col-qty">Qty</th>
              <th class="col-price">Unit Price</th>
              <th class="col-price">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>${data.planName || data.eventTitle || "Event Ticket Access"}</strong><br>
                <span style="font-size: 12px; color: #64748b;">Transaction Reference: ${invoiceNum}</span>
              </td>
              <td class="col-qty">1</td>
              <td class="col-price">${data.totalPaid}</td>
              <td class="col-price"><strong>${data.totalPaid}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td class="label">Subtotal:</td>
            <td class="value">${data.totalPaid}</td>
          </tr>
          <tr>
            <td class="label">Taxes &amp; Fees:</td>
            <td class="value">Included</td>
          </tr>
          <tr class="grand-total">
            <td class="label">Total Paid:</td>
            <td class="value">${data.totalPaid}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p>This is an electronically generated receipt for your official records and does not require a signature.</p>
        <p>Payments securely processed via <span class="highlight-secure">Razorpay</span> &bull; For support contact <strong>contact@stron.in</strong></p>
      </div>
    </body>
    </html>
  `;
};

/** Generate a PDF from HTML and open the system share/save sheet. */
export const shareHtmlAsPdf = async (html: string, dialogTitle: string): Promise<boolean> => {
  const permissionGranted = await requestStoragePermission();
  if (!permissionGranted) {
    return false;
  }

  const printModule = (Print as any).default || Print;
  const sharingModule = (Sharing as any).default || Sharing;

  const { uri } = await printModule.printToFileAsync({
    html,
    base64: false,
  });

  if (await sharingModule.isAvailableAsync()) {
    await sharingModule.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle,
      UTI: "com.adobe.pdf",
    });
    return true;
  }

  await printModule.printAsync({ html });
  return true;
};

export const downloadAndShareReceipt = async (data: ReceiptData): Promise<void> => {
  try {
    showToastMessage("Generating PDF receipt...");
    const html = generateReceiptHtml(data);
    const ok = await shareHtmlAsPdf(html, "Save Payment Receipt PDF");
    if (!ok) return;
  } catch (error: any) {
    logError("Error downloading receipt:", error);
    Alert.alert(
      "Download Failed",
      "Unable to generate receipt PDF at this time. Please check your storage permissions or contact support.",
    );
  }
};
