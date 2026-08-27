// =====================================================
// planilha_escala.js - Exportação PDF da Escala
// =====================================================

function exportarEscalaPDF(escalas, dataFiltro) {
    if (typeof window.jspdf === 'undefined') {
        console.error('Biblioteca jsPDF não carregada!');
        mostrarToast('Erro: Biblioteca PDF não carregada.', 'error');
        return;
    }

    if (!escalas || escalas.length === 0) {
        mostrarToast('Nenhuma escala para exportar', 'error');
        return;
    }

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
    
    const corPrimaria = [26, 115, 232];
    const corAgregado = [52, 168, 83];
    const corFrota = [156, 163, 175];
    
    const dataExemplo = dados[0].data;
    const dataFormatada = formatarData(dataExemplo);
    const diaSemana = getDiaSemanaExtenso(dataExemplo);
    
    const agregados = dados.filter(e => e.veiculo_proprietario_id !== null && e.veiculo_proprietario_id !== undefined);
    const frota = dados.filter(e => e.veiculo_proprietario_id === null || e.veiculo_proprietario_id === undefined);
    
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

        doc.setFontSize(11);
        doc.setTextColor(cor[0], cor[1], cor[2]);
        doc.setFont(undefined, 'bold');
        doc.text(titulo, 14, startY);
        startY += 5;

        const headers = [
            'Veiculo', 'Placa', 'Motorista', 'Ajudante(s)', 'Rota',
            'Celular', 'Maq.Cartao', 'NF', 'Peso Carga', 'Retornos',
            'Carregamento', 'Status'
        ];

        // 🔧 Calcular totais de NF e Peso
        let totalNF = 0;
        let totalPeso = 0;

        const rows = items.map(e => {
            // 🔧 Somar NF (tenta converter para número, ignora texto)
            const nfValue = parseFloat(e.nf);
            if (!isNaN(nfValue)) {
                totalNF += nfValue;
            }

            // 🔧 Somar Peso Carga
            const pesoValue = parseFloat(e.peso_carga);
            if (!isNaN(pesoValue)) {
                totalPeso += pesoValue;
            }

            const statusLabel = limparTexto(getStatusLabel(e.status));
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
                limparTexto(e.carregamento || '-'),
                statusLabel
            ];
        });

        const colWidths = [26, 18, 30, 24, 26, 18, 15, 13, 18, 20, 20, 18];

        doc.autoTable({
            startY: startY,
            head: [headers],
            body: rows,
            theme: 'striped',
            headStyles: {
                fillColor: cor,
                textColor: [255, 255, 255],
                fontSize: 7,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            styles: {
                fontSize: 6.5,
                cellPadding: 1.5,
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
                10: { cellWidth: colWidths[10], halign: 'center' },
                11: { cellWidth: colWidths[11], halign: 'center' }
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250]
            },
            didParseCell: function(data) {
                if (data.column.index === 11 && data.cell.raw) {
                    const status = data.cell.raw;
                    if (status.includes('OK')) data.cell.styles.textColor = [34, 197, 94];
                    else if (status.includes('OFICINA')) data.cell.styles.textColor = [234, 179, 8];
                    else if (status.includes('INDISPONIVEL')) data.cell.styles.textColor = [239, 68, 68];
                    else if (status.includes('ESCALADO')) data.cell.styles.textColor = [59, 130, 246];
                    data.cell.styles.fontStyle = 'bold';
                }
                if (data.column.index === 2 && data.cell.raw && data.cell.raw.includes('(')) {
                    data.cell.styles.textColor = [139, 92, 246];
                    data.cell.styles.fontStyle = 'italic';
                }
            },
            margin: { left: 14, right: 14 },
            pageBreak: 'auto'
        });

        const finalY = doc.lastAutoTable.finalY + 2;

        // 🔧 DESENHAR RESUMO DOS TOTAIS (GRUDADO NA TABELA)
        doc.setDrawColor(200, 200, 200);
        doc.line(14, finalY, 280, finalY); // Linha separadora

        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.setFont(undefined, 'bold');

        // Posição X para o resumo (alinhado com as colunas NF e Peso)
        // Usando a soma das colunas anteriores para achar a posição exata no PDF
        const xNF = 1 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + colWidths[6];
        const xPeso = xNF + colWidths[7] + 10; // Soma + um pequeno espaço extra

        // Caso você queira o resumo alinhado à direita, use:
        // const xNF = 176; // Ajuste para onde ficar a coluna NF na página
        // const xPeso = 196; // Ajuste para onde ficar a coluna Peso na página

        doc.text(`Total NF: ${totalNF}`, xNF, finalY + 5);
        doc.text(`Total Peso: ${totalPeso}kg`, xPeso, finalY + 5);

        return doc.lastAutoTable.finalY + 8;
    }

    startY = renderizarGrupo('AGREGADOS', agregados, corAgregado, startY);
    startY = renderizarGrupo('FROTA PROPRIA', frota, corFrota, startY);

    const finalY = startY + 6;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'normal');
    
    let resumoTexto = `Total: ${dados.length} veiculos`;
    if (agregados.length > 0) resumoTexto += `  |  Agregados: ${agregados.length}`;
    if (frota.length > 0) resumoTexto += `  |  Frota Propria: ${frota.length}`;
    doc.text(resumoTexto, 14, finalY);
    
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