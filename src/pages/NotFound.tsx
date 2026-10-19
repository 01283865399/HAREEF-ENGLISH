import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1>الصفحة غير موجودة</h1>
      <p>الصفحة التي طلبتها غير متاحة حالياً.</p>
      <Link to="/">العودة إلى الرئيسية</Link>
    </main>
  );
}
