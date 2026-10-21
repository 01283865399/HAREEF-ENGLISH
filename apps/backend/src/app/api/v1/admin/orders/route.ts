import { NextRequest } from "next/server";
import { logAdminActivity, isRecord } from "@/lib/admin";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { adminSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { client } = await adminSupabaseClient(request);
    const status = request.nextUrl.searchParams.get("status") ?? "pending";
    if (!["pending", "approved", "rejected"].includes(status)) {
      throw new ApiError(400, "invalid_order_status");
    }
    const { data, error } = await client
      .from("orders")
      .select(
        "id, user_id, course_id, amount, payment_method, sender_wallet_number, receipt_image_path, status, created_at, profiles!orders_user_id_fkey(full_name, email, phone), courses!orders_course_id_fkey(title)",
      )
      .eq("status", status)
      .order("created_at", { ascending: false });
    if (error) throw new ApiError(400, "orders_load_failed");
    return json(request, { orders: data ?? [] });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { client, user } = await adminSupabaseClient(request);
    const body: unknown = await request.json();
    if (
      !isRecord(body) ||
      typeof body.id !== "string" ||
      !["approved", "rejected"].includes(String(body.status))
    ) {
      throw new ApiError(400, "invalid_order_update");
    }
    const status = body.status as "approved" | "rejected";
    const { data, error } = await client
      .from("orders")
      .update({ status })
      .eq("id", body.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) throw new ApiError(400, "order_update_failed");
    if (!data) throw new ApiError(409, "order_not_pending");

    try {
      await logAdminActivity(
        client,
        user,
        status === "approved" ? "اعتماد طلب اشتراك" : "رفض طلب اشتراك",
        body.id,
      );
    } catch (error) {
      console.error("[Admin] Order updated but audit logging failed", error);
      return json(request, { orderId: data.id, warning: "audit_log_failed" });
    }
    return json(request, { orderId: data.id });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
