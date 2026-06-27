/* ============================================================
   ELITE BARBER — agendamento.js
   Controla: painéis, calendário, horários, confirmação, WhatsApp
   ============================================================ */

/* ===== STATE ===== */
const state = {
  svc: null /* { nome, price, dur } */,
  data: null /* Date */,
  hora: null /* "09:00" */,
  nome: "",
  tel: "",
};

/* ===== HORÁRIOS FICTÍCIOS OCUPADOS (demo) ===== */
const BUSY = ["09:30", "10:30", "14:00", "15:30", "17:00"];

/* ===== MESES PT-BR ===== */
const MESES = [
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
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* ============================================================
   PAINÉIS
   ============================================================ */
function activate(n) {
  const arena = document.getElementById("arena");
  const panels = document.querySelectorAll(".panel");

  /* Só permite abrir um painel que já tenha sido liberado */
  if (n === 2 && !state.svc) return;
  if (n === 3 && !state.data) return;
  if (n === 4 && !state.hora) return;

  panels.forEach((p, i) => {
    p.classList.toggle("active", i === n - 1);
  });

  arena.dataset.active = n;
  updateProgress(n);

  /* Ao abrir painel 3, atualiza sub com a data selecionada */
  if (n === 3) {
    const sub = document.getElementById("p3sub");
    if (sub && state.data) {
      sub.textContent = `Horários para ${formatDate(state.data)}`;
    }
  }

  /* Ao abrir painel 4, renderiza confirmação */
  if (n === 4) renderConfirm();
}

/* ============================================================
   PROGRESS BAR
   ============================================================ */
function updateProgress(step) {
  const fill = document.getElementById("progressFill");
  if (!fill) return;
  fill.style.width = (step / 4) * 100 + "%";
}

/* ============================================================
   SERVIÇOS
   ============================================================ */
document.querySelectorAll(".svc-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.stopPropagation();

    document
      .querySelectorAll(".svc-item")
      .forEach((i) => i.classList.remove("selected"));
    item.classList.add("selected");

    state.svc = {
      nome: item.dataset.svc,
      price: Number(item.dataset.price),
      dur: item.dataset.dur,
    };

    const btn = document.getElementById("next1");
    if (btn) {
      btn.disabled = false;
      btn.style.animation = ""; /* reset */
    }
  });
});

const next1 = document.getElementById("next1");
if (next1) {
  next1.addEventListener("click", (e) => {
    e.stopPropagation();
    activate(2);
  });
}

/* ============================================================
   CALENDÁRIO
   ============================================================ */
let calDate = new Date();
calDate.setDate(1);

function buildCalendar() {
  const grid = document.getElementById("calGrid");
  const label = document.getElementById("calMonth");
  if (!grid || !label) return;

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  label.textContent = `${MESES[month]} ${year}`;

  /* Cabeçalhos dias semana */
  let html = DIAS_SEMANA.map(
    (d) => `<div class="cal-day cal-head">${d}</div>`,
  ).join("");

  /* Primeiro dia do mês e dias preenchidos do mês anterior */
  const firstWeekDay = new Date(year, month, 1).getDay();
  const prevMonth = new Date(year, month, 0);

  for (let i = firstWeekDay - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month">${prevMonth.getDate() - i}</div>`;
  }

  /* Dias do mês atual */
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    date.setHours(0, 0, 0, 0);

    const isPast = date < today;
    const isSunday = date.getDay() === 0;
    const isToday = date.getTime() === today.getTime();
    const isSelected =
      state.data &&
      date.getTime() === new Date(state.data).setHours(0, 0, 0, 0);

    let cls = "cal-day";
    if (isPast || isSunday) cls += " past";
    if (isToday) cls += " today";
    if (isSelected) cls += " selected";

    const disabled = isPast || isSunday;
    html += `<div class="${cls}" ${disabled ? "" : `data-date="${date.toISOString()}"`}>${d}</div>`;
  }

  /* Completar última linha */
  const totalCells = firstWeekDay + daysInMonth;
  const remainder = 7 - (totalCells % 7);
  if (remainder < 7) {
    for (let d = 1; d <= remainder; d++) {
      html += `<div class="cal-day other-month">${d}</div>`;
    }
  }

  grid.innerHTML = html;

  /* Eventos nos dias */
  grid.querySelectorAll(".cal-day[data-date]").forEach((cell) => {
    cell.addEventListener("click", () => {
      grid
        .querySelectorAll(".cal-day")
        .forEach((c) => c.classList.remove("selected"));
      cell.classList.add("selected");

      state.data = new Date(cell.dataset.date);
      state.hora = null; /* reset horário ao trocar data */

      const next2 = document.getElementById("next2");
      if (next2) next2.disabled = false;

      buildTimeGrid();
    });
  });
}

document.getElementById("calPrev")?.addEventListener("click", (e) => {
  e.stopPropagation();
  calDate.setMonth(calDate.getMonth() - 1);
  buildCalendar();
});

document.getElementById("calNext")?.addEventListener("click", (e) => {
  e.stopPropagation();
  calDate.setMonth(calDate.getMonth() + 1);
  buildCalendar();
});

document.getElementById("next2")?.addEventListener("click", (e) => {
  e.stopPropagation();
  activate(3);
  buildTimeGrid();
});

buildCalendar();

/* ============================================================
   GRID DE HORÁRIOS
   ============================================================ */
function buildTimeGrid() {
  const wrap = document.getElementById("timeGridWrap");
  if (!wrap) return;

  const slots = generateSlots("09:00", "19:00", 30);

  /* Agrupa por período */
  const manha = slots.filter((h) => parseInt(h) < 12);
  const tarde = slots.filter((h) => parseInt(h) >= 12 && parseInt(h) < 17);
  const noite = slots.filter((h) => parseInt(h) >= 17);

  function renderGroup(label, list) {
    if (!list.length) return "";
    const items = list
      .map((h) => {
        const busy = BUSY.includes(h);
        const sel = state.hora === h;
        let cls = "time-slot";
        if (busy) cls += " busy";
        if (sel) cls += " selected";
        return `<div class="${cls}" data-time="${h}" ${busy ? "aria-disabled='true'" : ""}>${h}</div>`;
      })
      .join("");
    return `<span class="time-section-label">${label}</span><div class="time-grid">${items}</div>`;
  }

  wrap.innerHTML =
    renderGroup("Manhã", manha) +
    renderGroup("Tarde", tarde) +
    renderGroup("Noite", noite);

  /* Eventos */
  wrap.querySelectorAll(".time-slot:not(.busy)").forEach((slot) => {
    slot.addEventListener("click", () => {
      wrap
        .querySelectorAll(".time-slot")
        .forEach((s) => s.classList.remove("selected"));
      slot.classList.add("selected");

      state.hora = slot.dataset.time;

      const next3 = document.getElementById("next3");
      if (next3) next3.disabled = false;
    });
  });
}

document.getElementById("next3")?.addEventListener("click", (e) => {
  e.stopPropagation();
  activate(4);
});

/* ============================================================
   PAINEL 4 — CONFIRMAÇÃO
   ============================================================ */
function renderConfirm() {
  const body = document.getElementById("p4body");
  if (!body) return;

  body.innerHTML = `
    <h2 class="panel-title">Confirmar<br><em>agendamento</em></h2>
    <p class="panel-sub">Revise os dados e finalize pelo WhatsApp.</p>

    <div class="confirm-summary">
      <h3>Resumo</h3>
      <div class="confirm-row">
        <span>Serviço</span>
        <span>${state.svc?.nome ?? "—"}</span>
      </div>
      <div class="confirm-row">
        <span>Duração</span>
        <span>${state.svc?.dur ?? "—"}</span>
      </div>
      <div class="confirm-row">
        <span>Data</span>
        <span>${state.data ? formatDate(state.data) : "—"}</span>
      </div>
      <div class="confirm-row">
        <span>Horário</span>
        <span>${state.hora ?? "—"}</span>
      </div>
      <div class="confirm-row total">
        <span>Total</span>
        <span>R$ ${state.svc?.price ?? 0}</span>
      </div>
    </div>

    <div class="confirm-fields">
      <div class="confirm-field">
        <label for="cfNome">Seu nome</label>
        <input type="text" id="cfNome" placeholder="Nome completo" autocomplete="name" />
      </div>
      <div class="confirm-field">
        <label for="cfTel">WhatsApp</label>
        <input type="tel" id="cfTel" placeholder="(11) 9 0000-0000" autocomplete="tel" maxlength="16" />
      </div>
    </div>

    <div id="confirmMsg" class="msg" role="alert" aria-live="polite" style="display:none"></div>

    <div class="btn-row">
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();activate(3)">← Voltar</button>
      <button class="btn btn-whatsapp" id="btnWhatsapp" onclick="event.stopPropagation();sendWhatsApp()">
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.108.549 4.092 1.51 5.814L.057 23.58a.5.5 0 0 0 .611.628l5.918-1.55A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 0 1-5.073-1.383l-.363-.218-3.758.984.999-3.658-.237-.378A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
        Confirmar no WhatsApp
      </button>
    </div>
  `;

  /* Máscara telefone */
  const telInput = document.getElementById("cfTel");
  if (telInput) {
    telInput.addEventListener("input", () => {
      let v = telInput.value.replace(/\D/g, "");
      if (v.length > 11) v = v.slice(0, 11);
      if (v.length > 7)
        v = `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3, 7)}-${v.slice(7)}`;
      else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      telInput.value = v;
    });
  }
}

function sendWhatsApp() {
  const nome = document.getElementById("cfNome")?.value.trim() ?? "";
  const tel = document.getElementById("cfTel")?.value.trim() ?? "";
  const msg = document.getElementById("confirmMsg");

  if (!nome) {
    showConfirmMsg("Informe seu nome.");
    return;
  }
  if (tel.replace(/\D/g, "").length < 10) {
    showConfirmMsg("Informe um WhatsApp válido.");
    return;
  }

  state.nome = nome;
  state.tel = tel;

  const texto = encodeURIComponent(
    `Olá, Elite Barber! Gostaria de agendar:\n\n` +
      `👤 *${nome}*\n` +
      `✂️ Serviço: *${state.svc?.nome}*\n` +
      `📅 Data: *${formatDate(state.data)}*\n` +
      `🕐 Horário: *${state.hora}*\n` +
      `💰 Total: *R$ ${state.svc?.price}*\n\n` +
      `Confirma esse horário? 🙏`,
  );

  /* Troque pelo número real da barbearia */
  const numero = "5511999999999";
  window.open(`https://wa.me/${numero}?text=${texto}`, "_blank");

  /* Feedback de sucesso */
  const body = document.getElementById("p4body");
  if (body) {
    body.innerHTML = `
      <div class="success-msg">
        <div class="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <h3>Tudo certo, ${nome.split(" ")[0]}!</h3>
        <p>Sua mensagem foi enviada pelo WhatsApp. Aguarde a confirmação da Elite Barber.</p>
      </div>
      <div class="btn-row" style="justify-content:center;margin-top:1.5rem">
        <a href="/" class="btn btn-ghost btn-sm">← Voltar ao site</a>
      </div>
    `;
  }
}

function showConfirmMsg(texto) {
  const el = document.getElementById("confirmMsg");
  if (!el) return;
  el.textContent = texto;
  el.className = "msg error";
  el.style.display = "flex";
  setTimeout(() => {
    el.style.display = "none";
  }, 4000);
}

/* ============================================================
   HELPERS
   ============================================================ */
function generateSlots(start, end, step) {
  const slots = [];
  let [h, m] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  while (h < eh || (h === eh && m < em)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += step;
    if (m >= 60) {
      h++;
      m -= 60;
    }
  }
  return slots;
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
