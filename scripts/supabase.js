// =====================================================
// CONFIGURAÇÃO SUPABASE - SIMPLIFICADA
// =====================================================

// Configurações
const SUPABASE_URL = 'https://xtgzclzkareiqgnreeei.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sPY5wO67_Vc5BLOscqLn_A_XL--7dq_';

// Criar cliente Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Exportar para uso global
window.supabaseClient = supabaseClient;

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function formatarData(data) {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
}

function formatarMoeda(valor) {
    return valor ? `R$ ${Number(valor).toFixed(2).replace('.', ',')}` : 'R$ 0,00';
}

function mostrarToast(mensagem, tipo = 'success') {
    const cores = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 ${cores[tipo] || 'bg-blue-500'} text-white px-6 py-3 rounded-xl shadow-lg font-medium animate-slide-in z-50 max-w-md`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}