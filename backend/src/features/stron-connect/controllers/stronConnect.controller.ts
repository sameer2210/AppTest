import type { Request, Response } from "express";
import {
  getMyConnectQr,
  listMyConnectScans,
  scanConnectQr,
  checkInDirect,
  getConnectCatalogForScan,
} from "../services/stronConnect.service.js";
import { getConnectShareName } from "../services/stronConnectProfile.service.js";
import { routeParam } from "../../../types/controller.util.js";
import { buildStoreLinks, renderShareHtmlPage } from "../../../utils/shareHtml.util.js";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { getErrorCode } from "../../../types/errors.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";

const isTrueQuery = (value: unknown) => value === true || value === "true";

export const getMyConnectQrHandler = async (req: Request, res: Response) => {
  try {
    const forceRotate =
      isTrueQuery(req.query?.refresh) || isTrueQuery(req.query?.force);
    const qr = await getMyConnectQr(req.user!.uid, forceRotate);
    trackEvent(ANALYTICS_EVENTS.CONNECT_QR_VIEWED, {
      user_id: req.user!.uid,
      refreshed: forceRotate,
    });
    return res.status(200).json({ success: true, qr });
  } catch (error) {
    return sendError(res, error);
  }
};

export const scanConnectQrHandler = async (req: Request, res: Response) => {
  try {
    const payload = req.body.payload ?? req.body.qr ?? req.body.data;
    const result = await scanConnectQr({
      scannerUid: req.user!.uid,
      payload,
    });
    trackEvent(ANALYTICS_EVENTS.QR_SCANNED, {
      user_id: req.user!.uid,
      scan_type: result?.kind,
      success: true,
    });
    return res.status(200).json({ success: true, result });
  } catch (error) {
    trackEvent(ANALYTICS_EVENTS.QR_SCANNED, {
      user_id: req.user?.uid,
      success: false,
      reason: getErrorCode(error) || "internal_error",
    });
    return sendError(res, error);
  }
};

export const checkInDirectHandler = async (req: Request, res: Response) => {
  try {
    const { type, eventKey, businessId, memberId, scanId } = req.body;
    const result = await checkInDirect({
      scannerUid: req.user!.uid,
      type,
      eventKey,
      businessId,
      memberId,
      scanId,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const listMyConnectScansHandler = async (req: Request, res: Response) => {
  try {
    const scans = await listMyConnectScans(req.user!.uid, req.query);
    return res.status(200).json({ success: true, scans });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getConnectCatalogHandler = async (req: Request, res: Response) => {
  try {
    const catalog = await getConnectCatalogForScan({
      scannerUid: req.user!.uid,
      scanId: req.query?.scanId,
      targetUid: req.query?.targetUid,
      businessId: req.query?.businessId,
    });
    return res.status(200).json({ success: true, catalog });
  } catch (error) {
    return sendError(res, error);
  }
};

export const openSharedConnectPage = async (req: Request, res: Response) => {
  const uid = routeParam(req.params.uid);

  if (!uid) {
    return res.status(404).type("html").send(
      renderShareHtmlPage({
        title: "User Not Found",
        subtitle: "The user link is invalid.",
        canonicalPath: "/api/connect",
        customScheme: "stron://home",
        referrerSource: "connect_share",
      }),
    );
  }

  let title = "Connect on STRON";
  let subtitle = "Scan or connect with this user on STRON.";

  try {
    const name = await getConnectShareName(uid);
    if (name) {
      title = `Connect with ${name}`;
      subtitle = "Connect on STRON for fitness challenges, check-ins, and events.";
    }
  } catch {
    // Fall back to the generic template when the lookup fails.
  }

  const customScheme = `stron://connect/${encodeURIComponent(uid)}`;
  const canonicalPath = `/api/connect/${encodeURIComponent(uid)}`;
  const { androidIntent } = buildStoreLinks({
    referrerSource: "connect_share",
    canonicalPath,
    customScheme,
  });

  const ua = String(req.headers["user-agent"] || "");
  if (/Android/i.test(ua)) {
    return res.redirect(302, androidIntent);
  }

  return res.status(200).type("html").send(
    renderShareHtmlPage({
      title,
      subtitle,
      canonicalPath,
      customScheme,
      referrerSource: "connect_share",
    }),
  );
};

export default {
  getMyConnectQrHandler,
  openSharedConnectPage,
  scanConnectQrHandler,
  checkInDirectHandler,
  listMyConnectScansHandler,
  getConnectCatalogHandler,
};
