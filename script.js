
/* ========================= ELEMENTOS ========================= */
const numerosDiv = document.getElementById('numeros');
const valorInput = document.getElementById('valor');
const codigo = document.getElementById('codigo');
const horariosSelect = document.getElementById('horarios');
const totalPagarSpan = document.getElementById('totalPagar');
const totalReceberSpan = document.getElementById('totalReceber');
const menuEl = document.getElementById('menu');
const btnMenu = document.getElementById('btnMenu');
const salvarBtn = document.getElementById('salvar');
const nomeExibicao = document.getElementById('nomeExibicao');
const btnEditarNome = document.getElementById('btnEditarNome');
let ultimaDataComDados = null;
const modalNome = document.getElementById('modalNome');
const inputNome = document.getElementById('inputNome');
const btnContinuar = document.getElementById('btnContinuar');
// Elementos do modal de pacote
const modalPacote = document.getElementById('modalPacote');
const btnFecharModal = document.getElementById('btnFecharModal');
const btnMais10 = document.getElementById('btnMais10');
const btnMenos10 = document.getElementById('btnMenos10');
const valorPacoteSpan = document.getElementById('valorPacote');
let jogoEncerrado = false;
let selecionados = [];
let bloqueados = new Set();

/* ========================= CALCULAR INÍCIO E FIM DA SEMANA ATUAL ========================= */
function getInicioDaSemana() {
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const diasParaInicio = diaSemana === 0 ? -6 : 1 - diaSemana; // Semana começa na Segunda
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() + diasParaInicio);
  return inicio.toISOString().slice(0, 10); // Formato: YYYY-MM-DD
}

function getFimDaSemana() {
  const inicio = new Date(getInicioDaSemana());
  inicio.setDate(inicio.getDate() + 6); // Semana termina na Sábado
  return inicio.toISOString().slice(0, 10);
}

/* ========================= REGRAS DE DIA/HORA ========================= */
function podeMarcarAgora() {
  const agora = new Date();
  const dia = agora.getDay(); // 0=dom, 3=qua, 6=sab
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  if (dia === 6) {
    return minutosAgora < (20 * 60); // quarta e sábado até 20:00
  }

  return true; // domingo, segunda, terça, quarta (antes de 20h) e quinta liberados 24h
}


/* ========================= MODAL NOME ========================= */
function abrirModalNome() {
  modalNome.classList.add('show');
  inputNome.value = localStorage.getItem('nomeJogador') || '';
  setTimeout(() => inputNome.focus(), 100);
}
function fecharModalNome() { modalNome.classList.remove('show'); }
function exibirNome() {
  const n = localStorage.getItem('nomeJogador');
  nomeExibicao.textContent = n ? n : 'Bem-vindo';
}
function garantirNome() {
  const nome = localStorage.getItem('nomeJogador');
  if (!nome) abrirModalNome(); else exibirNome();
}
btnContinuar.onclick = () => {
  const v = inputNome.value.trim();
  if (!v) return alert('Digite um nome válido');
  localStorage.setItem('nomeJogador', v);
  fecharModalNome();
  exibirNome();
};
btnEditarNome.onclick = abrirModalNome;

/* ========================= SELEÇÃO ========================= */
function toggleNumero(btn, num) {
  if (btn.classList.contains('bloqueado')) return;
  if (btn.classList.contains('extra')) return; // 🔒 BLOQUEIA EXTRA
  if (!podeMarcarAgora()) return alert('Marcações encerradas por hoje');

  if (btn.classList.contains('marcado')) {
    btn.classList.remove('marcado');
    selecionados = selecionados.filter(n => n !== num);
  } else {
    btn.classList.add('marcado');
    selecionados.push(num);
  }

  atualizarTotais();
}

/* ========================= TOTAIS ========================= */
function atualizarTotais() {
  const v = 1.50;
  const qtd = selecionados.length;
  totalPagarSpan.textContent = (v * qtd).toFixed(2).replace('.', ',');
  totalReceberSpan.textContent = (v * 1000).toFixed(2).replace('.', ',');
}

/* ========================= BLOQUEADOS ========================= */
function atualizarBloqueados() {
  db.ref('numerosBloqueados').once('value').then(snap => {
    const dados = snap.val() || {};
    bloqueados = new Set(Object.keys(dados));

    document.querySelectorAll('.numero').forEach(btn => {
      const n = btn.textContent;
      const info = dados[n];

      btn.classList.remove('extra');

      if (info) {
        btn.classList.add('bloqueado');
        btn.disabled = true;

        if (info.extra) {
          btn.classList.add('extra'); // 🎁
        }

        btn.classList.remove('marcado');
        selecionados = selecionados.filter(x => x !== n);
      } else {
        btn.classList.remove('bloqueado');
        btn.disabled = false;
      }
    });

    atualizarTotais();
  });
}

/* ========================= TEXTAREA (NUNCA LIMPA AUTOMÁTICO) ========================= */
function gerarDezenasExtras(qtd, jaSelecionados, jaBloqueados) {
  const extrasQtd = Math.floor(qtd / 20);
  if (extrasQtd === 0) return [];

  let extras = [];
  let tentativas = 0;

  while (extras.length < extrasQtd && tentativas < 999) {
    const n = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');

    if (
      !jaSelecionados.includes(n) &&
      !jaBloqueados.has(n) &&
      !extras.includes(n)
    ) {
      extras.push(n);
    }
    tentativas++;
  }

  return extras;
}
// -------------------------- FUNÇÃO DE CÁLCULO DE DESCONTO COMPARTILHADA (MANTER EM CIMA DO CÓDIGO) --------------------------
const VALOR_UNITARIO = 1.50;
const VALOR_PACOTE_10 = 13.50; // 10% de desconto

function calcularValorTotal(qtdNumeros) {
  if (qtdNumeros <= 0) return 0.00;
  const totalPacotes = Math.floor(qtdNumeros / 10);
  const totalIndividuais = qtdNumeros % 10;
  return (totalPacotes * VALOR_PACOTE_10) + (totalIndividuais * VALOR_UNITARIO);
}

// -------------------------- ALTERAÇÕES NA FUNÇÃO QUE GERA O TEXTO DO TEXTAREA (textoNumerosBloqueados) --------------------------
function textoNumerosBloqueados(callback) {
  db.ref('numerosBloqueados').once('value').then(snap => {
    const dados = snap.val() || {};
    const porNome = {};

    // Agrupa por nome e conta quantidade total de números por pessoa
    Object.keys(dados).forEach(num => {
      const item = dados[num];
      const nome = item.nome?.trim();
      if (!nome) return;

      const status = item.status || '⏳ AGUARDANDO';

      if (!porNome[nome]) {
        porNome[nome] = {
          status,
          numeros: []
        };
      }

      porNome[nome].numeros.push(num);
    });

    let texto = '';

    Object.keys(porNome).forEach(nome => {
      const dadosNome = porNome[nome];
      const numeros = dadosNome.numeros.sort().join('-');
      const qtdTotal = dadosNome.numeros.length; // Quantidade total de números da pessoa
      const valorTotal = calcularValorTotal(qtdTotal); // Usa a função de desconto

      let classeStatus =
        dadosNome.status.includes('PAGO') ? 'verde' :
        dadosNome.status.includes('CANCEL') ? 'vermelho' :
        'amarelo';

      texto += `Nome:<span class="verde"> ${nome}</span>\n`;
      texto += `Números: ${numeros}\n`;
      texto += `Quantidade total: ${qtdTotal}\n`;
      texto += `Valor total: R$ ${valorTotal.toFixed(2).replace('.', ',')}\n`; // Valor com desconto
      texto += `Status :<span class="${classeStatus}">${dadosNome.status}</span>\n`;
      texto += '-----------------------------\n';
    });

    callback(texto);
  });
}

// -------------------------- ALTERAÇÕES NA FUNÇÃO QUE ATUALIZA O TEXTAREA COM RESERVAS DA SEMANA --------------------------
function atualizarTextareaReservasSemana(todasReservas) {
  textoNumerosBloqueados(textoBloq => {
    let html = textoBloq.replace(/\n/g, '<br>');
    html += cabecalhoDataJogo().replace(/\n/g, '<br>');
    const hoje = new Date();
    const diaAtual = hoje.getDay();
    const inicioSemana = getInicioDaSemana();
    const fimSemana = getFimDaSemana();

    // Define qual parte exibir (mesma lógica antiga)
    let tituloParte, diasParte, descricaoParte;
    if (diaAtual === 0 || (diaAtual >= 1 && diaAtual <= 4)) {
      descricaoParte = `Segunda (${inicioSemana.split('-').reverse().join('/')}) a Quarta`;
      diasParte = dia => dia >= 1 && dia <= 3;
    } else if (diaAtual >= 5 && diaAtual <= 6) {
      descricaoParte = `Quinta a Sábado (${fimSemana.split('-').reverse().join('/')})`;
      diasParte = dia => dia >= 4 && dia <= 6;
    }
  
    html += '------------------------------<br>';

    if (!todasReservas || Object.keys(todasReservas).length === 0) {
      html += 'Nenhuma reserva nessa etapa.<br><br>';
      codigo.innerHTML = html;
      return;
    }

    const diasOrdenados = Object.keys(todasReservas).sort();

    diasOrdenados.forEach(dataStr => {
      const dadosDia = todasReservas[dataStr];
      const dataBR = dataStr.split('-').reverse().join('/');
      const diaSemana = new Date(dataStr).toLocaleDateString('pt-BR', { weekday: 'long' });

      const horariosOrdenados = Object.keys(dadosDia).sort();
      horariosOrdenados.forEach(horario => {
        html += `<br><strong>[ HORÁRIO ] => ${horario}</strong><br>`;

        for (const k in dadosDia[horario]) {
          const d = dadosDia[horario][k];
          const countdownId = `countdown-${dataStr}-${horario}-${k}`.replace(/[^a-zA-Z0-9-_]/g, '');
          const qtdTotal = d.numeros.length; // Quantidade total de números da reserva
          const valorTotal = calcularValorTotal(qtdTotal); // Usa a função de desconto

          let status = d.status || 'AGUARDANDO';
          if (status.toUpperCase().includes('PAGO')) status = '✅ PAGO';

          const resultado = d.resultado || 'AGUARDANDO';

          const corStatus = status.includes('VALIDADO') || status.includes('PAGO') ? 'verde' : status.includes('CANCELADO') ? 'vermelho' : 'amarelo';
          const corResultado = resultado.includes('GANHOU') ? 'verde' : resultado.includes('PERDEU') ? 'vermelho' : 'amarelo';

          let extrasTxt = d.dezenasExtras && d.dezenasExtras.length ? `<br></br><strong>🎁 CENTENA extra:</strong> ${d.dezenasExtras.join('-')}` : '';

          html += `</br>Nome: <span class="verde">${d.nome}</span><br>
Quantidade: ${qtdTotal}</br>
Centenas Escolhidas : ${d.numeros.join('-')} ${extrasTxt}<br>
Valor a pagar: R$ ${valorTotal.toFixed(2).replace('.', ',')}<br> <!-- Valor com desconto -->
Status: <span class="${corStatus}">${status}</span>
Resultado: <span class="${corResultado}">${resultado}</span><br>
<div id="${countdownId}" class="amarelo"></div><br>
---------------------------<br>
`;

          setTimeout(() => {
            const el = document.getElementById(countdownId);
            if (el) gerarCountdown(countdownId, d.dataHora, d.status);
          }, 50);
        }
      });
    });

    codigo.innerHTML = html;
  });
}

/* ========================= CARREGAR APENAS RESERVAS DA PARTE RELEVANTE DA SEMANA + APENAS DIAS COM RESERVAS ========================= */
function carregarReservasDaSemana() {
  const inicioSemana = getInicioDaSemana();
  const fimSemana = getFimDaSemana();
  const todasReservas = {};
  const hoje = new Date();
  const diaAtual = hoje.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  const dataAtualHoje = hoje.toISOString().slice(0, 10); // Data de hoje no formato AAAA-MM-DD

  // Define quais dias CARREGAR com base no dia atual (inclusive se hoje for Quarta)
  let diasParaCarregar = [];
  const dataPercorrer = new Date(inicioSemana);

  while (dataPercorrer.toISOString().slice(0, 10) <= fimSemana) {
    const dataStr = dataPercorrer.toISOString().slice(0, 10);
    const diaDaSemana = new Date(dataStr).getDay();

    // Regra ajustada:
    // - Até Quarta-feira (inclusive): carrega Dom, Seg, Ter, Qua
    // - A partir de Quinta-feira: carrega Qui, Sex, Sab
    const ehAntesOuQuarta = new Date(dataStr) <= new Date(dataAtualHoje) || diaDaSemana ===6 ;
    if (ehAntesOuQuarta) {
      if (diaDaSemana === 0 || diaDaSemana >= 1 && diaDaSemana <= 6) {
        diasParaCarregar.push(dataStr);
      }
    } else {
      if (diaDaSemana >= 0 && diaDaSemana <= 6) {
        diasParaCarregar.push(dataStr);
      }
    }

    dataPercorrer.setDate(dataPercorrer.getDate() + 1);
  }

  // Carrega apenas os dias selecionados E só mantém aqueles que tem reservas
  let diasCarregados = 0;
  diasParaCarregar.forEach(dataStr => {
    db.ref(`compras-dia/${dataStr}`).once('value').then(snap => {
      const dadosDia = snap.val();
      // Só adiciona o dia se houver pelo menos uma reserva nele
      if (dadosDia && Object.keys(dadosDia).length > 0) {
        todasReservas[dataStr] = dadosDia;
      }
      diasCarregados++;

      // Quando terminar de carregar, exibe os dias com reservas
      if (diasCarregados === diasParaCarregar.length) {
        atualizarTextareaReservasSemana(todasReservas);
      }
    });
  });
}

salvarBtn.onclick = () => {
  if (selecionados.length === 0) return alert('Selecione números');
  if (!podeMarcarAgora()) return alert('Prazo encerrado');

  const nome = localStorage.getItem('nomeJogador') || 'Sem nome';
  const horario = horariosSelect.value;
  const dataHoje = new Date().toISOString().slice(0,10);
  const chave = 'ID-' + Date.now();

  // 🎁 GERA DEZENAS EXTRAS
  const dezenasExtras = gerarDezenasExtras(
    selecionados.length,
    selecionados,
    bloqueados
  );

  // 🔢 TODOS OS NÚMEROS QUE SERÃO BLOQUEADOS
  const todosNumeros = [...selecionados, ...dezenasExtras];

  const dados = {
    nome,
    numeros: [...selecionados],
    dezenasExtras,
    horario,
    status: '⏳ AGUARDANDO',
    resultado: '⏳ AGUARDANDO',
    dataHora: new Date().toISOString()
  };

  db.ref(`compras-dia/${dataHoje}/${horario}/${chave}`).set(dados)
    .then(() => {
      // 🔒 BLOQUEIA PAGOS + EXTRAS
      const updates = {};
      todosNumeros.forEach(n => {
        updates['numerosBloqueados/' + n] = {
          bloqueadoEm: Date.now(),
          extra: dezenasExtras.includes(n)
        };
      });
      return db.ref().update(updates);
    })
.then(() => {
  abrirModalPix();

  selecionados = [];
  document.querySelectorAll('.numero').forEach(b => b.classList.remove('marcado'));

  atualizarTotais();
  atualizarBloqueados();

  // ⚠️ LOGICA ANTIGA DE ABRIR MENU APOS SALVAR FOI REMOVIDA AQUI
});   
};

function proximaDataDeJogo() {
  const hoje = new Date();
  const d = hoje.getDay();
  let alvo = d <= 6 ? 6 : 6;
  let add = alvo - d;
  if (add < 0) add += 7;
  const data = new Date(hoje);
  data.setDate(hoje.getDate() + add);
  return data;
}
function cabecalhoDataJogo() {
  const d = proximaDataDeJogo();
  return `📅 DATA DO JOGO: ${d.toLocaleDateString('pt-BR')}\n==========================\n\n`;
}
        
        
function abrirModalPix() {
 document.getElementById('valorPix').textContent = totalPagarSpan.textContent;

 document.getElementById("modalPix").style.display = "flex";
  document.getElementById("pixMsg").style.display = "none";
}

function fecharModalPix() {
  document.getElementById("modalPix").style.display = "none";
}

function copiarPix() {
  const chave = document.getElementById("pixChave").innerText;
  navigator.clipboard.writeText(chave).then(() => {
    document.getElementById("pixMsg").style.display = "block";

    // ✅ NOVO: ABRE O MENU AO COPIAR O PIX
    if (!menuEl.classList.contains('open')) {
      btnMenu.click(); // Simula clique no botão "VER" para abrir
    } else {
      carregarReservasDaSemana(); // Atualiza se já estiver aberto
    }

    // Fecha o modal após 2,5 segundos
    setTimeout(() => {
      fecharModalPix();
    }, 3500);
  });
}

/* ========================= CORREÇÃO DA DATA DO JOGO ========================= */
function formatarDataBR(data) {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function atualizarDataJogo() {
  const dataJogo = proximaDataDeJogo();
  const diaSemana = dataJogo.toLocaleDateString('pt-BR', { weekday: 'long' });
  const el = document.getElementById("dataJogo");
  
  el.innerHTML = `📅 Próximo jogo: <strong>${diaSemana}</strong> - ${formatarDataBR(dataJogo)}`;
}
function salvarHistoricoAutomatico() {
  const agora = new Date();

  const dataStr = agora.toLocaleDateString('pt-BR');
  const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const dias = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const diaSemana = dias[agora.getDay()];

  const id = agora.toISOString().slice(0,10) + '_' + horaStr.replace(':','-');

  const texto = codigo.innerText.trim();

  if (!texto) return; // não salva vazio

  db.ref('historico/' + id).set({
    data: dataStr,
    dia: diaSemana,
    hora: horaStr,
    conteudo: texto,
    timestamp: Date.now()
  });

  console.log('📦 Histórico salvo:', id);
}
function podeAbrirPixAdmin() {
  const agora = new Date();
  const dia = agora.getDay(); // 3 = quarta | 6 = sábado
  const minutos = agora.getHours() * 60 + agora.getMinutes();

  // somente quarta e sábado
  if (dia !== 6 && dia !== 6) return false;

  const inicio = 20 * 60;      // 20:00
  const fim = 23 * 60 + 59;    // 23:59

  return minutos >= inicio && minutos <= fim;
}
const btnPixAdmin = document.getElementById('btnPixAdmin');
const modalPixAdmin = document.getElementById('modalPixAdmin');
const inputPixAdmin = document.getElementById('inputPixAdmin');

btnPixAdmin.onclick = () => {
  if (!podeAbrirPixAdmin()) {
    alert('🔒 PIX do Ganhador Será Liberado às 20:00 e Sabado');
    return;
  }
  inputPixAdmin.value = '';
  modalPixAdmin.style.display = 'flex';
};

function salvarPixAdmin() {
  const pix = inputPixAdmin.value.trim();
  if (!pix) {
    alert('Digite um PIX válido');
    return;
  }

  db.ref('admin/config/pix').set({
    chave: pix,
    atualizadoEm: Date.now()
  }).then(() => {
    alert('✅ PIX salvo (AGUARDE ATE 60 MINUTOS PARA RECEBER O VALOR )');
    fecharPixAdmin();
  });
}


function gerarCountdown(idElemento, dataHoraCompra, status) {
  const el = document.getElementById(idElemento);
  if (!el) return;

  // ✅ SE JÁ ESTÁ PAGO
  if (status && status.toUpperCase().includes('PAGO')) {
    el.innerHTML =
      '<span class="verde">✅ PIX VALIDADO</span>';
    return;
  }

  const inicio = Date.parse(dataHoraCompra);

  if (isNaN(inicio)) {
    el.innerHTML =
      '<span class="amarelo">⏳ Aguardando pagamento</span>';
    return;
  }

  const fim = inicio + (1 * 30 * 60 * 1000);
  let timer = null;

  function atualizar() {
    // 🛑 SE MUDOU PARA PAGO DURANTE O TEMPO
    if (status && status.toUpperCase().includes('PAGO')) {
      el.innerHTML =
        '<span class="verde">✅ PIX VALIDANDO...</span>';
      clearInterval(timer);
      return;
    }

    const restante = fim - Date.now();

    if (restante <= 0) {
      el.innerHTML =
        '<span class="vermelho">⏰ pagamento nao indetificado</span>';
      clearInterval(timer);
      return;
    }

    const h = Math.floor(restante / 3600000);
    const m = Math.floor((restante % 3600000) / 60000);
    const s = Math.floor((restante % 60000) / 1000);

    // 🟥 SÓ O CRONÔMETRO FICA VERMELHO
    el.innerHTML =
      `⏳ Faca o PIX Para Validar Sua Reserva. Suas Dezenas Sera LIBERADA apos Esse Prazo <span class="vermelho">${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}</span>`;
  }

  atualizar();
  timer = setInterval(atualizar, 1000);
}

function podeVirarPerdeuAutomatico() {
  const agora = new Date();
  const dia = agora.getDay(); // 0=Dom, 3=Qua, 6=Sáb
  const h = agora.getHours();
  const m = agora.getMinutes();

  // somente quarta (3) e sábado (6)
  if (dia !== 6) return false;

  // após 20:30
  return h > 20 || (h === 20 && m >= 30);
}
function atualizarResultadosAutomaticamente() {
  if (!podeVirarPerdeuAutomatico()) return;

  const hoje = new Date().toISOString().slice(0,10);

  db.ref(`compras-dia/${hoje}`).once('value').then(snap => {
    const dados = snap.val();
    if (!dados) return;

    const updates = {};

    Object.keys(dados).forEach(horario => {
      Object.keys(dados[horario]).forEach(id => {
        const item = dados[horario][id];

        if (
          item.resultado &&
          item.resultado.includes('AGUARDANDO')
        ) {
          updates[
            `compras-dia/${hoje}/${horario}/${id}/resultado`
          ] = '❌ PERDEU';
        }
      });
    });

    if (Object.keys(updates).length > 0) {
      db.ref().update(updates).then(() => {
        console.log('⏰ Resultados mudaram para PERDEU (Qua/Sáb 20:30)');
carregarReservasDaSemana(); // ✅ AGORA CARREGA A SEMANA

      });
    }
  });
}
function fecharPixAdmin() {
  document.getElementById('modalPixAdmin').style.display = 'none';
}
/* ========================= DEZENA PREMIADA PÚBLICA ========================= */
const dezenaAtualPublica = document.getElementById('dezenaAtual');

// Oculta o elemento POR PADRÃO (antes de carregar dados)
dezenaAtualPublica.style.display = 'none';

// Função para atualizar a dezena premiada exibida e destacar na grade
function atualizarDezenaPremiadaPublica() {
  db.ref('admin/config/dezenaPremiada').once('value').then(snap => {
    const dezena = snap.val();
    
    // Verifica se há dezena definida (ou seja, se houve alteração no painel)
    if (dezena) {
      const dezenaFormatada = dezena.padStart(2, '0');
      // Mostra o elemento e define o texto com a dezena
      dezenaAtualPublica.style.display = 'block';
      dezenaAtualPublica.textContent = `🏆 Dezena premiada: ${dezenaFormatada}`;
      
      // Destaca a dezena na grade de números
      document.querySelectorAll('.numero').forEach(btn => {
        if (btn.textContent === dezenaFormatada) {
          btn.style.background = 'linear-gradient(135deg, #8098ff, #6f86e6)';
          btn.style.boxShadow = '0 0 15px rgba(128, 152, 255, 0.8)';
          btn.style.border = '2px solid #fff';
        } else {
          // Volta o estilo original para os outros números (exceto bloqueados/extras)
          if (!btn.classList.contains('bloqueado') && !btn.classList.contains('extra')) {
            btn.style.background = '#3498db';
            btn.style.boxShadow = 'none';
            btn.style.border = 'none';
          }
        }
      });
    } else {
      // Se não há dezena, oculta o elemento (não mostra "Aguardando")
      dezenaAtualPublica.style.display = 'none';
      
      // Remove destaque de todos os números
      document.querySelectorAll('.numero').forEach(btn => {
        if (!btn.classList.contains('bloqueado') && !btn.classList.contains('extra')) {
          btn.style.background = '#3498db';
          btn.style.boxShadow = 'none';
          btn.style.border = 'none';
        }
      });
    }
  }).catch(err => {
    console.error('Erro ao carregar dezena premiada:', err);
    // Oculta o elemento também em caso de erro (para não mostrar mensagem desnecessária)
    dezenaAtualPublica.style.display = 'none';
  });
}

// Atualiza a dezena quando a página carrega (mas fica oculta se não houver dezena)
atualizarDezenaPremiadaPublica();

// Atualiza automaticamente QUANDO O PAINEL ADMIN ALTERAR a dezena no Firebase
db.ref('admin/config/dezenaPremiada').on('value', () => {
  atualizarDezenaPremiadaPublica();
});
// Fecha o menu ao clicar fora dele
document.addEventListener('click', (e) => {
  // Verifica se o menu está aberto E se o clique não foi no botão ou no próprio menu
  if (
    menuEl.classList.contains('open') &&
    !btnMenu.contains(e.target) &&
    !menuEl.contains(e.target)
  ) {
    menuEl.classList.remove('open');
    menuEl.setAttribute('aria-hidden', 'true');
    // Limpa temporizador se fechar ao clicar fora
    if (temporizadorMenu) clearTimeout(temporizadorMenu);
  }
});


/* ========================= INIT ATUALIZADO ========================= */
garantirNome();
exibirNome();
carregarReservasDaSemana(); // AGORA CARREGA TODA A SEMANA
atualizarResultadosAutomaticamente();
atualizarBloqueados();
atualizarDataJogo(); // Mostra a data do próximo jogo

// Atualizar o menu quando abrir (agora com reservas da semana)
// Variável para controlar o temporizador (evitar múltiplos temporizadores ao abrir/fechar rápido)
let temporizadorMenu;

// Abre/fecha o menu com o botão + temporizador de 30 segundos
btnMenu.onclick = () => {
  menuEl.classList.toggle('open');
  menuEl.setAttribute('aria-hidden', !menuEl.classList.contains('open')); // Acessibilidade

  if (menuEl.classList.contains('open')) {
    carregarReservasDaSemana(); // Carrega reservas ao abrir

    // Limpa temporizador antigo (se houver)
    if (temporizadorMenu) clearTimeout(temporizadorMenu);

    // Fecha o menu após 30 segundos (30.000 milissegundos)
    temporizadorMenu = setTimeout(() => {
      if (menuEl.classList.contains('open')) {
        menuEl.classList.remove('open');
        menuEl.setAttribute('aria-hidden', 'true');
      }
    }, 20000);
  } else {
    // Limpa temporizador se fechar manualmente antes dos 30 segundos
    if (temporizadorMenu) clearTimeout(temporizadorMenu);
  }
};
// Contador de números marcados para exibir o modal a cada 3
let contadorMarcacoes = 0;
// Valores base



// FUNÇÃO CORRIGIDA: Calcula valor total com desconto para pacotes de 10
function calcularValorTotal(qtdNumeros) {
  if (qtdNumeros <= 0) return 0.00;
  
  // Total de pacotes de 10 e números individuais restantes
  const totalPacotes = Math.floor(qtdNumeros / 10);
  const totalIndividuais = qtdNumeros % 10;
  
  // Valor total = (pacotes * R$9) + (individuais * R$1)
  return (totalPacotes * VALOR_PACOTE_10) + (totalIndividuais * VALOR_UNITARIO);
}

// Atualiza o valor exibido no modal
function atualizarValorModal() {
  const qtdAtual = selecionados.length;
  const valorTotal = calcularValorTotal(qtdAtual);
  valorPacoteSpan.textContent = valorTotal.toFixed(2).replace('.', ',');
}

// Atualiza os totais gerais (da página) com o desconto correto
function atualizarTotais() {
  const qtdAtual = selecionados.length;
  const valorTotal = calcularValorTotal(qtdAtual);
  
  // Atualiza os spans da página (ajusta os IDs se forem diferentes na sua base)
  document.getElementById('totalPagar').textContent = valorTotal.toFixed(2).replace('.', ',');
  document.getElementById('totalReceber').textContent = (VALOR_UNITARIO * 666.6666666667).toFixed(2).replace('.', ',');
}

// Abre o modal (chamado a cada 3 números marcados)
function abrirModalPacote() {
  atualizarValorModal();
  modalPacote.classList.add('show');
}

// Fecha o modal (só no X)
function fecharModalPacote() {
  modalPacote.classList.remove('show');
}

// Seleciona 10 números disponíveis aleatórios (com desconto garantido)
function adicionar10Numeros() {
  let numerosAdicionados = 0;
  const todosNumeros = Array.from({length: 1000}, (_, i) => i.toString().padStart(3, '0'));

  while (numerosAdicionados < 10 && todosNumeros.length > 0) {
    const indiceAleatorio = Math.floor(Math.random() * todosNumeros.length);
    const num = todosNumeros[indiceAleatorio];
    const btn = document.querySelector(`.numero[data-num="${num}"]`);

    if (btn && !btn.classList.contains('bloqueado') && !btn.classList.contains('marcado')) {
      btn.classList.add('marcado');
      selecionados.push(num);
      numerosAdicionados++;
    }

    todosNumeros.splice(indiceAleatorio, 1);
  }

  atualizarTotais();
  atualizarValorModal(); // Atualiza valor no modal (não fecha)
}

// Desmarca os últimos 10 números selecionados
function remover10Numeros() {
  const qtdARemover = Math.min(10, selecionados.length);
  const ultimos10 = selecionados.splice(-qtdARemover);

  ultimos10.forEach(num => {
    const btn = document.querySelector(`.numero[data-num="${num}"]`);
    if (btn) btn.classList.remove('marcado');
  });

  atualizarTotais();
  atualizarValorModal(); // Atualiza valor no modal (não fecha)
}

// Atualiza o contador de marcacoes e abre o modal a cada 5
function atualizarContadorMarcacoes() {
  contadorMarcacoes++;
  if (contadorMarcacoes % 5 === 0) {
    abrirModalPacote();
  }
}

// Função de marcação manual com atualização de desconto
function toggleNumero(btn, num) {
  if (btn.classList.contains('bloqueado') || btn.classList.contains('extra') || !podeMarcarAgora()) {
    return;
  }

  if (btn.classList.contains('marcado')) {
    btn.classList.remove('marcado');
    selecionados = selecionados.filter(n => n !== num);
    contadorMarcacoes--;
  } else {
    btn.classList.add('marcado');
    selecionados.push(num);
    atualizarContadorMarcacoes();
  }

  atualizarTotais();
  if (modalPacote.classList.contains('show')) {
    atualizarValorModal();
  }
}

// Adiciona data-num aos botões de número (ao criar eles)
for (let i = 0; i < 1000; i++) {
  let num = i.toString().padStart(3, '0');
  let btn = document.createElement('button');
  btn.textContent = num;
  btn.className = 'numero';
  btn.setAttribute('data-num', num);
  btn.addEventListener('click', () => toggleNumero(btn, num));
  document.getElementById('numeros').appendChild(btn);
}

// Eventos do modal
btnFecharModal.addEventListener('click', fecharModalPacote);
btnMais10.addEventListener('click', adicionar10Numeros);
btnMenos10.addEventListener('click', remover10Numeros);

// Desativa fechamento ao clicar fora
