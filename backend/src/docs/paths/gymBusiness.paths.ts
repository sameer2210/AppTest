export const gymBusinessPaths = {
  "/api/v1/business": {
    get: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Get gym business profile",
      description: "Retrieves details of the authenticated user's registered gym business profile.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Gym profile returned.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    nullable: true,
                    properties: {
                      _id: { type: "string", example: "66d8f1e8a93b4c12ef001a2b" },
                      ownerId: { type: "string", example: "firebase-uid" },
                      businessName: { type: "string", example: "Iron Fortress Gym" },
                      slug: { type: "string", example: "iron-fortress-gym" },
                      bio: { type: "string", nullable: true, example: "Strength gym in Indiranagar" },
                      logo: { type: "string", nullable: true },
                      bannerUrl: { type: "string", nullable: true },
                      galleryUrls: {
                        type: "array",
                        items: { type: "string" },
                        maxItems: 7,
                        example: ["https://apidev.stron.in/api/upload/public/gym-gallery/one.jpg"],
                      },
                      location: { type: "string", nullable: true, example: "42, 100ft Road, Indiranagar" },
                      mapLink: { type: "string", nullable: true },
                      phone: { type: "string", nullable: true, example: "+919876543210" },
                      services: { type: "array", items: { type: "string" }, example: ["CrossFit", "Zumba"] },
                      isVerified: { type: "boolean", example: false },
                      status: { type: "string", example: "ACTIVE" },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
    post: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Create gym business profile",
      description: "Registers and onboard a new gym entity under the authenticated owner.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                businessName: { type: "string", example: "Iron Fortress Gym" },
                slug: { type: "string", example: "iron-fortress-gym" },
                bio: { type: "string", example: "Strength gym in Indiranagar" },
                logo: { type: "string", nullable: true },
                bannerUrl: { type: "string", nullable: true },
                galleryUrls: {
                  type: "array",
                  items: { type: "string" },
                  maxItems: 7,
                },
                phone: { type: "string", example: "+919876543210" },
                location: { type: "string", example: "42, 100ft Road, Indiranagar" },
                mapLink: { type: "string", nullable: true },
                services: { type: "array", items: { type: "string" }, example: ["CrossFit", "Zumba"] },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Business profile created successfully.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StandardSuccess" },
            },
          },
        },
        400: { $ref: "#/components/responses/ValidationError" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
    patch: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Update gym business profile",
      description: "Updates details, amenities, or contact info of the gym profile.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                businessName: { type: "string", example: "Iron Fortress Fitness Club" },
                slug: { type: "string", example: "iron-fortress-fitness" },
                bio: { type: "string", nullable: true },
                bannerUrl: { type: "string", nullable: true },
                galleryUrls: {
                  type: "array",
                  items: { type: "string" },
                  maxItems: 7,
                },
                location: { type: "string", example: "New Address" },
                phone: { type: "string" },
                services: { type: "array", items: { type: "string" }, example: ["AC", "Locker", "Shower"] },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Business updated.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StandardSuccess" },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/v1/business/home-summary": {
    get: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Get business profile home summary",
      description:
        "Owner-only aggregate for the Business Profile Home screen. Formats money and labels server-side. WhatsApp credits are 0 until that module ships.",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "period",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["THIS_MONTH"], default: "THIS_MONTH" },
        },
      ],
      responses: {
        200: {
          description: "Home summary returned.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      business: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          businessName: { type: "string" },
                          slug: { type: "string", nullable: true },
                          logo: { type: "string", nullable: true },
                          status: { type: "string", example: "ACTIVE" },
                        },
                      },
                      verification: {
                        type: "object",
                        properties: {
                          isVerified: { type: "boolean" },
                          badgeLabel: { type: "string", example: "Verified Business" },
                          progressPercent: { type: "number", example: 85 },
                        },
                      },
                      earnings: {
                        type: "object",
                        properties: {
                          period: { type: "string", example: "THIS_MONTH" },
                          label: { type: "string", example: "Earnings (This Month)" },
                          amount: { type: "number", example: 23000 },
                          currency: { type: "string", example: "INR" },
                          formattedAmount: { type: "string", example: "₹ 23,000" },
                        },
                      },
                      brandPage: {
                        type: "object",
                        properties: {
                          slug: { type: "string", nullable: true },
                          shareUrl: { type: "string", nullable: true },
                          visitsToday: { type: "number", example: 12 },
                        },
                      },
                      whatsapp: {
                        type: "object",
                        properties: {
                          creditsLeft: { type: "number", example: 0 },
                          hasEntitlement: { type: "boolean" },
                          memberCount: { type: "number" },
                        },
                      },
                      notifications: {
                        type: "object",
                        properties: {
                          unreadCount: { type: "number" },
                        },
                      },
                      quickActions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            label: { type: "string" },
                            route: { type: "string" },
                            badgeCount: { type: "number" },
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
        401: { $ref: "#/components/responses/Unauthorized" },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/v1/business/brand-page": {
    get: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Get owner Brand Page with visit stats",
      description:
        "Owner-only Brand Page payload plus visit stats and share URL. Same public fields as GET /api/v1/brand/{slug}, plus stats and shareUrl.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Owner brand page returned.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      business: { type: "object" },
                      plans: { type: "array", items: { type: "object" } },
                      events: { type: "array", items: { type: "object" } },
                      categories: { type: "array", items: { type: "string" } },
                      stats: {
                        type: "object",
                        properties: {
                          visitsToday: { type: "number", example: 12 },
                          visitsLast7Days: { type: "number", example: 40 },
                          visitsTotal: { type: "number", example: 210 },
                        },
                      },
                      shareUrl: { type: "string", example: "https://stron.in/gym/iron-core-gym" },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/v1/brand/{slug}": {
    get: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Get public Brand Page by slug",
      description:
        "Unauthenticated. Returns public gym fields, ACTIVE membership plans, published/live organizer events, and category pills. INACTIVE and SUSPENDED gyms return brand_page_not_found. Never includes ownerId, phone, or payout fields.",
      parameters: [
        {
          name: "slug",
          in: "path",
          required: true,
          schema: { type: "string", example: "iron-core-gym" },
        },
      ],
      responses: {
        200: {
          description: "Public brand page returned.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      business: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          businessName: { type: "string" },
                          slug: { type: "string" },
                          logo: { type: "string", nullable: true },
                          bannerUrl: { type: "string", nullable: true },
                          galleryUrls: { type: "array", items: { type: "string" }, maxItems: 7 },
                          bio: { type: "string", nullable: true },
                          location: { type: "string", nullable: true },
                          mapLink: { type: "string", nullable: true },
                          services: { type: "array", items: { type: "string" } },
                          openingHours: { type: "array", items: { type: "object" } },
                          isVerified: { type: "boolean" },
                        },
                      },
                      plans: { type: "array", items: { type: "object" } },
                      events: { type: "array", items: { type: "object" } },
                      categories: {
                        type: "array",
                        items: { type: "string" },
                        example: ["Events", "Challenges", "Games", "Supplements", "Gear", "Services"],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/v1/brand/{slug}/visit": {
    post: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Record a Brand Page visit for today (IST)",
      description:
        "Unauthenticated. Upserts today's Asia/Kolkata visit counter. Optional visitorHash is idempotent per gym per IST day.",
      parameters: [
        {
          name: "slug",
          in: "path",
          required: true,
          schema: { type: "string", example: "iron-core-gym" },
        },
      ],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                visitorHash: { type: "string", example: "anon-abc123" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Visit recorded.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      visitsToday: { type: "number", example: 12 },
                    },
                  },
                },
              },
            },
          },
        },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/v1/membership-plans": {
    get: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "List membership plans",
      description: "Lists all active or archived plans (Monthly, Quarterly, Annual, etc.) offered by the gym.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "List of plans.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  plans: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        _id: { type: "string", example: "66d8f2b1a93b4c12ef001a2c" },
                        name: { type: "string", example: "Quarterly Pro Fitness" },
                        price: { type: "number", example: 4500 },
                        durationDays: { type: "number", example: 90 },
                        status: { type: "string", example: "ACTIVE" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
    post: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Create membership plan",
      description: "Creates a new membership plan pricing tier for members.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "price", "durationDays"],
              properties: {
                name: { type: "string", example: "Annual Unlimited" },
                price: { type: "number", example: 12000 },
                durationDays: { type: "number", example: 365 },
                description: { type: "string", example: "Full access to gym equipment, cardio zone and steam." },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Plan created successfully.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StandardSuccess" },
            },
          },
        },
        400: { $ref: "#/components/responses/ValidationError" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/v1/membership-plans/{planId}": {
    get: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Get membership plan by ID",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "planId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Plan details." },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
    patch: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Update membership plan",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "planId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                price: { type: "number" },
                status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Plan updated." },
      },
    },
    delete: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Delete / Archive membership plan",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "planId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Plan removed." },
      },
    },
  },
  "/api/v1/members": {
    get: {
      tags: ["Gym Business - Members & Memberships"],
      summary: "List gym members",
      description: "Searches and filters gym members with pagination, status filters, and search terms.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "number", default: 1 } },
        { name: "limit", in: "query", schema: { type: "number", default: 20 } },
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "EXPIRED", "EXPIRING_SOON", "INACTIVE"] } },
      ],
      responses: {
        200: {
          description: "Member list.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  members: { type: "array", items: { type: "object" } },
                  total: { type: "number", example: 45 },
                  page: { type: "number", example: 1 },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
    post: {
      tags: ["Gym Business - Members & Memberships"],
      summary: "Add new member",
      description: "Registers a member under the gym and creates an initial membership record if requested.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "phone"],
              properties: {
                name: { type: "string", example: "John Doe" },
                phone: { type: "string", example: "+919876543210" },
                email: { type: "string", example: "john@example.com" },
                gender: { type: "string", enum: ["male", "female", "other"], example: "male" },
                dateOfBirth: { type: "string", example: "1995-06-15" },
                planId: { type: "string", example: "66d8f2b1a93b4c12ef001a2c" },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Member created.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StandardSuccess" },
            },
          },
        },
        400: { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/api/v1/members/validity/summary": {
    get: {
      tags: ["Gym Business - Members & Memberships"],
      summary: "Get member validity summary",
      description: "Returns aggregated metrics: total active, expiring in 3 days, expiring in 7 days, and expired members.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Validity counts.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  summary: {
                    type: "object",
                    properties: {
                      active: { type: "number", example: 120 },
                      expiringSoon: { type: "number", example: 8 },
                      expired: { type: "number", example: 15 },
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
  "/api/v1/members/invite-link": {
    get: {
      tags: ["Gym Business - Members & Memberships"],
      summary: "Get gym member join link",
      description:
        "Returns `{PUBLIC_WEB_BASE_URL}/join/{slug}` for share and copy on Search your Member.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Join URL.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      inviteUrl: { type: "string", example: "https://stron.in/join/iron-core-gym" },
                      slug: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/v1/members/directory-users": {
    get: {
      tags: ["Gym Business - Members & Memberships"],
      summary: "List STRON users for gym member search",
      description: "Returns live, non-guest platform users so gym owners can search the full user directory.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "number", default: 1 } },
        { name: "limit", in: "query", schema: { type: "number", default: 20 } },
        { name: "search", in: "query", schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "User directory.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  users: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/v1/members/{memberId}": {
    get: {
      tags: ["Gym Business - Members & Memberships"],
      summary: "Get member details",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "memberId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Member details." },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
    patch: {
      tags: ["Gym Business - Members & Memberships"],
      summary: "Update member details",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "memberId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                phone: { type: "string" },
                status: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Member updated." },
      },
    },
    delete: {
      tags: ["Gym Business - Members & Memberships"],
      summary: "Delete member record",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "memberId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Member deleted." },
      },
    },
  },
  "/api/v1/members/{memberId}/remind-payment": {
    post: {
      tags: ["Gym Business - Members & Memberships"],
      summary: "Send payment reminder to member",
      description: "Sends an automated SMS or WhatsApp notification to the member regarding overdue or expiring membership fee (with 6h cooldown).",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "memberId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Reminder dispatched." },
        429: { $ref: "#/components/responses/RateLimited" },
      },
    },
  },
  "/api/v1/members/{memberId}/validity/extend": {
    post: {
      tags: ["Gym Business - Members & Memberships"],
      summary: "Extend member validity",
      description:
        "Adds a complimentary 7, 15, or 30 days to the member's current membership. Extends from remaining endDate when still active, or from now when expired. Blacklisted members cannot be extended.",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "memberId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["additionalDays"],
              properties: {
                additionalDays: { type: "integer", enum: [7, 15, 30], example: 15 },
                reason: { type: "string", example: "Complimentary goodwill extension" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Validity extended." },
        400: { $ref: "#/components/responses/ValidationError" },
        403: { description: "Member is blacklisted." },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/v1/members/{memberId}/blacklist": {
    post: {
      tags: ["Gym Business - Members & Memberships"],
      summary: "Blacklist member",
      description:
        "Marks the member BLOCKED, keeps the record, stops auto-renew, and excludes them from active/validity lists. Does not soft-delete.",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "memberId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                reason: { type: "string", example: "Repeated policy violation" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Member blacklisted." },
        404: { $ref: "#/components/responses/NotFound" },
        409: { description: "Member is already blacklisted." },
      },
    },
  },
  "/api/v1/attendance": {
    get: {
      tags: ["Gym Business - Operations & Billing"],
      summary: "List daily attendance logs",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "date", in: "query", schema: { type: "string" }, description: "YYYY-MM-DD" },
      ],
      responses: {
        200: { description: "Attendance records." },
      },
    },
    post: {
      tags: ["Gym Business - Operations & Billing"],
      summary: "Mark member attendance",
      description: "Logs check-in attendance for a member for today's date.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["memberId"],
              properties: {
                memberId: { type: "string", example: "66d8f341a93b4c12ef001a2d" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Attendance recorded." },
        409: { description: "Attendance already marked for today." },
      },
    },
  },
  "/api/v1/coupons": {
    get: {
      tags: ["Gym Business - Operations & Billing"],
      summary: "List discount coupons",
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: "Coupons list." },
      },
    },
    post: {
      tags: ["Gym Business - Operations & Billing"],
      summary: "Create discount coupon",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["code", "discountType", "discountValue"],
              properties: {
                code: { type: "string", example: "FESTIVE20" },
                discountType: { type: "string", enum: ["PERCENTAGE", "FIXED"], example: "PERCENTAGE" },
                discountValue: { type: "number", example: 20 },
                minOrderAmount: { type: "number", example: 2000 },
                expiresAt: { type: "string", example: "2026-12-31" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Coupon created." },
      },
    },
  },
  "/api/v1/analytics/dashboard": {
    get: {
      tags: ["Gym Business - SaaS & PRO Subscriptions"],
      summary: "Get gym analytics dashboard",
      description: "Aggregates revenue, active members, attendance breakdown, and renewal rates.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Dashboard analytics.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  metrics: {
                    type: "object",
                    properties: {
                      activeMembers: { type: "number", example: 142 },
                      monthlyRevenue: { type: "number", example: 245000 },
                      todayAttendance: { type: "number", example: 38 },
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
  "/api/v1/subscriptions": {
    get: {
      tags: ["Gym Business - SaaS & PRO Subscriptions"],
      summary: "Get STRON PRO subscription details",
      description: "Fetches the current gym's STRON PRO tier, trial status, and entitlements.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Subscription details.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  subscription: {
                    type: "object",
                    properties: {
                      plan: { type: "string", example: "PRO_MONTHLY" },
                      status: { type: "string", example: "ACTIVE" },
                      isTrial: { type: "boolean", example: false },
                      validUntil: { type: "string", example: "2026-10-01T00:00:00.000Z" },
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
  "/api/v1/subscriptions/trial/eligibility": {
    get: {
      tags: ["Gym Business - SaaS & PRO Subscriptions"],
      summary: "Check 14-day free trial eligibility",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Eligibility flag.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  isEligible: { type: "boolean", example: true },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/subscriptions/trial/activate": {
    post: {
      tags: ["Gym Business - SaaS & PRO Subscriptions"],
      summary: "Activate 14-day free trial",
      description: "Activates instant 14-day PRO trial with all premium features unlocked.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: "Trial activated successfully." },
        400: { description: "Already used trial." },
      },
    },
  },
  "/api/v1/subscriptions/features": {
    get: {
      tags: ["Gym Business - SaaS & PRO Subscriptions"],
      summary: "Get active feature entitlements",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Entitlement flags.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  features: {
                    type: "object",
                    properties: {
                      maxMembers: { type: "number", example: 500 },
                      advancedAnalytics: { type: "boolean", example: true },
                      connectQrScanner: { type: "boolean", example: true },
                      whatsappReminders: { type: "boolean", example: true },
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
  "/api/v1/staff": {
    get: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "List gym staff and trainers",
      description:
        "Owner-only. Optional status=ACTIVE|PENDING|REJECTED|ALL. PENDING maps to IN_PROGRESS. Each item includes computed plansCount.",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "status",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["ACTIVE", "PENDING", "IN_PROGRESS", "REJECTED", "ALL"] },
        },
      ],
      responses: {
        200: {
          description: "Staff list.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        role: { type: "string", example: "TRAINER" },
                        status: { type: "string", example: "IN_PROGRESS" },
                        splitPercent: { type: "number", example: 70 },
                        plansCount: { type: "number", example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/v1/staff/invite-link": {
    get: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Get trainer invite link",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Invite URL.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      inviteUrl: { type: "string", example: "https://stron.in/join/iron-core-gym?role=trainer" },
                      slug: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/v1/staff/proposals": {
    post: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Propose a trainer or moderator partnership",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                memberId: { type: "string" },
                phone: { type: "string", example: "+919876543210" },
                name: { type: "string" },
                role: { type: "string", enum: ["TRAINER", "MODERATOR"] },
                splitPercent: { type: "integer", minimum: 0, maximum: 100, example: 70 },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Proposal created." },
        409: {
          description: "Staff already exists.",
          content: { "application/json": { schema: { $ref: "#/components/schemas/StandardError" } } },
        },
      },
    },
  },
  "/api/v1/staff/{staffId}/proposal": {
    patch: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Owner re-proposes a split after counter or reject",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "staffId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { splitPercent: { type: "integer", example: 65 } },
            },
          },
        },
      },
      responses: {
        200: { description: "Proposal updated." },
        409: {
          description: "Proposal is not in a re-proposeable state.",
          content: { "application/json": { schema: { $ref: "#/components/schemas/StandardError" } } },
        },
      },
    },
  },
  "/api/v1/staff/{staffId}/respond": {
    post: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Trainer responds to a partnership proposal",
      description: "Authenticated trainer (no gym-owner scope). Actions: ACCEPT, REJECT, COUNTER.",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "staffId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["ACCEPT", "REJECT", "COUNTER"] },
                counterOfferPercent: { type: "integer", example: 60 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Response recorded." },
        403: { $ref: "#/components/responses/Forbidden" },
        409: {
          description: "Proposal is not pending.",
          content: { "application/json": { schema: { $ref: "#/components/schemas/StandardError" } } },
        },
      },
    },
  },
  "/api/v1/staff/{staffId}": {
    delete: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Remove a staff member",
      description: "Soft-removes the staff row and pulls the id from all plan trainerIds.",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "staffId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Staff removed." },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/v1/membership-plans/{planId}/trainers": {
    patch: {
      tags: ["Gym Business - Profile & Plans"],
      summary: "Assign ACTIVE trainers to a membership plan",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "planId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                trainerIds: { type: "array", items: { type: "string" }, maxItems: 20 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Plan trainers updated." },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/v1/whatsapp/wallet": {
    get: {
      tags: ["Gym Business - Operations & Billing"],
      summary: "Get WhatsApp credit wallet",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Wallet snapshot.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      creditsLeft: { type: "number", example: 320 },
                      memberCount: { type: "number", example: 238 },
                      hasEntitlement: { type: "boolean" },
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
  "/api/v1/whatsapp/reminders": {
    get: {
      tags: ["Gym Business - Operations & Billing"],
      summary: "List WhatsApp reminder configs",
      description: "Seeds default PAYMENT_RECEIPT, AUTOPAY_FAILED, and MANUAL_PAYMENT configs on first read.",
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: "Reminder configs." } },
    },
  },
  "/api/v1/whatsapp/reminders/{type}": {
    patch: {
      tags: ["Gym Business - Operations & Billing"],
      summary: "Update a WhatsApp reminder config",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "type",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["PAYMENT_RECEIPT", "AUTOPAY_FAILED", "MANUAL_PAYMENT"] },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                isActive: { type: "boolean" },
                dayOffsets: { type: "array", items: { type: "integer" } },
                audience: { type: "string", enum: ["ALL", "QUEUE_TOP_N"] },
                audienceLimit: { type: "integer", nullable: true },
                templateOverride: { type: "string", nullable: true },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Config updated." } },
    },
  },
  "/api/v1/whatsapp/reminders/{type}/recipients": {
    get: {
      tags: ["Gym Business - Operations & Billing"],
      summary: "Preview members who would receive the next reminder run",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "type",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["PAYMENT_RECEIPT", "AUTOPAY_FAILED", "MANUAL_PAYMENT"] },
        },
      ],
      responses: { 200: { description: "Recipient preview." } },
    },
  },
  "/api/v1/whatsapp/broadcast": {
    post: {
      tags: ["Gym Business - Operations & Billing"],
      summary: "Broadcast a WhatsApp announcement",
      description: "Requires STRON PRO and enough credits (1 per member). Debits the wallet atomically.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                memberIds: { type: "array", items: { type: "string" } },
                message: { type: "string", example: "Gym closed this Sunday." },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Messages queued." },
        402: {
          description: "Not enough WhatsApp credits.",
          content: { "application/json": { schema: { $ref: "#/components/schemas/StandardError" } } },
        },
        403: { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/api/v1/whatsapp/messages": {
    get: {
      tags: ["Gym Business - Operations & Billing"],
      summary: "List WhatsApp send history",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "type", in: "query", schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer" } },
        { name: "limit", in: "query", schema: { type: "integer" } },
      ],
      responses: { 200: { description: "Message history." } },
    },
  },
  "/api/v1/webhooks/whatsapp": {
    get: {
      tags: ["Gym Business - Operations & Billing"],
      summary: "Verify Meta WhatsApp Cloud API webhook",
      description: "Hub challenge. No auth. Requires matching WHATSAPP_VERIFY_TOKEN.",
      parameters: [
        { name: "hub.mode", in: "query", schema: { type: "string" } },
        { name: "hub.verify_token", in: "query", schema: { type: "string" } },
        { name: "hub.challenge", in: "query", schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Echoes hub.challenge as plain text." },
        403: { $ref: "#/components/responses/Forbidden" },
      },
    },
    post: {
      tags: ["Gym Business - Operations & Billing"],
      summary: "WhatsApp Cloud API webhook",
      description:
        "Public webhook. Verifies X-Hub-Signature-256 with WHATSAPP_APP_SECRET. Persists webhookEvents and enqueues BullMQ jobs, then returns 200 immediately. Workers apply inbound messages and SENT/DELIVERED/READ/FAILED statuses.",
      responses: {
        200: { description: "Accepted." },
        403: { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
};
