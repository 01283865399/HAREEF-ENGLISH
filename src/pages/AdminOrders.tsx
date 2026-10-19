import { useCallback, useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import {
  getPaymentMethodLabel,
  getAdminOrders,
  getReceiptUrl,
  setOrderStatus,
  type AdminOrder,
  type OrderStatus,
} from "../services/orderService";
import styles from "./AdminOrders.module.css";

type AdminOrderWithReceipt = AdminOrder & { receiptUrl: string };
type OrderFilter = OrderStatus;

export function AdminOrdersPage() {
  const [filter, setFilter] = useState<OrderFilter>("pending");
  const [orders, setOrders] = useState<AdminOrderWithReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingOrder, setWorkingOrder] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const visibleOrders = orders.filter((order) => {
    const query = search.trim().toLocaleLowerCase("ar");
    return (
      !query ||
      [order.courses.title, order.profiles.full_name, order.profiles.email]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase("ar").includes(query))
    );
  });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminOrders(filter);
      const withReceipts = await Promise.all(
        result.map(async (order) => ({
          ...order,
          receiptUrl: await getReceiptUrl(order.receipt_image_path),
        })),
      );
      setOrders(withReceipts);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذّر تحميل الطلبات.",
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders, refreshCount]);

  async function decide(orderId: string, status: OrderStatus) {
    if (status === "pending") return;
    setWorkingOrder(orderId);
    setError(null);
    setNotice(null);
    try {
      const warning = await setOrderStatus(orderId, status);
      setNotice(
        warning ??
          (status === "approved"
            ? "تم اعتماد الطلب وتفعيل الكورس."
            : "تم رفض الطلب."),
      );
      setRefreshCount((count) => count + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذّر تحديث حالة الطلب.",
      );
    } finally {
      setWorkingOrder(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>إدارة الاشتراكات</span>
          <h2>طلبات الدفع</h2>
          <p>راجع بيانات التحويل والإيصال قبل تفعيل الوصول للكورس.</p>
        </div>
        <Button
          onClick={() => setRefreshCount((count) => count + 1)}
          variant="outline"
        >
          تحديث القائمة
        </Button>
      </header>

      <div aria-label="تصفية الطلبات" className={styles.filters} role="group">
        <Button
          aria-pressed={filter === "pending"}
          onClick={() => setFilter("pending")}
          variant={filter === "pending" ? "secondary" : "white"}
        >
          قيد المراجعة
        </Button>
        <Button
          aria-pressed={filter === "approved"}
          onClick={() => setFilter("approved")}
          variant={filter === "approved" ? "secondary" : "white"}
        >
          معتمدة
        </Button>
        <Button
          aria-pressed={filter === "rejected"}
          onClick={() => setFilter("rejected")}
          variant={filter === "rejected" ? "secondary" : "white"}
        >
          مرفوضة
        </Button>
      </div>

      <label className={styles.search}>
        <span>بحث باسم الطالب أو البريد أو الكورس</span>
        <input
          onChange={(event) => setSearch(event.target.value)}
          placeholder="اكتب للبحث..."
          type="search"
          value={search}
        />
      </label>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      {loading ? (
        <p role="status">جارٍ تحميل الطلبات...</p>
      ) : visibleOrders.length ? (
        <div className={styles.orderList}>
          {visibleOrders.map((order) => (
            <Card className={styles.orderCard} key={order.id}>
              <div className={styles.orderHeading}>
                <div>
                  <h3>{order.courses.title}</h3>
                  <span className={styles.orderDate}>
                    {new Date(order.created_at).toLocaleString("ar-EG")}
                  </span>
                </div>
                <span className={styles.status}>
                  {order.status === "approved"
                    ? "معتمد"
                    : order.status === "rejected"
                      ? "مرفوض"
                      : "قيد المراجعة"}
                </span>
              </div>
              <dl className={styles.details}>
                <div>
                  <dt>اسم الطالب</dt>
                  <dd>{order.profiles.full_name || "غير مسجل"}</dd>
                </div>
                <div>
                  <dt>البريد الإلكتروني</dt>
                  <dd>{order.profiles.email}</dd>
                </div>
                <div>
                  <dt>رقم الهاتف</dt>
                  <dd dir="ltr">{order.profiles.phone || "غير مسجل"}</dd>
                </div>
                <div>
                  <dt>وسيلة الدفع</dt>
                  <dd>{getPaymentMethodLabel(order.payment_method)}</dd>
                </div>
                <div>
                  <dt>
                    {order.payment_method === "Fawry"
                      ? "رقم الهاتف أو مرجع فوري"
                      : "رقم المحفظة المرسلة"}
                  </dt>
                  <dd dir="ltr">{order.sender_wallet_number}</dd>
                </div>
                <div>
                  <dt>قيمة الاشتراك</dt>
                  <dd>{Number(order.amount).toLocaleString("ar-EG")} ج.م</dd>
                </div>
              </dl>
              <a
                className={styles.receiptLink}
                href={order.receiptUrl}
                rel="noreferrer"
                target="_blank"
              >
                <img
                  alt={`إيصال دفع ${order.courses.title}`}
                  src={order.receiptUrl}
                />
                <span>فتح صورة الإيصال</span>
              </a>
              {filter === "pending" ? (
                <div className={styles.actions}>
                  <Button
                    disabled={workingOrder === order.id}
                    loading={workingOrder === order.id}
                    onClick={() => decide(order.id, "approved")}
                  >
                    اعتماد وتفعيل الكورس
                  </Button>
                  <Button
                    disabled={workingOrder === order.id}
                    onClick={() => decide(order.id, "rejected")}
                    variant="outline"
                  >
                    رفض الطلب
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card className={styles.empty}>
          {search.trim()
            ? "لا توجد نتائج تطابق البحث."
            : `لا توجد طلبات ${
                filter === "pending"
                  ? "قيد المراجعة"
                  : filter === "approved"
                    ? "معتمدة"
                    : "مرفوضة"
              }.`}
        </Card>
      )}
    </main>
  );
}
