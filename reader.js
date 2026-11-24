// 36:5 reader. Wide screens: spreads as in the book (cover alone, then pairs). Narrow: one page, swipe.
// URL hash #p12 = page 12 of the PDF (1-based). No libraries.
(async function () {
  const $ = (id) => document.getElementById(id);
  const book = await (await fetch("book.json")).json();
  const N = book.pages.length, secs = book.sections;
  const src = (i) => "pages/" + String(i + 1).padStart(3, "0") + ".webp";
  let page = 0;

  const twoUp = () => innerWidth >= 900 && innerWidth / Math.max(1, innerHeight - 44) > 1.05;
  // spread holding page i: [0], [1,2], [3,4] ... ; a lone last page stays alone
  function spreadOf(i) {
    if (!twoUp() || i === 0) return [i];
    const a = i % 2 ? i : i - 1;
    return a + 1 < N ? [a, a + 1] : [a];
  }
  const sectionAt = (i) => { let s = secs[0]; for (const x of secs) if (x.i <= i) s = x; return s; };

  // contents
  const list = $("tocList");
  let chapter = false;
  secs.forEach((s) => {
    const top = s.title.startsWith("Chapter") || ["Cover", "Front matter", "Contents", "Back cover"].includes(s.title) || !chapter;
    chapter = chapter || s.title.startsWith("Chapter");
    const li = document.createElement("li"); li.className = top ? "l1" : "l2"; li.dataset.i = s.i;
    li.innerHTML = '<a href="#p' + (s.i + 1) + '"><span></span><span>' + (s.i + 1) + "</span></a>";
    li.firstChild.firstChild.textContent = s.title;
    list.appendChild(li);
  });
  const toc = $("toc"), tocBtn = $("tocBtn");
  const showToc = (on) => { toc.hidden = !on; tocBtn.setAttribute("aria-expanded", on); };
  tocBtn.onclick = () => showToc(toc.hidden);
  list.addEventListener("click", (e) => { if (e.target.closest("a")) showToc(false); });

  const cache = new Map();
  const img = (i) => { if (!cache.has(i)) { const im = new Image(); im.decoding = "async"; im.src = src(i); im.alt = "Page " + (i + 1); cache.set(i, im); } return cache.get(i); };

  function render() {
    const sp = spreadOf(page), box = $("spread"), st = $("stage");
    const cs = getComputedStyle(st), W = st.clientWidth - parseFloat(cs.paddingLeft) * 2, H = st.clientHeight - parseFloat(cs.paddingTop) * 2;
    const pw = sp.reduce((a, i) => a + book.pages[i].w, 0), ph = Math.max(...sp.map((i) => book.pages[i].h));
    const k = Math.min(W / pw, H / ph);
    box.replaceChildren(...sp.map((i) => { const im = img(i); im.style.width = Math.floor(book.pages[i].w * k) + "px"; im.style.height = Math.floor(book.pages[i].h * k) + "px"; return im; }));
    box.className = "spread" + (sp.length === 1 ? " one" : "");
    const a = book.pages[sp[0]].f, b = book.pages[sp[sp.length - 1]].f;
    $("count").textContent = (a === b ? a : a + "–" + b) + "  ·  " + (sp[0] + 1) + " / " + N;
    const s = sectionAt(sp[0]); $("sec").textContent = s.title;
    document.title = s.i === 0 ? "36:5 · Small Epiphanies" : s.title + " · 36:5";
    list.querySelectorAll("li").forEach((li) => li.classList.toggle("on", +li.dataset.i === s.i));
    $("prev").disabled = sp[0] === 0; $("next").disabled = sp[sp.length - 1] >= N - 1;
    // preload the neighbours only
    const last = sp[sp.length - 1];
    [last + 1, last + 2, sp[0] - 1, sp[0] - 2].forEach((i) => { if (i >= 0 && i < N) img(i); });
  }
  function go(i, push) {
    page = Math.max(0, Math.min(N - 1, i));
    const h = "#p" + (spreadOf(page)[0] + 1);
    if (location.hash !== h) history[push ? "pushState" : "replaceState"](null, "", h);
    render();
  }
  const step = (d) => { const sp = spreadOf(page); go(d > 0 ? sp[sp.length - 1] + 1 : sp[0] - 1, false); };
  const fromHash = () => { const m = /^#p(\d+)$/.exec(location.hash); return m ? +m[1] - 1 : 0; };

  $("prev").onclick = () => step(-1); $("next").onclick = () => step(1);
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) { step(1); e.preventDefault(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) { step(-1); e.preventDefault(); }
    else if (e.key === "Home") go(0); else if (e.key === "End") go(N - 1);
    else if (e.key === "Escape") showToc(false);
  });
  let tx = null, ty = null;
  $("stage").addEventListener("touchstart", (e) => { if (e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } else tx = null; }, { passive: true });
  $("stage").addEventListener("touchend", (e) => {
    if (tx === null) return; const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; tx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  addEventListener("hashchange", () => go(fromHash(), false));
  addEventListener("resize", render);
  go(fromHash(), false);
})();
