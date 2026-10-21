import { NextRequest } from "next/server";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { authenticatedSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

const PAYMENT_METHODS = new Set([
  "Vodafone Cash",
  "Etisalat Cash",
  "InstaPay",
  "Fawry",
  "Orange Cash",
]);
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

function isSupportedImage(buffer: Buffer, type: string): boolean {
  if (type === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }
  if (type === "image/png") {
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (type === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

function orderErrorStatus(code: string | undefined): number {
  if (code === "23505") return 409;
  if (code === "42501") return 403;
  return 400;
}

export async function GET(request: NextRequest) {
  try {
    const { client, user } = await authenticatedSupabaseClient(request);
    const courseId = request.nextUrl.searchParams.get("courseId");
    let query = client
      .from("orders")
      .select(
        "id, course_id, amount, payment_method, sender_wallet_number, status, created_at, courses!orders_course_id_fkey(title)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (courseId) query = query.eq("course_id", courseId);
    const { data, error } = await query;
    if (error) throw new ApiError(400, "orders_load_failed");
    return json(request, { orders: data ?? [] });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authenticated = await authenticatedSupabaseClient(request);
    const { client, user } = authenticated;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError(400, "invalid_order");
    }
    const input = body as Record<string, unknown>;
    const { courseId, phone, paymentMethod, senderWalletNumber, receiptPath } =
      {
        courseId: input.course_id,
        phone: input.phone,
        paymentMethod: input.payment_method,
        senderWalletNumber: input.sender_wallet_number,
        receiptPath: input.receipt_image_path,
      };

    if (
      typeof courseId !== "string" ||
      !courseId.trim() ||
      typeof phone !== "string" ||
      !phone.trim() ||
      typeof paymentMethod !== "string" ||
      !PAYMENT_METHODS.has(paymentMethod) ||
      typeof senderWalletNumber !== "string" ||
      senderWalletNumber.trim().length < 7 ||
      senderWalletNumber.trim().length > 32 ||
      typeof receiptPath !== "string" ||
      !receiptPath.startsWith(`${user.id}/`) ||
      receiptPath.length > 200 ||
      !/^[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp)$/iu.test(
        receiptPath.slice(user.id.length + 1),
      )
    ) {
      throw new ApiError(400, "invalid_order");
    }

    const { data: course, error: courseError } = await client
      .from("courses")
      .select("is_free")
      .eq("id", courseId.trim())
      .single();
    if (courseError || !course) throw new ApiError(404, "course_not_found");
    if (course.is_free)
      throw new ApiError(400, "free_course_order_not_allowed");

    const { data: receipt, error: receiptError } = await client.storage
      .from("payment-receipts")
      .download(receiptPath);
    if (receiptError || !receipt) throw new ApiError(400, "receipt_not_found");
    if (receipt.size === 0 || receipt.size > MAX_RECEIPT_BYTES) {
      throw new ApiError(400, "invalid_receipt_size");
    }
    const receiptType = receipt.type.toLowerCase();
    const image = Buffer.from(await receipt.arrayBuffer());
    if (!isSupportedImage(image, receiptType)) {
      throw new ApiError(400, "invalid_receipt_type");
    }

    const { error: profileError } = await client
      .from("profiles")
      .update({ phone: phone.trim() })
      .eq("id", user.id);
    if (profileError) throw new ApiError(400, "profile_update_failed");

    const { data: order, error: orderError } = await client
      .from("orders")
      .insert({
        user_id: user.id,
        course_id: courseId.trim(),
        payment_method: paymentMethod,
        sender_wallet_number: senderWalletNumber.trim(),
        receipt_image_path: receiptPath,
      })
      .select("id")
      .single();
    if (orderError) {
      const { error: cleanupError } = await client.storage
        .from("payment-receipts")
        .remove([receiptPath]);
      if (cleanupError) {
        console.error(
          "[API] Receipt cleanup failed after order insert failure",
          {
            orderCode: orderError.code,
            cleanupMessage: cleanupError.message,
          },
        );
      } else {
        throw new ApiError(
          orderErrorStatus(orderError.code),
          orderError.code === "23505"
            ? "pending_order_exists"
            : "order_create_failed",
        );
      }
      throw new ApiError(500, "order_create_failed_receipt_cleanup_failed");
    }

    return json(request, { orderId: order.id }, 201);
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
