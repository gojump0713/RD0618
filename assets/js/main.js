/* ===================== 유틸 ===================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const msym = (name) => `<span class="material-symbols-rounded">${name}</span>`;

/* 마감 D-day 계산 (보고 기준일: 2026-06-18) */
const TODAY = new Date(2026, 5, 18);
function dday(end) {
  const [m, d] = end.split(".").map(Number);
  const due = new Date(2026, m - 1, d);
  const diff = Math.round((due - TODAY) / 86400000);
  return diff;
}

/* ===================== Hero 통계 ===================== */
function renderStats() {
  const byAgency = NOTICES.reduce((acc, n) => {
    const s = AGENCY[n.agency].short;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const urgent = NOTICES.filter((n) => dday(n.end) <= 7).length;
  const stats = [
    { icon: "play_circle", num: NOTICES.length, label: "접수중 공고" },
    { icon: "bolt", num: urgent, label: "마감 7일 이내" },
    ...Object.entries(byAgency).map(([k, v]) => ({ icon: "account_balance", num: v, label: k })),
  ];
  const ul = $("#heroStats");
  stats.forEach((s) => {
    const li = el("li", "stat");
    li.innerHTML = `${msym(s.icon)}<b>${s.num}</b><span>${s.label}</span>`;
    ul.appendChild(li);
  });
}

/* ===================== 필터 칩 ===================== */
let activeFilter = "all";
function renderFilters() {
  const agencies = [...new Set(NOTICES.map((n) => AGENCY[n.agency].short))];
  const box = $("#filters");
  const mk = (key, label) => {
    const b = el("button", "chip" + (key === "all" ? " is-on" : ""), label);
    b.dataset.filter = key;
    b.onclick = () => {
      activeFilter = key;
      $$(".chip", box).forEach((c) => c.classList.toggle("is-on", c.dataset.filter === key));
      renderCards();
    };
    return b;
  };
  box.appendChild(mk("all", "전체"));
  agencies.forEach((a) => box.appendChild(mk(a, a)));
}

/* ===================== 카드 ===================== */
function renderCards() {
  const grid = $("#cardGrid");
  grid.innerHTML = "";
  const list = NOTICES.filter(
    (n) => activeFilter === "all" || AGENCY[n.agency].short === activeFilter
  );

  list.forEach((n, i) => {
    const a = AGENCY[n.agency];
    const d = dday(n.end);
    const urgent = d <= 7;
    const card = el("article", `card chip-${a.chip}` + (n.url ? " card--link" : ""));
    card.style.setProperty("--i", i);
    if (n.url) {
      card.dataset.url = n.url;
      card.tabIndex = 0;
      card.setAttribute("role", "link");
      card.setAttribute("aria-label", `${n.title} 공고 페이지 새 탭으로 열기`);
    }

    card.innerHTML = `
      <div class="card__top">
        <span class="tag tag--live">${msym("fiber_manual_record")}접수중</span>
        ${n.isNew ? `<span class="tag tag--new">NEW</span>` : ""}
        <span class="dday ${urgent ? "is-urgent" : ""}">
          ${urgent ? msym("local_fire_department") : msym("schedule")}
          ${d > 0 ? "D-" + d : d === 0 ? "D-DAY" : "마감"}
        </span>
      </div>
      <h3 class="card__title">${n.title}</h3>
      <div class="card__meta">
        <span class="agency">${msym(a.icon)}${a.short}</span>
        <span class="org">${n.org}</span>
      </div>
      <div class="card__period">
        ${msym("date_range")}<span>${n.start} ~ ${n.end}</span>
      </div>
      <div class="card__actions">
        ${
          n.detail
            ? `<button class="card__cta" data-detail="${n.detail}">세부 내용 보기 ${msym("arrow_forward")}</button>`
            : ""
        }
        ${
          n.url
            ? `<span class="card__open">공고 바로가기 ${msym("open_in_new")}</span>`
            : ""
        }
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ===================== 상세 모달 ===================== */
function sectionHTML(s) {
  let inner = "";
  switch (s.type) {
    case "kv":
      inner = `<dl class="kv">${s.rows
        .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
        .join("")}</dl>`;
      break;
    case "timeline":
      inner = `<ol class="timeline">${s.rows
        .map(([k, v]) => `<li><span class="timeline__dot"></span><b>${k}</b><span>${v}</span></li>`)
        .join("")}</ol>`;
      break;
    case "table":
      inner = `<table class="dtable"><thead><tr>${s.head
        .map((h) => `<th>${h}</th>`)
        .join("")}</tr></thead><tbody>${s.rows
        .map(
          (r, ri) =>
            `<tr class="${s.highlight === ri ? "is-hl" : ""}">${r
              .map((c) => `<td>${c}</td>`)
              .join("")}</tr>`
        )
        .join("")}</tbody></table>`;
      break;
    case "list":
      inner = `<ul class="dlist">${s.items
        .map((t) => `<li>${msym("check")}<span>${t}</span></li>`)
        .join("")}</ul>`;
      break;
    case "flow":
      inner = `<div class="flow">${s.steps
        .map(
          (t, i) =>
            `<span class="flow__step">${t}</span>${
              i < s.steps.length - 1 ? `<span class="flow__arw">${msym("chevron_right")}</span>` : ""
            }`
        )
        .join("")}</div>`;
      break;
    case "callout":
      inner = `<div class="callout">${msym("priority_high")}<p>${s.text}</p></div>`;
      break;
  }
  return `
    <section class="dsec">
      <h4 class="dsec__h">${msym(s.icon || "label")}${s.h}</h4>
      ${inner}
      ${s.note ? `<p class="dnote">${msym("info")}${s.note}</p>` : ""}
    </section>`;
}

function openDetail(key) {
  const d = DETAILS[key];
  if (!d) return;
  const body = $("#modalBody");
  body.innerHTML = `
    <div class="dhead">
      <span class="dhead__badge">${msym(d.icon)}${d.badge}</span>
      <h2 id="modalTitle" class="dhead__title">${d.title}</h2>
      <p class="dhead__sub">${msym("event")}${d.sub}</p>
      ${d.sourceNote ? `<p class="dhead__warn">${msym("error")}${d.sourceNote}</p>` : ""}
    </div>
    <div class="dbody">${d.sections.map(sectionHTML).join("")}</div>
  `;
  const m = $("#modal");
  m.classList.add("is-open");
  m.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  body.scrollTop = 0;
}

function closeModal() {
  const m = $("#modal");
  m.classList.remove("is-open");
  m.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/* ===================== 이벤트 ===================== */
function openNotice(url) {
  if (url) window.open(url, "_blank", "noopener");
}

document.addEventListener("click", (e) => {
  // 세부 내용 보기 → 모달 (카드 이동보다 우선, 전파 차단)
  const trig = e.target.closest("[data-detail]");
  if (trig) {
    e.stopPropagation();
    openDetail(trig.dataset.detail);
    return;
  }
  if (e.target.closest("[data-close]")) {
    closeModal();
    return;
  }
  // 카드 본문 클릭 → 공고 페이지
  const card = e.target.closest(".card--link");
  if (card) openNotice(card.dataset.url);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  // 카드 포커스 후 Enter/Space → 공고 페이지
  if ((e.key === "Enter" || e.key === " ") && e.target.classList?.contains("card--link")) {
    e.preventDefault();
    openNotice(e.target.dataset.url);
  }
});

/* ===================== 초기화 ===================== */
renderStats();
renderFilters();
renderCards();
