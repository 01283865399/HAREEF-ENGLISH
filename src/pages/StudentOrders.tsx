import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { useAsyncData } from "../hooks/useAsyncData";
import { getMyOrders, getPaymentMethodLabel } from "../services/orderService";
import styles from "./StudentOrders.module.css";

const statusLabels = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
} as const;

export function StudentOrdersPage() {
  const { data: orders, loading, error, retry } = useAsyncData(getMyOrders);

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <span className={styles.eyebrow}>متابعة الاشتراكات</span>
        <h2>طلباتي واشتراكاتي</h2>
        <p>تابع حالة الدفع وقرار الإدارة لكل كورس طلبت الاشتراك فيه.</p>
      </header>

      {loading ? (
        <p role="status">جارٍ تحميل طلباتك...</p>
      ) : error ? (
        <Card className={styles.empty} role="alert">
          <p>{error}</p>
          <button onClick={retry} type="button">
            إعادة المحاولة
          </button>
        </Card>
      ) : orders?.length ? (
        <div className={styles.list}>
          {orders.map((order) => (
            <Card className={styles.order} key={order.id}>
              <div className={styles.orderHeading}>
                <div>
                  <span className={styles.eyebrow}>طلب اشتراك</span>
                  <h3>{order.courses.title}</h3>
                </div>
                <span
                  className={`${styles.status} ${styles[order.status]}`}
                  role="status"
                >
                  {statusLabels[order.status]}
                </span>
              </div>
              <dl className={styles.details}>
                <div>
                  <dt>تاريخ الطلب</dt>
                  <dd>{new Date(order.created_at).toLocaleString("ar-EG")}</dd>
                </div>
                <div>
                  <dt>طريقة الدفع</dt>
                  <dd>{getPaymentMethodLabel(order.payment_method)}</dd>
                </div>
                <div>
                  <dt>المبلغ</dt>
                  <dd>{Number(order.amount).toLocaleString("ar-EG")} ج.م</dd>
                </div>
              </dl>
              {order.status === "pending" ? (
                <p className={styles.message}>
                  طلبك قيد مراجعة الإيصال، وسيُفتح الكورس بعد اعتماد الإدارة.
                </p>
              ) : order.status === "rejected" ? (
                <p className={styles.message}>
                  لم يُعتمد هذا الطلب. يمكنك مراجعة بيانات الدفع وإرسال طلب
                  جديد.
                </p>
              ) : (
                <p className={styles.message}>
                  تم اعتماد الدفع. أصبح الكورس متاحًا في حسابك.
                </p>
              )}
              <Link
                className={styles.courseLink}
                to={`/courses/${order.course_id}`}
              >
                عرض صفحة الكورس
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <Card className={styles.empty}>
          <p>لا توجد طلبات اشتراك حتى الآن.</p>
          <Link className={styles.courseLink} to="/packages">
            تصفّح الكورسات المتاحة
          </Link>
        </Card>
      )}
    </main>
  );
}
