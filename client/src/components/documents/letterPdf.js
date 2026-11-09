import { jsPDF } from "jspdf";

/* A4 letter renderer. Ye HTML wale OfferLetter jaisa hi design banata hai:
   header swoosh + logo, footer wave + contact icons. Images public/brand/ se load hoti hain.
   Text vector hai (sharp, selectable). 2 page ho to chhote font ke saath dobara banta hai. */

const NAVY = [11, 27, 58];
const BLUE = [31, 111, 224];
const SKY = [56, 189, 248];
const INK = [17, 24, 39];
const LINE = [203, 213, 225];
const ZEBRA = [236, 242, 250];
const WHITE = [255, 255, 255];

const W = 210;
const H = 297;
const LM = 25;
const CW = 160;
const RM = LM + CW;
const TITLE_Y = 44.5;
const DATE_Y = 60;
const DATE_RIGHT = 184;
const NEXT_TOP = 24;
const FOOT_TOP = 252;
const PX = 8; // canvas pixels per mm (sirf agle pages ki chhoti header ke liye)

const LEVELS = [
    { body: 8.6, lh: 3.95, top: 66, bottom: 251, gap: 1.6 },
    { body: 8.2, lh: 3.75, top: 66, bottom: 252, gap: 1.1 },
    { body: 7.8, lh: 3.55, top: 66, bottom: 253, gap: 0.8 },
];

const ptToMm = (p) => p * 0.3528;
const mmToPt = (mm) => mm / 0.3528;
const color = (doc, rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
const css = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

/* ---------- images from public/brand ---------- */

const BRAND_FILES = {
    header: "/brand/header-swoosh.png",
    logo: "/brand/paysave-logo.png",
    wave: "/brand/footer-wave.png",
    phone: "/brand/icon-phone.png",
    pin: "/brand/icon-location.png",
};

const readAsDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});

const naturalSize = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
});

async function loadOne(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const src = await readAsDataUrl(await res.blob());
        const { w, h } = await naturalSize(src);
        if (!w || !h) throw new Error("empty image");
        return { src, w, h };
    } catch (err) {
        console.warn(`Letter image load nahi hui: ${path}`, err);
        return null;
    }
}

let brandPromise = null;
export function loadBrandAssets() {
    if (!brandPromise) {
        const keys = Object.keys(BRAND_FILES);
        brandPromise = Promise.all(keys.map((k) => loadOne(BRAND_FILES[k])))
            .then((list) => Object.fromEntries(keys.map((k, i) => [k, list[i]])));
    }
    return brandPromise;
}

/* image ko box ke andar aspect ratio ke saath fit karta hai (SVG ke preserveAspectRatio="meet" jaisa) */
function fit(img, box) {
    const s = Math.min(box.w / img.w, box.h / img.h);
    const w = img.w * s;
    const h = img.h * s;
    return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

function place(doc, img, box, alias) {
    if (!img) return;
    const f = fit(img, box);
    doc.addImage(img.src, "PNG", f.x, f.y, f.w, f.h, alias);
}

/* ---------- canvas helpers (next pages ki chhoti header ke liye) ---------- */

function makeBand(wMm, hMm, draw) {
    const c = document.createElement("canvas");
    c.width = Math.round(wMm * PX);
    c.height = Math.round(hMm * PX);
    const ctx = c.getContext("2d");
    ctx.scale(PX, PX);
    draw(ctx);
    return c.toDataURL("image/png");
}

function fanPoly(ctx, pts, rgb) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fillStyle = css(rgb);
    ctx.fill();
}

function canvasBrand(ctx, name, x, y, size, mainRgb, accentRgb, align = "left") {
    const t = String(name || "").toUpperCase();
    const a = t.slice(0, 4);
    const b = t.slice(4);
    ctx.font = `bold ${ptToMm(size)}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const wa = ctx.measureText(a).width;
    const wb = ctx.measureText(b).width;
    let sx = x;
    if (align === "center") sx = x - (wa + wb) / 2;
    if (align === "right") sx = x - (wa + wb);
    ctx.fillStyle = css(mainRgb);
    ctx.fillText(a, sx, y);
    ctx.fillStyle = css(accentRgb);
    ctx.fillText(b, sx + wa, y);
}

function makeTopNext(company) {
    return makeBand(W, 18, (ctx) => {
        fanPoly(ctx, [[0, 0], [70, 0], [0, 13]], NAVY);
        fanPoly(ctx, [[0, 13], [70, 0], [76, 0], [0, 17]], SKY);
        canvasBrand(ctx, company.brand || "FOURPAYSAVE", RM, 9, 9, NAVY, BLUE, "right");
    });
}

/* ---------- header / footer (HTML design ke coordinates, mm me) ---------- */

function drawWordmark(doc, company) {
    const brand = String(company.brand || "FOURPAYSAVE").toUpperCase();
    const a = brand.slice(0, 4);
    const b = brand.slice(4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(mmToPt(5.6));
    const wa = doc.getTextWidth(a);
    const wb = doc.getTextWidth(b);
    const x = 185 - (wa + wb) / 2;
    color(doc, INK);
    doc.text(a, x, 46);
    color(doc, BLUE);
    doc.text(b, x + wa, 46);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(mmToPt(3));
    color(doc, NAVY);
    doc.text(String(company.brandSub || "").toUpperCase(), 185, 50.8, { align: "center" });
}

function drawFooter(doc, company, img) {
    place(doc, img.wave, { x: 0, y: 272.7, w: W, h: 25.3 }, "wave");
    place(doc, img.phone, { x: 2.5, y: 262.5, w: 10, h: 10 }, "phone");
    place(doc, img.pin, { x: 125, y: 261, w: 10, h: 10 }, "pin");

    /* phone */
    doc.setFont("helvetica", "normal");
    doc.setFontSize(mmToPt(4.6));
    color(doc, INK);
    doc.text(String(company.phone || ""), 12.5, 268);

    /* email (envelope icon shapes se banta hai) */
    doc.setFillColor(...BLUE);
    doc.circle(63.5, 266.5, 4, "F");
    doc.setFillColor(...WHITE);
    doc.rect(61.2, 265.2, 4.6, 3.2, "F");
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.35);
    doc.line(61.2, 265.2, 63.5, 267.5);
    doc.line(63.5, 267.5, 65.8, 265.2);
    doc.setFontSize(mmToPt(4.4));
    color(doc, INK);
    doc.text(String(company.email || ""), 69, 268);

    /* address (2 lines) */
    doc.setFontSize(mmToPt(3.5));
    color(doc, INK);
    const addr = doc.splitTextToSize(String(company.address || ""), 72).slice(0, 2);
    addr.forEach((line, k) => doc.text(line, 134.5, k === 0 ? 264.6 : 269));
}

function chrome(doc, first, company, assets) {
    if (first) {
        place(doc, assets.img.header, { x: 0, y: 0, w: W, h: 53.33 }, "header");
        place(doc, assets.img.logo, { x: 172, y: 14, w: 18, h: 28 }, "logo");
        drawWordmark(doc, company);
    } else {
        doc.addImage(assets.topNext, "PNG", 0, 0, W, 18, "topnext");
    }
    drawFooter(doc, company, assets.img);
}

/* ---------- render one version of the letter ---------- */

function render(letter, cfg, imgs) {
    const { body: BODY, lh: LH, top: FIRST_TOP, bottom: BOTTOM, gap } = cfg;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const company = letter.company || {};
    const assets = { img: imgs, topNext: makeTopNext(company) };

    doc.setProperties({
        title: letter.heading || "Letter",
        subject: letter.heading || "Letter",
        author: company.companyName || "",
        creator: "HRMS",
    });

    let y = FIRST_TOP;
    chrome(doc, true, company, assets);

    const newPage = () => {
        doc.addPage();
        chrome(doc, false, company, assets);
        y = NEXT_TOP;
    };
    const ensure = (h) => {
        if (y + h > BOTTOM) newPage();
    };

    const measure = (tok) => {
        doc.setFont("helvetica", tok.b ? "bold" : "normal");
        return doc.getTextWidth(tok.t);
    };

    /* **bold** wala text, word wrap ke saath. Har line par page check hota hai. */
    const rich = (text, opt = {}) => {
        const { x = LM, w = CW, size = BODY, rgb = INK, align = "left" } = opt;

        const tokens = [];
        String(text ?? "").split("**").forEach((part, i) => {
            const b = i % 2 === 1;
            part.split(/(\s+)/).forEach((t) => {
                if (t) tokens.push({ t, b, sp: /^\s+$/.test(t) });
            });
        });

        doc.setFontSize(size);
        const lines = [];
        let cur = [];
        let cw = 0;
        tokens.forEach((tok) => {
            const tw = measure(tok);
            if (tok.sp) {
                if (cur.length) {
                    cur.push(tok);
                    cw += tw;
                }
                return;
            }
            if (cw + tw > w && cur.length) {
                while (cur.length && cur[cur.length - 1].sp) cur.pop();
                lines.push(cur);
                cur = [tok];
                cw = tw;
            } else {
                cur.push(tok);
                cw += tw;
            }
        });
        while (cur.length && cur[cur.length - 1].sp) cur.pop();
        if (cur.length) lines.push(cur);

        if (!lines.length) {
            y += LH * 0.5;
            return;
        }

        lines.forEach((ln) => {
            ensure(LH);
            doc.setFontSize(size);
            color(doc, rgb);
            const total = ln.reduce((s, t) => s + measure(t), 0);
            let cx = align === "center" ? x + (w - total) / 2 : align === "right" ? x + w - total : x;
            ln.forEach((tok) => {
                doc.setFont("helvetica", tok.b ? "bold" : "normal");
                doc.text(tok.t, cx, y);
                cx += doc.getTextWidth(tok.t);
            });
            y += LH;
        });
    };

    const para = (text) => {
        rich(text);
        y += gap;
    };

    const heading = (text) => {
        ensure(LH + 4);
        y += gap + 0.6;
        rich(`**${text}**`, { size: BODY + 0.5, rgb: NAVY });
        y += gap * 0.4;
    };

    const recipient = (items) => {
        items.forEach(([label, text]) => {
            const line = label ? `**${label}** ${text || ""}` : text ? `**${text}**` : "";
            if (String(line).trim()) rich(line);
        });
        y += gap + 0.6;
    };

    const bullets = (items) => {
        items
            .filter(([, value]) => String(value || "").trim())
            .forEach(([label, value]) => {
                ensure(LH);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(BODY);
                color(doc, INK);
                doc.text("•", LM + 0.6, y);
                rich(`**${label}** ${value}`, { x: LM + 5, w: CW - 5 });
            });
        y += gap;
    };

    const numbered = (items) => {
        items.forEach((item, i) => {
            ensure(LH);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(BODY);
            color(doc, INK);
            doc.text(`${i + 1}.`, LM + 0.4, y);
            rich(item, { x: LM + 6, w: CW - 6 });
        });
        y += gap;
    };

    const table = (b) => {
        const cols = [CW * 0.5, CW * 0.25, CW * 0.25];
        const RH = LH + 2.4;
        const row = (cells, { head = false, total = false } = {}) => {
            ensure(RH);
            if (head) {
                doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
                doc.rect(LM, y, CW, RH, "F");
            } else if (total) {
                doc.setFillColor(ZEBRA[0], ZEBRA[1], ZEBRA[2]);
                doc.rect(LM, y, CW, RH, "F");
            }
            doc.setFont("helvetica", head || total ? "bold" : "normal");
            doc.setFontSize(BODY - 0.5);
            color(doc, head ? WHITE : INK);
            let cx = LM;
            cells.forEach((c, i) => {
                const cw = cols[i];
                if (i === 0) doc.text(String(c), cx + 3, y + RH * 0.7);
                else doc.text(String(c), cx + cw - 3, y + RH * 0.7, { align: "right" });
                cx += cw;
            });
            if (!head) {
                doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
                doc.setLineWidth(0.2);
                doc.line(LM, y + RH, LM + CW, y + RH);
            }
            y += RH;
        };
        ensure(RH * 3);
        y += 1;
        row(b.head, { head: true });
        b.rows.forEach((r) => row(r));
        if (b.total) row(b.total, { total: true });
        y += gap + 1;
    };

    const signature = (b) => {
        ensure(LH * 5);
        y += gap + 1;
        rich("**Best Regards,**");
        y += gap * 3;
        if (b.name) rich(`**${b.name}**`);
        if (b.title) rich(`**${b.title}**`);
        if (b.company) rich(`**${b.company}**`);
        y += gap + 1;
    };

    const acceptance = () => {
        ensure(LH * 3);
        y += gap + 1;
        rich("**Employee / Candidate Signature:** ____________________________");
        y += gap;
        rich("**Date:** ____________________");
    };

    /* Page 1 header: title aur date (HTML jaisi position) */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    color(doc, INK);
    doc.text(String(letter.heading || ""), W / 2, TITLE_Y, { align: "center" });
    doc.setFontSize(7.6);
    doc.text(`Date:${letter.date || ""}`, DATE_RIGHT, DATE_Y, { align: "right" });

    (letter.blocks || []).forEach((b) => {
        switch (b.type) {
            case "recipient":
                recipient(b.items || []);
                break;
            case "center":
                ensure(LH + 2);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(BODY);
                color(doc, INK);
                doc.text(String(b.text || ""), W / 2, y, { align: "center" });
                y += LH + gap;
                break;
            case "p":
                para(b.text);
                break;
            case "h":
                heading(b.text);
                break;
            case "bullets":
                bullets(b.items || []);
                break;
            case "numbered":
                numbered(b.items || []);
                break;
            case "table":
                table(b);
                break;
            case "signature":
                signature(b);
                break;
            case "acceptance":
                acceptance();
                break;
            default:
                break;
        }
    });

    return doc;
}

export async function buildLetterPdf(letter) {
    const imgs = await loadBrandAssets();
    let doc = null;
    for (const cfg of LEVELS) {
        doc = render(letter, cfg, imgs);
        if (doc.getNumberOfPages() === 1) break;
    }
    return doc.output("blob");
}
