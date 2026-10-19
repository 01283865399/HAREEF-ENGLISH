import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  courseSingle,
  from,
  orderInsert,
  orderSingle,
  profileSingle,
  remove,
  upload,
} = vi.hoisted(() => {
  const courseSingle = vi.fn();
  const orderInsert = vi.fn();
  const orderSingle = vi.fn();
  const profileSingle = vi.fn();
  const remove = vi.fn();
  const upload = vi.fn();
  const from = vi.fn();
  return {
    courseSingle,
    from,
    orderInsert,
    orderSingle,
    profileSingle,
    remove,
    upload,
  };
});

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: () => ({
    from,
    storage: {
      from: () => ({ remove, upload }),
    },
  }),
}));

vi.mock("./adminDemoService", () => ({
  getAdminDemoSession: () => null,
}));

import { submitCourseOrder } from "./orderService";

function mockTableBuilders() {
  from.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        update: () => ({
          eq: () => ({
            select: () => ({ single: profileSingle }),
          }),
        }),
      };
    }
    if (table === "courses") {
      return {
        select: () => ({
          eq: () => ({ single: courseSingle }),
        }),
      };
    }
    if (table === "orders") {
      return { insert: orderInsert };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

const validInput = () => ({
  userId: "student-1",
  courseId: "grade-1-system-1-term-1",
  phone: " 01012345678 ",
  paymentMethod: "Fawry" as const,
  senderWalletNumber: "  FAWRY-REF-5678 ",
  receipt: new File(["receipt"], "receipt.webp", { type: "image/webp" }),
});

describe("submitCourseOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTableBuilders();
    orderInsert.mockReturnValue({
      select: () => ({ single: orderSingle }),
    });
    profileSingle.mockResolvedValue({ data: { id: "student-1" }, error: null });
    courseSingle.mockResolvedValue({
      data: { is_free: false },
      error: null,
    });
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    orderSingle.mockResolvedValue({
      data: { id: "order-123" },
      error: null,
    });
  });

  it("uploads the receipt and creates the order with trimmed Fawry details", async () => {
    await expect(submitCourseOrder(validInput())).resolves.toBe("order-123");

    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^student-1\/.+\.webp$/),
      expect.any(File),
      { contentType: "image/webp", upsert: false },
    );
    expect(from).toHaveBeenCalledWith("profiles");
    expect(from).toHaveBeenCalledWith("courses");
    expect(from).toHaveBeenCalledWith("orders");
    expect(orderInsert).toHaveBeenCalledWith({
      user_id: "student-1",
      course_id: "grade-1-system-1-term-1",
      payment_method: "Fawry",
      sender_wallet_number: "FAWRY-REF-5678",
      receipt_image_path: expect.stringMatching(/^student-1\/.+\.webp$/),
    });
  });

  it("cleans up the receipt and reports duplicate pending subscriptions clearly", async () => {
    orderSingle.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "orders_one_pending_per_course"',
      },
    });

    await expect(submitCourseOrder(validInput())).rejects.toThrow(
      "لديك طلب دفع قيد المراجعة لهذا الكورس بالفعل.",
    );
    expect(remove).toHaveBeenCalledWith([
      expect.stringMatching(/^student-1\/.+\.webp$/),
    ]);
  });

  it("rejects unsupported receipts before making any database or storage request", async () => {
    const input = {
      ...validInput(),
      receipt: new File(["receipt"], "receipt.svg", { type: "image/svg+xml" }),
    };

    await expect(submitCourseOrder(input)).rejects.toThrow(
      "ارفع صورة بصيغة JPG أو PNG أو WebP.",
    );
    expect(from).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });
});
