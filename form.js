// CONFIGURAÇÕES E DEPENDÊNCIAS
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { MessageMedia } = require("whatsapp-web.js");

// ------------------------------------------------------
// NOVAS VARIÁVEIS PARA PESQUISA DE SATISFAÇÃO
// ------------------------------------------------------
const perguntasPesquisa = [
  // Pergunta 1: Limpeza e Conforto
  `Sua avaliação é muito importante para nós. Por favor, nos dê uma nota de 1 a 5 para a **limpeza e o conforto do seu quarto**.\n\n` +
    `5 – Muito satisfeito(a) 🤩\n` +
    `4 – Satisfeito(a) 😍\n` +
    `3 – Parcialmente satisfeito(a) 😐\n` +
    `2 – Insatisfeito(a) 🥺\n` +
    `1 – Muito insatisfeito(a) 😔`,

  // Pergunta 2: Atendimento e Cordialidade
  `Por favor, dê uma nota de 1 a 5 para a **qualidade do atendimento e a cordialidade da nossa equipe**.\n\n` +
    `5 – Muito satisfeito(a) 🤩\n` +
    `4 – Satisfeito(a) 😍\n` +
    `3 – Parcialmente satisfeito(a) 😐\n` +
    `2 – Insatisfeito(a) 🥺\n` +
    `1 – Muito insatisfeito(a) 😔`,

  // Pergunta 3: Áreas de Lazer e Restaurantes
  `Dê uma nota de 1 a 5 para as **nossas áreas de lazer e restaurantes**.\n\n` +
    `5 – Muito satisfeito(a) 🤩\n` +
    `4 – Satisfeito(a) 😍\n` +
    `3 – Parcialmente satisfeito(a) 😐\n` +
    `2 – Insatisfeito(a) 🥺\n` +
    `1 – Muito insatisfeito(a) 😔`,

  // Pergunta 4: Custo-Benefício
  `Sua última avaliação com nota (1 a 5) é sobre o **custo-benefício da sua estadia**.\n\n` +
    `5 – Muito satisfeito(a) 🤩\n` +
    `4 – Satisfeito(a) 😍\n` +
    `3 – Parcialmente satisfeito(a) 😐\n` +
    `2 – Insatisfeito(a) 🥺\n` +
    `1 – Muito insatisfeito(a) 😔`,

  // Pergunta 5: Comentário (Resposta de Texto Livre)
  "💬 Para finalizar, por favor, deixe um **breve comentário** sobre o que mais gostou ou o que podemos melhorar. (Digite seu texto livremente):",
];

// Objeto para armazenar as respostas temporárias e o índice atual da pergunta para cada usuário.
const estadoPesquisa = {};

// 1. CRIAÇÃO DA INSTÂNCIA DO CLIENTE COM PARÂMETROS DE ESTABILIDADE
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    timeout: 60000,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  },
});

// 2. SISTEMA DE CONTEXTOS (Estado da Conversa)
const userContexts = {};
const CONTEXT_MENU_PRINCIPAL = "menu_principal";
const CONTEXT_TRANSFERINDO_HUMANO = "transferindo_humano";
const CONTEXT_AGUARDANDO_RESPOSTA = "aguardando_resposta";

function setUserContext(userId, context, data = {}) {
  userContexts[userId] = {
    context: context,
    timestamp: Date.now(),
    data: data,
  };
}

function getUserContext(userId) {
  return userContexts[userId] || { context: null, data: {} };
}

// Delay para simular digitação ou processamento
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// 5. FUNÇÃO SEGURA DE ENVIO
const safeSendMessage = async (msg, message) => {
  const finalChat = await msg.getChat();
  if (finalChat.isGroup || !msg.from.endsWith("@c.us")) return;

  try {
    await client.sendMessage(msg.from, message);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
  }
};

// ------------------------------------------------------
// FUNÇÕES DE FLUXO DA PESQUISA
// ------------------------------------------------------

async function iniciarPesquisa(msg, name) {
  const userId = msg.from;

  estadoPesquisa[userId] = {
    indiceAtual: 0,
    respostas: [],
    nome: name,
    dataInicio: new Date().toISOString(),
  };

  setUserContext(userId, CONTEXT_AGUARDANDO_RESPOSTA, { indicePergunta: 0 });

  await safeSendMessage(
    msg,
    `Olá ${name}! Agradecemos por dedicar um momento para nos avaliar. Sua opinião é fundamental para o **Garden Hotel e Resort**.\n\n` +
      "Por favor, responda com o **NÚMERO** da nota (1 a 5) para as próximas perguntas:"
  );

  await delay(2000);
  await enviarProximaPergunta(msg, 0);
}

async function enviarProximaPergunta(msg, indice) {
  const userId = msg.from;

  if (indice < perguntasPesquisa.length) {
    setUserContext(userId, CONTEXT_AGUARDANDO_RESPOSTA, {
      indicePergunta: indice,
    });
    estadoPesquisa[userId].indiceAtual = indice;

    // Simula a digitação antes de enviar a pergunta formatada
    await msg.getChat().then((chat) => chat.sendStateTyping());
    await delay(1500);

    await safeSendMessage(
      msg,
      `*PERGUNTA ${indice + 1}/${perguntasPesquisa.length}:*\n\n` +
        perguntasPesquisa[indice]
    );
  } else {
    await safeSendMessage(
      msg,
      "✅ Avaliação concluída! Seus comentários foram registrados com sucesso. O **Garden Hotel e Resort** agradece a sua participação!\n\n" +
        "Se precisar de algo mais, digite **menu**."
    );

    // Simula o envio para o banco de dados
    console.log(`\n--- AVALIAÇÃO FINAL DO USUÁRIO ${userId} ---`);
    console.log(estadoPesquisa[userId]);
    console.log("-------------------------------------------\n");

    setUserContext(userId, null);
    delete estadoPesquisa[userId];
  }
}

async function processarRespostaPesquisa(msg, userMessage) {
  const userId = msg.from;
  const {
    data: { indicePergunta },
  } = getUserContext(userId);
  const perguntaRespondida = perguntasPesquisa[indicePergunta];

  // As 4 primeiras perguntas (índice 0 a 3) exigem nota (1 a 5)
  const isNota = indicePergunta < 4;

  // Lógica de Validação para notas (Perguntas 1 a 4)
  if (isNota) {
    const nota = parseInt(userMessage);

    if (isNaN(nota) || nota < 1 || nota > 5 || userMessage.length > 1) {
      // Garante que é um único dígito de 1 a 5
      await safeSendMessage(
        msg,
        "🚫 Opção inválida. Por favor, responda **APENAS com o número da nota de 1 a 5**."
      );
      await safeSendMessage(
        msg,
        `*PERGUNTA ${indicePergunta + 1}/${perguntasPesquisa.length}:*\n\n` +
          perguntaRespondida
      );
      return;
    }
  }

  // Salva a Resposta
  estadoPesquisa[userId].respostas.push({
    pergunta: perguntaRespondida,
    resposta: userMessage,
    timestamp: new Date().toISOString(),
  });

  // Avança para a próxima pergunta
  await enviarProximaPergunta(msg, indicePergunta + 1);
}

// ------------------------------------------------------
// INICIALIZAÇÕES E EVENTOS
// ------------------------------------------------------

// 3. EVENTOS DE INICIALIZAÇÃO E CONEXÃO
client.on("qr", (qr) => {
  console.log("--- QR CODE PARA LOGIN ---");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Bot WhatsApp conectado e pronto!");
});

// 4. TRATAMENTO DO ERRO DE PROTOCOLO / DESCONEXÃO
client.on("disconnected", (reason) => {
  console.log("❌ O CLIENTE FOI DESCONECTADO:", reason);
  setTimeout(() => {
    console.log("🔁 Tentando reiniciar o cliente e carregar a sessão...");
    client.initialize();
  }, 5000);
});

// 6. LÓGICA PRINCIPAL DE MENSAGENS
client.on("message", async (msg) => {
  // --- Verificações Iniciais ---
  if (msg.isGroup) return;
  if (!msg.from.endsWith("@c.us")) return;

  const userId = msg.from;
  const userMessage = msg.body ? msg.body.toLowerCase().trim() : "";
  const userContext = getUserContext(userId);
  const currentContext = userContext.context;

  // OTIMIZAÇÃO CRÍTICA: Obtém o nome sem usar getContact() para evitar o ProtocolError
  const name = msg._data.notifyName || "Cliente";

  // ------------------------------------------------------
  // LÓGICA 1: COMANDO DE INÍCIO (Gatilho para o menu)
  // ------------------------------------------------------

  if (
    /oi|olá|ola|bom dia|boa tarde|boa noite|produtos|menu|começar|start/i.test(
      userMessage
    )
  ) {
    if (currentContext === CONTEXT_AGUARDANDO_RESPOSTA) {
      await safeSendMessage(
        msg,
        "Você já está no meio da pesquisa de satisfação. Por favor, responda a pergunta atual."
      );
      await safeSendMessage(
        msg,
        `*PERGUNTA ${estadoPesquisa[userId].indiceAtual + 1}/${
          perguntasPesquisa.length
        }:*\n\n` + perguntasPesquisa[estadoPesquisa[userId].indiceAtual]
      );
      return;
    }

    setUserContext(userId, CONTEXT_MENU_PRINCIPAL);

    await delay(1000);
    await msg.getChat().then((chat) => chat.sendStateTyping());
    await delay(2000);

    const menuMessage =
      `Olá ${name}! Seja bem-vindo(a) ao Garden Hotel e Resort! 🏪\n\n` +
      "Por favor, digite o número da opção desejada:\n\n" +
      "1 - Falar com um recepcionista.\n" +
      "2 - Pesquisa de satisfação.\n";

    await safeSendMessage(msg, menuMessage);
    return;
  }

  // ------------------------------------------------------
  // LÓGICA 2: PROCESSAMENTO DA ESCOLHA DO MENU (Baseado no contexto)
  // ------------------------------------------------------

  if (currentContext === CONTEXT_MENU_PRINCIPAL) {
    if (userMessage === "1") {
      await safeSendMessage(
        msg,
        `Aguarde um momento, ${name}. Sua solicitação foi transferida para um recepcionista. Em breve ele entrará em contato.`
      );
      setUserContext(userId, CONTEXT_TRANSFERINDO_HUMANO);
    } else if (userMessage === "2") {
      await iniciarPesquisa(msg, name);
    } else {
      await safeSendMessage(
        msg,
        "Opção inválida. Por favor, escolha **1** ou **2** para prosseguir."
      );
    }
    return;
  }

  // ------------------------------------------------------
  // LÓGICA 3: PROCESSAMENTO DA PESQUISA DE SATISFAÇÃO (AVANÇO)
  // ------------------------------------------------------

  if (currentContext === CONTEXT_AGUARDANDO_RESPOSTA) {
    await processarRespostaPesquisa(msg, msg.body.trim());
    return;
  }

  // ------------------------------------------------------
  // LÓGICA PADRÃO (Para qualquer mensagem não reconhecida)
  // ------------------------------------------------------

  if (currentContext === null) {
    await safeSendMessage(
      msg,
      "Desculpe, não entendi. Digite **menu** ou **oi** para ver as opções disponíveis."
    );
  }
});

// 7. INICIALIZAÇÃO
client.initialize();
