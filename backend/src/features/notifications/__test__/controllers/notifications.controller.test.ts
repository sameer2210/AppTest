import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import * as notificationController from "@/features/notifications/controllers/notification.controller.js";
import * as userInboxService from "@/features/notifications/services/userInbox.service.js";

describe("notifications: notification.controller unit edge cases", () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("listNotificationsHandler returns 401 when req.user is missing", async () => {
    const req = { user: undefined, query: {} } as unknown as Request;
    const res = mockResponse();

    await notificationController.listNotificationsHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("unreadCountHandler handles service errors via sendError", async () => {
    vi.spyOn(userInboxService, "getUnreadCount").mockRejectedValueOnce(new Error("Count error"));

    const req = { user: { uid: "user-1" } } as unknown as Request;
    const res = mockResponse();

    await notificationController.unreadCountHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
