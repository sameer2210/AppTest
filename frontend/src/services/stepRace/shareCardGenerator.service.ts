import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { showToastMessage } from "@/utils/app-utils";
import { captureEvent } from "@/analytics/posthog/events";

export interface ShareCardData {
  leadSteps?: string;
  unit?: string;
  finalPace?: string;
  paceDiff?: string;
  opponentName?: string;
  userName?: string;
  wins?: number;
  losses?: number;
}

export const generateShareCardHtml = (data: ShareCardData): string => {
  const leadSteps = data.leadSteps || "+50";
  const unit = data.unit || "steps";
  const finalPace = data.finalPace || "04:28/km";
  const paceDiff = data.paceDiff || "12% Faster";
  const opponentName = data.opponentName || "Harshit";
  const userName = data.userName || "You";
  const wins = data.wins ?? 4;
  const losses = data.losses ?? 3;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Stron Step Race Result</title>
      <style>
        @page {
          size: 420px 680px;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: linear-gradient(180deg, #1B6FFF 0%, #0A3B99 35%, #030E26 70%, #010614 100%);
          color: #FFFFFF;
          width: 420px;
          height: 680px;
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          -webkit-print-color-adjust: exact;
        }
        .lead-section {
          margin-top: 12px;
        }
        .lead-title {
          color: #2DE441;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .lead-count-row {
          display: flex;
          align-items: baseline;
          margin-top: 8px;
        }
        .lead-number {
          color: #86F291;
          font-size: 84px;
          font-weight: 800;
          line-height: 90px;
          letter-spacing: -2px;
        }
        .lead-unit {
          color: #FFFFFF;
          font-size: 32px;
          font-weight: 600;
          margin-left: 12px;
        }
        .pace-card {
          margin-top: 24px;
          background: rgba(4, 18, 48, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 18px;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .pace-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
        }
        .pace-value {
          color: #FFFFFF;
          font-size: 26px;
          font-weight: 700;
          margin-top: 4px;
        }
        .pace-badge {
          background: rgba(255, 255, 255, 0.18);
          color: #86F291;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 20px;
        }
        .vs-card {
          margin-top: 20px;
          background: rgba(4, 18, 48, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 24px;
          padding: 24px 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .vs-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .user-col {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .avatar-circle {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.3);
          background: #1B6FFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: bold;
          overflow: hidden;
        }
        .avatar-circle.opponent {
          background: #FF5C5C;
        }
        .user-name {
          margin-top: 10px;
          font-size: 16px;
          font-weight: 600;
          color: #397EFF;
        }
        .user-name.opponent {
          color: #FF5C5C;
        }
        .vs-text {
          font-size: 36px;
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 20px;
        }
        .rivalry-section {
          margin-top: 24px;
        }
        .rivalry-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .rivalry-title {
          color: rgba(255, 255, 255, 0.6);
        }
        .rivalry-score {
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 2px;
          font-weight: 600;
        }
        .rivalry-bar {
          display: flex;
          gap: 6px;
          height: 6px;
        }
        .bar-seg {
          flex: 1;
          height: 100%;
          border-radius: 3px;
        }
        .bar-win { background: #2DE441; }
        .bar-loss { background: #FF5C5C; }
        .footer-branding {
          margin-top: 16px;
          text-align: center;
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 1px;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div>
        <div class="lead-section">
          <div class="lead-title">YOUR LEAD</div>
          <div class="lead-count-row">
            <div class="lead-number">${leadSteps}</div>
            <div class="lead-unit">${unit}</div>
          </div>
        </div>

        <div class="pace-card">
          <div>
            <div class="pace-label">Final Pace</div>
            <div class="pace-value">${finalPace}</div>
          </div>
          <div class="pace-badge">${paceDiff}</div>
        </div>

        <div class="vs-card">
          <div class="vs-row">
            <div class="user-col">
              <div class="avatar-circle">🏃</div>
              <div class="user-name">${userName}</div>
            </div>
            <div class="vs-text">VS</div>
            <div class="user-col">
              <div class="avatar-circle opponent">👤</div>
              <div class="user-name opponent">${opponentName}</div>
            </div>
          </div>

          <div class="rivalry-section">
            <div class="rivalry-header">
              <span class="rivalry-title">Rivalry</span>
              <span class="rivalry-score">${wins}W • ${losses}L</span>
            </div>
            <div class="rivalry-bar">
              <div class="bar-seg bar-win"></div>
              <div class="bar-seg bar-win"></div>
              <div class="bar-seg bar-win"></div>
              <div class="bar-seg bar-loss"></div>
              <div class="bar-seg bar-loss"></div>
              <div class="bar-seg bar-win"></div>
              <div class="bar-seg bar-loss"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-branding">STRON 1K STEP RACE • STRON.IN</div>
    </body>
    </html>
  `;
};

export const generateAndShareResultPdfCard = async (data?: ShareCardData): Promise<boolean> => {
  try {
    const html = generateShareCardHtml(data || {});
    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Stron Step Race Result",
        UTI: "com.adobe.pdf",
      });
      captureEvent("race_result_shared", {});
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error generating visual share card:", error);
    showToastMessage("Could not generate result card file");
    return false;
  }
};
