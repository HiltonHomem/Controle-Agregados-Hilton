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
    const ferias = document.getElementById('ferias').value.trim();
    const licencaMedica = document.getElementById('licencaMedica').value.trim();
    const falta = document.getElementById('falta').value.trim();
    const sobra = document.getElementById('sobra').value.trim();
    const observacao = document.getElementById('observacao').value.trim();

    if (!funcionarioId || !tipo || !data) {
        mostrarToast('Selecione funcionário e data', 'error');
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
function renderizarTabela() {
    const tbody = document.getElementById('funcionariosBody');
    const thead = document.querySelector('#funcionariosBody').closest('table').querySelector('thead');
    const filtroData = document.getElementById('filtroData').value;
    const filtroBusca = document.getElementById('filtroBusca').value.toLowerCase();

    // 🔧 CABEÇALHO GERADO DINAMICAMENTE
    thead.innerHTML = `
        <tr>
            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-black">NOME</th>
            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-red-600">BANCO DE HORAS</th>
            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-red-600">FÉRIAS:</th>
            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-red-600">LICENÇA MÉDICA:</th>
            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-red-600">FALTA:</th>
            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-red-600">SOBRA:</th>
            <th class="border border-gray-300 px-3 py-2 text-center font-bold text-gray-600">AÇÕES:</th>
        </tr>
    `;

    let funcionariosFiltrados = [...funcionarios];
    if (filtroBusca) {
        funcionariosFiltrados = funcionariosFiltrados.filter(f => f.nome.toLowerCase().includes(filtroBusca));
    }

    if (funcionariosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-10 text-gray-400">
                    <div class="text-5xl mb-2">👥</div>
                    <p>Nenhum funcionário encontrado</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    funcionariosFiltrados.forEach(func => {
        const registro = statusRegistros.find(r => 
            r.funcionario_id === func.id && 
            r.tipo === func.origem &&
            (!filtroData || r.data === filtroData)
        );

        const bancoHoras = registro?.banco_horas || '';
        const ferias = registro?.ferias || '';
        const licencaMedica = registro?.licenca_medica || '';
        const falta = registro?.falta || '';
        const sobra = registro?.sobra || '';

        const temRegistro = bancoHoras || ferias || licencaMedica || falta || sobra;
        if (!temRegistro) return;

        // 🔧 BOTÕES: Visualizar, Editar e Excluir
        html += `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="border border-gray-300 px-3 py-2 font-bold">${func.nome}</td>
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
                <td class="border border-gray-300 px-3 py-2 text-center">
                    <button onclick="abrirModalVisualizar(${func.id}, '${filtroData || ''}', '${func.origem}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition">👁️</button>
                    <button onclick="abrirModalEditar(${func.id}, '${filtroData || ''}', '${func.origem}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition">✏️</button>
                    <button onclick="excluirRegistro(${func.id}, '${filtroData || ''}', '${func.origem}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition">🗑️</button>
                </td>
            </tr>
        `;
    });

    if (html === '') {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-10 text-gray-400">
                    <div class="text-5xl mb-2">📭</div>
                    <p>Nenhum registro de situação para este dia</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = html;
    document.getElementById('totalRegistros').textContent = funcionariosFiltrados.length;
}

// ===== MODAL DE VISUALIZAÇÃO =====
function abrirModalVisualizar(funcionarioId, data, tipo) {
    const funcionario = funcionarios.find(f => f.id === funcionarioId && f.origem === tipo);
    const registro = statusRegistros.find(r => r.funcionario_id === funcionarioId && r.tipo === tipo && (!data || r.data === data));

    if (!funcionario || !registro) {
        mostrarToast('Nenhum registro encontrado para visualizar', 'info');
        return;
    }

    document.getElementById('visualizarNome').textContent = funcionario.nome;
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
function abrirModalEditar(funcionarioId, data, tipo) {
    const funcionario = funcionarios.find(f => f.id === funcionarioId && f.origem === tipo);
    const registro = statusRegistros.find(r => r.funcionario_id === funcionarioId && r.tipo === tipo && (!data || r.data === data));

    if (!funcionario || !registro) {
        mostrarToast('Nenhum registro encontrado para editar', 'info');
        return;
    }

    document.getElementById('modalFuncionarioNome').value = funcionario.nome;
    document.getElementById('modalFuncionarioId').value = funcionarioId;
    document.getElementById('modalTipo').value = tipo;
    document.getElementById('modalBancoHoras').value = registro.banco_horas || '';
    document.getElementById('modalFerias').value = registro.ferias || '';
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
    
    const funcionarioId = document.getElementById('modalFuncionarioId').value;
    const tipo = document.getElementById('modalTipo').value;

    const bancoHoras = document.getElementById('modalBancoHoras').value.trim();
    const ferias = document.getElementById('modalFerias').value.trim();
    const licencaMedica = document.getElementById('modalLicencaMedica').value.trim();
    const falta = document.getElementById('modalFalta').value.trim();
    const sobra = document.getElementById('modalSobra').value.trim();
    const observacao = document.getElementById('modalObservacao').value.trim();

    const dados = {
        banco_horas: bancoHoras || null,
        ferias: ferias || null,
        licenca_medica: licencaMedica || null,
        falta: falta || null,
        sobra: sobra || null,
        observacao: observacao || null
    };

    try {
        // Buscar o registro exato
        const { data: existente } = await supabaseClient
            .from('funcionarios_status')
            .select('id')
            .eq('funcionario_id', parseInt(funcionarioId))
            .eq('tipo', tipo)
            .eq('data', document.getElementById('statusData').value) // Para a busca pelo dia atual
            .maybeSingle();

        // Se a data selecionada no filtro não for hoje, buscar pelo valor correto
        if (!existente) {
            const { data: buscarData } = await supabaseClient
                .from('funcionarios_status')
                .select('id')
                .eq('funcionario_id', parseInt(funcionarioId))
                .eq('tipo', tipo)
                .eq('data', document.getElementById('filtroData').value)
                .maybeSingle();
            
            if (buscarData) {
                const { error } = await supabaseClient
                    .from('funcionarios_status')
                    .update(dados)
                    .eq('id', buscarData.id);
                
                if (error) throw error;
            } else {
                mostrarToast('Data não encontrada no registro', 'error');
                return;
            }
        } else {
            const { error } = await supabaseClient
                .from('funcionarios_status')
                .update(dados)
                .eq('id', existente.id);
            
            if (error) throw error;
        }

        mostrarToast('Registro atualizado com sucesso!');
        fecharModalEditar();
        await carregarDados();
    } catch (error) {
        console.error('Erro ao atualizar registro:', error);
        mostrarToast('Erro ao atualizar registro', 'error');
    }
}

// ===== EXCLUSÃO =====
async function excluirRegistro(funcionarioId, data, tipo) {
    if (!confirm('Deseja realmente excluir este registro?')) return;

    try {
        const { error } = await supabaseClient
            .from('funcionarios_status')
            .delete()
            .eq('funcionario_id', funcionarioId)
            .eq('data', data)
            .eq('tipo', tipo);

        if (error) throw error;

        mostrarToast('Registro excluído com sucesso!');
        await carregarDados();
    } catch (error) {
        console.error('Erro ao excluir registro:', error);
        mostrarToast('Erro ao excluir registro', 'error');
    }
}

// ===== FUNÇÕES AUXILIARES =====
function limparForm() {
    document.getElementById('funcionarioId').value = '';
    document.getElementById('funcionarioTipo').value = '';
    document.getElementById('statusData').value = new Date().toISOString().split('T')[0];
    document.getElementById('bancoHoras').value = '';
    document.getElementById('ferias').value = '';
    document.getElementById('licencaMedica').value = '';
    document.getElementById('falta').value = '';
    document.getElementById('sobra').value = '';
    document.getElementById('observacao').value = '';
}

function limparFiltros() {
    document.getElementById('filtroData').value = '';
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
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('statusData').value = hoje;
    document.getElementById('filtroData').value = hoje;
    carregarDados();
}

document.addEventListener('DOMContentLoaded', inicializar);