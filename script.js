const WHATSAPP_NUMBER = "5577998726668";

const OBJETIVOS = {
  agro: ["Trator", "Colheitadeira", "Implementos", "Caminhão", "Terra", "Estrutura", "Outro"],
  veiculo: ["Carro", "Moto", "Caminhão", "Outro"],
  imovel: ["Casa", "Apartamento", "Terreno", "Imóvel comercial", "Construção", "Reforma", "Investimento"],
  investimento: ["Diversificar patrimônio", "Reserva de valor", "Planejamento futuro", "Outro"],
  outros: ["Quero conhecer as opções disponíveis"],
};

const SEGMENTO_LABEL = {
  agro: "Agronegócio",
  veiculo: "Veículo",
  imovel: "Imóvel",
  investimento: "Investimento / Patrimônio",
  outros: "Outros",
};

const state = {
  segmento: null,
  credito: null,
  objetivo: null,
  prazo: null,
  possuiLance: null,
  valorLance: "",
  nome: "",
  whatsapp: "",
  cidade: "",
  estado: "",
};

let currentStep = 1;

const form = document.getElementById("simForm");
const steps = document.querySelectorAll(".form-step");
const progressSteps = document.querySelectorAll(".progress-step");

function goToStep(step) {
  currentStep = step;
  steps.forEach((el) => el.classList.toggle("active", el.dataset.step == step));
  progressSteps.forEach((el) => {
    const n = Number(el.dataset.progress);
    el.classList.toggle("active", n === step);
    el.classList.toggle("done", n < step);
  });
  document.querySelector(".form-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectOption(group, button) {
  group.querySelectorAll(".option-btn").forEach((b) => b.classList.remove("selected"));
  button.classList.add("selected");
}

document.getElementById("step1-options").addEventListener("click", (e) => {
  const btn = e.target.closest(".option-btn");
  if (!btn) return;
  state.segmento = btn.dataset.value;
  selectOption(e.currentTarget, btn);
  buildStep3Options();
  setTimeout(() => goToStep(2), 200);
});

document.getElementById("step2-options").addEventListener("click", (e) => {
  const btn = e.target.closest(".option-btn");
  if (!btn) return;
  selectOption(e.currentTarget, btn);
  const outroCampo = document.getElementById("campo-outro-credito");
  if (btn.dataset.value === "outro") {
    outroCampo.hidden = false;
    state.credito = null;
    document.getElementById("outroCredito").focus();
  } else {
    outroCampo.hidden = true;
    state.credito = btn.dataset.value;
    setTimeout(() => goToStep(3), 200);
  }
});

document.getElementById("outroCredito").addEventListener("input", (e) => {
  state.credito = e.target.value ? `R$ ${e.target.value}` : null;
});

document.getElementById("outroCredito").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && state.credito) {
    e.preventDefault();
    goToStep(3);
  }
});

function buildStep3Options() {
  const container = document.getElementById("step3-options");
  container.innerHTML = "";
  const lista = OBJETIVOS[state.segmento] || OBJETIVOS.outros;
  lista.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.dataset.value = item;
    btn.textContent = item;
    container.appendChild(btn);
  });
}

document.getElementById("step3-options").addEventListener("click", (e) => {
  const btn = e.target.closest(".option-btn");
  if (!btn) return;
  state.objetivo = btn.dataset.value;
  selectOption(e.currentTarget, btn);
  setTimeout(() => goToStep(4), 200);
});

document.querySelectorAll('[data-step="4"] .option-grid-inline').forEach((group, index) => {
  group.addEventListener("click", (e) => {
    const btn = e.target.closest(".option-btn");
    if (!btn) return;
    selectOption(group, btn);
    if (index === 0) {
      state.prazo = btn.dataset.value;
    } else {
      state.possuiLance = btn.dataset.value;
      const campoLance = document.getElementById("campo-valor-lance");
      if (btn.dataset.value === "Sim") {
        campoLance.hidden = false;
        document.getElementById("valorLance").focus();
      } else {
        campoLance.hidden = true;
        state.valorLance = "";
      }
    }
  });
});

document.getElementById("valorLance").addEventListener("input", (e) => {
  state.valorLance = e.target.value;
});

document.querySelectorAll('[data-action="back"]').forEach((btn) => {
  btn.addEventListener("click", () => goToStep(Math.max(1, currentStep - 1)));
});

document.querySelector('[data-action="next-4"]').addEventListener("click", () => {
  if (!state.prazo) {
    alert("Escolha quando você pretende adquirir.");
    return;
  }
  if (state.possuiLance === "Sim" && !state.valorLance) {
    alert("Informe o valor aproximado disponível para lance.");
    return;
  }
  goToStep(5);
});

function buildWhatsappMessage() {
  const linhas = [
    `Olá, Carlos! Meu nome é ${state.nome}.`,
    `Vim pelo seu site e gostaria de fazer uma simulação de consórcio.`,
    ``,
    `Segmento: ${SEGMENTO_LABEL[state.segmento] || state.segmento}`,
    `Crédito desejado: ${state.credito}`,
    `Objetivo: ${state.objetivo}`,
    `Prazo: ${state.prazo}`,
  ];
  if (state.possuiLance === "Sim" && state.valorLance) {
    linhas.push(`Valor disponível para lance: R$ ${state.valorLance}`);
  } else if (state.possuiLance) {
    linhas.push(`Valor disponível para lance: ${state.possuiLance}`);
  }
  linhas.push(`Cidade: ${state.cidade}/${state.estado}`);
  return linhas.join("\n");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  state.nome = document.getElementById("nome").value.trim();
  state.whatsapp = document.getElementById("whatsapp").value.trim();
  state.cidade = document.getElementById("cidade").value.trim();
  state.estado = document.getElementById("estado").value;
  const consentimento = document.getElementById("consentimento").checked;

  if (!state.nome || !state.whatsapp || !state.cidade || !state.estado) {
    alert("Preencha todos os campos pra continuar.");
    return;
  }
  if (!consentimento) {
    alert("Confirme a autorização de contato pra continuar.");
    return;
  }

  const mensagem = buildWhatsappMessage();
  const link = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem)}`;
  document.getElementById("whatsappLink").href = link;
  document.getElementById("successNome").textContent = `Pronto, ${state.nome}! Recebi seu objetivo.`;

  steps.forEach((el) => el.classList.remove("active"));
  document.querySelector('[data-step="success"]').classList.add("active");
  progressSteps.forEach((el) => el.classList.add("done"));
  document.querySelector(".form-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelectorAll(".segmento-card").forEach((card) => {
  card.addEventListener("click", () => {
    const segmento = card.dataset.segmento;
    state.segmento = segmento;
    const step1Btn = document.querySelector(`#step1-options .option-btn[data-value="${segmento}"]`);
    if (step1Btn) selectOption(document.getElementById("step1-options"), step1Btn);
    buildStep3Options();
    document.getElementById("simulacao").scrollIntoView({ behavior: "smooth", block: "start" });
    goToStep(2);
  });
});

function preSelectFromHash() {
  const hash = window.location.hash.replace("#", "");
  if (OBJETIVOS[hash]) {
    state.segmento = hash;
    const step1Btn = document.querySelector(`#step1-options .option-btn[data-value="${hash}"]`);
    if (step1Btn) selectOption(document.getElementById("step1-options"), step1Btn);
    buildStep3Options();
    goToStep(2);
  }
}

preSelectFromHash();
