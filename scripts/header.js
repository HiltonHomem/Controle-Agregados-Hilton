// =====================================================
// header.js - Header e Navegação Dinâmica
// =====================================================

// 🔧 CONFIGURAÇÕES DAS PÁGINAS
const CONFIG_PAGINAS = {
    'escala.html': { 
        titulo: '📋 Escala Logística Diária', 
        subtitulo: 'Gestão de rotas e motoristas', 
        funcaoAtualizar: 'carregarDados()' 
    },
    'dashboard.html': { 
        titulo: '📊 Dashboard', 
        subtitulo: 'Visão geral do sistema', 
        funcaoAtualizar: 'carregarDados()' 
    },
    'controle_agregados.html': { 
        titulo: '💰 Controle de Agregados', 
        subtitulo: 'Gestão financeira de motoristas', 
        funcaoAtualizar: 'carregarDados()' 
    },
    'veiculos.html': { 
        titulo: '🚗 Gestão de Veículos', 
        subtitulo: 'Frota própria, agregados e proprietários', 
        funcaoAtualizar: 'carregarDados()' 
    },
    'funcionarios.html': { 
        titulo: '👥 Gestão de Funcionários', 
        subtitulo: 'Registros diários para o RH', 
        funcaoAtualizar: 'carregarDados()' 
    },
    'admin.html': { 
        titulo: '⚙️ Administração', 
        subtitulo: 'Logs de auditoria do sistema', 
        funcaoAtualizar: 'carregarLogs()' 
    }
};

// 🔧 LISTA DE PÁGINAS PARA O MENU
const PAGINAS_MENU = [
    { arquivo: 'escala.html', icone: '📋', nome: 'Escala' },
    { arquivo: 'dashboard.html', icone: '📊', nome: 'Dashboard' },
    { arquivo: 'controle_agregados.html', icone: '💰', nome: 'Agregados' },
    { arquivo: 'veiculos.html', icone: '🚗', nome: 'Veículos' },
    { arquivo: 'funcionarios.html', icone: '👥', nome: 'Funcionários' },
    { arquivo: 'admin.html', icone: '⚙️', nome: 'Admin' }
];

let usuarioAtualHeader = null;

// ===== BUSCAR USUÁRIO LOGADO =====
async function buscarUsuario() {
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
        
        const userId = session.user.id;
        const { data, error } = await window.supabaseClient
            .from('usuarios')
            .select('nome, email, role')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        usuarioAtualHeader = data;
    } catch (error) {
        // Fallback caso não encontre na tabela
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        usuarioAtualHeader = { 
            nome: session?.user?.email?.split('@')[0] || 'Usuário',
            email: session?.user?.email,
            role: 'user'
        };
    }
    
    injetarHeader();
}

// ===== GERAR SAUDAÇÃO DINÂMICA =====
function getSaudacao(nome) {
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

// ===== INJETAR O HEADER NA PÁGINA =====
function injetarHeader() {
    const headerPrincipal = document.getElementById('headerPrincipal');
    if (!headerPrincipal) return;

    // 🔧 IDENTIFICAR A PÁGINA ATUAL
    const paginaAtual = window.location.pathname.split('/').pop() || 'escala.html';
    const configAtual = CONFIG_PAGINAS[paginaAtual] || CONFIG_PAGINAS['escala.html'];
    
    const nome = usuarioAtualHeader?.nome || 'Usuário';
    const role = usuarioAtualHeader?.role === 'admin' ? ' <span class="text-yellow-300">(Admin)</span>' : '';
    const saudacao = getSaudacao(nome);

    // 🔧 GERAR MENU DE NAVEGAÇÃO
    let menuHtml = '';
    PAGINAS_MENU.forEach(pagina => {
        const ativo = paginaAtual === pagina.arquivo ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20';
        menuHtml += `
            <a href="${pagina.arquivo}" class="px-4 py-2 rounded-lg font-medium text-sm transition ${ativo}">
                ${pagina.icone} ${pagina.nome}
            </a>
        `;
    });

    // 🔧 GERAR CONTEÚDO FINAL DO HEADER
    headerPrincipal.innerHTML = `
        <div class="flex flex-wrap justify-between items-center w-full">
            <div id="saudacaoUsuario" class="text-white text-sm font-medium">
                ${saudacao}${role}
            </div>
            <div class="flex items-center gap-2">
                <button onclick="${configAtual.funcaoAtualizar}" class="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition">🔄 Atualizar</button>
                <button onclick="fazerLogout()" class="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition">🚪 Sair</button>
            </div>
        </div>
        
        <div class="flex flex-wrap justify-between items-center w-full">
            <div>
                <h1 class="text-2xl font-bold">${configAtual.titulo}</h1>
                <p class="text-blue-100 text-sm">${configAtual.subtitulo}</p>
            </div>
            <nav class="flex gap-1 flex-wrap">
                ${menuHtml}
            </nav>
        </div>
    `;
}

// ===== FUNÇÃO DE LOGOUT (COMPARTILHADA) =====
async function fazerLogout() {
    try {
        await window.supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    buscarUsuario();
});