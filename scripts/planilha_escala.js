// =====================================================
// planilha_escala.js - Exportação PDF da Escala
// =====================================================

function buscarDadosFuncionarios() {
    try {
        // Retorna uma Promise
        return window.supabaseClient
            .from('funcionarios_status')
            .select('*')
            .then(res => res.data || []);
    } catch (error) {
        console.error('Erro ao buscar funcionarios_status:', error);
        return [];
    }
}

function encontrarStatusFuncionario(statusRegistros, data, funcionarioId, tipo) {
    if (!statusRegistros || !data || !funcionarioId) return null;
    
    return statusRegistros.find(s => 
        s.data === data && 
        s.funcionario_id === parseInt(funcionarioId) && 
        s.tipo === tipo
    );
}

async function exportarEscalaPDF(escalas, dataFiltro) {
    if (typeof window.jspdf === 'undefined') {
        console.error('Biblioteca jsPDF não carregada!');
        mostrarToast('Erro: Biblioteca PDF não carregada.', 'error');
        return;
    }

    if (!escalas || escalas.length === 0) {
        mostrarToast('Nenhuma escala para exportar', 'error');
        return;
    }

    const statusRegistros = await buscarDadosFuncionarios();

    let dados = [...escalas];
    if (dataFiltro) {
        dados = dados.filter(e => e.data === dataFiltro);
    }

    if (dados.length === 0) {
        const dataFormatada = dataFiltro ? formatarData(dataFiltro) : '';
        mostrarToast(`Nenhuma escala para ${dataFormatada}`, 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = 297;
    const pageHeight = 210;
    
    const corPrimaria = [26, 115, 232];
    const corAgregado = [52, 168, 83];
    const corFrota = [156, 163, 175];
    const corStatus = [128, 0, 128]; // Roxo
    
    const dataExemplo = dados[0].data;
    const dataFormatada = formatarData(dataExemplo);
    const diaSemana = getDiaSemanaExtenso(dataExemplo);
    
    const agregados = dados.filter(e => e.veiculo_proprietario_id !== null && e.veiculo_proprietario_id !== undefined);
    const frota = dados.filter(e => e.veiculo_proprietario_id === null || e.veiculo_proprietario_id === undefined);
    
    let totalNFGeral = 0;
    let totalPesoGeral = 0;
    
    // ===== CABEÇALHO =====
    doc.setFontSize(16);
    doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.setFont(undefined, 'bold');
    doc.text('ESCALA LOGISTICA DIARIA', 14, 15);
    
    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51);
    doc.setFont(undefined, 'normal');
    doc.text(`${dataFormatada} - ${diaSemana}`, 14, 25);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total: ${dados.length} veiculos  |  Agregados: ${agregados.length}  |  Frota Propria: ${frota.length}`, 14, 32);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 36, 280, 36);

    let startY = 40;

    function renderizarGrupo(titulo, items, cor, startY) {
        if (items.length === 0) return startY;

        doc.setFontSize(10);
        doc.setTextColor(cor[0], cor[1], cor[2]);
        doc.setFont(undefined, 'bold');
        doc.text(titulo, 14, startY);
        startY += 4;

        const headers = ['Veiculo', 'Placa', 'Motorista', 'Ajudante(s)', 'Rota', 'Celular', 'Maq.Cartao', 'NF', 'Peso Carga', 'Retornos', 'Carregamento'];
        const rows = items.map(e => {
            const nfValue = parseFloat(e.nf);
            if (!isNaN(nfValue)) totalNFGeral += nfValue;

            const pesoValue = parseFloat(e.peso_carga);
            if (!isNaN(pesoValue)) totalPesoGeral += pesoValue;

            return [
                limparTexto(e.veiculo_nome || '-'),
                limparTexto(e.veiculo_placa || '-'),
                limparTexto(e.motorista_nome_completo || '-'),
                limparTexto(e.nomes_ajudantes || '-'),
                limparTexto(e.rota || '-'),
                limparTexto(e.celular || '-'),
                e.maquina_cartao || '0',
                limparTexto(e.nf || '-'),
                e.peso_carga ? `${e.peso_carga}kg` : '-',
                limparTexto(e.retornos || '-'),
                limparTexto(e.carregamento || '-')
            ];
        });

        const colWidths = [28, 20, 32, 26, 28, 20, 16, 16, 20, 22, 22];

        doc.autoTable({
            startY: startY,
            head: [headers],
            body: rows,
            theme: 'striped',
            headStyles: {
                fillColor: cor,
                textColor: [255, 255, 255],
                fontSize: 6.5,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            styles: {
                fontSize: 6,
                cellPadding: 1,
                lineColor: [200, 200, 200],
                lineWidth: 0.1,
                overflow: 'linebreak',
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: colWidths[0], halign: 'left' },
                1: { cellWidth: colWidths[1], halign: 'center' },
                2: { cellWidth: colWidths[2], halign: 'left' },
                3: { cellWidth: colWidths[3], halign: 'left' },
                4: { cellWidth: colWidths[4], halign: 'left' },
                5: { cellWidth: colWidths[5], halign: 'center' },
                6: { cellWidth: colWidths[6], halign: 'center' },
                7: { cellWidth: colWidths[7], halign: 'center' },
                8: { cellWidth: colWidths[8], halign: 'center' },
                9: { cellWidth: colWidths[9], halign: 'center' },
                10: { cellWidth: colWidths[10], halign: 'center' }
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250]
            },
            didParseCell: function(data) {
                if (data.column.index === 2 && data.cell.raw && data.cell.raw.includes('(')) {
                    data.cell.styles.textColor = [139, 92, 246];
                    data.cell.styles.fontStyle = 'italic';
                }
            },
            margin: { left: 14, right: 14 },
            pageBreak: 'avoid'
        });

        return doc.lastAutoTable.finalY + 6;
    }

    // 🔧 CÁLCULO PARA GARANTIR 1 PÁGINA:
    // Se a tabela for muito grande, o autoTable vai quebrar. 
    // Para evitar, definimos Y como 210 (limite da página) - mas ajustamos para caber.
    
    startY = renderizarGrupo('AGREGADOS', agregados, corAgregado, startY);
    startY = renderizarGrupo('FROTA PROPRIA', frota, corFrota, startY);

    // ===== TABELA DE STATUS DOS FUNCIONÁRIOS =====
    if (statusRegistros.length > 0) {
        const statusDoDia = statusRegistros.filter(s => s.data === dataFiltro);

        if (statusDoDia.length > 0) {
            doc.setFontSize(10);
            doc.setTextColor(corStatus[0], corStatus[1], corStatus[2]);
            doc.setFont(undefined, 'bold');
            doc.text('STATUS DOS FUNCIONARIOS', 14, startY);
            startY += 4;

            // Buscar motoristas e ajudantes
            const motoristasData = await window.supabaseClient
                .from('motoristas')
                .select('id, nome')
                .eq('tipo', 'funcionario');
            const ajudantesData = await window.supabaseClient
                .from('ajudantes')
                .select('id, nome')
                .eq('ativo', true);

            const motoristas = motoristasData.data || [];
            const ajudantes = ajudantesData.data || [];

            const headersStatus = ['Nome', 'Banco de Horas', 'Férias', 'Licença Médica', 'Falta', 'Sobra', 'Observação'];
            const rowsStatus = statusDoDia.map(s => {
                let nome = '';
                if (s.tipo === 'motorista') {
                    const m = motoristas.find(m => m.id === s.funcionario_id);
                    nome = m ? m.nome : 'Desconhecido';
                } else {
                    const a = ajudantes.find(a => a.id === s.funcionario_id);
                    nome = a ? a.nome : 'Desconhecido';
                }
                return [
                    nome,
                    s.banco_horas || '-',
                    s.ferias || '-',
                    s.licenca_medica || '-',
                    s.falta || '-',
                    s.sobra || '-',
                    s.observacao || '-'
                ];
            });

            doc.autoTable({
                startY: startY,
                head: [headersStatus],
                body: rowsStatus,
                theme: 'striped',
                headStyles: {
                    fillColor: corStatus,
                    textColor: [255, 255, 255],
                    fontSize: 6.5,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle',
                    fontColor: [255, 255, 255]
                },
                styles: {
                    fontSize: 6,
                    cellPadding: 1,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.1,
                    overflow: 'linebreak',
                    valign: 'middle'
                },
                columnStyles: {
                    0: { cellWidth: 40, halign: 'left' },
                    1: { cellWidth: 30, halign: 'center' },
                    2: { cellWidth: 25, halign: 'center' },
                    3: { cellWidth: 30, halign: 'center' },
                    4: { cellWidth: 25, halign: 'center' },
                    5: { cellWidth: 25, halign: 'center' },
                    6: { cellWidth: 100, halign: 'left' }
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250]
                },
                didParseCell: function(data) {
                    if (data.column.index >= 1 && data.column.index <= 5 && data.cell.raw && data.cell.raw !== '-') {
                        data.cell.styles.textColor = [128, 0, 128];
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
                margin: { left: 14, right: 14 },
                pageBreak: 'avoid'
            });

            startY = doc.lastAutoTable.finalY + 4;
        }
    }

    // ===== RESUMO FINAL =====
    // ESPREME PARA CABER NA PÁGINA (LIMITE 210mm)
    let finalY = Math.min(startY + 2, 200);

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.setFont(undefined, 'bold');
    
    let resumoTexto = `Total: ${dados.length} veiculos`;
    if (agregados.length > 0) resumoTexto += `  |  Agregados: ${agregados.length}`;
    if (frota.length > 0) resumoTexto += `  |  Frota Propria: ${frota.length}`;
    doc.text(resumoTexto, 14, finalY);
    
    doc.text(`Total NF: ${totalNFGeral}`, 175, finalY);
    doc.text(`Total Peso: ${totalPesoGeral}kg`, 210, finalY);
    
    const dataGeracao = new Date().toLocaleString('pt-BR');
    doc.text(`Gerado em: ${dataGeracao}`, 270, finalY, { align: 'right' });

    // ===== ADICIONAR LOGO E SALVAR =====
    const nomeArquivo = `escala_${dados[0].data}.pdf`;
    
    try {
        const logoUrl = 'images/logo_reidistribuidora.png';
        
        fetch(logoUrl)
            .then(response => {
                if (!response.ok) throw new Error('Logo não encontrada');
                return response.blob();
            })
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = function() {
                    doc.addImage(reader.result, 'PNG', 200, 5, 15, 15);
                    doc.save(nomeArquivo);
                    mostrarToast(`PDF "${nomeArquivo}" gerado com sucesso!`, 'success');
                };
                reader.readAsDataURL(blob);
            })
            .catch(() => {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('REI DISTRIBUIDORA', 265, 12, { align: 'right' });
                doc.save(nomeArquivo);
                mostrarToast(`PDF "${nomeArquivo}" gerado com sucesso!`, 'success');
            });
    } catch (error) {
        console.warn('Erro ao adicionar logo:', error);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('REI DISTRIBUIDORA', 265, 12, { align: 'right' });
        doc.save(nomeArquivo);
        mostrarToast(`PDF "${nomeArquivo}" gerado com sucesso!`, 'success');
    }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function limparTexto(texto) {
    if (!texto) return '-';
    if (typeof texto !== 'string') return String(texto);
    
    return texto
        .replace(/[\u{1F300}-\u{1FAFF}]|[\u{1F600}-\u{1F64F}]|[\u{2700}-\u{27BF}]|[\u{2600}-\u{26FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]/gu, '')
        .replace(/[→←↑↓↔↕↖↗↘↙↚↛↜↝↞↟↠↡↢↣↤↥↦↧↨↩↪↫↬↭↮↯]/g, '')
        .replace(/[™®©°±×÷≠≈∞√∫∆∑∏πΩ]/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getDiaSemanaExtenso(data) {
    if (!data) return '';
    const partes = data.split('-');
    if (partes.length === 3) {
        const d = new Date(partes[0], partes[1] - 1, partes[2]);
        const dias = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERCA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SABADO'];
        return dias[d.getDay()];
    }
    const d = new Date(data);
    const dias = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERCA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SABADO'];
    return dias[d.getDay()];
}

function getStatusLabel(status) {
    const labels = {
        'OK': 'OK',
        'OFICINA': 'Oficina',
        'INDISPONÍVEL': 'Indisponivel',
        'ESCALADO': 'Escalado',
        'DISPONÍVEL': 'Disponivel'
    };
    return labels[status] || status;
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

window.exportarEscalaPDF = exportarEscalaPDF;