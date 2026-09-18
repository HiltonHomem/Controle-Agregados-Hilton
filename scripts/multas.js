// =====================================================
// multas.js - Gerenciamento de Multas e Descontos
// =====================================================

let multasLista = [];
let motoristasLista = [];
let veiculosLista = [];
let multaEmEdicao = null;
let filtroAtualFase = '';
let filtroAtualStatus = '';
let filtroAtualDesconto = '';
let termoBusca = '';

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', async () => {
    const campoCnpj = document.getElementById('cnpjEmpresa');
    if (campoCnpj && !campoCnpj.value) {
        campoCnpj.value = CNPJ_EMPRESA_PADRAO;
    }
    await carregarDependencias();
    await carregarDados();
});

// ===== CARREGAR MOTORISTAS E VEÍCULOS =====
async function carregarDependencias() {
    try {
        // Carregar motoristas
        const { data: motoristas, error: errMot } = await window.supabaseClient
            .from('motoristas')
            .select('id, nome, tipo, telefone')
            .order('nome');
        
        if (!errMot && motoristas) {
            motoristasLista = motoristas;
            popularSelectsMotoristas();
        }

        // Carregar veículos
        const { data: veiculos, error: errVeic } = await window.supabaseClient
            .from('veiculos')
            .select('id, nome, placa, proprietario_id')
            .order('placa');

        if (!errVeic && veiculos) {
            veiculosLista = veiculos;
            popularSelectsVeiculos();
        }
    } catch (err) {
        console.error('Erro ao carregar motoristas e veículos:', err);
    }
}

function popularSelectsMotoristas() {
    const selects = ['motoristaId', 'modalDescontoMotoristaId', 'filtroMotorista'];
    selects.forEach(selId => {
        const el = document.getElementById(selId);
        if (!el) return;
        const valorAtual = el.value;
        const primeiroTexto = selId.startsWith('filtro') ? 'Todos os Motoristas' : 'Selecione o motorista...';
        
        el.innerHTML = `<option value="">${primeiroTexto}</option>`;
        motoristasLista.forEach(m => {
            el.innerHTML += `<option value="${m.id}">${m.nome} (${m.tipo || 'Motorista'})</option>`;
        });
        if (valorAtual) el.value = valorAtual;
    });
}

function popularSelectsVeiculos() {
    const selects = ['veiculoId', 'filtroVeiculo'];
    selects.forEach(selId => {
        const el = document.getElementById(selId);
        if (!el) return;
        const valorAtual = el.value;
        const primeiroTexto = selId.startsWith('filtro') ? 'Todos os Veículos' : 'Selecione o veículo...';
        
        el.innerHTML = `<option value="">${primeiroTexto}</option>`;
        veiculosLista.forEach(v => {
            el.innerHTML += `<option value="${v.id}">${v.placa} - ${v.nome}</option>`;
        });
        if (valorAtual) el.value = valorAtual;
    });
}

function popularSelectAutosOrigem(idAtualExcluir = null) {
    const sel = document.getElementById('autoOrigemId');
    if (!sel) return;
    const valorAtual = sel.value;
    
    sel.innerHTML = '<option value="">Nenhum (Auto Originário Próprio)</option>';
    multasLista
        .filter(m => !idAtualExcluir || m.id != idAtualExcluir)
        .forEach(m => {
            sel.innerHTML += `<option value="${m.id}">AIT: ${m.numero_auto_infracao} (${m.placa} - ${m.descricao_infracao.substring(0, 35)}...)</option>`;
        });
    if (valorAtual) sel.value = valorAtual;
}

// ===== CARREGAR MULTAS DO SUPABASE =====
async function carregarDados() {
    const loader = document.getElementById('loadingIndicador');
    if (loader) loader.classList.remove('hidden');

    try {
        // Tenta buscar da view view_multas_completas ou direto da tabela multas
        let query = window.supabaseClient.from('view_multas_completas').select('*').order('id', { ascending: false });
        let { data, error } = await query;

        if (error) {
            console.warn('View view_multas_completas pode não estar instalada ainda, usando fallback tabela multas:', error);
            const fallback = await window.supabaseClient.from('multas').select('*').order('id', { ascending: false });
            data = fallback.data;
            error = fallback.error;
        }

        if (error) {
            console.error('Erro ao consultar multas:', error);
            mostrarToast('Aviso: Verifique se executou o script multas.sql no Supabase!', 'error');
            multasLista = [];
        } else {
            multasLista = data || [];
        }

        atualizarKPIs();
        popularSelectAutosOrigem();
        renderizarTabela();
    } catch (err) {
        console.error('Erro ao carregar multas:', err);
    } finally {
        if (loader) loader.classList.add('hidden');
    }
}

// ===== ATUALIZAR INDICADORES (KPIs) =====
function atualizarKPIs() {
    const totalMultas = multasLista.length;
    const totalAutuacao = multasLista.filter(m => m.fase === 'AUTUACAO').length;
    const totalPenalidade = multasLista.filter(m => m.fase === 'PENALIDADE').length;
    const totalPagas = multasLista.filter(m => m.status_pagamento === 'PAGO').length;
    
    // Total a cobrar / valor pendente
    const valorPendente = multasLista
        .filter(m => m.status_pagamento !== 'PAGO' && m.fase === 'PENALIDADE')
        .reduce((acc, m) => acc + (Number(m.valor_integral) || 0), 0);

    const valorDescontado = multasLista
        .reduce((acc, m) => acc + (Number(m.total_descontado_motorista) || 0), 0);

    setTextSafe('kpiTotalMultas', totalMultas);
    setTextSafe('kpiAutuacao', totalAutuacao);
    setTextSafe('kpiPenalidade', totalPenalidade);
    setTextSafe('kpiPagas', totalPagas);
    setTextSafe('kpiValorPendente', formatarMoeda(valorPendente));
    setTextSafe('kpiValorDescontado', formatarMoeda(valorDescontado));
    setTextSafe('totalMultasBadge', totalMultas);
}

function setTextSafe(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
}

// ===== RENDERIZAR TABELA =====
function renderizarTabela() {
    const tbody = document.getElementById('tabelaMultasBody');
    if (!tbody) return;

    const filtradas = multasLista.filter(m => {
        if (filtroAtualFase && m.fase !== filtroAtualFase) return false;
        if (filtroAtualStatus && m.status_pagamento !== filtroAtualStatus) return false;
        if (filtroAtualDesconto) {
            if (filtroAtualDesconto === 'SIM' && !m.descontar_motorista) return false;
            if (filtroAtualDesconto === 'NAO' && m.descontar_motorista) return false;
            if (filtroAtualDesconto === 'PENDENTE' && (!m.descontar_motorista || m.status_desconto === 'DESCONTADO')) return false;
        }

        const filtroMot = document.getElementById('filtroMotorista')?.value;
        if (filtroMot && m.motorista_id != filtroMot) return false;

        const filtroVeic = document.getElementById('filtroVeiculo')?.value;
        if (filtroVeic && m.veiculo_id != filtroVeic) return false;

        if (termoBusca) {
            const busca = termoBusca.toLowerCase();
            const ait = (m.numero_auto_infracao || '').toLowerCase();
            const placa = (m.placa || '').toLowerCase();
            const desc = (m.descricao_infracao || '').toLowerCase();
            const cod = (m.codigo_infracao || '').toLowerCase();
            const mot = (m.motorista_nome_exibicao || m.motorista_nome || '').toLowerCase();
            if (!ait.includes(busca) && !placa.includes(busca) && !desc.includes(busca) && !cod.includes(busca) && !mot.includes(busca)) {
                return false;
            }
        }
        return true;
    });

    if (filtradas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-10 text-gray-500">
                    <div class="text-4xl mb-2">🔍</div>
                    Nenhuma infração/multa encontrada com os filtros selecionados.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtradas.map(m => {
        // Estilo de Fase
        const isAutuacao = m.fase === 'AUTUACAO';
        const badgeFase = isAutuacao 
            ? `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300">🟡 1. Autuação</span>`
            : `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-300">🔴 2. Penalidade</span>`;

        // Status de Pagamento
        let badgeStatus = '';
        if (m.status_pagamento === 'PAGO') {
            badgeStatus = `<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">✅ Pago</span>`;
        } else if (m.status_pagamento === 'VENCIDO') {
            badgeStatus = `<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 font-bold">⚠️ Vencido</span>`;
        } else if (m.status_pagamento === 'EM_DEFESA') {
            badgeStatus = `<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">🛡️ Em Recurso</span>`;
        } else {
            badgeStatus = `<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">⏳ Pendente</span>`;
        }

        // Vínculo Originário (NIC / Auto Derivado)
        let vinculoHtml = '';
        if (m.auto_origem_id || m.auto_origem_numero) {
            vinculoHtml = `
                <div class="text-xs text-purple-700 font-medium mt-1 flex items-center gap-1 bg-purple-50 px-1.5 py-0.5 rounded">
                    🔗 Derivada do AIT: <strong>${m.auto_origem_numero || ('#' + m.auto_origem_id)}</strong>
                </div>
            `;
        }
        if (m.total_autos_derivados > 0) {
            vinculoHtml += `
                <div class="text-xs text-blue-700 font-medium mt-1">
                    📂 Gerou <strong>${m.total_autos_derivados}</strong> multa(s) derivada(s)
                </div>
            `;
        }

        // Prazo / Validade
        let prazoInfo = '';
        if (isAutuacao) {
            prazoInfo = `
                <div class="text-xs text-gray-700"><strong>Prazo Defesa:</strong> ${formatarData(m.data_limite_defesa_autuacao)}</div>
                <div class="text-xs text-gray-400">Emissão: ${formatarData(m.data_emissao_autuacao)}</div>
            `;
        } else {
            prazoInfo = `
                <div class="text-xs ${m.status_pagamento !== 'PAGO' ? 'text-red-600 font-semibold' : 'text-gray-700'}">
                    <strong>Validade Pgto:</strong> ${formatarData(m.data_vencimento_penalidade)}
                </div>
                <div class="text-xs text-gray-400">Notif: ${m.numero_notificacao_penalidade || '-'}</div>
            `;
        }

        // Desconto do Motorista
        let descontoBadge = '';
        if (!m.descontar_motorista) {
            descontoBadge = `<span class="text-xs text-gray-400">Não descontar</span>`;
        } else {
            if (m.status_desconto === 'DESCONTADO') {
                descontoBadge = `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                        ✓ Descontado
                    </span>
                `;
            } else {
                descontoBadge = `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                        ⏳ Desconto Pendente
                    </span>
                    <button onclick="abrirModalDesconto(${m.id})" class="block mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium underline">
                        💸 Efetuar Desconto
                    </button>
                `;
            }
        }

        const motoristaNome = m.motorista_nome_exibicao || m.motorista_nome || '<span class="text-gray-400 italic">Não vinculado</span>';

        return `
            <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="px-4 py-3 align-top">
                    <div class="font-bold text-gray-900">${m.numero_auto_infracao}</div>
                    <div class="text-xs text-gray-500">Cód: ${m.codigo_infracao}${m.desdobramento_infracao ? '-' + m.desdobramento_infracao : ''}</div>
                    ${vinculoHtml}
                </td>
                <td class="px-4 py-3 align-top">
                    <span class="font-semibold text-gray-800 tracking-wider">${m.placa}</span>
                    <div class="text-xs text-gray-500">${m.veiculo_modelo || ''}</div>
                </td>
                <td class="px-4 py-3 align-top">
                    <div class="text-sm font-medium text-gray-800">${motoristaNome}</div>
                </td>
                <td class="px-4 py-3 align-top max-w-xs">
                    <div class="text-xs text-gray-800 font-medium line-clamp-2" title="${m.descricao_infracao}">${m.descricao_infracao}</div>
                    <div class="text-xs text-gray-400 mt-1">${m.orgao_autuador || '-'}</div>
                </td>
                <td class="px-4 py-3 align-top">
                    ${badgeFase}
                </td>
                <td class="px-4 py-3 align-top">
                    ${prazoInfo}
                </td>
                <td class="px-4 py-3 align-top">
                    <div class="text-sm font-bold text-gray-900">${formatarMoeda(m.valor_integral)}</div>
                    ${m.valor_com_desconto > 0 ? `<div class="text-xs text-emerald-700">Desc: ${formatarMoeda(m.valor_com_desconto)}</div>` : ''}
                    ${m.valor_pago > 0 ? `<div class="text-xs text-blue-700">Pago: ${formatarMoeda(m.valor_pago)}</div>` : ''}
                    <div class="mt-1">${badgeStatus}</div>
                </td>
                <td class="px-4 py-3 align-top">
                    ${descontoBadge}
                </td>
                <td class="px-4 py-3 align-top text-right whitespace-nowrap">
                    ${m.status_pagamento !== 'PAGO' ? `
                    <button onclick="abrirModalPagamento(${m.id})" class="text-emerald-600 hover:text-emerald-800 p-1.5 rounded hover:bg-emerald-50 transition" title="Registrar Pagamento">
                        💳
                    </button>
                    ` : ''}
                    <button onclick="editarMulta(${m.id})" class="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition" title="Editar / Mudar Fase">
                        ✏️
                    </button>
                    <button onclick="excluirMulta(${m.id})" class="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition" title="Excluir">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== APLICAR FILTROS =====
function aplicarFiltros() {
    filtroAtualFase = document.getElementById('filtroFase')?.value || '';
    filtroAtualStatus = document.getElementById('filtroStatus')?.value || '';
    filtroAtualDesconto = document.getElementById('filtroDesconto')?.value || '';
    termoBusca = document.getElementById('filtroBusca')?.value || '';
    renderizarTabela();
}

// ===== ALTERAÇÃO DINÂMICA DE FASE NO FORMULÁRIO =====
function alternarCamposFase() {
    const fase = document.getElementById('faseInfracao').value;
    const boxAutuacao = document.getElementById('secaoAutuacao');
    const boxPenalidade = document.getElementById('secaoPenalidade');

    if (fase === 'AUTUACAO') {
        boxAutuacao.classList.remove('opacity-50');
        boxPenalidade.classList.add('opacity-50');
    } else {
        boxAutuacao.classList.remove('opacity-50');
        boxPenalidade.classList.remove('opacity-50');
    }
}

const CNPJ_EMPRESA_PADRAO = '11.216.118/0001-78';

// ===== CONTROLE DO MODAL DE MULTA =====
function abrirModalMulta() {
    limparFormularioMulta();
    document.getElementById('modalMultaTitulo').textContent = 'Nova Infração / Auto de Infração';
    document.getElementById('formModoBadge').textContent = 'Inserção';
    document.getElementById('formModoBadge').className = 'bg-blue-600 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold';
    document.getElementById('modalMulta').classList.remove('hidden');
    document.getElementById('numeroAutoInfracao')?.focus();
}

function fecharModalMulta() {
    document.getElementById('modalMulta').classList.add('hidden');
    limparFormularioMulta();
}

function rolarParaFormulario() {
    abrirModalMulta();
}

// ===== AO SELECIONAR VEÍCULO =====
function aoSelecionarVeiculo() {
    const veiculoId = document.getElementById('veiculoId').value;
    const veiculo = veiculosLista.find(v => v.id == veiculoId);
    
    if (veiculo) {
        document.getElementById('placa').value = veiculo.placa;
        // Se o veículo tiver proprietário/motorista vinculado e o campo estiver vazio, pré-seleciona
        if (veiculo.proprietario_id && !document.getElementById('motoristaId').value) {
            document.getElementById('motoristaId').value = veiculo.proprietario_id;
        }
    } else {
        document.getElementById('placa').value = '';
    }
}

// ===== SALVAR MULTA (MANUAL OU EDIÇÃO) =====
async function salvarMulta(event) {
    event.preventDefault();
    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.disabled = true;
    btnSalvar.textContent = '⏳ Gravando...';

    try {
        const id = document.getElementById('multaId').value;
        const veiculoId = document.getElementById('veiculoId').value;
        const veiculo = veiculosLista.find(v => v.id == veiculoId);
        const placa = veiculo ? veiculo.placa : (document.getElementById('placa').value || '').trim().toUpperCase();

        if (!placa) {
            throw new Error('Selecione um veículo válido para obter a placa.');
        }

        const dados = {
            cnpj_empresa: CNPJ_EMPRESA_PADRAO,
            numero_auto_infracao: document.getElementById('numeroAutoInfracao').value.trim().toUpperCase(),
            codigo_renainf: document.getElementById('codigoRenainf').value.trim() || null,
            auto_origem_id: document.getElementById('autoOrigemId').value || null,
            
            placa: placa,
            codigo_renavam: null,
            veiculo_id: veiculoId || null,
            motorista_id: document.getElementById('motoristaId').value || null,
            motorista_nome: document.getElementById('motoristaId').selectedOptions[0]?.text?.split(' (')[0] || null,
            
            codigo_infracao: document.getElementById('codigoInfracao').value.trim(),
            desdobramento_infracao: '0',
            descricao_infracao: document.getElementById('descricaoInfracao').value.trim(),
            orgao_autuador: document.getElementById('orgaoAutuador').value.trim(),
            
            fase: document.getElementById('faseInfracao').value,
            data_emissao_autuacao: document.getElementById('dataEmissaoAutuacao').value || null,
            data_limite_defesa_autuacao: document.getElementById('dataLimiteDefesaAutuacao').value || null,
            
            numero_notificacao_penalidade: document.getElementById('numeroNotificacaoPenalidade').value.trim() || null,
            data_emissao_penalidade: document.getElementById('dataEmissaoPenalidade').value || null,
            data_vencimento_penalidade: document.getElementById('dataVencimentoPenalidade').value || null,
            
            valor_integral: parseFloat(document.getElementById('valorIntegral').value) || 0,
            valor_com_desconto: parseFloat(document.getElementById('valorComDesconto').value) || 0,
            status_pagamento: document.getElementById('statusPagamento').value,
            
            descontar_motorista: document.getElementById('descontarMotorista').checked,
            status_desconto: document.getElementById('descontarMotorista').checked ? 'PENDENTE' : 'NAO_APLICAVEL',
            observacoes: document.getElementById('observacoes').value.trim()
        };

        let res;
        if (id) {
            res = await window.supabaseClient.from('multas').update(dados).eq('id', id);
        } else {
            res = await window.supabaseClient.from('multas').insert([dados]);
        }

        if (res.error) throw res.error;

        mostrarToast(id ? 'Multa atualizada com sucesso!' : 'Multa cadastrada com sucesso!', 'success');
        fecharModalMulta();
        await carregarDados();
    } catch (err) {
        console.error('Erro ao salvar multa:', err);
        mostrarToast(`Erro ao salvar: ${err.message}`, 'error');
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = '💾 Salvar Infração';
    }
}

// ===== EDITAR MULTA =====
function editarMulta(id) {
    const multa = multasLista.find(m => m.id == id);
    if (!multa) return;

    multaEmEdicao = multa;
    popularSelectAutosOrigem(multa.id);

    document.getElementById('multaId').value = multa.id;
    document.getElementById('cnpjEmpresa').value = multa.cnpj_empresa || CNPJ_EMPRESA_PADRAO;
    document.getElementById('numeroAutoInfracao').value = multa.numero_auto_infracao || '';
    document.getElementById('codigoRenainf').value = multa.codigo_renainf || '';
    document.getElementById('autoOrigemId').value = multa.auto_origem_id || '';
    
    document.getElementById('veiculoId').value = multa.veiculo_id || '';
    document.getElementById('placa').value = multa.placa || '';
    document.getElementById('motoristaId').value = multa.motorista_id || '';
    
    document.getElementById('codigoInfracao').value = multa.codigo_infracao || '';
    document.getElementById('descricaoInfracao').value = multa.descricao_infracao || '';
    document.getElementById('orgaoAutuador').value = multa.orgao_autuador || '';
    
    document.getElementById('faseInfracao').value = multa.fase || 'AUTUACAO';
    document.getElementById('dataEmissaoAutuacao').value = multa.data_emissao_autuacao || '';
    document.getElementById('dataLimiteDefesaAutuacao').value = multa.data_limite_defesa_autuacao || '';
    
    document.getElementById('numeroNotificacaoPenalidade').value = multa.numero_notificacao_penalidade || '';
    document.getElementById('dataEmissaoPenalidade').value = multa.data_emissao_penalidade || '';
    document.getElementById('dataVencimentoPenalidade').value = multa.data_vencimento_penalidade || '';
    
    document.getElementById('valorIntegral').value = multa.valor_integral || 0;
    document.getElementById('valorComDesconto').value = multa.valor_com_desconto || 0;
    document.getElementById('statusPagamento').value = multa.status_pagamento || 'PENDENTE';
    
    document.getElementById('descontarMotorista').checked = !!multa.descontar_motorista;
    document.getElementById('observacoes').value = multa.observacoes || '';

    document.getElementById('modalMultaTitulo').textContent = `Editar Infração - AIT: ${multa.numero_auto_infracao}`;
    document.getElementById('formModoBadge').textContent = 'Edição';
    document.getElementById('formModoBadge').className = 'bg-amber-600 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold';

    alternarCamposFase();
    document.getElementById('modalMulta').classList.remove('hidden');
}

function cancelarEdicao() {
    fecharModalMulta();
}

function limparFormularioMulta() {
    document.getElementById('multaForm').reset();
    document.getElementById('multaId').value = '';
    document.getElementById('placa').value = '';
    document.getElementById('cnpjEmpresa').value = CNPJ_EMPRESA_PADRAO;
    multaEmEdicao = null;
    popularSelectAutosOrigem();
    alternarCamposFase();
}

// ===== MODAL DE REGISTRAR PAGAMENTO =====
function abrirModalPagamento(id) {
    const multa = multasLista.find(m => m.id == id);
    if (!multa) return;

    document.getElementById('pagamentoMultaId').value = multa.id;
    document.getElementById('pagamentoAitInfo').textContent = `AIT: ${multa.numero_auto_infracao} • Placa: ${multa.placa} • ${multa.descricao_infracao}`;
    
    // Sugere o valor com desconto se houver, ou o integral
    const valorSugerido = multa.valor_com_desconto > 0 ? multa.valor_com_desconto : multa.valor_integral;
    document.getElementById('pagamentoValorPago').value = valorSugerido || 0;
    document.getElementById('pagamentoData').value = new Date().toISOString().split('T')[0];

    document.getElementById('modalPagamento').classList.remove('hidden');
    document.getElementById('pagamentoValorPago').focus();
}

function fecharModalPagamento() {
    document.getElementById('modalPagamento').classList.add('hidden');
}

async function confirmarPagamentoMulta(event) {
    event.preventDefault();
    const btn = document.getElementById('btnConfirmarPgto');
    btn.disabled = true;
    btn.textContent = '⏳ Baixando...';

    try {
        const id = document.getElementById('pagamentoMultaId').value;
        const valorPago = parseFloat(document.getElementById('pagamentoValorPago').value) || 0;
        const dataPgto = document.getElementById('pagamentoData').value;

        if (valorPago <= 0) {
            throw new Error('Informe um valor pago válido.');
        }

        const { error } = await window.supabaseClient
            .from('multas')
            .update({
                valor_pago: valorPago,
                data_pagamento: dataPgto,
                status_pagamento: 'PAGO'
            })
            .eq('id', id);

        if (error) throw error;

        fecharModalPagamento();
        mostrarToast('Pagamento registrado com sucesso!', 'success');
        await carregarDados();
    } catch (err) {
        console.error('Erro ao registrar pagamento:', err);
        mostrarToast(`Erro ao registrar: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirmar Pagamento';
    }
}

// ===== EXCLUIR MULTA =====
async function excluirMulta(id) {
    const multa = multasLista.find(m => m.id == id);
    if (!multa) return;

    if (!confirm(`Tem certeza que deseja excluir o AIT ${multa.numero_auto_infracao}? Se houver descontos vinculados, serão apagados.`)) {
        return;
    }

    try {
        const { error } = await window.supabaseClient.from('multas').delete().eq('id', id);
        if (error) throw error;
        mostrarToast('Multa removida com sucesso!', 'success');
        await carregarDados();
    } catch (err) {
        console.error('Erro ao excluir:', err);
        mostrarToast(`Erro ao excluir: ${err.message}`, 'error');
    }
}

// ===== DESCONTOS LANCAMENTOS (MODAL E EFETIVAÇÃO) =====
function abrirModalDesconto(multaId) {
    const multa = multasLista.find(m => m.id == multaId);
    if (!multa) return;

    document.getElementById('modalDescontoMultaId').value = multa.id;
    document.getElementById('modalDescontoAitInfo').textContent = `${multa.numero_auto_infracao} (${multa.placa})`;
    document.getElementById('modalDescontoValor').value = multa.valor_integral || 0;
    document.getElementById('modalDescontoMotoristaId').value = multa.motorista_id || '';
    document.getElementById('modalDescontoData').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalDescontoObs').value = `Desconto ref. AIT ${multa.numero_auto_infracao} - ${multa.descricao_infracao.substring(0, 60)}`;

    document.getElementById('modalDesconto').classList.remove('hidden');
}

function fecharModalDesconto() {
    document.getElementById('modalDesconto').classList.add('hidden');
}

async function confirmarDescontoLancamento(event) {
    event.preventDefault();
    const btn = document.getElementById('btnConfirmarDesconto');
    btn.disabled = true;
    btn.textContent = '⏳ Registrando...';

    try {
        const multaId = document.getElementById('modalDescontoMultaId').value;
        const motoristaId = document.getElementById('modalDescontoMotoristaId').value;
        const valor = parseFloat(document.getElementById('modalDescontoValor').value) || 0;
        const dataDesc = document.getElementById('modalDescontoData').value;
        const obs = document.getElementById('modalDescontoObs').value.trim();

        if (!motoristaId) {
            throw new Error('Por favor, selecione o motorista devedor.');
        }
        if (valor <= 0) {
            throw new Error('O valor do desconto deve ser maior que zero.');
        }

        const multa = multasLista.find(m => m.id == multaId);

        // 1. Inserir na tabela descontos_lancamentos
        const { error: errDesc } = await window.supabaseClient
            .from('descontos_lancamentos')
            .insert([{
                multa_id: multaId,
                motorista_id: motoristaId,
                veiculo_id: multa?.veiculo_id || null,
                valor_desconto: valor,
                data_desconto: dataDesc,
                tipo_desconto: 'MULTA_TRANSITO',
                status: 'DESCONTADO',
                observacao: obs
            }]);

        if (errDesc) throw errDesc;

        // 2. Atualizar status na tabela multas
        await window.supabaseClient
            .from('multas')
            .update({
                descontar_motorista: true,
                status_desconto: 'DESCONTADO',
                motorista_id: motoristaId
            })
            .eq('id', multaId);

        fecharModalDesconto();
        mostrarToast('Desconto lançado com sucesso na tabela de descontos!', 'success');
        await carregarDados();
    } catch (err) {
        console.error('Erro ao efetuar desconto:', err);
        mostrarToast(`Erro: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirmar Desconto';
    }
}


