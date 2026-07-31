// =====================================================
// footer.js - Footer com Tutorial Completo
// =====================================================

(function() {
    'use strict';

    // ===== CONFIGURAÇÕES =====
    const CONFIG = {
        versao: '1.0.0',
        anoAtual: new Date().getFullYear(),
        empresa: 'Sistema de Gestão Logística'
    };

    // ===== FUNÇÃO PARA CRIAR O FOOTER =====
    function criarFooter() {
        // Verificar se o footer já existe
        if (document.getElementById('footerSistema')) return;

        const footer = document.createElement('footer');
        footer.id = 'footerSistema';
        footer.className = 'mt-10 pt-6 border-t border-gray-200/20';
        footer.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 md:px-5">
                <!-- ===== TUTORIAL COMPLETO ===== -->
                <div class="bg-gradient-to-br from-blue-950/80 via-blue-900/60 to-blue-950/80 backdrop-blur-sm rounded-2xl p-6 mb-5 border border-blue-700/30 shadow-lg shadow-blue-900/20">
                    
                    <!-- Título -->
                    <div class="text-center mb-5">
                        <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-200 text-xs font-semibold tracking-wider uppercase">
                            📚 Guia Rápido do Sistema
                        </span>
                    </div>
                    
                    <!-- Grid de Passos -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <!-- Passo 1: Escala -->
                        <div class="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all duration-300 border border-white/5 hover:border-blue-500/30">
                            <div class="flex items-center gap-3 mb-2">
                                <span class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 text-sm font-bold">1</span>
                                <span class="text-white font-semibold text-sm">📋 Crie Escalas</span>
                            </div>
                            <p class="text-gray-300 text-sm leading-relaxed pl-11">
                                Organize o dia a dia criando <span class="text-blue-300 font-medium">escalas</span> 
                                com veículos, motoristas e ajudantes. Defina a rota, status e todas as informações 
                                necessárias para a viagem.
                            </p>
                            <div class="mt-2 pl-11 text-white text-xs">
                                💡 Use os filtros para encontrar escalas rapidamente
                            </div>
                        </div>

                        <!-- Passo 2: Confirmar Viagem -->
                        <div class="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all duration-300 border border-white/5 hover:border-green-500/30">
                            <div class="flex items-center gap-3 mb-2">
                                <span class="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-300 text-sm font-bold">2</span>
                                <span class="text-white font-semibold text-sm">✅ Confirme Viagens</span>
                            </div>
                            <p class="text-gray-300 text-sm leading-relaxed pl-11">
                                Ao finalizar a viagem, <span class="text-green-300 font-medium">confirme</span> 
                                no sistema. Isso gera automaticamente um <span class="text-yellow-300 font-medium">lançamento financeiro</span> 
                                com todos os valores (diária, pedágio, almoço, chapa e descontos).
                            </p>
                            <div class="mt-2 pl-11 text-white text-xs">
                                💡 O sistema sugere valores automaticamente com base na rota
                            </div>
                        </div>

                        <!-- Passo 3: Pagamentos -->
                        <div class="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all duration-300 border border-white/5 hover:border-yellow-500/30">
                            <div class="flex items-center gap-3 mb-2">
                                <span class="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-300 text-sm font-bold">3</span>
                                <span class="text-white font-semibold text-sm">💰 Gerencie Pagamentos</span>
                            </div>
                            <p class="text-gray-300 text-sm leading-relaxed pl-11">
                                Acompanhe todos os <span class="text-yellow-300 font-medium">pagamentos</span> 
                                no Controle de Agregados. Visualize relatórios gerais ou <span class="text-purple-300 font-medium">quinzenais</span> 
                                por motorista e exporte em PDF.
                            </p>
                            <div class="mt-2 pl-11 text-white text-xs">
                                💡 Use os filtros para consultar períodos específicos
                            </div>
                        </div>
                    </div>

                    <!-- Fluxo Visual -->
                    <div class="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
                        <span class="px-3 py-1 rounded-full bg-blue-600/30 text-blue-200">📋 Escala</span>
                        <span class="text-white text-lg">→</span>
                        <span class="px-3 py-1 rounded-full bg-green-600/30 text-green-200">✅ Confirmação</span>
                        <span class="text-white text-lg">→</span>
                        <span class="px-3 py-1 rounded-full bg-yellow-600/30 text-yellow-200">💰 Lançamento</span>
                            <span class="text-white text-lg">→</span>
                        <span class="px-3 py-1 rounded-full bg-purple-600/30 text-purple-200">📊 Relatórios</span>
                        <span class="text-white text-lg">→</span>
                        <span class="px-3 py-1 rounded-full bg-pink-600/30 text-pink-200">🎯 Controle total</span>
                    </div>

                    <!-- Dica Final -->
                    <div class="mt-4 text-center text-xs text-gray-400 border-t border-gray-700/30 pt-3">
                        <span class="text-blue-300">🚀</span> 
                        Todos os dados são sincronizados em <span class="text-purple-300 font-medium">tempo real</span> com o Supabase
                        <span class="hidden sm:inline"> · Acompanhe tudo em um só lugar</span>
                    </div>
                </div>
                
                <!-- ===== FOOTER PRINCIPAL ===== -->
                <div class="flex flex-wrap justify-between items-center gap-2 text-xs text-gray-500">
                    <div class="flex flex-wrap items-center gap-3">
                        <span class="text-gray-300">${CONFIG.empresa}</span>
                        <span class="w-px h-3 bg-gray-700 hidden sm:block"></span>
                        <span>v${CONFIG.versao}</span>
                        <span class="w-px h-3 bg-gray-700 hidden sm:block"></span>
                        <span>© ${CONFIG.anoAtual}</span>
                        <span class="w-px h-3 bg-gray-700 hidden sm:block"></span>
                        <span class="text-gray-400">🔒 Acesso restrito</span>
                    </div>
                    <div class="text-white text-[10px]">
                        Desenvolvido por Hilton Homem
                    </div>
                </div>
            </div>
        `;

        // Inserir após o conteúdo principal
        const container = document.querySelector('.max-w-7xl');
        if (container) {
            container.parentNode.insertBefore(footer, container.nextSibling);
        } else {
            document.body.appendChild(footer);
        }
    }

    // ===== EXPORTAR PARA USO GLOBAL =====
    window.footer = {
        criar: criarFooter
    };

    // ===== INJETAR AUTOMATICAMENTE =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', criarFooter);
    } else {
        criarFooter();
    }

})();