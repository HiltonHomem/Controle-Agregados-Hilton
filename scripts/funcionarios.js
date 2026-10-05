// =====================================================
// funcionarios.js - Lógica da Gestão de Funcionários v2.0
// =====================================================

// ===== VARIÁVEIS GLOBAIS =====
let funcionarios = [];
let statusRegistros = [];

// ===== AUTENTICAÇÃO =====
async function verificarAuth() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    }
}
verificarAuth();

async function fazerLogout() {
    await window.supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}

// ===== CARREGAR DADOS (MOTORISTAS + AJUDANTES) =====
async function carregarDados() {
    try {
        // Buscar motoristas tipo funcionario
        const { data: motoristasData } = await supabaseClient
            .from('motoristas')
            .select('*')
            .eq('tipo', 'funcionario')
            .eq('ativo', true)
            .order('nome');
        
        // Buscar ajudantes ativos
        const { data: ajudantesData } = await supabaseClient
            .from('ajudantes')
            .select('*')
            .eq('ativo', true)
            .order('nome');

        // Unificar motoristas e ajudantes em um único array
        funcionarios = [
            ...(motoristasData || []).map(m => ({ id: m.id, nome: m.nome, origem: 'motorista' })),
            ...(ajudantesData || []).map(a => ({ id: a.id, nome: a.nome, origem: 'ajudante' }))
        ];

        // Carregar todos os registros de status
        const { data: statusData } = await supabaseClient
            .from('funcionarios_status')
            .select('*')
            .order('data', { ascending: false });
        statusRegistros = statusData || [];

        preencherSelectFuncionarios();
        renderizarTabela();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        mostrarToast('Erro ao carregar dados', 'error');
    }
}

// ===== PREENCHER SELECT =====
function preencherSelectFuncionarios() {
    const select = document.getElementById('funcionarioId');
    select.innerHTML = '<option value="">Selecione...</option>';
    funcionarios.forEach(f => {
        select.innerHTML += `<option value="${f.id}" data-tipo="${f.origem}">${f.nome} (${f.origem === 'motorista' ? 'Motorista' : 'Ajudante'})</option>`;
    });
}

// ===== SALVAR STATUS (FORM PRINCIPAL) =====
async function salvarStatus(event) {
    event.preventDefault();
    
    const funcionarioId = document.getElementById('funcionarioId').value;
    const tipo = document.getElementById('funcionarioTipo').value;
    const data = document.getElementById('statusData').value;
    
    const bancoHoras = document.getElementById('bancoHoras').value.trim();
    const feriasInicio = document.getElementById('feriasInicio')?.value || '';
    const feriasFim = document.getElementById('feriasFim')?.value || '';
    const ferias = formatarPeriodoFerias(feriasInicio, feriasFim);
    const licencaMedica = document.getElementById('licencaMedica').value.trim();
    const falta = document.getElementById('falta').value.trim();
    const sobra = document.getElementById('sobra').value.trim();
    const observacao = document.getElementById('observacao').value.trim();

    if (!funcionarioId || !tipo || !data) {
        mostrarToast('Selecione funcionário e data', 'error');
        return;
    }

    if ((feriasInicio && !feriasFim) || (!feriasInicio && feriasFim)) {
        mostrarToast('Preencha a data inicial e final das férias', 'error');
        return;
    }

    const dados = {
        data: data,
        funcionario_id: parseInt(funcionarioId),
        tipo: tipo,
        banco_horas: bancoHoras || null,
        ferias: ferias || null,
        licenca_medica: licencaMedica || null,
        falta: falta || null,
        sobra: sobra || null,
        observacao: observacao || null
    };

    try {
        // Verificar se já existe um registro para este funcionário nesta data
        const { data: existente } = await supabaseClient
            .from('funcionarios_status')
            .select('id')
            .eq('data', data)
            .eq('funcionario_id', parseInt(funcionarioId))
            .eq('tipo', tipo)
            .maybeSingle();

        let result;
        if (existente) {
            result = await supabaseClient
                .from('funcionarios_status')
                .update(dados)
                .eq('id', existente.id);
        } else {
            result = await supabaseClient
                .from('funcionarios_status')
                .insert([dados]);
        }

        if (result.error) throw result.error;

        mostrarToast('Registro salvo com sucesso!');
        limparForm();
        await carregarDados();
    } catch (error) {
        console.error('Erro ao salvar registro:', error);
        mostrarToast('Erro ao salvar registro', 'error');
    }
}

// ===== RENDERIZAR TABELA =====
function obterRegistrosFiltrados() {
    const dataInicio = document.getElementById('filtroDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroDataFim')?.value || '';
    const filtroBusca = (document.getElementById('filtroBusca')?.value || '').toLowerCase().trim();

    return statusRegistros.filter(r => {
        // Filtro de período
        if (dataInicio && r.data < dataInicio) return false;
        if (dataFim && r.data > dataFim) return false;

        // Se tiver funcionário vinculado
        const func = funcionarios.find(f => f.id === r.funcionario_id && f.origem === r.tipo);
        const nome = func ? func.nome.toLowerCase() : '';

        if (filtroBusca && !nome.includes(filtroBusca)) return false;

        // Só exibe se tiver pelo menos um campo preenchido
        const temRegistro = r.banco_horas || r.ferias || r.licenca_medica || r.falta || r.sobra || r.observacao;
        return !!temRegistro;
    });
}

function renderizarTabela() {
    const tbody = document.getElementById('funcionariosBody');
    const thead = document.querySelector('#funcionariosBody').closest('table').querySelector('thead');

    // 🔧 CABEÇALHO COM A COLUNA DATA
    thead.innerHTML = `
        <tr>
            <th class="border border-gray-300 px-3 py-2 text-center font-bold text-black w-24">DATA</th>
            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-black">NOME</th>
            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-red-600">BANCO DE HORAS</th>
            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-red-600">FÉRIAS:</th>
            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-red-600">LICENÇA MÉDICA:</th>
            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-red-600">FALTA:</th>
            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-red-600">SOBRA:</th>
            <th class="border border-gray-300 px-3 py-2 text-center font-bold text-gray-600">AÇÕES:</th>
        </tr>
    `;

    const registros = obterRegistrosFiltrados();

    if (registros.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-10 text-gray-400">
                    <div class="text-5xl mb-2">📭</div>
                    <p>Nenhum registro de situação para o período selecionado</p>
                </td>
            </tr>
        `;
        document.getElementById('totalRegistros').textContent = '0';
        return;
    }

    // Ordenar por data decrescente e depois por nome
    const registrosOrdenados = [...registros].sort((a, b) => {
        if (a.data !== b.data) return b.data.localeCompare(a.data);
        const funcA = funcionarios.find(f => f.id === a.funcionario_id && f.origem === a.tipo)?.nome || '';
        const funcB = funcionarios.find(f => f.id === b.funcionario_id && f.origem === b.tipo)?.nome || '';
        return funcA.localeCompare(funcB);
    });

    let html = '';
    registrosOrdenados.forEach(r => {
        const func = funcionarios.find(f => f.id === r.funcionario_id && f.origem === r.tipo);
        const nomeFunc = func ? func.nome : `ID ${r.funcionario_id}`;

        const bancoHoras = r.banco_horas || '';
        const ferias = r.ferias || '';
        const licencaMedica = r.licenca_medica || '';
        const falta = r.falta || '';
        const sobra = r.sobra || '';

        html += `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap">${formatarData(r.data)}</td>
                <td class="border border-gray-300 px-3 py-2 font-bold">${nomeFunc}</td>
                <td class="border border-gray-300 px-3 py-2">
                    ${bancoHoras ? `<span class="text-blue-700 font-semibold">${bancoHoras}</span>` : ''}
                </td>
                <td class="border border-gray-300 px-3 py-2">
                    ${ferias ? `<span class="text-blue-700 font-semibold">${ferias}</span>` : ''}
                </td>
                <td class="border border-gray-300 px-3 py-2">
                    ${licencaMedica ? `<span class="text-yellow-600 font-semibold">${licencaMedica}</span>` : ''}
                </td>
                <td class="border border-gray-300 px-3 py-2">
                    ${falta ? `<span class="text-red-600 font-bold">${falta}</span>` : ''}
                </td>
                <td class="border border-gray-300 px-3 py-2">
                    ${sobra ? `<span class="text-green-700 font-semibold">${sobra}</span>` : ''}
                </td>
                <td class="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">
                    <button onclick="abrirModalVisualizar(${r.id})" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition" title="Visualizar">👁️</button>
                    <button onclick="abrirModalEditar(${r.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition" title="Editar">✏️</button>
                    <button onclick="excluirRegistro(${r.id})" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    document.getElementById('totalRegistros').textContent = registrosOrdenados.length;
}

// ===== MODAL DE VISUALIZAÇÃO =====
function abrirModalVisualizar(registroId) {
    const registro = statusRegistros.find(r => r.id === registroId);
    if (!registro) {
        mostrarToast('Registro não encontrado', 'info');
        return;
    }

    const funcionario = funcionarios.find(f => f.id === registro.funcionario_id && f.origem === registro.tipo);

    document.getElementById('visualizarNome').textContent = funcionario?.nome || 'Desconhecido';
    document.getElementById('visualizarData').textContent = formatarData(registro.data);
    document.getElementById('visualizarBancoHoras').textContent = registro.banco_horas || '-';
    document.getElementById('visualizarFerias').textContent = registro.ferias || '-';
    document.getElementById('visualizarLicenca').textContent = registro.licenca_medica || '-';
    document.getElementById('visualizarFalta').textContent = registro.falta || '-';
    document.getElementById('visualizarSobra').textContent = registro.sobra || '-';
    document.getElementById('visualizarObservacao').textContent = registro.observacao || '-';

    document.getElementById('modalVisualizar').classList.remove('hidden');
    document.getElementById('modalVisualizar').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function fecharModalVisualizar() {
    document.getElementById('modalVisualizar').style.display = 'none';
    document.getElementById('modalVisualizar').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// ===== MODAL DE EDIÇÃO =====
function abrirModalEditar(registroId) {
    const registro = statusRegistros.find(r => r.id === registroId);
    if (!registro) {
        mostrarToast('Registro não encontrado para editar', 'info');
        return;
    }

    const funcionario = funcionarios.find(f => f.id === registro.funcionario_id && f.origem === registro.tipo);

    document.getElementById('modalRegistroId').value = registro.id;
    document.getElementById('modalDataRegistro').value = registro.data;
    document.getElementById('modalFuncionarioNome').value = `${funcionario?.nome || ''} (${formatarData(registro.data)})`;
    document.getElementById('modalFuncionarioId').value = registro.funcionario_id;
    document.getElementById('modalTipo').value = registro.tipo;
    document.getElementById('modalBancoHoras').value = registro.banco_horas || '';
    const { inicio: fInicio, fim: fFim } = extrairDatasPeriodo(registro.ferias);
    const modalFeriasInicio = document.getElementById('modalFeriasInicio');
    const modalFeriasFim = document.getElementById('modalFeriasFim');
    if (modalFeriasInicio) modalFeriasInicio.value = fInicio;
    if (modalFeriasFim) modalFeriasFim.value = fFim;
    document.getElementById('modalLicencaMedica').value = registro.licenca_medica || '';
    document.getElementById('modalFalta').value = registro.falta || '';
    document.getElementById('modalSobra').value = registro.sobra || '';
    document.getElementById('modalObservacao').value = registro.observacao || '';

    document.getElementById('modalEditar').classList.remove('hidden');
    document.getElementById('modalEditar').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function fecharModalEditar() {
    document.getElementById('modalEditar').style.display = 'none';
    document.getElementById('modalEditar').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// ===== SALVAR EDIÇÃO NO MODAL =====
async function salvarEdicaoModal(event) {
    event.preventDefault();
    
    const registroId = document.getElementById('modalRegistroId').value;
    const funcionarioId = document.getElementById('modalFuncionarioId').value;
    const tipo = document.getElementById('modalTipo').value;
    const dataRegistro = document.getElementById('modalDataRegistro').value;

    const bancoHoras = document.getElementById('modalBancoHoras').value.trim();
    const feriasInicio = document.getElementById('modalFeriasInicio')?.value || '';
    const feriasFim = document.getElementById('modalFeriasFim')?.value || '';
    const ferias = formatarPeriodoFerias(feriasInicio, feriasFim);
    const licencaMedica = document.getElementById('modalLicencaMedica').value.trim();
    const falta = document.getElementById('modalFalta').value.trim();
    const sobra = document.getElementById('modalSobra').value.trim();
    const observacao = document.getElementById('modalObservacao').value.trim();

    if ((feriasInicio && !feriasFim) || (!feriasInicio && feriasFim)) {
        mostrarToast('Preencha a data inicial e final das férias', 'error');
        return;
    }

    const dados = {
        banco_horas: bancoHoras || null,
        ferias: ferias || null,
        licenca_medica: licencaMedica || null,
        falta: falta || null,
        sobra: sobra || null,
        observacao: observacao || null
    };

    try {
        let query = supabaseClient.from('funcionarios_status').update(dados);

        if (registroId) {
            query = query.eq('id', parseInt(registroId));
        } else {
            query = query.eq('funcionario_id', parseInt(funcionarioId))
                         .eq('tipo', tipo)
                         .eq('data', dataRegistro);
        }

        const { error } = await query;
        if (error) throw error;

        mostrarToast('Registro atualizado com sucesso!');
        fecharModalEditar();
        await carregarDados();
    } catch (error) {
        console.error('Erro ao atualizar registro:', error);
        mostrarToast('Erro ao atualizar registro', 'error');
    }
}

// ===== EXCLUSÃO =====
async function excluirRegistro(registroId) {
    if (!confirm('Deseja realmente excluir este registro?')) return;

    try {
        const { error } = await supabaseClient
            .from('funcionarios_status')
            .delete()
            .eq('id', parseInt(registroId));

        if (error) throw error;

        mostrarToast('Registro excluído com sucesso!');
        await carregarDados();
    } catch (error) {
        console.error('Erro ao excluir registro:', error);
        mostrarToast('Erro ao excluir registro', 'error');
    }
}

// ===== RELATÓRIO GERAL EM PDF =====
async function gerarRelatorioFuncionariosPDF() {
    if (typeof window.jspdf === 'undefined') {
        mostrarToast('Biblioteca PDF não carregada!', 'error');
        return;
    }

    const dataInicio = document.getElementById('filtroDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroDataFim')?.value || '';
    const registros = obterRegistrosFiltrados();

    if (registros.length === 0) {
        mostrarToast('Nenhum registro para exportar no período selecionado.', 'info');
        return;
    }

    // Ordenação cronológica para o relatório
    const registrosOrdenados = [...registros].sort((a, b) => {
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        const funcA = funcionarios.find(f => f.id === a.funcionario_id && f.origem === a.tipo)?.nome || '';
        const funcB = funcionarios.find(f => f.id === b.funcionario_id && f.origem === b.tipo)?.nome || '';
        return funcA.localeCompare(funcB);
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'mm', 'a4');

    const corHeader = [128, 0, 128]; // Roxo
    const corPrimaria = [26, 115, 232];

    // ===== CABEÇALHO =====
    doc.setFontSize(16);
    doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.setFont(undefined, 'bold');
    doc.text('RELATÓRIO GERAL - SITUAÇÃO DOS FUNCIONÁRIOS', 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    doc.setFont(undefined, 'normal');

    let textoPeriodo = 'Período: Todos os registros cadastrados';
    if (dataInicio && dataFim) {
        textoPeriodo = `Período: ${formatarData(dataInicio)} até ${formatarData(dataFim)}`;
    } else if (dataInicio) {
        textoPeriodo = `A partir de: ${formatarData(dataInicio)}`;
    } else if (dataFim) {
        textoPeriodo = `Até: ${formatarData(dataFim)}`;
    }
    doc.text(textoPeriodo, 14, 22);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total de Registros: ${registrosOrdenados.length}`, 14, 28);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 32, 283, 32);

    // Linhas da tabela
    const headers = ['Data', 'Nome', 'Função', 'Banco de Horas', 'Férias', 'Licença Médica', 'Falta', 'Sobra', 'Observação'];
    const rows = registrosOrdenados.map(r => {
        const func = funcionarios.find(f => f.id === r.funcionario_id && f.origem === r.tipo);
        return [
            formatarData(r.data),
            func?.nome || `ID ${r.funcionario_id}`,
            r.tipo === 'motorista' ? 'Motorista' : 'Ajudante',
            r.banco_horas || '-',
            r.ferias || '-',
            r.licenca_medica || '-',
            r.falta || '-',
            r.sobra || '-',
            r.observacao || '-'
        ];
    });

    doc.autoTable({
        startY: 36,
        head: [headers],
        body: rows,
        theme: 'striped',
        headStyles: {
            fillColor: corHeader,
            textColor: [255, 255, 255],
            fontSize: 7.5,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
        },
        styles: {
            fontSize: 7,
            cellPadding: 2,
            lineColor: [220, 220, 220],
            lineWidth: 0.1,
            overflow: 'linebreak',
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 42, halign: 'left', fontStyle: 'bold' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 28, halign: 'center' },
            4: { cellWidth: 24, halign: 'center' },
            5: { cellWidth: 26, halign: 'center' },
            6: { cellWidth: 24, halign: 'center' },
            7: { cellWidth: 24, halign: 'center' },
            8: { cellWidth: 59, halign: 'left' }
        },
        alternateRowStyles: {
            fillColor: [248, 249, 250]
        },
        didParseCell: function(data) {
            if (data.section === 'body') {
                // Destacar faltas em vermelho se houver
                if (data.column.index === 6 && data.cell.raw && data.cell.raw !== '-') {
                    data.cell.styles.textColor = [220, 38, 38];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        },
        margin: { left: 14, right: 14 }
    });

    // Rodapé
    const dataGeracao = new Date().toLocaleString('pt-BR');
    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Relatório gerado em: ${dataGeracao}`, 283, Math.min(finalY, 202), { align: 'right' });

    const nomeArquivo = `relatorio_funcionarios_${dataInicio || 'inicio'}_a_${dataFim || 'fim'}.pdf`;
    doc.save(nomeArquivo);
    mostrarToast('Relatório PDF gerado com sucesso!');
}

// ===== FUNÇÕES AUXILIARES =====
function formatarPeriodoFerias(inicio, fim) {
    if (!inicio && !fim) return '';
    if (inicio && fim) {
        return `${formatarData(inicio)} a ${formatarData(fim)}`;
    }
    return inicio ? formatarData(inicio) : formatarData(fim);
}

function converterDataBrParaIso(dataBr) {
    if (!dataBr) return '';
    const partes = dataBr.trim().split('/');
    if (partes.length === 3) {
        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
    return '';
}

function extrairDatasPeriodo(texto) {
    if (!texto) return { inicio: '', fim: '' };
    // Formato esperado: "DD/MM/AAAA a DD/MM/AAAA" ou "AAAA-MM-DD a AAAA-MM-DD"
    const partes = texto.split(/\s+a\s+|\s+à\s+|\s+ate\s+|\s+até\s+/i);
    if (partes.length === 2) {
        const parte1 = partes[0].trim();
        const parte2 = partes[1].trim();
        const data1 = parte1.includes('/') ? converterDataBrParaIso(parte1) : (parte1.includes('-') ? parte1 : '');
        const data2 = parte2.includes('/') ? converterDataBrParaIso(parte2) : (parte2.includes('-') ? parte2 : '');
        return { inicio: data1, fim: data2 };
    }
    return { inicio: '', fim: '' };
}

function limparForm() {
    document.getElementById('funcionarioId').value = '';
    document.getElementById('funcionarioTipo').value = '';
    document.getElementById('statusData').value = obterDataLocalFormatada(new Date());
    document.getElementById('bancoHoras').value = '';
    const feriasInicio = document.getElementById('feriasInicio');
    const feriasFim = document.getElementById('feriasFim');
    if (feriasInicio) feriasInicio.value = '';
    if (feriasFim) feriasFim.value = '';
    document.getElementById('licencaMedica').value = '';
    document.getElementById('falta').value = '';
    document.getElementById('sobra').value = '';
    document.getElementById('observacao').value = '';
}

// ===== FUNÇÕES AUXILIARES DE DATA =====
function obterDataLocalFormatada(d = new Date()) {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function obterPeriodoPadrao2Meses() {
    const fim = new Date();
    const inicio = new Date();
    inicio.setMonth(inicio.getMonth() - 2);
    return {
        dataInicio: obterDataLocalFormatada(inicio),
        dataFim: obterDataLocalFormatada(fim)
    };
}

function limparFiltros() {
    const { dataInicio, dataFim } = obterPeriodoPadrao2Meses();
    const dataInicioInput = document.getElementById('filtroDataInicio');
    const dataFimInput = document.getElementById('filtroDataFim');
    if (dataInicioInput) dataInicioInput.value = dataInicio;
    if (dataFimInput) dataFimInput.value = dataFim;
    document.getElementById('filtroBusca').value = '';
    renderizarTabela();
}

function formatarData(data) {
    if (!data) return '-';
    const partes = data.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return new Date(data).toLocaleDateString('pt-BR');
}

function mostrarToast(mensagem, tipo = 'success') {
    const cores = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 ${cores[tipo] || 'bg-blue-500'} text-white px-6 py-3 rounded-xl shadow-lg font-medium animate-slide-in z-50 max-w-md`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== INICIALIZAÇÃO =====
function inicializar() {
    const hoje = obterDataLocalFormatada(new Date());
    document.getElementById('statusData').value = hoje;
    
    // Inicializa período com os últimos 2 meses por padrão
    const { dataInicio, dataFim } = obterPeriodoPadrao2Meses();
    const dataInicioInput = document.getElementById('filtroDataInicio');
    const dataFimInput = document.getElementById('filtroDataFim');
    if (dataInicioInput) dataInicioInput.value = dataInicio;
    if (dataFimInput) dataFimInput.value = dataFim;

    carregarDados();
}

document.addEventListener('DOMContentLoaded', inicializar);
window.gerarRelatorioFuncionariosPDF = gerarRelatorioFuncionariosPDF;