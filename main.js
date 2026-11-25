// Contact address lives in one place. Confirm the real mailbox before publishing.
const CONTACT_EMAIL = "info@devanta.net";
const MAIL_SUBJECT = "Sitemizi inceler misiniz?";
const MAIL_BODY = "Merhaba,\n\nSite adresimiz: \n\n";

const mailHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(MAIL_SUBJECT)}&body=${encodeURIComponent(MAIL_BODY)}`;
document.querySelectorAll("[data-mail]").forEach((a) => { a.href = mailHref; });
document.querySelectorAll("[data-mail-text]").forEach((el) => { el.textContent = CONTACT_EMAIL; });

const SVG_NS = "http://www.w3.org/2000/svg";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Revision clouds: scalloped red-pen outline around a rectangle ----------
function cloudPath(x, y, w, h, r = 9) {
  const parts = [`M${x} ${y}`];
  const edge = (x1, y1, x2, y2) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(2, Math.round(len / (r * 2)));
    const rad = (len / n / 2).toFixed(1);
    for (let i = 1; i <= n; i++) {
      const px = x1 + ((x2 - x1) * i) / n;
      const py = y1 + ((y2 - y1) * i) / n;
      parts.push(`A${rad} ${rad} 0 0 1 ${px.toFixed(1)} ${py.toFixed(1)}`);
    }
  };
  edge(x, y, x + w, y);
  edge(x + w, y, x + w, y + h);
  edge(x + w, y + h, x, y + h);
  edge(x, y + h, x, y);
  return parts.join(" ") + " Z";
}

document.querySelectorAll(".clouds[data-clouds]").forEach((group) => {
  const specs = JSON.parse(group.dataset.clouds);
  const marked = new Set();
  specs.forEach(([x, y, w, h, n], i) => {
    const delay = `${0.25 + i * 0.18}s`;
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", cloudPath(x, y, w, h));
    path.setAttribute("class", "cloud");
    path.dataset.n = n;
    group.appendChild(path);
    path.style.setProperty("--len", Math.ceil(path.getTotalLength()));
    path.style.setProperty("--delay", delay);

    if (marked.has(n)) return;
    marked.add(n);
    // Revision triangle carrying the legend number, at the cloud's top-right corner.
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "marker");
    g.dataset.n = n;
    g.style.setProperty("--delay", delay);
    const cx = Math.min(x + w + 2, 590);
    const cy = y - 2;
    const tri = document.createElementNS(SVG_NS, "path");
    tri.setAttribute("d", `M${cx} ${cy - 12} L${cx + 12} ${cy + 9} L${cx - 12} ${cy + 9} Z`);
    const t = document.createElementNS(SVG_NS, "text");
    t.setAttribute("x", cx);
    t.setAttribute("y", cy + 6);
    t.setAttribute("text-anchor", "middle");
    t.textContent = String(n);
    g.append(tri, t);
    group.appendChild(g);
  });
});

// ---------- Revision switch ----------
const drawing = document.querySelector(".drawing");
const sheet = drawing.querySelector(".sheet");
const letter = drawing.querySelector("[data-rev-letter]");
const revButtons = [...drawing.querySelectorAll("[data-set-rev]")];

function setRev(rev) {
  drawing.dataset.rev = rev;
  letter.textContent = rev.toUpperCase();
  revButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setRev === rev)));
  setFocus(null);
}
revButtons.forEach((btn) => btn.addEventListener("click", () => { stopAutoplay(); setRev(btn.dataset.setRev); }));

// ---------- Legend <-> drawing highlighting ----------
function setFocus(n) {
  const rev = drawing.dataset.rev;
  drawing.classList.toggle("has-focus", n != null);
  drawing.querySelectorAll("[data-n]").forEach((el) => {
    const inActive = el.closest(`.rev-${rev}, .legend-${rev}`);
    el.classList.toggle("hl", n != null && !!inActive && el.dataset.n === String(n));
  });
}
drawing.querySelectorAll(".legend li").forEach((li) => {
  li.addEventListener("mouseenter", () => setFocus(li.dataset.n));
  li.addEventListener("focus", () => setFocus(li.dataset.n));
  li.addEventListener("mouseleave", () => setFocus(null));
  li.addEventListener("blur", () => setFocus(null));
});
drawing.querySelector(".plan").addEventListener("mouseover", (e) => {
  const hit = e.target.closest(".cloud, .marker, .steps [data-n], .table[data-n]");
  setFocus(hit ? hit.dataset.n : null);
});
drawing.querySelector(".plan").addEventListener("mouseleave", () => setFocus(null));

// ---------- Working product finder in Rev. B ----------
const CATEGORIES = [
  { cols: ["Çalışma genişliği", "Traktör gücü", "Ağırlık"], row: 1, cells: [0.9, 1.1, 0.8, 1, 1.15, 0.85, 1, 0.9, 0.7, 1.05, 0.95, 1] },
  { cols: ["Sıra sayısı", "Depo hacmi", "Traktör gücü"], row: 0, cells: [1.1, 0.6, 1, 0.9, 0.8, 0.7, 1.15, 1, 1, 0.65, 0.85, 1.1] },
  { cols: ["Depo hacmi", "Bom genişliği", "Pompa debisi"], row: 2, cells: [0.75, 1, 0.9, 1.1, 1, 0.85, 1.05, 0.7, 1.15, 1.1, 0.8, 0.9] },
  { cols: ["İş genişliği", "Ayak sayısı", "Traktör gücü"], row: 1, cells: [1, 0.8, 1.1, 0.75, 0.9, 1.05, 0.6, 1.15, 0.85, 1, 1.1, 0.8] },
];
const ROW_OFFSETS = [0, 24, 51];
const chips = [...drawing.querySelectorAll(".chip")];
const table = drawing.querySelector(".table");
const headers = [...table.querySelectorAll("[data-col]")];
const rowHi = table.querySelector(".row-hi");
const cellLines = [...table.querySelectorAll(".cells line")];
let currentCat = 0;

function selectCategory(i) {
  currentCat = i;
  const cat = CATEGORIES[i];
  chips.forEach((c, j) => { c.classList.toggle("is-on", j === i); c.setAttribute("aria-pressed", String(j === i)); });
  rowHi.style.transform = `translateY(${ROW_OFFSETS[cat.row]}px)`;
  cellLines.forEach((line, j) => { line.style.transform = `scaleX(${cat.cells[j]})`; });
  table.classList.add("is-swapping");
  setTimeout(() => {
    headers.forEach((h, j) => { h.textContent = cat.cols[j]; });
    table.classList.remove("is-swapping");
  }, reduceMotion ? 0 : 160);
}
chips.forEach((chip, i) => {
  chip.addEventListener("click", () => { stopAutoplay(); selectCategory(i); });
  chip.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); stopAutoplay(); selectCategory(i); }
  });
});
selectCategory(0);

// ---------- One-time autoplay: red markup, then the proposed structure, then one finder round ----------
let autoplayTimers = [];
let autoplayDone = false;
function stopAutoplay() {
  autoplayDone = true;
  autoplayTimers.forEach(clearTimeout);
  autoplayTimers = [];
  revButtons.forEach((b) => b.classList.remove("is-next"));
}
function later(ms, fn) { autoplayTimers.push(setTimeout(fn, ms)); }

function runAutoplay() {
  if (autoplayDone) return;
  const WAIT_A = 4200;
  const nextBtn = revButtons.find((b) => b.dataset.setRev === "b");
  nextBtn.style.setProperty("--wait", `${WAIT_A}ms`);
  nextBtn.classList.add("is-next");
  later(WAIT_A, () => {
    nextBtn.classList.remove("is-next");
    setRev("b");
    [1, 2, 3, 0].forEach((cat, k) => later(1500 + k * 1500, () => selectCategory(cat)));
    later(1500 + 4 * 1500, () => { autoplayDone = true; });
  });
}

if (!reduceMotion) {
  // Any intent to read or use the drawing hands control to the visitor.
  ["pointerdown", "keydown"].forEach((ev) => drawing.addEventListener(ev, stopAutoplay));
  drawing.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") stopAutoplay(); });

  const io = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) { io.disconnect(); runAutoplay(); }
  }, { threshold: 0.6 });
  io.observe(sheet);
}

// ---------- 30-second self-check ----------
const checks = [...document.querySelectorAll("[data-check]")];
const countEl = document.querySelector("[data-check-count]");
const verdictEl = document.querySelector("[data-check-verdict]");
const checkCta = document.querySelector("[data-check-cta]");
document.querySelector("[data-check-total]").textContent = checks.length;

function updateCheck() {
  const picked = checks.filter((c) => c.checked).map((c) => c.dataset.check);
  countEl.textContent = picked.length;
  verdictEl.textContent =
    picked.length === 0 ? "Henüz bir şey işaretlemediniz." :
    picked.length <= 2 ? "Küçük ama ilk izlenimi bozan sorunlar. Çoğu birkaç günde düzelir." :
    "Bu sorunlar size müşteri kaybettiriyor olabilir. Sitenizi ücretsiz inceleyelim, önce neyin düzeltilmesi gerektiğini yazalım.";
  const body = picked.length
    ? `Merhaba,\n\nSite adresimiz: \n\nHızlı kontrolde işaretlediğimiz maddeler:\n${picked.map((p) => `- ${p}`).join("\n")}\n`
    : MAIL_BODY;
  checkCta.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(MAIL_SUBJECT)}&body=${encodeURIComponent(body)}`;
}
checks.forEach((c) => c.addEventListener("change", updateCheck));
updateCheck();

// Start the markup draw-in on the next frame (the clouds' start state must paint first).
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add("is-drawn")));
