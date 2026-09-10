// =====================================================
// dashboard.js - Dashboard com gráficos e estatísticas
// =====================================================

// ================= VARIÁVEIS GLOBAIS =================
let lancamentos = [];
let escalas = [];
let motoristas = [];
let veiculos = [];
let charts = {};
let chartInitialized = false;
let mesesDisponiveis = [];

// ================= FUNÇÕES DE UTILIDADE =================

function formatarMoeda(valor) {
    return valor ? `R$ ${Number(valor).toFixed(2).replace('.', ',')}` : 'R$ 0,00';
}

/**
 * 🔧 Formata data SEM sofrer com fuso horário.
 * Trata "YYYY-MM-DD" como data local, não UTC.
 */
function formatarData(data) {
    if (!data) return '-';
    const partes = data.split('-');
    if (partes.length === 3) {
        const d = new Date(partes[0], partes[1] - 1, partes[2]);
        return d.toLocaleDateString('pt-BR');
    }
    return new Date(data).toLocaleDateString('pt-BR');
}

/**
 * 🔧 REGRA DE NEGÓCIO PADRONIZADA (igual à planilha PDF e ao controle_agregados.html):
 * 
 * Total a Pagar = Diárias + Pedágios + Almoço − Chapa − Descontos
 * 
 * A chapa é o valor pago ao FUNCIONÁRIO que dirigiu veículo de agregado.
 * Esse valor é DESCONTADO do que o proprietário (agregado) recebe.
 */
function calcularTotal(item) {
    return (Number(item.valor_diaria) || 0) + 
           (Number(item.pedagio) || 0) + 
           (Number(item.almoco) || 0) - 
           (Number(item.chapa) || 0) - 
           (Number(item.desconto) || 0);
}

function mostrarToast(mensagem, tipo = 'success') {
    const cores = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 ${cores[tipo] || 'bg-blue-500'} text-white px-6 py-3 rounded-xl shadow-lg font-medium animate-slide-in z-50 max-w-md`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

/**
 * 🔧 Calcula o dia da semana sem depender de fuso horário
 */
function getDiaSemanaPorData(dataISO) {
    if (!dataISO) return '';
    const partes = dataISO.split('-');
    if (partes.length !== 3) return '';
    
    const d = new Date(partes[0], partes[1] - 1, partes[2]);
    const dias = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
    return dias[d.getDay()];
}

/**
 * 🔧 Verifica se um lançamento pertence ao "mundo dos agregados".
 * Regra alinhada com controle_agregados.html:
 *   - Se tem proprietario_id → é agregado (mesmo que o motorista seja funcionário)
 *   - Caso contrário → checa se o motorista é do tipo 'agregado'
 */
function isLancamentoAgregado(lancamento) {
    if (lancamento.proprietario_id) return true;
    const motorista = motoristas.find(m => m.id === lancamento.motorista_id);
    return motorista?.tipo === 'agregado';
}

/**
 * 🔧 Retorna o nome do "responsável financeiro" pelo lançamento.
 * Se tem proprietário → nome do proprietário (quem recebe).
 * Senão → nome do motorista.
 */
function getNomeResponsavel(lancamento) {
    if (lancamento.proprietario_id) {
        const proprietario = motoristas.find(m => m.id === lancamento.proprietario_id);
        if (proprietario) return proprietario.nome;
    }
    return lancamento.motorista_nome || 'N/A';
}

// ===== CARREGAR DADOS =====
async function carregarDados() {
    try {
        // Carregar motoristas
        const { data: motoristasData } = await supabaseClient
            .from('motoristas')
            .select('*')
            .eq('ativo', true);
        motoristas = motoristasData || [];

        // Carregar veículos
        const { data: veiculosData } = await supabaseClient
            .from('veiculos')
            .select('*');
        veiculos = veiculosData || [];

        // Carregar lançamentos
        const { data: lancamentosData } = await supabaseClient
            .from('view_lancamentos_completos')
            .select('*')
            .order('data', { ascending: false });
        lancamentos = lancamentosData || [];

        // Carregar escalas
        const { data: escalasData } = await supabaseClient
            .from('view_escalas_completas')
            .select('*')
            .order('data', { ascending: false });
        escalas = escalasData || [];

        // Preencher select de meses
        preencherSelectMeses();

        atualizarStats();
        atualizarStatsComFiltro();
        atualizarResumoSemana();
        setTimeout(() => {
            atualizarGraficos();
            atualizarGraficoAgregados();
            atualizarGraficoPeso();
        }, 300);

        // 🔍 DEBUG TEMPORÁRIO - CARLOS ALBERTO 01/09 a 10/09/2026
        setTimeout(debugCarlosAlberto, 500);

        mostrarToast('Dados carregados com sucesso!');
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        mostrarToast('Erro ao carregar dados', 'error');
    }
}

function preencherSelectMeses() {
    const selectAgregado = document.getElementById('filtroMesAgregado');
    const selectPeso = document.getElementById('filtroMesPeso');
    const mesesSet = new Set();

    lancamentos.forEach(l => {
        if (l.data) {
            mesesSet.add(l.data.substring(0, 7)); // YYYY-MM
        }
    });
    
    escalas.forEach(e => {
        if (e.data) {
            mesesSet.add(e.data.substring(0, 7));
        }
    });

    mesesDisponiveis = Array.from(mesesSet).sort().reverse();

    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const optionsHTML = '<option value="">Todos os meses</option>';
    let optionsAgregado = optionsHTML;
    let optionsPeso = optionsHTML;

    mesesDisponiveis.forEach(mes => {
        const [ano, mesNum] = mes.split('-');
        const label = `${nomesMeses[parseInt(mesNum) - 1]} de ${ano}`;
        optionsAgregado += `<option value="${mes}">${label}</option>`;
        optionsPeso += `<option value="${mes}">${label}</option>`;
    });

    selectAgregado.innerHTML = optionsAgregado;
    selectPeso.innerHTML = optionsPeso;
}

// ================= ESTATÍSTICAS =================

/**
 * 🔧 Soma os totais financeiros aplicando a regra correta.
 * Reutilizada por atualizarStats e atualizarStatsComFiltro.
 */
function calcularTotaisFinanceiros(listaLancamentos) {
    const agregados = listaLancamentos.filter(isLancamentoAgregado);

    const totalDiarias = agregados.reduce((s, l) => s + (Number(l.valor_diaria) || 0), 0);
    const totalPedagios = agregados.reduce((s, l) => s + (Number(l.pedagio) || 0), 0);
    const totalAlmoco = agregados.reduce((s, l) => s + (Number(l.almoco) || 0), 0);
    const totalChapa = agregados.reduce((s, l) => s + (Number(l.chapa) || 0), 0);
    const totalDescontos = agregados.reduce((s, l) => s + (Number(l.desconto) || 0), 0);

    // 🔧 FÓRMULA CORRETA: chapa SUBTRAI
    const totalLiquido = totalDiarias + totalPedagios + totalAlmoco - totalChapa - totalDescontos;

    return { totalDiarias, totalDescontos, totalLiquido };
}

function atualizarStats() {
    // Motoristas ativos
    const totalMotoristas = motoristas.filter(m => m.ativo === true).length;
    
    // Agregados (veículos do tipo Agregado)
    const totalAgregados = veiculos.filter(v => v.tipo === 'Agregado').length;
    
    // Totais financeiros (apenas agregados, com regra correta)
    const { totalDiarias, totalDescontos, totalLiquido } = calcularTotaisFinanceiros(lancamentos);
    
    // Escalas de hoje
    const hoje = new Date().toISOString().split('T')[0];
    const escalasHoje = escalas.filter(e => e.data === hoje).length;

    document.getElementById('totalMotoristas').textContent = totalMotoristas;
    document.getElementById('totalAgregados').textContent = totalAgregados;
    document.getElementById('totalDiarias').textContent = formatarMoeda(totalDiarias);
    document.getElementById('totalDescontos').textContent = formatarMoeda(totalDescontos);
    document.getElementById('totalLiquido').textContent = formatarMoeda(totalLiquido);
    document.getElementById('totalEscalas').textContent = escalasHoje;
}

// 🔧 FILTRO DE PERÍODO PARA OS CARDS
function atualizarStatsComFiltro() {
    const dataInicio = document.getElementById('filtroDataInicio').value;
    const dataFim = document.getElementById('filtroDataFim').value;
    
    // Filtrar lançamentos pelo período selecionado
    let lancamentosFiltrados = [...lancamentos];
    if (dataInicio) lancamentosFiltrados = lancamentosFiltrados.filter(l => l.data >= dataInicio);
    if (dataFim) lancamentosFiltrados = lancamentosFiltrados.filter(l => l.data <= dataFim);
    
    // Totais financeiros (apenas agregados, com regra correta)
    const { totalDiarias, totalDescontos, totalLiquido } = calcularTotaisFinanceiros(lancamentosFiltrados);
    
    // Escalas filtradas
    let escalasFiltradas = [...escalas];
    if (dataInicio) escalasFiltradas = escalasFiltradas.filter(e => e.data >= dataInicio);
    if (dataFim) escalasFiltradas = escalasFiltradas.filter(e => e.data <= dataFim);

    document.getElementById('totalDiarias').textContent = formatarMoeda(totalDiarias);
    document.getElementById('totalDescontos').textContent = formatarMoeda(totalDescontos);
    document.getElementById('totalLiquido').textContent = formatarMoeda(totalLiquido);
    document.getElementById('totalEscalas').textContent = escalasFiltradas.length;
}

function limparFiltroData() {
    document.getElementById('filtroDataInicio').value = '';
    document.getElementById('filtroDataFim').value = '';
    atualizarStatsComFiltro();
}

function atualizarResumoSemana() {
    const dias = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
    const ids = ['segTotal', 'terTotal', 'quaTotal', 'quiTotal', 'sexTotal', 'sabTotal'];
    
    const hoje = new Date();
    const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const diaHoje = getDiaSemanaPorData(hojeISO);
    
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay() + 1);
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 5);

    const inicioISO = `${inicioSemana.getFullYear()}-${String(inicioSemana.getMonth() + 1).padStart(2, '0')}-${String(inicioSemana.getDate()).padStart(2, '0')}`;
    const fimISO = `${fimSemana.getFullYear()}-${String(fimSemana.getMonth() + 1).padStart(2, '0')}-${String(fimSemana.getDate()).padStart(2, '0')}`;

    const contagem = { SEGUNDA: 0, TERCA: 0, QUARTA: 0, QUINTA: 0, SEXTA: 0, SABADO: 0 };

    escalas.forEach(e => {
        if (!e.data) return;
        if (e.data >= inicioISO && e.data <= fimISO) {
            const diaSemana = getDiaSemanaPorData(e.data);
            if (contagem[diaSemana] !== undefined) {
                contagem[diaSemana]++;
            }
        }
    });

    dias.forEach((dia, i) => {
        document.getElementById(ids[i]).textContent = contagem[dia];
    });
}

// ================= GRÁFICOS =================

function atualizarGraficos() {
    if (lancamentos.length === 0 && escalas.length === 0) {
        mostrarToast('Sem dados para exibir gráficos', 'info');
        return;
    }

    // Destruir gráficos antigos
    Object.keys(charts).forEach(key => {
        if (charts[key]) {
            charts[key].destroy();
        }
    });

    // ===== 1. Evolução Quinzenal (APENAS agregados, regra correta) =====
    const quinzenas = {};
    const nomesQuinzenas = ['1ª Quinzena', '2ª Quinzena'];

    lancamentos.forEach(l => {
        if (!isLancamentoAgregado(l)) return;

        // 🔧 CORREÇÃO DE FUSO: usar 'T00:00:00' para forçar horário local
        const data = new Date(l.data + 'T00:00:00');
        const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        const quinzena = data.getDate() <= 15 ? '1' : '2';
        const chave = `${mesAno}-Q${quinzena}`;
        
        const total = calcularTotal(l);
        quinzenas[chave] = (quinzenas[chave] || 0) + total;
    });

    const sortedEvol = Object.entries(quinzenas)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12);

    const ctx2 = document.getElementById('chartEvolucao').getContext('2d');
    charts.evolucao = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: sortedEvol.map(item => {
                const [mesAno, q] = item[0].split('-Q');
                const [ano, mesNum] = mesAno.split('-');
                const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                return `${nomesMeses[parseInt(mesNum) - 1]}/${ano} - ${nomesQuinzenas[parseInt(q) - 1]}`;
            }),
            datasets: [{
                label: 'Total Quinzenal (R$)',
                data: sortedEvol.map(item => item[1]),
                backgroundColor: 'rgba(52,168,83,0.7)',
                borderColor: 'rgba(52,168,83,1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: value => 'R$ ' + value.toFixed(0) }
                }
            }
        }
    });

    // ===== 2. Rotas mais Frequentes =====
    const rotaData = {};
    lancamentos.forEach(l => {
        const rota = l.rota || 'Sem rota';
        rotaData[rota] = (rotaData[rota] || 0) + 1;
    });
    const sortedRotas = Object.entries(rotaData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const coresDoughnut = [
        '#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0',
        '#00bcd4', '#ff6f00', '#795548', '#607d8b', '#e91e63'
    ];

    const ctx3 = document.getElementById('chartRotas').getContext('2d');
    charts.rotas = new Chart(ctx3, {
        type: 'doughnut',
        data: {
            labels: sortedRotas.map(item => item[0]),
            datasets: [{
                data: sortedRotas.map(item => item[1]),
                backgroundColor: coresDoughnut.slice(0, sortedRotas.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { font: { size: 10 }, boxWidth: 12, padding: 8 }
                }
            }
        }
    });

    // ===== 3. Escalas por Dia =====
    const escalaDia = { SEGUNDA: 0, TERCA: 0, QUARTA: 0, QUINTA: 0, SEXTA: 0, SABADO: 0 };
    escalas.forEach(e => {
        if (e.data) {
            const diaSemana = getDiaSemanaPorData(e.data);
            if (escalaDia[diaSemana] !== undefined) {
                escalaDia[diaSemana]++;
            }
        }
    });

    const ctx4 = document.getElementById('chartEscalas').getContext('2d');
    charts.escalas = new Chart(ctx4, {
        type: 'bar',
        data: {
            labels: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
            datasets: [{
                label: 'Quantidade de Escalas',
                data: Object.values(escalaDia),
                backgroundColor: 'rgba(156,39,176,0.7)',
                borderColor: 'rgba(156,39,176,1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

    chartInitialized = true;
}

// ===== ATUALIZAR GRÁFICO DE AGREGADOS COM FILTRO DE MÊS =====
function atualizarGraficoAgregados() {
    const mesSelecionado = document.getElementById('filtroMesAgregado').value;
    const aggData = {};

    lancamentos.forEach(l => {
        // Filtrar por mês
        if (mesSelecionado && l.data && !l.data.startsWith(mesSelecionado)) {
            return;
        }

        // Apenas lançamentos do "mundo dos agregados"
        if (!isLancamentoAgregado(l)) return;

        // 🔧 Agrupar pelo proprietário (responsável financeiro)
        const nome = getNomeResponsavel(l);
        const total = calcularTotal(l); // regra correta: chapa subtrai
        aggData[nome] = (aggData[nome] || 0) + total;
    });

    const sortedAgg = Object.entries(aggData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const cores = [
        'rgba(26,115,232,0.8)', 'rgba(52,168,83,0.8)', 'rgba(251,188,4,0.8)',
        'rgba(234,67,53,0.8)', 'rgba(156,39,176,0.8)', 'rgba(0,188,212,0.8)',
        'rgba(255,111,0,0.8)', 'rgba(121,85,72,0.8)', 'rgba(96,125,139,0.8)',
        'rgba(233,30,99,0.8)'
    ];

    if (charts.agregados) {
        charts.agregados.destroy();
    }

    const ctx1 = document.getElementById('chartAgregados').getContext('2d');
    charts.agregados = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: sortedAgg.map(item => item[0]),
            datasets: [{
                label: 'Total (R$)',
                data: sortedAgg.map(item => item[1]),
                backgroundColor: cores.slice(0, sortedAgg.length),
                borderColor: cores.slice(0, sortedAgg.length).map(c => c.replace('0.8', '1')),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: value => 'R$ ' + value.toFixed(0) }
                }
            }
        }
    });
}

// ===== ATUALIZAR GRÁFICO DE PESO COM FILTRO DE MÊS =====
function atualizarGraficoPeso() {
    const mesSelecionado = document.getElementById('filtroMesPeso').value;
    const pesoData = {};

    escalas.forEach(e => {
        if (mesSelecionado && e.data && !e.data.startsWith(mesSelecionado)) {
            return;
        }

        if (e.peso_carga && e.peso_carga > 0) {
            const placa = e.veiculo_placa || 'SEM PLACA';
            const veiculo = `${e.veiculo_nome || ''} (${placa})`; 
            pesoData[veiculo] = (pesoData[veiculo] || 0) + parseFloat(e.peso_carga);
        }
    });

    const sortedPeso = Object.entries(pesoData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    if (charts.peso) {
        charts.peso.destroy();
    }

    const ctx5 = document.getElementById('chartPeso').getContext('2d');
    charts.peso = new Chart(ctx5, {
        type: 'bar',
        data: {
            labels: sortedPeso.map(item => item[0]),
            datasets: [{
                label: 'Peso Carregado (kg)',
                data: sortedPeso.map(item => item[1]),
                backgroundColor: 'rgba(255,152,0,0.7)',
                borderColor: 'rgba(255,152,0,1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { callback: value => value + ' kg' }
                }
            }
        }
    });
}

// =====================================================
// 🔍 DEBUG TEMPORÁRIO — CARLOS ALBERTO 01/09 a 10/09/2026
// Remover após validação
// =====================================================
function debugCarlosAlberto() {
    const INICIO = '2026-09-01';
    const FIM    = '2026-09-10';

    console.log('%c🔍 DEBUG CARLOS ALBERTO', 'background:#1a73e8;color:#fff;padding:4px 8px;font-weight:bold;border-radius:4px');
    console.log(`Período: ${INICIO} a ${FIM}`);

    // Filtra os lançamentos do período que envolvem "CARLOS ALBERTO"
    const itens = lancamentos.filter(l => {
        if (!l.data) return false;
        if (l.data < INICIO || l.data > FIM) return false;

        const nomeResp = (getNomeResponsavel(l) || '').toUpperCase();
        const nomeMot  = (l.motorista_nome || '').toUpperCase();
        return nomeResp.includes('CARLOS ALBERTO') || nomeMot.includes('CARLOS ALBERTO');
    });

    if (itens.length === 0) {
        console.warn('Nenhum lançamento de CARLOS ALBERTO no período. Veja todos os lançamentos brutos:');
        console.table(
            lancamentos
                .filter(l => l.data >= INICIO && l.data <= FIM)
                .map(l => ({
                    data: l.data,
                    motorista_id: l.motorista_id,
                    proprietario_id: l.proprietario_id,
                    motorista_nome: l.motorista_nome,
                    responsavel: getNomeResponsavel(l),
                    rota: l.rota,
                    diaria: l.valor_diaria,
                    pedagio: l.pedagio,
                    almoco: l.almoco,
                    chapa: l.chapa,
                    desconto: l.desconto,
                    total_calculado: calcularTotal(l)
                }))
        );
        return;
    }

    // Detalhamento linha por linha
    console.log('%c📋 Lançamentos individuais:', 'color:#34a853;font-weight:bold');
    console.table(itens.map(l => ({
        data: l.data,
        escala_id: l.escala_id,
        lancamento_id: l.lancamento_id,
        motorista_id: l.motorista_id,
        proprietario_id: l.proprietario_id,
        motorista_nome: l.motorista_nome,
        responsavel: getNomeResponsavel(l),
        rota: l.rota,
        diaria: Number(l.valor_diaria) || 0,
        pedagio: Number(l.pedagio) || 0,
        almoco: Number(l.almoco) || 0,
        chapa: Number(l.chapa) || 0,
        desconto: Number(l.desconto) || 0,
        total_calculado: calcularTotal(l),
        total_view: l.total_lancamento ?? '—',
        bate_com_view: (l.total_lancamento !== undefined)
            ? (calcularTotal(l) === Number(l.total_lancamento))
            : '—'
    })));

    // Soma total
    const somaCorreta = itens.reduce((s, l) => s + calcularTotal(l), 0);
    const somaView    = itens.reduce((s, l) => s + (Number(l.total_lancamento) || 0), 0);
    const somaDiarias = itens.reduce((s, l) => s + (Number(l.valor_diaria) || 0), 0);
    const somaChapas  = itens.reduce((s, l) => s + (Number(l.chapa) || 0), 0);
    const somaPedagio = itens.reduce((s, l) => s + (Number(l.pedagio) || 0), 0);
    const somaAlmoco  = itens.reduce((s, l) => s + (Number(l.almoco) || 0), 0);
    const somaDesc    = itens.reduce((s, l) => s + (Number(l.desconto) || 0), 0);

    console.log('%c💰 TOTAIS DO PERÍODO:', 'color:#fbbc04;font-weight:bold');
    console.log({
        'Qtd lançamentos':       itens.length,
        'Soma Diárias (R$)':     somaDiarias.toFixed(2),
        'Soma Pedágios (R$)':    somaPedagio.toFixed(2),
        'Soma Almoço (R$)':      somaAlmoco.toFixed(2),
        'Soma Chapa (R$)':       somaChapas.toFixed(2),
        'Soma Descontos (R$)':   somaDesc.toFixed(2),
        '─────────────────':     '─────────',
        'TOTAL CORRETO (R$)':    somaCorreta.toFixed(2),
        'TOTAL VIA VIEW (R$)':   somaView.toFixed(2),
        'DIFERENÇA (R$)':        (somaCorreta - somaView).toFixed(2)
    });

    // Verificação da fórmula
    const formulaEsperada = somaDiarias + somaPedagio + somaAlmoco - somaChapas - somaDesc;
    console.log(
        `%c✅ Fórmula esperada: ${somaDiarias.toFixed(2)} + ${somaPedagio.toFixed(2)} + ${somaAlmoco.toFixed(2)} − ${somaChapas.toFixed(2)} − ${somaDesc.toFixed(2)} = ${formulaEsperada.toFixed(2)}`,
        'color:#22c55e;font-weight:bold'
    );
    console.log(
        `%c📌 Valor esperado no PDF quinzenal: R$ ${formulaEsperada.toFixed(2)}`,
        'color:#8b5cf6;font-weight:bold;font-size:14px'
    );
}

// ================= INICIALIZAÇÃO =================
function inicializar() {
    carregarDados();
}

document.addEventListener('DOMContentLoaded', inicializar);

// =====================================================
// EXPOR FUNÇÕES PARA O ESCOPO GLOBAL (onclick no HTML)
// =====================================================
window.atualizarStatsComFiltro = atualizarStatsComFiltro;
window.limparFiltroData = limparFiltroData;
window.atualizarGraficoAgregados = atualizarGraficoAgregados;
window.atualizarGraficoPeso = atualizarGraficoPeso;
window.carregarDados = carregarDados;
window.debugCarlosAlberto = debugCarlosAlberto;