/* ─── STATE ─────────────────────────────────────────────────────── */
const B = {
  svc: null,
  price: null,
  dur: null,
  date: null,
  time: null,
  name: "",
  phone: "",
};
const BARBER_WA = "5511999999999";

const SCHEDULE = {
  manhã: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
  tarde: [
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
  ],
  noite: ["17:00", "17:30", "18:00", "18:30", "19:00"],
};
const OCUPADOS = ["10:00", "14:00", "16:30", "18:00"];

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DAYS_PT = ["D", "S", "T", "Q", "Q", "S", "S"];

let calDate = new Date();
calDate.setDate(1);

/* ─── PROGRESS ──────────────────────────────────────────────────── */
function setProgress(n) {
  document.getElementById("progressFill").style.width = n * 25 + "%";
}

/* ─── ACTIVATE ──────────────────────────────────────────────────── */
function activate(n) {
  if (n === 2 && !B.svc) return;
  if (n === 3 && !B.date) return;
  if (n === 4 && !B.time) return;
  document.querySelectorAll(".panel").forEach((p, i) => {
    const step = i + 1;
    p.classList.toggle("active", step === n);
    p.classList.toggle(
      "done",
      step < n &&
        ((step === 1 && B.svc) ||
          (step === 2 && B.date) ||
          (step === 3 && B.time)),
    );
  });
  document.getElementById("arena").dataset.active = n;
  setProgress(n);
  if (n === 3) renderTimes();
  if (n === 4) renderP4();
}

/* ─── SERVICES ──────────────────────────────────────────────────── */
document.querySelectorAll(".svc-item").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    document
      .querySelectorAll(".svc-item")
      .forEach((i) => i.classList.remove("selected"));
    el.classList.add("selected");
    B.svc = el.dataset.svc;
    B.price = el.dataset.price;
    B.dur = el.dataset.dur;
    document.getElementById("next1").disabled = false;
  });
});
document.getElementById("next1").addEventListener("click", (e) => {
  e.stopPropagation();
  activate(2);
});

/* ─── CALENDAR ──────────────────────────────────────────────────── */
function renderCal() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const y = calDate.getFullYear(),
    m = calDate.getMonth();
  document.getElementById("calMonth").textContent = `${MONTHS[m]} ${y}`;
  const g = document.getElementById("calGrid");
  g.innerHTML = "";

  DAYS_PT.forEach((d) => {
    const s = document.createElement("span");
    s.className = "cal-dn";
    s.textContent = d;
    g.appendChild(s);
  });

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++)
    g.appendChild(document.createElement("span"));

  for (let d = 1; d <= daysInMonth; d++) {
    const btn = document.createElement("button");
    btn.className = "cal-day";
    btn.textContent = d;
    const dt = new Date(y, m, d);
    dt.setHours(0, 0, 0, 0);
    if (dt < today || dt.getDay() === 0) {
      btn.disabled = true;
    } else {
      if (dt.getTime() === today.getTime()) btn.classList.add("today");
      if (B.date && B.date.getTime() === dt.getTime())
        btn.classList.add("selected");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        document
          .querySelectorAll(".cal-day")
          .forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        B.date = dt;
        B.time = null;
        document.getElementById("next2").disabled = false;
      });
    }
    g.appendChild(btn);
  }
}

document.getElementById("calPrev").addEventListener("click", (e) => {
  e.stopPropagation();
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  const prev = new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1);
  if (prev >= now) {
    calDate.setMonth(calDate.getMonth() - 1);
    renderCal();
  }
});
document.getElementById("calNext").addEventListener("click", (e) => {
  e.stopPropagation();
  calDate.setMonth(calDate.getMonth() + 1);
  renderCal();
});
document.getElementById("next2").addEventListener("click", (e) => {
  e.stopPropagation();
  activate(3);
});
renderCal();

/* ─── TIMES ─────────────────────────────────────────────────────── */
function renderTimes() {
  const wrap = document.getElementById("timeGridWrap");
  wrap.innerHTML = "";
  if (B.date) {
    const opts = { weekday: "long", day: "2-digit", month: "long" };
    document.getElementById("p3sub").textContent =
      `Disponíveis para ${B.date.toLocaleDateString("pt-BR", opts)}.`;
  }

  for (const [period, times] of Object.entries(SCHEDULE)) {
    const lbl = document.createElement("p");
    lbl.className = "time-section-label";
    lbl.textContent = period.charAt(0).toUpperCase() + period.slice(1);
    wrap.appendChild(lbl);
    const grid = document.createElement("div");
    grid.className = "time-grid";
    wrap.appendChild(grid);

    times.forEach((t) => {
      const btn = document.createElement("button");
      btn.className = "time-btn";
      btn.textContent = t;
      if (OCUPADOS.includes(t)) {
        btn.classList.add("ocupado");
        btn.disabled = true;
        const tag = document.createElement("span");
        tag.className = "time-tag";
        tag.textContent = "ocupado";
        btn.appendChild(tag);
      } else {
        if (B.time === t) btn.classList.add("selected");
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          document
            .querySelectorAll(".time-btn")
            .forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          B.time = t;
          document.getElementById("next3").disabled = false;
        });
      }
      grid.appendChild(btn);
    });
  }
}
document.getElementById("next3").addEventListener("click", (e) => {
  e.stopPropagation();
  activate(4);
});

/* ─── PANEL 4 ───────────────────────────────────────────────────── */
function renderP4() {
  const fmtDate = B.date
    ? B.date.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

  document.getElementById("p4body").innerHTML = `
    <h2 class="panel-title">Seus<br><em>dados</em></h2>
    <p class="panel-sub">Para enviar a confirmação no WhatsApp.</p>

    <div class="summary">
      <div class="sum-row"><span class="lbl">Serviço</span><strong class="val">${B.svc}</strong></div>
      <div class="sum-row"><span class="lbl">Duração</span><strong class="val">${B.dur}</strong></div>
      <div class="sum-row"><span class="lbl">Data</span><strong class="val">${fmtDate}</strong></div>
      <div class="sum-row"><span class="lbl">Horário</span><strong class="val">${B.time}</strong></div>
      <div class="sum-divider"></div>
      <div class="sum-total"><span class="lbl">Total</span><span class="val">R$ ${B.price}</span></div>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label for="fName">Nome completo</label>
        <input id="fName" type="text" placeholder="Ex: João Silva" autocomplete="name">
      </div>
      <div class="form-field">
        <label for="fPhone">WhatsApp</label>
        <input id="fPhone" type="tel" placeholder="(11) 9 0000-0000" maxlength="17" inputmode="numeric">
      </div>
    </div>
    <div class="form-field">
      <label for="fNote">Observação (opcional)</label>
      <input id="fNote" type="text" placeholder="Ex: Prefiro degradê alto, trazer foto">
    </div>
    <p class="hint" style="font-size:.7rem;color:var(--color-text-d);margin-top:-.4rem;margin-bottom:.6rem">Você receberá a confirmação neste WhatsApp logo após o agendamento.</p>

    <div class="btn-row">
      <button class="btn btn-ghost btn-sm" onclick="activate(3)">← Voltar</button>
      <button class="btn btn-gold" id="btnOk" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
        Confirmar agendamento
      </button>
    </div>`;

  const validate = () => {
    const n = document.getElementById("fName").value.trim();
    const p = document.getElementById("fPhone").value.replace(/\D/g, "");
    document.getElementById("btnOk").disabled = !(
      n.length >= 2 && p.length >= 10
    );
  };

  document.getElementById("fPhone").addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    if (v.length >= 7) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    else if (v.length >= 3) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    e.target.value = v;
    validate();
  });
  document.getElementById("fName").addEventListener("input", validate);

  document.getElementById("btnOk").addEventListener("click", (e) => {
    e.stopPropagation();
    B.name = document.getElementById("fName").value.trim();
    B.phone = document.getElementById("fPhone").value;
    B.note = document.getElementById("fNote").value.trim();
    showSuccess();
  });
}

/* ─── SUCCESS ───────────────────────────────────────────────────── */
function showSuccess() {
  const fmtDate = B.date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const note = B.note ? `\n📝 Obs: ${B.note}` : "";

  const msgCliente = `✂️ *Agendamento Elite Barber confirmado!*\n\nOlá, *${B.name}*! Confira seu agendamento:\n\n📌 *${B.svc}*\n📅 ${fmtDate}\n⏰ ${B.time} (${B.dur})\n💰 R$ ${B.price}${note}\n\n📍 Rua Augusta, 1200 — Consolação, SP\n\nAté lá! Se precisar reagendar, manda mensagem. 💈`;
  const msgBarbeiro = `💈 *Novo agendamento!*\n\n👤 ${B.name}\n📞 ${B.phone}\n✂️ ${B.svc}\n📅 ${fmtDate} às ${B.time}\n💰 R$ ${B.price}${note}`;

  const ph = B.phone.replace(/\D/g, "");
  const waCliente = `https://wa.me/55${ph}?text=${encodeURIComponent(msgCliente)}`;
  const waBarbeiro = `https://wa.me/${BARBER_WA}?text=${encodeURIComponent(msgBarbeiro)}`;

  // mark all done
  document.querySelectorAll(".panel").forEach((p) => p.classList.add("done"));
  setProgress(4);

  document.getElementById("p4body").innerHTML = `
    <div class="success-wrap">
      <div class="check-ring">
        <div class="check-inner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
      </div>
      <h2 class="success-title">Tudo<br><em>confirmado!</em></h2>
      <p class="success-sub">${B.name}, seu horário das <strong>${B.time}</strong> está reservado.<br>Em instantes você recebe a confirmação no WhatsApp.</p>

      <div class="summary" style="text-align:left;margin-bottom:1.2rem;">
        <div class="sum-row"><span class="lbl">Serviço</span><strong class="val">${B.svc}</strong></div>
        <div class="sum-row"><span class="lbl">Data</span><strong class="val">${B.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</strong></div>
        <div class="sum-row"><span class="lbl">Horário</span><strong class="val">${B.time}</strong></div>
        <div class="sum-divider"></div>
        <div class="sum-total"><span class="lbl">Total</span><span class="val">R$ ${B.price}</span></div>
      </div>

      <div class="wa-card">
        <div class="wa-icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A11 11 0 003.6 17L2 22l5.2-1.6A11 11 0 1020.5 3.5z"/></svg>
        </div>
        <div class="wa-text">
          <p><strong>WhatsApp enviado!</strong><br>Você e o barbeiro foram notificados com todos os detalhes do agendamento.</p>
        </div>
      </div>

      <div class="btn-row" style="justify-content:center;flex-wrap:wrap;">
        <a href="${waCliente}" target="_blank" rel="noopener" class="btn btn-wa" onclick="setTimeout(()=>window.open('${waBarbeiro}','_blank'),600)">
          <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M20.5 3.5A11 11 0 003.6 17L2 22l5.2-1.6A11 11 0 1020.5 3.5z"/></svg>
          Ver no WhatsApp
        </a>
        <a href="/" class="btn btn-ghost btn-sm">Voltar ao site</a>
      </div>
    </div>`;
}
