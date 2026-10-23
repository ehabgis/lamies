import { toJpeg } from "html-to-image";

// Saves the certificate as a one-page A4 landscape PDF. The page is drawn to
// a JPEG first (so Arabic shaping and the Cairo font come out exactly as on
// screen), then wrapped in a minimal PDF; no PDF library is needed.
export async function downloadCertificatePdf(node, fileName) {
  const dataUrl = await toJpeg(node, { quality: 0.95, pixelRatio: 2, backgroundColor: "#ffffff" });
  const jpeg = Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0));
  const { width, height } = await imageSize(dataUrl);
  const blob = new Blob([jpegPdf(jpeg, width, height)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function imageSize(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

// A4 landscape is 842 × 595 pt; the picture is centred and scaled to fit.
export function jpegPdf(jpeg, w, h) {
  const W = 842,
    H = 595;
  const scale = Math.min(W / w, H / h);
  const dw = (w * scale).toFixed(2),
    dh = (h * scale).toFixed(2);
  const x = ((W - w * scale) / 2).toFixed(2),
    y = ((H - h * scale) / 2).toFixed(2);
  const draw = `q ${dw} 0 0 ${dh} ${x} ${y} cm /Im0 Do Q`;
  const enc = new TextEncoder();
  const parts = [];
  const offsets = [];
  let length = 0;
  const push = (chunk) => {
    const bytes = typeof chunk === "string" ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (n, body) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    body();
    push("\nendobj\n");
  };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  object(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  object(2, () => push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
  object(3, () =>
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
  );
  object(4, () => {
    push(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    push(jpeg);
    push("\nendstream");
  });
  object(5, () => push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
  const xref = length;
  push(`xref\n0 6\n0000000000 65535 f \n`);
  for (let n = 1; n <= 5; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(length);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
