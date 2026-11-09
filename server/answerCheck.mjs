// One answer check for every route (demo, classroom, help). A blank accepts
// any listed spelling, ignoring extra spaces, short vowels, tatweel, the
// forms of alef and yaa / taa marbuta, and a leading «ال» («نحاس» = «النحاس»).
export const canonical = (v) =>
  JSON.stringify(
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, JSON.parse(canonical(v[k]))]),
        )
      : Array.isArray(v)
        ? v.map((x) => JSON.parse(canonical(x)))
        : v,
  );

export function normalizeText(v) {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[.،,؛!؟?«»"']/g, "")
    .trim();
}
const bare = (t) => normalizeText(t).split(" ").map((w) => w.replace(/^ال(?=..)/, "")).join(" ");

export function acceptedAnswers(q) {
  return Array.isArray(q.answer) && q.type === "blank" ? q.answer : [q.answer];
}

/** Is a written answer one of the accepted spellings? */
export function blankMatches(accepted, answer) {
  const a = bare(answer);
  return Boolean(a) && accepted.some((x) => bare(x) === a);
}

export function isCorrect(q, answer) {
  if (q.type === "blank") return blankMatches(acceptedAnswers(q), answer);
  return acceptedAnswers(q).some((a) => canonical(a) === canonical(answer));
}

/** A key that is the same for answers the checker treats as the same. */
export function answerKey(q, answer) {
  return q.type === "blank" ? bare(answer) : canonical(answer);
}

/** An empty or unfinished answer is not an attempt. */
export function isEmptyAnswer(q, answer) {
  if (answer === undefined || answer === null) return true;
  if (q.type === "blank") return !bare(answer);
  if (typeof answer === "string") return !answer.trim();
  return false;
}
