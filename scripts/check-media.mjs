// npm run media — checks teacher-added photos and videos in public/lesson-media/
// (sites/, water/ and projects/) and says in plain Arabic why a file will not show:
// unknown name, unsupported format (MOV), unsupported codec (H.265), or size.
import { openSync, readSync, closeSync, statSync, readdirSync, existsSync } from "node:fs";
import { MEDIA_ROOT, normalizeMediaName, IMAGE_EXT, VIDEO_EXT } from "../server/mediaFiles.mjs";
import { demoLesson, DEMO_IDS } from "../server/demo.mjs";

const siteIds = new Map();
for (const id of DEMO_IDS)
  for (const r of demoLesson(id).content.resources || [])
    for (const l of r.locations || []) siteIds.set(l.id.toLowerCase(), `${l.name} (${r.label})`);
// Covers of the two «رحلة كنوز مصر» mission cards.
siteIds.set("trip-minerals", "غلاف مهمة «كنوز المعادن» (رحلة كنوز مصر)");
siteIds.set("trip-energy", "غلاف مهمة «مصادر الطاقة» (رحلة كنوز مصر)");
const waterNames = new Map([
  ["farm", "مهمة ري المزرعة"],
  ["oasis", "مهمة مياه الواحة"],
  ["coast", "مهمة المدينة الساحلية"],
]);
const projectNames = new Map([
  ["wheat", "محطة الدلتا الجديدة (حصاد القمح)"],
  ["fish", "محطة بركة غليون (أحواض الأسماك)"],
  ["solar", "محطة بنبان (الألواح الشمسية)"],
  ["new-delta", "صورة مشروع الدلتا الجديدة"],
  ["birket-ghalioun", "صورة مشروع بركة غليون"],
  ["benban-solar", "صورة مشروع بنبان"],
]);

// Scan the whole file in chunks for the codec tags MP4/WebM files carry.
function videoCodec(path) {
  const tags = { avc1: "H.264", avc3: "H.264", hvc1: "H.265", hev1: "H.265", av01: "AV1", vp09: "VP9", V_VP8: "VP8", V_VP9: "VP9", V_AV1: "AV1", mp4v: "MPEG-4" };
  const fd = openSync(path, "r");
  const buf = Buffer.alloc(4 * 1024 * 1024);
  let pos = 0, found = null, carry = "";
  try {
    for (;;) {
      const n = readSync(fd, buf, 0, buf.length, pos);
      if (!n) break;
      const text = carry + buf.toString("latin1", 0, n);
      for (const [tag, name] of Object.entries(tags)) if (text.includes(tag)) found = found || name;
      if (found) break;
      carry = text.slice(-8);
      pos += n;
    }
  } finally {
    closeSync(fd);
  }
  return found;
}

function nearest(name, names) {
  const d = (a, b) => {
    const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return m[a.length][b.length];
  };
  return [...names].map((n) => [n, d(name, n)]).sort((a, b) => a[1] - b[1])[0];
}

let problems = 0;
for (const [folder, known] of [["sites", siteIds], ["water", waterNames], ["projects", projectNames]]) {
  const dir = MEDIA_ROOT + folder;
  console.log(`\n=== public/lesson-media/${folder}/`);
  if (!existsSync(dir)) {
    console.log("  المجلد غير موجود.");
    continue;
  }
  const files = readdirSync(dir).filter((f) => !/^readme\.md$/i.test(f));
  if (!files.length) console.log("  لا توجد ملفات.");
  for (const f of files) {
    const norm = normalizeMediaName(f);
    const ext = norm.split(".").pop();
    const base = norm.slice(0, -(ext.length + 1)).replace(/-[2-6]$/, "");
    const size = statSync(`${dir}/${f}`).size / 1024 / 1024;
    const notes = [];
    if (norm !== f.toLowerCase()) notes.push("الاسم فيه امتداد مكرر أو مسافات؛ يعمل الآن، لكن الأفضل تصحيحه");
    if (!IMAGE_EXT.includes(ext) && !VIDEO_EXT.includes(ext)) {
      notes.push(
        ext === "mov"
          ? "❌ صيغة MOV لا تعمل في المتصفح. حوّله إلى MP4 (H.264) بنفس الاسم"
          : `❌ الصيغة .${ext} غير مدعومة. الصور: jpg/png/webp، الفيديو: mp4/webm`,
      );
    } else if (!known.has(base)) {
      const [guess] = nearest(base, known.keys());
      notes.push(`❌ الاسم «${base}» لا يطابق أي موقع. هل تقصد «${guess}»؟ (القائمة في docs/SITE_IDS.md)`);
    } else {
      notes.push(`✔ مرتبط بـ: ${known.get(base)}`);
    }
    if (VIDEO_EXT.includes(ext)) {
      const codec = videoCodec(`${dir}/${f}`);
      if (codec === "H.265") notes.push("❌ الترميز H.265/HEVC لا يعمل في أغلب المتصفحات. حوّله إلى H.264");
      else if (codec) notes.push(`الترميز: ${codec}${["H.264", "VP8", "VP9", "AV1"].includes(codec) ? " ✔" : " — قد لا يعمل؛ يُفضّل H.264"}`);
      else notes.push("لم أتعرف على الترميز؛ إن لم يعمل حوّله إلى MP4 (H.264)");
      if (size > 80) notes.push(`⚠ الحجم ${size.toFixed(0)} ميجابايت كبير جدًا وقد يتأخر التشغيل؛ يُفضّل أقل من 50 ميجابايت (720p)`);
    } else if (size > 3) notes.push(`⚠ الصورة ${size.toFixed(1)} ميجابايت؛ يُفضّل أقل من 1 ميجابايت`);
    if (notes.some((n) => n.startsWith("❌"))) problems++;
    console.log(`\n  ${f}  (${size.toFixed(1)} MB)`);
    for (const n of notes) console.log(`    - ${n}`);
  }
}
console.log(problems ? `\nيوجد ${problems} ملف يحتاج إصلاحًا.` : "\nكل الملفات سليمة.");
console.log("بعد أي تعديل أعد تحميل صفحة الدرس (لا حاجة لإعادة تشغيل البرنامج).");
