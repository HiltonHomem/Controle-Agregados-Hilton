// =====================================================
// VERIFICAÇÃO DE AUTENTICAÇÃO E SAUDAÇÃO
// =====================================================

let usuarioAtual = null;
let escalas = [];
let veiculos = [];
let motoristas = [];
let ajudantes = [];
let precos = []; // 🔧 Preços das rotas
let itemParaExcluir = null;

// 🔧 LISTA DE ROTAS PADRÃO PARA O SELECT (EM ORDEM ALFABÉTICA)
const ROTAS_PADRAO = [
    "ANGRA",
    "ARARUAMA",
    "ARRAIAL DO CABO",
    "BAIXADA (ATÉ QUEIMADOS)",
    "BARRA",
    "BÚZIOS",
    "CAXIAS",
    "CENTRO",
    "GUAPIMIRIM",
    "ITAGUAÍ",
    "ITAIPAVA",
    "JACAREPAGUÁ",
    "MAGÉ",
    "MARICÁ",
    "NITERÓI",
    "NORTE",
    "OESTE 1",
    "OESTE 2",
    "PETRÓPOLIS",
    "REALENGO",
    "RECREIO",
    "RIO DAS OSTRAS",
    "SÃO GONÇALO",
    "SÃO JOSÉ DO VALE",
    "SÃO PEDRO DA ALDEIA",
    "SAQUAREMA",
    "SUL",
    "TERESÓPOLIS"
];

async function verificarAuth() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    await carregarUsuario(session.user.id);
}

async function carregarUsuario(userId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('usuarios')
            .select('nome, email, role')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        usuarioAtual = data;
        atualizarSaudacao();
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        usuarioAtual = { 
            nome: session?.user?.email?.split('@')[0] || 'Usuário',
            email: session?.user?.email,
            role: 'user'
        };
        atualizarSaudacao();
    }
}

function atualizarSaudacao() {
    const saudacaoEl = document.getElementById('saudacaoUsuario');
    if (!saudacaoEl) return;
    
    const nome = usuarioAtual?.nome || 'Usuário';
    saudacaoEl.innerHTML = getSaudacaoPorDia(nome);
}

function getSaudacaoPorDia(nome) {
    const hoje = new Date();
    const diaSemana = hoje.getDay();
    const hora = hoje.getHours();
    
    let saudacaoHora = '';
    if (hora < 12) saudacaoHora = 'Bom dia';
    else if (hora < 18) saudacaoHora = 'Boa tarde';
    else saudacaoHora = 'Boa noite';
    
    if (diaSemana === 5) {
        return `🎉 ${saudacaoHora}, ${nome}! <span class="text-yellow-300">Sextou!! 🥳</span>`;
    }
    
    return `👋 ${saudacaoHora}, ${nome}!`;
}

async function fazerLogout() {
    try {
        await window.supabaseClient.auth.signOut();
        mostrarToast('Logout realizado com sucesso!', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 500);
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        mostrarToast('Erro ao fazer logout', 'error');
    }
}

// =====================================================
// FUNÇÕES DE UTILIDADE
// =====================================================

function formatarData(data) {
    if (!data) return '-';
    const partes = data.split('-');
    if (partes.length === 3) {
        const d = new Date(partes[0], partes[1] - 1, partes[2]);
        return d.toLocaleDateString('pt-BR');
    }
    return new Date(data).toLocaleDateString('pt-BR');
}

function getDiaSemana(data) {
    if (!data) return '';
    const partes = data.split('-');
    if (partes.length === 3) {
        const d = new Date(partes[0], partes[1] - 1, partes[2]);
        const dias = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
        return dias[d.getDay()];
    }
    const d = new Date(data);
    const dias = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
    return dias[d.getDay()];
}

function getStatusClass(status) {
    if (!status || status === 'OK') return 'status-ok';
    if (status === 'OFICINA') return 'status-oficina';
    if (status === 'INDISPONÍVEL') return 'status-indisponivel';
    if (status === 'ESCALADO') return 'status-escalado';
    if (status === 'DISPONÍVEL') return 'status-disponivel';
    return 'status-ok';
}

function getStatusLabel(status) {
    const labels = {
        'OK': '✅ OK',
        'OFICINA': '🔧 Oficina',
        'INDISPONÍVEL': '❌ Indisponível',
        'ESCALADO': '📌 Escalado',
        'DISPONÍVEL': '🟣 Disponível'
    };
    return labels[status] || status;
}

function mostrarToast(mensagem, tipo = 'success') {
    const cores = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 ${cores[tipo] || 'bg-blue-500'} text-white px-6 py-3 rounded-xl shadow-lg font-medium animate-slide-in z-50 max-w-md`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// =====================================================
// CARREGAR DADOS
// =====================================================

async function carregarDados() {
    try {
        const { data: veiculosData } = await supabaseClient
            .from('veiculos')
            .select('*, motoristas!proprietario_id(id, nome, motoristas_terceiros)')
            .order('nome');
        veiculos = veiculosData || [];

        const { data: motoristasData } = await supabaseClient
            .from('motoristas')
            .select('*')
            .eq('ativo', true)
            .order('nome');
        motoristas = motoristasData || [];

        const { data: ajudantesData } = await supabaseClient
            .from('ajudantes')
            .select('*')
            .eq('ativo', true)
            .order('nome');
        ajudantes = ajudantesData || [];

        // 🔧 CARREGAR PREÇOS DAS ROTAS
        const { data: precosData } = await supabaseClient
            .from('precos_rotas')
            .select('*');
        precos = precosData || [];

        const { data: escalasData } = await supabaseClient
            .from('view_escalas_completas')
            .select('*')
            .order('data', { ascending: false });
        escalas = escalasData || [];

        atualizarSelects();
        
        setTimeout(() => {
            const veiculoSelecionado = document.getElementById('escalaVeiculo').value;
            if (veiculoSelecionado) {
                atualizarCamposVeiculo();
                atualizarMotoristasPorVeiculo(veiculoSelecionado);
            }
        }, 200);
        
        renderizarEscalas();
        document.getElementById('totalEscalasBadge').textContent = escalas.length;
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        mostrarToast('Erro ao carregar dados', 'error');
    }
}

// =====================================================
// PREENCHER MOTORISTAS
// =====================================================

function preencherMotoristas(selectElement, veiculoId) {
    if (!selectElement) return;
    
    const value = selectElement.value;
    let motoristasDisponiveis = [];
    
    if (veiculoId) {
        const veiculo = veiculos.find(v => v.id === parseInt(veiculoId));
        
        if (veiculo?.proprietario_id) {
            const proprietario = motoristas.find(m => m.id === veiculo.proprietario_id);
            
            if (proprietario) {
                motoristasDisponiveis.push({
                    id: proprietario.id,
                    nome: proprietario.nome,
                    tipo: proprietario.tipo,
                    isTerceirizado: false,
                    nomeTerceiro: '',
                    grupo: 'proprietario',
                    nomeExibicao: proprietario.nome
                });
                
                if (proprietario.motoristas_terceiros) {
                    let terceiros = proprietario.motoristas_terceiros;
                    if (typeof terceiros === 'string') {
                        try { terceiros = JSON.parse(terceiros); } catch(e) { terceiros = []; }
                    }
                    if (!Array.isArray(terceiros)) terceiros = [];
                    
                    terceiros.forEach(nomeTerceiro => {
                        const nomeExibicao = `${proprietario.nome} (${nomeTerceiro})`;
                        
                        const motoristaExistente = motoristas.find(m => m.nome === nomeTerceiro);
                        if (motoristaExistente) {
                            motoristasDisponiveis.push({
                                id: motoristaExistente.id,
                                nome: motoristaExistente.nome,
                                tipo: motoristaExistente.tipo,
                                isTerceirizado: true,
                                nomeTerceiro: nomeTerceiro,
                                proprietarioId: proprietario.id,
                                grupo: 'terceirizado',
                                nomeExibicao: nomeExibicao
                            });
                        } else {
                            motoristasDisponiveis.push({
                                id: `terceiro_${proprietario.id}_${nomeTerceiro}`,
                                nome: nomeTerceiro,
                                tipo: 'terceirizado',
                                isTerceirizado: true,
                                nomeTerceiro: nomeTerceiro,
                                proprietarioId: proprietario.id,
                                isNomeApenas: true,
                                grupo: 'terceirizado',
                                nomeExibicao: nomeExibicao
                            });
                        }
                    });
                }
                
                const funcionarios = motoristas
                    .filter(m => m.tipo === 'funcionario' && m.ativo === true)
                    .map(m => ({
                        id: m.id,
                        nome: m.nome,
                        tipo: m.tipo,
                        isTerceirizado: false,
                        nomeTerceiro: '',
                        grupo: 'funcionario',
                        nomeExibicao: m.nome
                    }));
                
                motoristasDisponiveis = [...motoristasDisponiveis, ...funcionarios];
            }
        } else {
            motoristasDisponiveis = motoristas
                .filter(m => m.ativo === true)
                .map(m => ({
                    id: m.id,
                    nome: m.nome,
                    tipo: m.tipo,
                    isTerceirizado: false,
                    nomeTerceiro: '',
                    grupo: m.tipo === 'agregado' ? 'agregado' : 'funcionario',
                    nomeExibicao: m.nome
                }));
        }
    } else {
        motoristasDisponiveis = motoristas
            .filter(m => m.ativo === true)
            .map(m => ({
                id: m.id,
                nome: m.nome,
                tipo: m.tipo,
                isTerceirizado: false,
                nomeTerceiro: '',
                grupo: m.tipo === 'agregado' ? 'agregado' : 'funcionario',
                nomeExibicao: m.nome
            }));
    }
    
    selectElement.innerHTML = '<option value="">Selecione...</option>';
    
    const grupos = {
        proprietario: [],
        terceirizado: [],
        funcionario: [],
        agregado: []
    };
    
    motoristasDisponiveis.forEach(m => {
        if (m.grupo) {
            grupos[m.grupo].push(m);
        }
    });
    
    if (grupos.proprietario.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '👨‍💼 Proprietário';
        grupos.proprietario.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.nomeExibicao;
            option.dataset.terceirizado = 'false';
            option.dataset.nomeTerceiro = '';
            optgroup.appendChild(option);
        });
        selectElement.appendChild(optgroup);
    }
    
    if (grupos.terceirizado.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '🔶 Terceirizados';
        grupos.terceirizado.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.nomeExibicao;
            option.dataset.terceirizado = 'true';
            option.dataset.nomeTerceiro = m.nomeTerceiro || '';
            optgroup.appendChild(option);
        });
        selectElement.appendChild(optgroup);
    }
    
    if (grupos.funcionario.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '👷 Funcionários';
        grupos.funcionario.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.nomeExibicao;
            option.dataset.terceirizado = 'false';
            option.dataset.nomeTerceiro = '';
            optgroup.appendChild(option);
        });
        selectElement.appendChild(optgroup);
    }
    
    if (grupos.agregado.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '👨‍💼 Agregados';
        grupos.agregado.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.nomeExibicao;
            option.dataset.terceirizado = 'false';
            option.dataset.nomeTerceiro = '';
            optgroup.appendChild(option);
        });
        selectElement.appendChild(optgroup);
    }
    
    if (value) {
        const optionExists = Array.from(selectElement.options).some(opt => opt.value === value);
        if (optionExists) {
            selectElement.value = value;
        }
    }
}

function preencherMotoristasModal(selectElement, veiculoId) {
    if (!selectElement) return;
    
    const value = selectElement.value;
    let motoristasDisponiveis = [];
    
    if (veiculoId) {
        const veiculo = veiculos.find(v => v.id === parseInt(veiculoId));
        
        if (veiculo?.proprietario_id) {
            const proprietario = motoristas.find(m => m.id === veiculo.proprietario_id);
            
            if (proprietario) {
                motoristasDisponiveis.push({
                    id: proprietario.id,
                    nome: proprietario.nome,
                    tipo: proprietario.tipo,
                    isTerceirizado: false,
                    nomeTerceiro: '',
                    grupo: 'proprietario',
                    nomeExibicao: proprietario.nome
                });
                
                if (proprietario.motoristas_terceiros) {
                    let terceiros = proprietario.motoristas_terceiros;
                    if (typeof terceiros === 'string') {
                        try { terceiros = JSON.parse(terceiros); } catch(e) { terceiros = []; }
                    }
                    if (!Array.isArray(terceiros)) terceiros = [];
                    
                    terceiros.forEach(nomeTerceiro => {
                        const nomeExibicao = `${proprietario.nome} (${nomeTerceiro})`;
                        
                        const motoristaExistente = motoristas.find(m => m.nome === nomeTerceiro);
                        if (motoristaExistente) {
                            motoristasDisponiveis.push({
                                id: motoristaExistente.id,
                                nome: motoristaExistente.nome,
                                tipo: motoristaExistente.tipo,
                                isTerceirizado: true,
                                nomeTerceiro: nomeTerceiro,
                                proprietarioId: proprietario.id,
                                grupo: 'terceirizado',
                                nomeExibicao: nomeExibicao
                            });
                        } else {
                            motoristasDisponiveis.push({
                                id: `terceiro_${proprietario.id}_${nomeTerceiro}`,
                                nome: nomeTerceiro,
                                tipo: 'terceirizado',
                                isTerceirizado: true,
                                nomeTerceiro: nomeTerceiro,
                                proprietarioId: proprietario.id,
                                isNomeApenas: true,
                                grupo: 'terceirizado',
                                nomeExibicao: nomeExibicao
                            });
                        }
                    });
                }
                
                const funcionarios = motoristas
                    .filter(m => m.tipo === 'funcionario' && m.ativo === true)
                    .map(m => ({
                        id: m.id,
                        nome: m.nome,
                        tipo: m.tipo,
                        isTerceirizado: false,
                        nomeTerceiro: '',
                        grupo: 'funcionario',
                        nomeExibicao: m.nome
                    }));
                
                motoristasDisponiveis = [...motoristasDisponiveis, ...funcionarios];
            }
        } else {
            motoristasDisponiveis = motoristas
                .filter(m => m.ativo === true)
                .map(m => ({
                    id: m.id,
                    nome: m.nome,
                    tipo: m.tipo,
                    isTerceirizado: false,
                    nomeTerceiro: '',
                    grupo: m.tipo === 'agregado' ? 'agregado' : 'funcionario',
                    nomeExibicao: m.nome
                }));
        }
    } else {
        motoristasDisponiveis = motoristas
            .filter(m => m.ativo === true)
            .map(m => ({
                id: m.id,
                nome: m.nome,
                tipo: m.tipo,
                isTerceirizado: false,
                nomeTerceiro: '',
                grupo: m.tipo === 'agregado' ? 'agregado' : 'funcionario',
                nomeExibicao: m.nome
            }));
    }
    
    selectElement.innerHTML = '<option value="">Selecione...</option>';
    
    const grupos = {
        proprietario: [],
        terceirizado: [],
        funcionario: [],
        agregado: []
    };
    
    motoristasDisponiveis.forEach(m => {
        if (m.grupo) {
            grupos[m.grupo].push(m);
        }
    });
    
    if (grupos.proprietario.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '👨‍💼 Proprietário';
        grupos.proprietario.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.nomeExibicao;
            option.dataset.terceirizado = 'false';
            option.dataset.nomeTerceiro = '';
            optgroup.appendChild(option);
        });
        selectElement.appendChild(optgroup);
    }
    
    if (grupos.terceirizado.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '🔶 Terceirizados';
        grupos.terceirizado.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.nomeExibicao;
            option.dataset.terceirizado = 'true';
            option.dataset.nomeTerceiro = m.nomeTerceiro || '';
            optgroup.appendChild(option);
        });
        selectElement.appendChild(optgroup);
    }
    
    if (grupos.funcionario.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '👷 Funcionários';
        grupos.funcionario.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.nomeExibicao;
            option.dataset.terceirizado = 'false';
            option.dataset.nomeTerceiro = '';
            optgroup.appendChild(option);
        });
        selectElement.appendChild(optgroup);
    }
    
    if (grupos.agregado.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '👨‍💼 Agregados';
        grupos.agregado.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.nomeExibicao;
            option.dataset.terceirizado = 'false';
            option.dataset.nomeTerceiro = '';
            optgroup.appendChild(option);
        });
        selectElement.appendChild(optgroup);
    }
    
    if (value) {
        const optionExists = Array.from(selectElement.options).some(opt => opt.value === value);
        if (optionExists) {
            selectElement.value = value;
        }
    }
}

function atualizarMotoristasPorVeiculo(veiculoId) {
    const selectMotorista = document.getElementById('escalaMotorista');
    preencherMotoristas(selectMotorista, veiculoId);
}

function atualizarSelects() {
    const selectVeiculo = document.getElementById('escalaVeiculo');
    if (selectVeiculo) {
        const value = selectVeiculo.value;
        selectVeiculo.innerHTML = '<option value="">Selecione...</option>';
        veiculos.forEach(v => {
            const proprietario = v.motoristas?.nome || 'Frota Própria';
            selectVeiculo.innerHTML += `<option value="${v.id}" data-placa="${v.placa || ''}" data-peso="${v.peso_max || 0}" data-proprietario="${v.proprietario_id || ''}">${v.nome} (${v.placa || 'SEM PLACA'}) - Dono: ${proprietario}</option>`;
        });
        if (value) {
            selectVeiculo.value = value;
            setTimeout(() => atualizarCamposVeiculo(), 100);
        } else {
            document.getElementById('escalaPlaca').value = '';
            document.getElementById('escalaPeso').value = '';
            document.getElementById('escalaProprietario').value = '';
        }
        
        selectVeiculo.removeEventListener('change', handleVeiculoChange);
        selectVeiculo.addEventListener('change', handleVeiculoChange);
    }

    const selectMotorista = document.getElementById('escalaMotorista');
    if (selectMotorista) {
        preencherMotoristas(selectMotorista, null);
    }

    const selectAjudante = document.getElementById('escalaAjudante');
    if (selectAjudante) {
        selectAjudante.innerHTML = '';
        ajudantes.forEach(a => {
            selectAjudante.innerHTML += `<option value="${a.id}">${a.nome}</option>`;
        });
    }

    // 🔧 PREENCHER SELECT DE ROTAS
    const selectRota = document.getElementById('escalaRota');
    if (selectRota) {
        selectRota.innerHTML = '';
        ROTAS_PADRAO.forEach(rota => {
            selectRota.innerHTML += `<option value="${rota}">${rota}</option>`;
        });
    }

    const selectRotaModal = document.getElementById('modalRota');
    if (selectRotaModal) {
        selectRotaModal.innerHTML = '';
        ROTAS_PADRAO.forEach(rota => {
            selectRotaModal.innerHTML += `<option value="${rota}">${rota}</option>`;
        });
    }

    const modalVeiculo = document.getElementById('modalVeiculo');
    if (modalVeiculo) {
        const value = modalVeiculo.value;
        modalVeiculo.innerHTML = '<option value="">Selecione...</option>';
        veiculos.forEach(v => {
            modalVeiculo.innerHTML += `<option value="${v.id}" data-placa="${v.placa || ''}" data-peso="${v.peso_max || 0}">${v.nome} (${v.placa || 'SEM PLACA'})</option>`;
        });
        if (value) {
            modalVeiculo.value = value;
            setTimeout(() => atualizarCamposVeiculoModal(), 100);
        }
        
        modalVeiculo.removeEventListener('change', handleModalVeiculoChange);
        modalVeiculo.addEventListener('change', handleModalVeiculoChange);
    }

    const modalMotorista = document.getElementById('modalMotorista');
    if (modalMotorista) {
        preencherMotoristasModal(modalMotorista, null);
    }

    const modalAjudante = document.getElementById('modalAjudante');
    if (modalAjudante) {
        modalAjudante.innerHTML = '';
        ajudantes.forEach(a => {
            modalAjudante.innerHTML += `<option value="${a.id}">${a.nome}</option>`;
        });
    }
}

function handleVeiculoChange() {
    atualizarCamposVeiculo();
    const veiculoId = this.value;
    if (veiculoId) {
        atualizarMotoristasPorVeiculo(veiculoId);
    } else {
        document.getElementById('escalaPlaca').value = '';
        document.getElementById('escalaPeso').value = '';
        document.getElementById('escalaProprietario').value = '';
        const selectMotorista = document.getElementById('escalaMotorista');
        preencherMotoristas(selectMotorista, null);
    }
}

function handleModalVeiculoChange() {
    atualizarCamposVeiculoModal();
    const veiculoId = this.value;
    const modalMotorista = document.getElementById('modalMotorista');
    if (veiculoId) {
        preencherMotoristasModal(modalMotorista, veiculoId);
    } else {
        preencherMotoristasModal(modalMotorista, null);
    }
}

function atualizarCamposVeiculo() {
    const select = document.getElementById('escalaVeiculo');
    const selected = select.options[select.selectedIndex];
    
    const placa = selected?.dataset?.placa || '';
    const peso = selected?.dataset?.peso || '';
    const proprietarioId = selected?.dataset?.proprietario || '';
    
    document.getElementById('escalaPlaca').value = placa;
    document.getElementById('escalaPeso').value = peso;
    
    if (proprietarioId) {
        const proprietario = motoristas.find(m => m.id === parseInt(proprietarioId));
        document.getElementById('escalaProprietario').value = proprietario?.nome || 'Frota Própria';
    } else {
        document.getElementById('escalaProprietario').value = 'Frota Própria';
    }
    
    if (select.value) {
        atualizarMotoristasPorVeiculo(select.value);
    }
}

function atualizarCamposVeiculoModal() {
    const select = document.getElementById('modalVeiculo');
    const selected = select.options[select.selectedIndex];
    
    const placa = selected?.dataset?.placa || '';
    const peso = selected?.dataset?.peso || '';
    
    document.getElementById('modalPlaca').value = placa;
    document.getElementById('modalPeso').value = peso;
}

// =====================================================
// SALVAR ESCALA
// =====================================================

async function salvarEscala(event) {
    event.preventDefault();
    const id = document.getElementById('editEscalaId').value;
    
    const veiculoId = document.getElementById('escalaVeiculo').value;
    const motoristaSelect = document.getElementById('escalaMotorista');
    const motoristaId = motoristaSelect.value;
    const ajudanteSelect = document.getElementById('escalaAjudante');
    const ajudantesIds = Array.from(ajudanteSelect.selectedOptions).map(opt => opt.value).filter(v => v);
    
           const selectedOption = motoristaSelect.options[motoristaSelect.selectedIndex];
        const isTerceirizado = selectedOption?.dataset?.terceirizado === 'true';
        const nomeTerceiro = selectedOption?.dataset?.nomeTerceiro || '';
        let motoristaNome = '';
        let motoristaIdReal = null; // 🔧 VARIÁVEL PARA O ID REAL

        if (isTerceirizado && nomeTerceiro) {
            // 🔧 CORREÇÃO CRÍTICA: Se for terceirizado, o motorista_id DEVE ser o ID do PROPRIETÁRIO
            // Buscar o veículo para achar o proprietário
            const veiculoSelecionado = veiculos.find(v => v.id === parseInt(veiculoId));
            const proprietario = motoristas.find(m => m.id === veiculoSelecionado?.proprietario_id);
            
            if (proprietario) {
                motoristaNome = `${proprietario.nome} (${nomeTerceiro})`;
                motoristaIdReal = proprietario.id; // 🔧 Usa o ID do proprietário
            } else {
                motoristaNome = `Desconhecido (${nomeTerceiro})`;
            }
        } else if (motoristaId) {
            const motorista = motoristas.find(m => m.id === parseInt(motoristaId));
            motoristaNome = motorista?.nome || '';
            motoristaIdReal = motoristaId ? parseInt(motoristaId) : null;
        }
        
        const dados = {
            data: document.getElementById('escalaData').value,
            veiculo_id: parseInt(veiculoId),
            motorista_id: motoristaIdReal, // 🔧 Usa o ID real (do proprietário para terceirizados)
        motorista_nome: motoristaNome,
        rota: Array.from(document.getElementById('escalaRota').selectedOptions).map(opt => opt.value).join(' \\ '),
        status: document.getElementById('escalaStatus').value || 'ESCALADO',
        celular: document.getElementById('escalaCelular').value.trim(),
        maquina_cartao: parseFloat(document.getElementById('escalaMaquina').value) || 0,
        nf: document.getElementById('escalaNF').value.trim() || '',
        peso_carga: parseFloat(document.getElementById('escalaPesoCarga').value) || 0,
        retornos: document.getElementById('escalaRetornos').value.trim(),
        carregamento: document.getElementById('escalaCarregamento').value.trim(),
        observacao: document.getElementById('escalaObs').value.trim(),
        confirmado: false
    };

    if (!dados.data || !dados.veiculo_id || !dados.rota) {
        mostrarToast('Preencha Data, Veículo e Rota', 'error');
        return;
    }

    try {
        let result;
        if (id) {
            result = await supabaseClient
                .from('escalas')
                .update(dados)
                .eq('id', parseInt(id));
        } else {
            result = await supabaseClient
                .from('escalas')
                .insert([dados])
                .select();
        }

        if (result.error) throw result.error;

        if (ajudantesIds.length > 0) {
            let escalaId = id;
            if (!id && result.data) {
                escalaId = result.data[0].id;
            }
            
            if (id) {
                await supabaseClient
                    .from('escala_ajudantes')
                    .delete()
                    .eq('escala_id', parseInt(id));
            }
            
            const ajudantesInsert = ajudantesIds.map(aId => ({
                escala_id: parseInt(escalaId),
                ajudante_id: parseInt(aId)
            }));
            
            if (ajudantesInsert.length > 0) {
                await supabaseClient
                    .from('escala_ajudantes')
                    .insert(ajudantesInsert);
            }
        }

        mostrarToast(id ? 'Escala atualizada!' : 'Escala salva!');
        limparFormEscala();
        await carregarDados();
    } catch (error) {
        console.error('Erro ao salvar escala:', error);
        mostrarToast('Erro ao salvar escala', 'error');
    }
}

// =====================================================
// MODAL CONFIRMAR VIAGEM
// =====================================================

async function abrirModalConfirmar(id) {
    const item = escalas.find(e => e.id === id);
    
    if (!item) {
        mostrarToast('Escala não encontrada', 'error');
        return;
    }

    if (item.confirmado) {
        mostrarToast('Esta viagem já foi confirmada!', 'error');
        return;
    }

    if (!item.motorista_id) {
        mostrarToast('Esta escala não tem um motorista vinculado!', 'error');
        return;
    }

    let motorista = motoristas.find(m => m.id === item.motorista_id);
    if (!motorista) {
        try {
            const { data } = await supabaseClient
                .from('motoristas')
                .select('id, nome')
                .eq('id', item.motorista_id)
                .single();
            if (data) motorista = data;
        } catch (error) {
            console.error('Erro ao buscar motorista:', error);
        }
    }

    const veiculo = veiculos.find(v => v.id === item.veiculo_id);
    const proprietario = veiculo?.proprietario_id ? motoristas.find(m => m.id === veiculo.proprietario_id) : null;
    
    const isFuncionario = motorista?.tipo === 'funcionario';
    const isProprietario = motorista?.id === veiculo?.proprietario_id;
    
    let isTerceirizado = false;
    if (veiculo?.proprietario_id && motorista && !isProprietario) {
        const proprietarioVeiculo = motoristas.find(m => m.id === veiculo.proprietario_id);
        if (proprietarioVeiculo?.motoristas_terceiros) {
            let terceiros = proprietarioVeiculo.motoristas_terceiros;
            if (typeof terceiros === 'string') {
                try { terceiros = JSON.parse(terceiros); } catch(e) { terceiros = []; }
            }
            if (!Array.isArray(terceiros)) terceiros = [];
            isTerceirizado = terceiros.includes(motorista?.nome || '');
        }
    }

    document.getElementById('confEscalaId').value = item.id;
    document.getElementById('confMotoristaId').value = item.motorista_id || '';
    document.getElementById('confProprietarioId').value = veiculo?.proprietario_id || '';
    
    document.getElementById('confIsFuncionario').value = isFuncionario ? 'true' : 'false';
    document.getElementById('confIsTerceirizado').value = isTerceirizado ? 'true' : 'false';
    
    document.getElementById('modalConfMotorista').textContent = item.motorista_nome || motorista?.nome || 'N/A';
    document.getElementById('modalConfData').textContent = formatarData(item.data);
    document.getElementById('modalConfRota').textContent = item.rota;
    document.getElementById('modalConfVeiculo').textContent = veiculo?.nome || 'N/A';
    document.getElementById('modalConfProprietario').textContent = proprietario?.nome || 'Frota Própria (Empresa)';
    
    const deveCobrarChapa = isFuncionario && veiculo?.proprietario_id && !isProprietario;
    
    document.getElementById('confChapa').required = deveCobrarChapa;
    document.getElementById('confChapa').placeholder = deveCobrarChapa ? 'Valor da chapa (obrigatório)' : '0.00';
    if (!deveCobrarChapa) {
        document.getElementById('confChapa').value = 0;
    }
    
    // 🔧 CALCULAR VALOR AUTOMÁTICO (Preço da rota, ou maior rota + 200 se for combo)
    let valorSugerido = 550; // Valor fallback caso não encontre nada

    const rotasSeparadas = item.rota.split(' \\ ').filter(r => r.trim() !== '');

    if (rotasSeparadas.length === 1) {
        const precoUnico = precos.find(p => p.veiculo_id === item.veiculo_id && p.rota.trim().toUpperCase() === rotasSeparadas[0].trim().toUpperCase());
        if (precoUnico) {
            valorSugerido = parseFloat(precoUnico.valor_diaria);
        }
    } else if (rotasSeparadas.length > 1) {
        let maiorValor = 0;
        rotasSeparadas.forEach(rota => {
            const preco = precos.find(p => p.veiculo_id === item.veiculo_id && p.rota.trim().toUpperCase() === rota.trim().toUpperCase());
            if (preco && parseFloat(preco.valor_diaria) > maiorValor) {
                maiorValor = parseFloat(preco.valor_diaria);
            }
        });
        if (maiorValor > 0) {
            valorSugerido = maiorValor + 200;
        }
    }

    document.getElementById('confValorDiaria').value = valorSugerido;
    document.getElementById('confPedagio').value = 0;
    document.getElementById('confAlmoco').value = 0;
    document.getElementById('confDesconto').value = 0;
    document.getElementById('confObservacao').value = `Viagem confirmada - ${item.rota}`;

    const modalConfirmar = document.getElementById('modalConfirmarViagem');
    modalConfirmar.classList.remove('hidden');
    modalConfirmar.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function fecharModalConfirmar() {
    const modalConfirmar = document.getElementById('modalConfirmarViagem');
    modalConfirmar.style.display = 'none';
    modalConfirmar.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

async function confirmarViagem(event) {
    event.preventDefault();
    
    const escalaId = document.getElementById('confEscalaId').value;
    const motoristaId = document.getElementById('confMotoristaId').value;
    const proprietarioId = document.getElementById('confProprietarioId').value;
    const isFuncionario = document.getElementById('confIsFuncionario').value === 'true';
    const isTerceirizado = document.getElementById('confIsTerceirizado').value === 'true';
    
    const valorDiaria = parseFloat(document.getElementById('confValorDiaria').value) || 0;
    const pedagio = parseFloat(document.getElementById('confPedagio').value) || 0;
    const almoco = parseFloat(document.getElementById('confAlmoco').value) || 0;
    const chapa = parseFloat(document.getElementById('confChapa').value) || 0;
    const desconto = parseFloat(document.getElementById('confDesconto').value) || 0;
    const observacao = document.getElementById('confObservacao').value.trim();

    if (valorDiaria < 0) {
        mostrarToast('Informe o valor da diária', 'error');
        return;
    }

    try {
        const escala = escalas.find(e => e.id === parseInt(escalaId));
        if (!escala) return;

        const motorista = motoristas.find(m => m.id === parseInt(motoristaId));
        const veiculo = veiculos.find(v => v.id === escala.veiculo_id);
        const motoristaNome = escala?.motorista_nome || motorista?.nome || '';

        let proprietario_id = null;
        let chapaValor = 0;
        
        if (veiculo && veiculo.proprietario_id) {
            proprietario_id = veiculo.proprietario_id;
            
            if (isFuncionario && !isTerceirizado) {
                chapaValor = chapa;
                if (chapaValor <= 0) {
                    mostrarToast('Informe o valor da chapa (funcionário dirigindo veículo de agregado)', 'error');
                    return;
                }
            } else {
                chapaValor = 0;
            }
        } else {
            proprietario_id = null;
            chapaValor = 0;
        }

        const novoLancamento = {
            motorista_id: parseInt(motoristaId),
            proprietario_id: proprietario_id,
            veiculo_id: escala.veiculo_id,
            escala_id: parseInt(escalaId),
            data: escala.data,
            rota: escala.rota,
            valor_diaria: valorDiaria,
            pedagio: pedagio,
            almoco: almoco,
            chapa: chapaValor,
            desconto: desconto,
            observacao: observacao || `Viagem confirmada - ${escala.rota}`,
            origem: 'escala',
            motorista_nome: motoristaNome
        };

        const { error } = await supabaseClient.from('lancamentos').insert([novoLancamento]);
        if (error) throw error;

        await supabaseClient
            .from('escalas')
            .update({
                status: 'OK',
                confirmado: true,
                observacao: (escala.observacao || '') + ` | Confirmado em ${new Date().toLocaleString('pt-BR')}`
            })
            .eq('id', parseInt(escalaId));

        fecharModalConfirmar();
        await carregarDados();
        
        let mensagem = 'Viagem confirmada! ';
        if (proprietario_id) {
            const proprietario = motoristas.find(m => m.id === proprietario_id);
            mensagem += `Pagamento para ${proprietario?.nome || 'agregado'}`;
            if (chapaValor > 0) {
                mensagem += ` (diária: R$ ${valorDiaria.toFixed(2)} - chapa: R$ ${chapaValor.toFixed(2)})`;
                mensagem += ` e chapa para ${motorista?.nome || 'funcionário'} (R$ ${chapaValor.toFixed(2)})`;
            } else {
                mensagem += ` (R$ ${valorDiaria.toFixed(2)})`;
                if (motorista && parseInt(motoristaId) !== proprietario_id) {
                    mensagem += ' - Motorista terceirizado pago pelo agregado';
                }
            }
        } else {
            mensagem += `Pagamento para ${motorista?.nome || 'motorista'} (R$ ${valorDiaria.toFixed(2)})`;
        }
        
        mostrarToast(mensagem);
    } catch (error) {
        console.error('Erro ao confirmar viagem:', error);
        mostrarToast('Erro ao confirmar viagem', 'error');
    }
}

// =====================================================
// MODAL EDIÇÃO
// =====================================================

function editarEscala(id) {
    const idNum = parseInt(id);
    const idStr = String(id);
    let item = escalas.find(e => e.id === idNum || e.id === idStr || String(e.id) === idStr);
    
    if (!item) {
        mostrarToast('Escala não encontrada', 'error');
        return;
    }
    
    document.getElementById('modalEditId').value = item.id;
    document.getElementById('modalData').value = item.data;
    document.getElementById('modalVeiculo').value = item.veiculo_id || '';
    document.getElementById('modalStatus').value = item.status || 'ESCALADO';
    
    // 🔧 Pré-selecionar rotas no select múltiplo
    if (item.rota) {
        const rotasEdit = item.rota.split(' \\ ');
        const selectModalRota = document.getElementById('modalRota');
        Array.from(selectModalRota.options).forEach(opt => {
            if (rotasEdit.includes(opt.value)) {
                opt.selected = true;
            }
        });
    }
    
    document.getElementById('modalCelular').value = item.celular || '';
    document.getElementById('modalMaquina').value = item.maquina_cartao || 0;
    document.getElementById('modalNF').value = item.nf || '';
    document.getElementById('modalPesoCarga').value = item.peso_carga || 0;
    document.getElementById('modalRetornos').value = item.retornos || '';
    document.getElementById('modalCarregamento').value = item.carregamento || '';
    document.getElementById('modalObs').value = item.observacao || '';
    document.getElementById('modalTitle').textContent = `✏️ Editar Escala - ${item.veiculo_nome || 'N/A'}`;
    
    const veiculoSelecionado = document.getElementById('modalVeiculo');
    const selectedOption = veiculoSelecionado.options[veiculoSelecionado.selectedIndex];
    if (selectedOption) {
        document.getElementById('modalPlaca').value = selectedOption?.dataset?.placa || '';
        document.getElementById('modalPeso').value = selectedOption?.dataset?.peso || '';
    }
    
                const modalMotorista = document.getElementById('modalMotorista');
            if (item.veiculo_id) {
                preencherMotoristasModal(modalMotorista, item.veiculo_id);
                // 🔧 CORREÇÃO: Pré-selecionar com base no NOME SALVO (ex: "FRANCISCO (JOSE CARLOS)")
                // 1. Se for um nome composto com parênteses (terceirizado)
                if (item.motorista_nome && item.motorista_nome.includes('(')) {
                    // Procurar a opção no select que tenha exatamente esse texto
                    const opcaoEncontrada = Array.from(modalMotorista.options).find(opt => 
                        opt.textContent.trim().toUpperCase() === item.motorista_nome.trim().toUpperCase()
                    );
                    if (opcaoEncontrada) {
                        modalMotorista.value = opcaoEncontrada.value;
                    }
                } 
                // 2. Se for apenas o nome do proprietário ou funcionário
                else if (item.motorista_id) {
                    modalMotorista.value = item.motorista_id;
                }
            } else {
                preencherMotoristasModal(modalMotorista, null);
                if (item.motorista_id) {
                    modalMotorista.value = item.motorista_id;
                }
            }
    
    const modalAjudante = document.getElementById('modalAjudante');
    if (item.nomes_ajudantes) {
        const nomesAjudantes = item.nomes_ajudantes.split(',').map(n => n.trim());
        Array.from(modalAjudante.options).forEach(opt => {
            if (nomesAjudantes.includes(opt.textContent.trim())) {
                opt.selected = true;
            }
        });
    }
    
    const modalEdicao = document.getElementById('modalEdicao');
    modalEdicao.classList.remove('hidden');
    modalEdicao.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function fecharModal() {
    const modalEdicao = document.getElementById('modalEdicao');
    modalEdicao.style.display = 'none';
    modalEdicao.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

async function salvarEdicaoModal(event) {
    event.preventDefault();
    const id = document.getElementById('modalEditId').value;
    
    const veiculoId = document.getElementById('modalVeiculo').value;
    const motoristaSelect = document.getElementById('modalMotorista');
    const motoristaId = motoristaSelect.value;
    const ajudanteSelect = document.getElementById('modalAjudante');
    const ajudantesIds = Array.from(ajudanteSelect.selectedOptions).map(opt => opt.value).filter(v => v);
    
     const selectedOption = motoristaSelect.options[motoristaSelect.selectedIndex];
            const isTerceirizado = selectedOption?.dataset?.terceirizado === 'true';
            const nomeTerceiro = selectedOption?.dataset?.nomeTerceiro || '';
            let motoristaNome = '';
            let motoristaIdReal = null; // 🔧 RESETA PARA NULL
            
            if (isTerceirizado && nomeTerceiro) {
                // 🔧 CORREÇÃO CRÍTICA: Se for terceirizado, o motorista_id DEVE ser o ID do PROPRIETÁRIO
                const veiculo = veiculos.find(v => v.id === parseInt(veiculoId));
                const proprietario = motoristas.find(m => m.id === veiculo?.proprietario_id);
                
                if (proprietario) {
                    motoristaNome = `${proprietario.nome} (${nomeTerceiro})`;
                    motoristaIdReal = proprietario.id; // 🔧 Usa o ID do proprietário
                } else {
                    motoristaNome = `Desconhecido (${nomeTerceiro})`;
                }
            } else if (motoristaId) {
                const motorista = motoristas.find(m => m.id === parseInt(motoristaId));
                motoristaNome = motorista?.nome || '';
                motoristaIdReal = motoristaId ? parseInt(motoristaId) : null;
            }
    
    const dados = {
        data: document.getElementById('modalData').value,
        veiculo_id: parseInt(veiculoId),
        motorista_id: motoristaIdReal,
        motorista_nome: motoristaNome,
        rota: Array.from(document.getElementById('modalRota').selectedOptions).map(opt => opt.value).join(' \\ '),
        status: document.getElementById('modalStatus').value || 'ESCALADO',
        celular: document.getElementById('modalCelular').value.trim(),
        maquina_cartao: parseFloat(document.getElementById('modalMaquina').value) || 0,
        nf: document.getElementById('modalNF').value.trim() || '',
        peso_carga: parseFloat(document.getElementById('modalPesoCarga').value) || 0,
        retornos: document.getElementById('modalRetornos').value.trim() || '',
        carregamento: document.getElementById('modalCarregamento').value.trim() || '',
        observacao: document.getElementById('modalObs').value.trim() || ''
    };

    if (!dados.data || !dados.veiculo_id || !dados.rota) {
        mostrarToast('Preencha Data, Veículo e Rota', 'error');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('escalas')
            .update(dados)
            .eq('id', parseInt(id));

        if (error) throw error;

        await supabaseClient.from('escala_ajudantes').delete().eq('escala_id', parseInt(id));
        
        if (ajudantesIds.length > 0) {
            const ajudantesInsert = ajudantesIds.map(aId => ({
                escala_id: parseInt(id),
                ajudante_id: parseInt(aId)
            }));
            await supabaseClient.from('escala_ajudantes').insert(ajudantesInsert);
        }

        fecharModal();
        await carregarDados();
        mostrarToast('Escala atualizada com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar escala:', error);
        mostrarToast('Erro ao atualizar escala', 'error');
    }
}

function confirmarExclusao() {
    const id = document.getElementById('modalEditId').value;
    if (id) {
        fecharModal();
        setTimeout(() => excluirEscala(id), 200);
    }
}

function excluirEscala(id) {
    itemParaExcluir = id;
    const item = escalas.find(e => e.id === id);
    document.getElementById('confirmMessage').textContent = 'Deseja realmente excluir esta escala?';
    document.getElementById('confirmSubmessage').textContent = `${item?.veiculo_nome || 'Item'} - ${item?.data ? formatarData(item.data) : ''}`;
    document.getElementById('btnConfirmarExclusao').onclick = executarExclusao;
    
    const modalExclusao = document.getElementById('modalConfirmacao');
    modalExclusao.classList.remove('hidden');
    modalExclusao.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function fecharConfirmacao() {
    const modalExclusao = document.getElementById('modalConfirmacao');
    modalExclusao.style.display = 'none';
    modalExclusao.classList.add('hidden');
    document.body.style.overflow = 'auto';
    itemParaExcluir = null;
}

async function executarExclusao() {
    if (!itemParaExcluir) return;
    
    try {
        await supabaseClient
            .from('escalas')
            .delete()
            .eq('id', parseInt(itemParaExcluir));
        
        itemParaExcluir = null;
        fecharConfirmacao();
        if (document.getElementById('modalEdicao').style.display === 'flex') fecharModal();
        await carregarDados();
        mostrarToast('Escala excluída com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir escala:', error);
        mostrarToast('Erro ao excluir escala', 'error');
    }
}

// =====================================================
// LIMPAR E FILTRAR
// =====================================================

function limparFormEscala() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('editEscalaId').value = '';
    document.getElementById('escalaData').value = hoje;
    document.getElementById('escalaVeiculo').value = '';
    document.getElementById('escalaPlaca').value = '';
    document.getElementById('escalaPeso').value = '';
    document.getElementById('escalaMotorista').value = '';
    document.getElementById('escalaProprietario').value = '';
    
    const ajudanteSelect = document.getElementById('escalaAjudante');
    if (ajudanteSelect) {
        Array.from(ajudanteSelect.options).forEach(opt => opt.selected = false);
    }

    // 🔧 LIMPAR SELECT DE ROTAS
    const selectRota = document.getElementById('escalaRota');
    if (selectRota) {
        Array.from(selectRota.options).forEach(opt => opt.selected = false);
    }

    document.getElementById('escalaStatus').value = 'ESCALADO';
    document.getElementById('escalaCelular').value = '';
    document.getElementById('escalaMaquina').value = '0';
    document.getElementById('escalaNF').value = '';
    document.getElementById('escalaPesoCarga').value = '0';
    document.getElementById('escalaRetornos').value = '';
    document.getElementById('escalaCarregamento').value = '';
    document.getElementById('escalaObs').value = '';
    document.getElementById('escalaFormMode').textContent = 'Inserção';
    document.getElementById('btnSalvarEscala').textContent = '💾 Salvar Escala';
    document.getElementById('btnCancelarEscala').classList.add('hidden');
}

function cancelarEdicaoEscala() { limparFormEscala(); }
function aplicarFiltros() { renderizarEscalas(); }

// =====================================================
// RENDERIZAR ESCALAS
// =====================================================

function renderizarEscalas() {
    const container = document.getElementById('escalaCards');
    let dados = [...escalas];

    const filtroData = document.getElementById('filtroEscalaData').value;
    const filtroMotorista = document.getElementById('filtroEscalaMotorista').value.toLowerCase();
    const filtroVeiculo = document.getElementById('filtroEscalaVeiculo').value.toLowerCase();
    const filtroRota = document.getElementById('filtroEscalaRota').value.toLowerCase();
    const filtroStatus = document.getElementById('filtroEscalaStatus').value;
    const filtroTipo = document.getElementById('filtroTipo').value;

    if (filtroData) dados = dados.filter(e => e.data === filtroData);
    if (filtroMotorista) dados = dados.filter(e => (e.motorista_nome_completo || '').toLowerCase().includes(filtroMotorista));
    if (filtroVeiculo) dados = dados.filter(e => (e.veiculo_nome || '').toLowerCase().includes(filtroVeiculo));
    if (filtroRota) dados = dados.filter(e => (e.rota || '').toLowerCase().includes(filtroRota));
    if (filtroStatus) dados = dados.filter(e => e.status === filtroStatus);

    if (filtroTipo === 'agregado') {
        dados = dados.filter(e => e.veiculo_proprietario_id !== null && e.veiculo_proprietario_id !== undefined);
    } else if (filtroTipo === 'frota') {
        dados = dados.filter(e => e.veiculo_proprietario_id === null || e.veiculo_proprietario_id === undefined);
    }

    if (dados.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-gray-400">
                <div class="text-5xl mb-2">📋</div>
                <p>Nenhuma escala encontrada</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
                <thead class="bg-gray-50 border-b-2 border-gray-300 sticky top-0 z-10">
                    <tr>
                        <th class="px-4 py-3 text-left font-semibold text-gray-600 border-b-2 border-gray-300">Data</th>
                        <th class="px-4 py-3 text-left font-semibold text-gray-600 border-b-2 border-gray-300">Veículo</th>
                        <th class="px-4 py-3 text-left font-semibold text-gray-600 border-b-2 border-gray-300">Placa</th>
                        <th class="px-4 py-3 text-center font-semibold text-gray-600 border-b-2 border-gray-300">Peso</th>
                        <th class="px-4 py-3 text-center font-semibold text-gray-600 border-b-2 border-gray-300">Status</th>
                        <th class="px-4 py-3 text-left font-semibold text-gray-600 border-b-2 border-gray-300">Motorista</th>
                        <th class="px-4 py-3 text-left font-semibold text-gray-600 border-b-2 border-gray-300">Ajudante(s)</th>
                        <th class="px-4 py-3 text-center font-semibold text-gray-600 border-b-2 border-gray-300">Tipo</th>
                        <th class="px-4 py-3 text-left font-semibold text-gray-600 border-b-2 border-gray-300">Rota</th>
                        <th class="px-4 py-3 text-center font-semibold text-gray-600 border-b-2 border-gray-300">Ações</th>
                    </tr>
                </thead>
                <tbody>
    `;

    dados.forEach(e => {
        const statusClass = getStatusClass(e.status);
        const statusLabel = getStatusLabel(e.status);
        const veiculoNome = e.veiculo_nome || 'Sem veículo';
        const placa = e.veiculo_placa || '';
        const peso = e.veiculo_peso || '';
        
        const veiculoProprietario = e.veiculo_proprietario_id !== null && e.veiculo_proprietario_id !== undefined;
        const isTerceirizado = e.motorista_nome_completo && e.motorista_nome_completo.includes('(');
        const isChapa = veiculoProprietario && e.motorista_id && e.motorista_id !== e.veiculo_proprietario_id;
        
        let borderColor = 'border-blue-600';
        let cardBgClass = 'bg-white';
        let badgeAgregado = '';
        let badgeTerceirizado = '';
        let badgeChapa = '';

        if (e.status === 'OK') borderColor = 'border-green-500';
        else if (e.status === 'OFICINA') borderColor = 'border-yellow-500';
        else if (e.status === 'INDISPONÍVEL') borderColor = 'border-red-500';
        else if (e.status === 'DISPONÍVEL') borderColor = 'border-purple-500';
        else if (e.status === 'ESCALADO') borderColor = 'border-blue-600';

        if (veiculoProprietario) {
            if (isChapa) {
                cardBgClass = 'bg-orange-200';
                badgeAgregado = '<span class="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full shadow-sm">🟧 CHAPA</span>';
                
                if (isTerceirizado) {
                    badgeTerceirizado = '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">🔶 Terceirizado</span>';
                }
            } else {
                cardBgClass = 'bg-blue-50/80';
                badgeAgregado = '<span class="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">🔵 Agregado</span>';
                
                if (isTerceirizado) {
                    badgeTerceirizado = '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">🔶 Terceirizado</span>';
                }
            }
        } else {
            cardBgClass = 'bg-white';
        }

        const btnConfirmar = e.confirmado 
            ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✅ Confirmado</span>'
            : `<button onclick="abrirModalConfirmar(${e.id})" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition">✅</button>`;

        html += `
            <tr class="${cardBgClass} hover-row border-t border-gray-300">
                <td class="px-3 py-1.5 font-medium text-sm">${formatarData(e.data)}</td>
                <td class="px-3 py-1.5 font-semibold text-sm">${veiculoNome}</td>
                <td class="px-3 py-1.5 text-gray-600 text-sm">${placa}</td>
                <td class="px-3 py-1.5 text-center text-gray-600 text-sm">${peso}kg</td>
                <td class="px-3 py-1.5 text-center">
                    <span class="${statusClass} text-sm">${statusLabel}</span>
                </td>
                <td class="px-3 py-1.5 font-medium text-sm">${e.motorista_nome || '-'}</td>
                <td class="px-3 py-1.5 text-gray-500 text-xs">${e.nomes_ajudantes || '-'}</td>
                <td class="px-3 py-1.5 text-center">
                    ${badgeAgregado}
                    ${badgeTerceirizado}
                </td>
                <td class="px-3 py-1.5 text-gray-600 text-sm">${e.rota}</td>
                <td class="px-3 py-1.5 text-center">
                    <div class="flex items-center justify-center gap-1 flex-wrap">
                        ${btnConfirmar}
                        <button onclick="editarEscala(${e.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] transition">✏️</button>
                        <button onclick="excluirEscala(${e.id})" class="bg-red-500 hover:bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] transition">🗑️</button>
                    </div>
                </td>
            </tr>
        `;

        html += `
            <tr class="${cardBgClass} detalhes-row border-b border-gray-300">
                <td colspan="10" class="px-3 py-0">
                    <div class="flex flex-wrap gap-1.5 text-[10px] text-gray-500 leading-tight">
                        ${e.celular ? `<span><span class="font-medium text-gray-600">📱</span> ${e.celular}</span>` : ''}
                        ${e.nf ? `<span><span class="font-medium text-gray-600">📄</span> ${e.nf}</span>` : ''}
                        ${e.peso_carga ? `<span><span class="font-medium text-gray-600">⚖️</span> ${e.peso_carga}kg</span>` : ''}
                        ${e.retornos ? `<span><span class="font-medium text-gray-600">🔄</span> ${e.retornos}</span>` : ''}
                        ${e.carregamento ? `<span><span class="font-medium text-gray-600">📦</span> ${e.carregamento}</span>` : ''}
                        ${e.observacao ? `<span class="text-yellow-600"><span class="font-medium text-gray-600">📌</span> ${e.observacao}</span>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// =====================================================
// ESCUTADORES DE EVENTO E INICIALIZAÇÃO
// =====================================================

window.onclick = function(event) {
    const modalEdicao = document.getElementById('modalEdicao');
    const modalConfirmacao = document.getElementById('modalConfirmacao');
    const modalConfirmarViagem = document.getElementById('modalConfirmarViagem');
    
    if (event.target === modalEdicao) fecharModal();
    if (event.target === modalConfirmacao) fecharConfirmacao();
    if (event.target === modalConfirmarViagem) fecharModalConfirmar();
};

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        fecharModal();
        fecharConfirmacao();
        fecharModalConfirmar();
    }
});

function inicializar() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('escalaData').value = hoje;
    document.getElementById('filtroEscalaData').value = hoje;
    carregarDados();
    verificarAuth();
}

document.addEventListener('DOMContentLoaded', inicializar);