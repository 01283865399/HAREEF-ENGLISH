# إعداد المساعد الذكي

## 1. إنشاء مفتاح Gemini

1. افتح [Google AI Studio](https://aistudio.google.com/) وسجّل الدخول.
2. أنشئ مفتاح API جديدًا من صفحة مفاتيح API.
3. لا تضع المفتاح في ملفات `src` أو متغيرات `VITE_*`؛ المفتاح يُستخدم داخل دالة Vercel فقط.

## 2. إضافة المفتاح إلى Vercel

1. افتح المشروع في Vercel.
2. من **Project → Settings → General** اضبط **Root Directory** على `website`. يحتوي هذا المجلد `package.json` و`package-lock.json` و`api/chat.js` و`vercel.json`.
3. اذهب إلى **Project → Settings → Environment Variables**.
4. أضف `GEMINI_API_KEY` بقيمة المفتاح، وحدد البيئات المطلوبة.
5. أضف `GEMINI_MODEL` بالقيمة `gemini-2.5-flash` إذا أردت تثبيت الموديل؛ إن لم تضفه فسيستخدم الخادم هذا الموديل افتراضيًا. إذا أعاد الموديل المحدد حالة 404، يعيد الخادم المحاولة تلقائيًا باستخدام `gemini-2.5-flash`.
6. في **Project → Settings → Build and Deployment** امسح أي **Install Command** أو **Build Command** مخصص، واترك Vercel يكتشف npm وVite تلقائيًا. لا تستخدم `--prefix website` عند ضبط Root Directory على `website`؛ سيبحث npm عندها في `website/website`.
7. نفّذ **Redeploy** لآخر نشر حتى تُحمّل الإعدادات ومتغيرات البيئة.

## 3. التشغيل محليًا

أنشئ ملف `.env.local` محليًا وأضف إليه:

```dotenv
GEMINI_API_KEY=ضع_مفتاحك_محليًا
GEMINI_MODEL=gemini-2.5-flash
```

ثم شغّل:

```bash
npm run dev:vercel
```

يحمّل السكريبت `GEMINI_API_KEY` من `.env.local` إلى بيئة Vercel المحلية تلقائيًا، دون طباعته. يتطلب Node.js 20.12 أو أحدث. لإضافة خيارات إلى Vercel CLI:

```bash
npm run dev:vercel -- --listen 3000
```

إذا احتجت تسجيل الدخول أو الربط يدويًا:

```bash
npx vercel login
npx vercel link
npx vercel dev
```

أكمل المصادقة في المتصفح عند `vercel login`. في `vercel link` اختر الحساب/الفريق (scope) ثم مشروع المنصة الموجود، أو أنشئ مشروعًا جديدًا إذا لم يكن لها مشروع بعد. قد يطلب CLI تحديد مسار المشروع؛ شغّل الأوامر من مجلد `website` الذي يحتوي `package.json` و`api`. لا تلصق المفتاح في المحادثة أو مخرجات الطرفية؛ خليه في `.env.local` المحلي أو إعدادات Vercel.

استخدام `npm run dev` وحده يشغّل Vite للواجهة فقط، ولا يشغّل مجلد `api`؛ لذا لن يعمل مسار `/api/chat` عبر خادم Vite وحده. إذا تعذّر تثبيت/تشغيل Vercel CLI، انشر Preview على Vercel بعد ضبط المتغيرات السرية وافتح رابط Preview للاختبار. أما للتطوير بواجهة Vite فقط، فاختبارات `npm test` تغطي ردود الذكاء الاصطناعي والمحاكاة دون اتصال أو مفتاح.

## 4. تغيير الموديل والحدود

غيّر قيمة `GEMINI_MODEL` في إعدادات Vercel أو `.env.local` إلى اسم موديل متاح لحسابك، ثم أعد النشر. توفر الموديلات وحدود الاستخدام المجاني تتغير؛ راجع شروط Google الحالية وحدود حسابك قبل الاعتماد على الخدمة.

حد الطلبات الموجود داخل الدالة مؤقت ومحفوظ بذاكرة كل نسخة Serverless، وليس حدًا موزعًا دقيقًا بين النسخ. عند زيادة الاستخدام، استبدله بمخزن مشترك مثل Upstash، وراجع حدود الاستخدام وحماية الإساءة.
