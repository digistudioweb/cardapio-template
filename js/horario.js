// Calcula se o restaurante está aberto agora.
//
// Dois cuidados:
// 1. O horário é sempre o do restaurante (fusoHorario no JSON), não o do celular.
//    Quem abre o cardápio em Foz (Brasil) vê o status certo de uma pizzaria em CDE.
// 2. Turnos que passam da meia-noite (17:30 às 01:30). Para não tratar isso como
//    caso especial, tudo vira "minutos desde domingo 00:00"; um turno de sábado
//    que termina 01:30 de domingo simplesmente passa do fim da semana.

const MINUTOS_DIA = 24 * 60;
const MINUTOS_SEMANA = 7 * MINUTOS_DIA;

const NOMES_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const NOMES_DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIA_POR_SIGLA = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function paraMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Dia da semana, hora e minuto "de agora" no fuso do restaurante.
function minutosDaSemanaAgora(fuso, agora) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(agora);
  const valor = (tipo) => partes.find((p) => p.type === tipo).value;
  return DIA_POR_SIGLA[valor('weekday')] * MINUTOS_DIA + Number(valor('hour')) * 60 + Number(valor('minute'));
}

function listarTurnos(horarios) {
  return horarios.flatMap(({ dias, abre, fecha }) =>
    dias.map((dia) => {
      const inicio = dia * MINUTOS_DIA + paraMinutos(abre);
      let fim = dia * MINUTOS_DIA + paraMinutos(fecha);
      if (fim <= inicio) fim += MINUTOS_DIA; // fecha no dia seguinte
      return { inicio, fim, abre, fecha };
    }),
  );
}

// Ferramenta de teste: ?teste=aberto ou ?teste=fechado na URL força o status,
// para dar para testar o pedido durante o dia. Está documentado no README.
function statusForcado() {
  const valor = new URLSearchParams(location.search).get('teste');
  return valor === 'aberto' || valor === 'fechado' ? valor : null;
}

/**
 * Retorna { aberto: true, fechaAs: '01:30' }
 *      ou { aberto: false, abreEm: 'hoje às 17:30' }.
 */
export function calcularStatus(restaurante, agora = new Date()) {
  const forcado = statusForcado();
  if (forcado === 'aberto') return { aberto: true, fechaAs: null, forcado: true };
  if (forcado === 'fechado') return { aberto: false, abreEm: null, forcado: true };

  const turnos = listarTurnos(restaurante.horarios ?? []);
  const minutoAgora = minutosDaSemanaAgora(restaurante.fusoHorario, agora);

  // Testa "agora" e "agora + 1 semana" para pegar o turno de sábado que invade o domingo.
  const turnoAtual = turnos.find(({ inicio, fim }) =>
    [minutoAgora, minutoAgora + MINUTOS_SEMANA].some((m) => m >= inicio && m < fim),
  );
  if (turnoAtual) return { aberto: true, fechaAs: turnoAtual.fecha };

  if (turnos.length === 0) return { aberto: false, abreEm: null };

  // Próxima abertura: o turno cujo início está mais perto, olhando para frente.
  const distancia = (t) => (t.inicio - minutoAgora + MINUTOS_SEMANA) % MINUTOS_SEMANA;
  const proximo = turnos.reduce((a, b) => (distancia(b) < distancia(a) ? b : a));
  const diasAte = Math.floor((distancia(proximo) + (minutoAgora % MINUTOS_DIA)) / MINUTOS_DIA);

  let quando;
  if (diasAte === 0) quando = 'hoje';
  else if (diasAte === 1) quando = 'amanhã';
  else quando = NOMES_DIAS[Math.floor(proximo.inicio / MINUTOS_DIA)];

  return { aberto: false, abreEm: `${quando} às ${proximo.abre}` };
}

// "Todos os dias · 17:30 às 01:30", "Ter a Dom · 18:00 às 23:00"…
export function resumirHorarios(horarios = []) {
  return horarios.map(({ dias, abre, fecha }) => `${resumirDias(dias)} · ${abre} às ${fecha}`);
}

function resumirDias(dias) {
  const ordenados = [...dias].sort((a, b) => a - b);
  if (ordenados.length === 7) return 'Todos os dias';

  // Dias seguidos "dando a volta" na semana (ex.: terça a domingo) viram um intervalo.
  // O começo é o dia cujo anterior não está na lista; o fim, o dia cujo seguinte não está.
  const tem = (d) => ordenados.includes((d + 7) % 7);
  const comecos = ordenados.filter((d) => !tem(d - 1));
  if (comecos.length === 1 && ordenados.length > 2) {
    const fim = ordenados.find((d) => !tem(d + 1));
    return `${NOMES_DIAS_CURTOS[comecos[0]]} a ${NOMES_DIAS_CURTOS[fim]}`;
  }
  return ordenados.map((d) => NOMES_DIAS_CURTOS[d]).join(', ');
}
