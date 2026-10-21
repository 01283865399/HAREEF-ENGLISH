# منصة مستر محمود للغة الإنجليزية

منصة تعليم English للطلاب المصريين، بواجهة RTL عربية، مبنية باستخدام React وVite وTypeScript وSupabase.

## التشغيل

```bash
npm install
npm run dev -- --host 0.0.0.0
```

## أوامر المشروع

```bash
npm run dev
npm run build
npm test
npm run lint
npm run format:check
```

## صفحات التحميل

صفحة Android على `/download-app` وصفحة Windows على `/download-windows`. ملفات التطبيق الموجودة وروابطها تخص تطبيقات منفصلة عن مشروع الويب.

## هيكل المشروع

```text
src/
  components/
  data/
  features/
  hooks/
  pages/
  services/
  styles/
  types/
supabase/
```

## إعداد Supabase

1. أضف بيانات مشروع Supabase إلى `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_ADMIN_EMAIL=admin@example.com
   ```

2. أنشئ حساب المدير وأكّد بريده، ثم شغّل `supabase/promote-admin.sql` يدويًا في SQL Editor لمنحه صلاحية الإدارة. اسم الدخول `admin` يشير إلى البريد المحدد في `VITE_ADMIN_EMAIL`.
3. شغّل `supabase/schema.sql` يدويًا في SQL Editor الخاص بالمشروع.
4. عند إعداد محتوى الكورسات، راجع ملفات SQL الموجودة في مجلد `supabase/` واتبع التسلسل الموثق في `supabase/README.md`.

تسجيل Google واستعادة كلمة المرور يستخدمان Supabase Auth. فعّل Google Provider وأضف روابط الموقع المحلي والإنتاجي إلى قائمة Redirect URLs في إعدادات Authentication.

للمعاينة المحلية فقط، شغّل الموقع على `localhost` من غير إعداد Supabase وسجّل الدخول بحساب المعاينة المحلي. لا تستخدمه أو تنشره كحساب إدارة فعلي.

## ملاحظات

- بيانات التقدم المحلية لا تتزامن بين الأجهزة.
- بوابات التحقق الأساسية: `npm run build` و`npm test` و`npm run lint`.
- الـBackend المستقل مبني بـNext.js في `apps/backend/`. راجع `apps/backend/README.md` لإعداده ونشره على Vercel وربط واجهة الموقع به عن طريق `VITE_API_BASE`.
