# خادم لميس المحلي

يتطلب Node.js 24 ويستخدم SQLite المدمجة دون حزم خادم إضافية. من جذر المشروع:

```sh
node server/index.mjs
node --test tests/server/*.test.mjs
```

العنوان الافتراضي `http://127.0.0.1:3100`. متغيرات الخادم: `HOST`, `PORT`, `LAMIS_DB`, `UPLOAD_DIR`, `APP_ORIGIN`, `COOKIE_SECURE=true` عند HTTPS. لا تنشر الخادم مباشرة دون HTTPS وضبط APP_ORIGIN الصحيح. SQLite وملفات الرفع في `server/data` بيانات تشغيل خاصة؛ لا تضفها إلى Git أو أرشيف التوزيع. النسخ الاحتياطي يحتاج قاعدة البيانات وملفات الرفع معًا؛ أوقف الخادم قبل نسخها.

إنشاء أول مشرف: حدد `ADMIN_EMAIL` و`ADMIN_NAME` اختياريًا، ثم مرر كلمة مرور خاصة (12 حرفًا على الأقل) عبر stdin أو متغير `ADMIN_PASSWORD` إلى `node server/bootstrap.mjs`. لا توجد كلمة مرور افتراضية، ولا يستبدل هذا الأمر حسابًا موجودًا. مثال Bash يتجنب سجل الأوامر:

```sh
export ADMIN_EMAIL='your-admin@example.org'
read -s -p 'Admin password: ' ADMIN_PASSWORD
export ADMIN_PASSWORD
node server/bootstrap.mjs
unset ADMIN_PASSWORD
```

في PowerShell يمكن استخدام قراءة آمنة ثم تمرير القيمة مؤقتًا:

```powershell
$env:ADMIN_EMAIL = Read-Host 'Admin email'
$adminSecret = Read-Host 'Admin password' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $adminSecret).Password
node server/bootstrap.mjs
Remove-Item Env:ADMIN_PASSWORD
Remove-Variable adminSecret
```

## المصادقة والحماية

`POST /api/auth/register` يقبل `{name,username,password}` أو email بدل username؛ تسجيل عام للطالب فقط. username من 3–40 حرفًا لاتينيًا/رقمًا/شرطة، كلمة المرور 10–200 حرف. `POST /api/auth/login` يقبل `{username,password}` أو email. تعيد الاستجابة `{user,csrfToken}` مع cookie `lamis_session` HttpOnly/SameSite=Lax. `GET /api/auth/me` يعيد نفس الهيئة أو user:null. جميع عمليات الكتابة بعد تسجيل الدخول تحتاج `X-CSRF-Token`. يُرفض Origin مختلف. لا تخزن cookie الجلسة في localStorage. `POST /api/auth/logout` يبطل الجلسة. كلمات المرور scrypt+salt عشوائي، وتخزن رموز الجلسات كـ SHA256 فقط. الجلسة سبعة أيام. التسجيل والدخول والأسئلة والمساعد تخضع لحدود محاولات في ذاكرة العملية.

الأدوار: `super_admin`, `content_admin`, `teacher`, `student`, `parent`. دور parent محجوز، ولا يمنح حاليًا تقارير أي طفل؛ يلزم بناء ربط وصي موثّق قبل ذلك. التقارير للمعلم محصورة في الطلاب المسندين له، وللمشرفين جميع الطلاب. إدارة الحسابات للمشرف الرئيسي فقط؛ لا يستطيع إزالة صلاحياته أو تعطيل نفسه.

## المنهج وCMS

`GET /api/catalog` للمستخدم المسجل: `{nodes}` المنشورة والمفعلة تحت أسلاف منشورين ومفعلين. ترتيب الهيكل:

`stage → grade → term → year → subject → unit → lesson`

`PUT /api/enrollment` يقبل `{stageId,gradeId,termId,yearId}` ويتحقق من التتابع. دروس الطالب يجب أن تطابق سنة تسجيله. لا تصبح المسودات متاحة بتغيير URL. تتضمن البيانات الأولية صفوف الابتدائي الرابع والخامس والسادس وفصلين وسنة 2026/2027، ومراحل إعدادي وثانوي كهيكل فارغ. الوحدة والدرس الأول مسودتان؛ مادة هذا الدرس تحتاج مراجعة مصدرية. لا توجد مصادقة رسمية للمحتوى.

- `GET /api/admin/nodes` يعيد `{nodes}` بما فيها المسودات.
- `POST /api/admin/nodes` و`PUT /api/admin/nodes/:id` يقبلان `{id,parentId,kind,title,status,order,disabled,content}`. `enabled` alias عكسي لـ disabled. status إما draft أو published. التعطيل يحافظ على التاريخ والتقدم.
- `GET /api/admin/nodes/:id/history` يعيد `{history:[{id,snapshot,createdAt}]}`.
- `POST /api/admin/nodes/:id/restore` يقبل `{historyId}` وينشئ إصدارًا جديدًا.
- `GET /api/admin/export` يعيد `{schemaVersion:1,nodes}`.
- `POST /api/admin/import` يقبل `{nodes}` بترتيب الآباء قبل الأبناء. الاستيراد معاملة كاملة؛ خطأ عنصر يلغي الجميع. الحد 1000 عنصر و1 MiB للطلب.

لا ينشر درسًا مع reviewRequired:true أو دون مصدر `{id,text,approved:true}` وبنك أسئلة غير فارغ. الموافقة الإدارية على المصدر تتطلب مراجعة بشرية فعلية؛ ليست تحققًا تلقائيًا من صحة المصدر. تاريخ إصدارات العقد يسجل الحالة السابقة والفاعل. حقول content المرنة:

```json
{"intro":"...","objectives":["..."],"concepts":[{"term":"...","definition":"..."}],"summary":"...","reviewRequired":true,"sources":[{"id":"source-1","title":"...","text":"...","approved":false}],"resources":[{"id":"iron","label":"الحديد","kind":"mineral","description":"...","importance":"...","locations":[{"id":"bahariya","name":"الواحات البحرية","lat":28.35,"lng":28.87}],"media":{"image":"","video":""}}],"questions":[{"id":"q1","type":"choice","prompt":"...","options":["أ","ب"],"answer":"أ","hint":"...","explanation":"..."}],"completionXp":30}
```

أنواع السؤال choice/boolean/order/match/drag/map/blank/image-match. الخادم يقارن answer المرسلة مع الإجابة المعتمدة بمساواة JSON بنيوية (مفاتيح الكائنات مرتبة، ترتيب المصفوفة ذو معنى). استخدم أشكال إجابات متسقة مع واجهة النشاط.

## الطلاب والتقييم

`GET /api/lessons/:id` يعيد `{lesson,progress}`؛ الإجابة المعتمدة مخفية عن الطالب. `POST /api/lessons/:id/answers` يقبل `{questionId,answer}` ويعيد `{correct,hint,explanation,questionId}`. التلميح عند الخطأ والتفسير عند الصواب؛ لا تصحيح من المتصفح ولا نقاط مرسلة من العميل. الإجابة الصحيحة السابقة لا تُمحى بمحاولة خاطئة لاحقة. `POST /api/lessons/:id/complete` بعد حل جميع الأسئلة يمنح completionXp المحصورة 0–100 مرة واحدة بقيد فريد في قاعدة البيانات، ويعيد `{completed,awarded,xp}`.

`GET /api/progress` يعيد `{xp,stars,lessons,answers}`، يشمل الدروس الجارية والمكتملة؛ النجوم عدد الأسئلة المحلولة. يحفظ التقدم والجلسات بعد إعادة تشغيل الخادم.

`GET /api/admin/users` يعيد `{users}`. `POST /api/admin/users` يقبل `{name,email,password,role,teacherId?,enabled?}`، كلمة مرور 12 حرفًا. `PUT /api/admin/users/:id` يقبل `{role,teacherId,enabled}` ويبطل جلسات الحساب المتغير. `GET /api/reports` يعيد `{students}` مع completed وanswers وxp.

## الوسائط

`POST /api/admin/media`: جسم binary مباشر، Content-Type حقيقي وX-Filename اختياري. يسمح PNG/JPEG/WebP/MP4/WebM/PDF حتى 25 MiB مع فحص magic signature، دون SVG أو HTML. الأسماء عشوائية ولا تستخدم اسم المستخدم كمسار. يعيد `{media:{id,url,mime,size}}`. `GET /api/media/:id` يتطلب جلسة؛ الطالب لا يقرأ إلا وسيطًا مشارًا إليه في درس منشور مطابق لتسجيله. PDF ينزل attachment، مع nosniff وCSP sandbox. فحص التوقيع ليس فحص مضاد فيروسات؛ عند نشر ملفات من جهات غير موثوقة أضف معالجة وسائط وعزلًا وفحصًا متخصصًا. لا توجد خدمة رفع عامة للطلاب.

## المساعد الحقيقي

اضبط `OPENAI_API_KEY` في بيئة الخادم فقط و`OPENAI_MODEL` اختياريًا (الافتراضي gpt-4.1-mini). لا تستخدم متغير VITE للمفتاح. `POST /api/ai` يقبل `{lessonId,resourceId?,locationId?,message,mode,consent:true}`، mode: explain/hint/feedback/question. يتحقق من درس الطالب والمورد والموقع، ويسترجع أعلى ثلاث فقرات مراجعة تطابق كلمات السؤال والمورد والموقع بعد تطبيع عربي بسيط. إذا لم يجد تطابقًا يرفض السؤال دون الاتصال بالمزود. المطابقة اللفظية لا تعادل البحث الدلالي، وقد تتطلب إعادة صياغة السؤال. لا يرسل اسم الطالب أو بريده أو سجل محادثاته. يستخدم OpenAI Responses API مع store:false وJSON Schema ومهلة 20 ثانية. يتحقق من معرفات المصادر وشكل الاستجابة ويختار السؤال من بنك معتمد فقط؛ يمنح الخادم النقاط عبر التقييم الحتمي وحده.

دون المفتاح ترجع 503 واضحة ولا توجد محاكاة تدعي أنها ذكاء اصطناعي. دون مصادر معتمدة ترجع 409 ولا يُرسل طلب خارجي. يتطلب ذلك موافقة صريحة في كل طلب؛ تصميم موافقة ولي الأمر وسياسات الاحتفاظ والتشغيل المؤسسي يحتاج تحديدًا قبل نشر منصة أطفال عامة. اتصال مزود AI الحقيقي غير مختبر دون مفتاح. التحقق البنيوي لا يثبت صحة كل عبارة لغوية؛ راجع إجابات النموذج تعليميًا قبل الاعتماد واسع النطاق.

## التحقق والحدود

اختبار التكامل ينشئ قاعدة مؤقتة وخادم HTTP حقيقي ويتحقق من المصادقة/CSRF/الأدوار/التسجيل/حجب المسودات/منع نشر غير مراجع/تقييم الخادم/إعادة الجوائز/تراجع الاستيراد/التاريخ/إسناد المعلم/استمرار البيانات بعد الإغلاق/تعطيل الحسابات. لا يحتوي كلمات مرور إنتاج. لم يُختبر أمر الإقلاع على Windows فعلي. هذا خادم محلي مكتمل الوظائف الأساسية؛ نشر إنتاج متعدد العمليات يحتاج نقل rate limits إلى مخزن مشترك، تشغيل HTTPS، نسخ احتياطي ومراقبة وتحديد سياسة بيانات الأطفال.

## حالة الاستئناف عبر الأجهزة

المخطط الإصدار 2 يضيف `learning_state`. فتح `GET /api/lessons/:id` يسجل آخر زيارة ويحافظ على الحالة السابقة، ويعيد `progress.state`. `PUT /api/lessons/:id/state` يحتاج الجلسة وCSRF وصلاحية الدرس ويقبل فقط `{resourceId,locationId,mode,questionId}`؛ الحقول اختيارية، وتتحقق معرفات المورد والموقع والسؤال مقابل المحتوى الحالي. لا تقبل الحالة نقاطًا أو إجابات أو حقولًا إضافية ولا تمنح أي مكافأة. يتضمن `GET /api/progress` أيضًا `lastLessonId`، ولكل درس `state,totalQuestions,percent` حيث percent نسبة الأسئلة المحلولة الصحيحة. تبقى الحالة بعد إعادة تشغيل الخادم، وتسترجع من جلسة المستخدم على جهاز آخر.

للمناقشة المرتبطة بسؤال، يقبل `/api/ai` أيضًا `questionId` من بنك الدرس و`attempt` كنص حتى 1000 حرف. يسترجع الخادم السؤال وإجابته وتفسيره المعتمدين لسياق المعلم فقط، ويطلب تلميحًا دون كشف الإجابة. لا يعيد حقول الإجابة المعتمدة للواجهة، ولا يستخدم النموذج لتصحيح درجات الطالب. `previousResponse` اختياري حتى 1000 حرف لآخر رد فقط؛ يستخدم كبيانات متابعة غير موثوقة، وليس مصدرًا معتمدًا أو سجلًا كاملًا للمحادثة. التوجيه يقلل كشف الإجابة في النص اللغوي لكنه لا يضمنه دلاليًا؛ مخرجات النموذج تحتاج المراجعة التعليمية المذكورة أعلاه.

## تجربة زائر بلا حساب

`GET /api/demo/lessons/lesson-1` يعرض فقط نسخة البذرة المرفقة، لا مسودات الإدارة المخصصة؛ يحذف answer وexplanation ويُبقي الحالة draft والمصادر غير معتمدة. `POST /api/demo/lessons/lesson-1/answers` يصحح `{questionId,answer}` دون جلسة أو كتابة في DB، ويرجع awarded:0 دائمًا. هذا المسار عديم الحالة مستثنى تحديدًا من CSRF token، مع فحص Origin وحد المعدل وحجم الطلب. أي درس آخر غير متاح من هذا المسار. لا يوجد نشر أو مسار إكمال/AI للزائر. واجهة `/demo/lesson-1` تستخدم نفس مكونات الخريطة والأسئلة مع شارة عدم الاعتماد وتلميحات محلية واضحة.


تحديث العينات: تدعم /api/demo/lessons/lesson-1 وlesson-2 وlesson-3 قراءة الدرس وPOST answers. الدروسان الثاني والثالث محولان من المصدر القديم، والأول يجمع البذرة الحالية ومعلوماته القديمة. جميعها draft وغير معتمدة، ولا تحفظ نتائج أو تمنح نقاطًا رسمية. لا تتوسع الإتاحة إلى مسودات CMS؛ قائمة DEMO_IDS ثابتة. راجع docs/LESSON_BUTTONS_AND_LEGACY.md وجرد الوسائط في docs/LEGACY_MIGRATION.json.
