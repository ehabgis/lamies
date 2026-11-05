import test from "node:test";
import assert from "node:assert/strict";
import { studentText, forStudents } from "../../server/studentText.mjs";

test("review notes are not shown to students", () => {
  assert.equal(studentText("موضع تقريبي للمكان المذكور في الكتاب، يحتاج مراجعة المعلم."), "");
  assert.equal(studentText("جبل الزيت: موضع تقريبي مرسوم عن خريطة الكتاب، يحتاج مراجعة المعلم."), "");
  assert.equal(
    studentText("الكتاب يذكر المحافظة فقط؛ موضع تقريبي للمكان المذكور في الكتاب، يحتاج مراجعة المعلم."),
    "الكتاب يذكر المحافظة فقط.",
  );
  assert.equal(studentText("بيانات مشروع لميس السابقة — تحتاج مراجعة المعلم"), "بيانات مشروع لميس السابقة");
  assert.equal(
    studentText("يُستخرج الفحم من جبل المغارة. إحداثيات الموقع تحتاج مراجعة قبل إضافتها للخريطة. الفحم وقود غير متجدد."),
    "يُستخرج الفحم من جبل المغارة. الفحم وقود غير متجدد.",
  );
});

test("other text is unchanged", () => {
  assert.equal(studentText("بعض التوصيلات تحتاج مراجعة."), "بعض التوصيلات تحتاج مراجعة.");
  assert.equal(studentText("الذهب من المعادن النادرة."), "الذهب من المعادن النادرة.");
  assert.deepEqual(forStudents({ a: [1, "نص"], b: null }), { a: [1, "نص"], b: null });
});
