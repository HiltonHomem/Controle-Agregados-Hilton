// ================= EXPORTAÇÃO PDF =================
// Usando jsPDF + autoTable para gerar PDF com texto selecionável

// Usar uma função de toast passada externamente
let toastFunction = null;

function configurarToastPDF(fn) {
    toastFunction = fn || console.log;
}

function mostrarToastPDF(mensagem, tipo = 'success') {
    if (toastFunction) {
        toastFunction(mensagem, tipo);
    } else {
        console.log(mensagem);
    }
}

function formatarMoedaPDF(valor) {
    return valor ? `R$ ${Number(valor).toFixed(2).replace('.', ',')}` : 'R$ 0,00';
}

function formatarDataPDF(data) {
    if (!data) return '-';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
}

function calcularTotalPDF(item) {
    return (Number(item.valor_diaria) || 0) + 
           (Number(item.pedagio) || 0) + 
           (Number(item.almoco) || 0) + 
           (Number(item.chapa) || 0) - 
           (Number(item.desconto) || 0);
}

function getQuinzena(data) {
    const dia = new Date(data).getDate();
    return dia <= 15 ? 1 : 2;
}

function getNomeMes(mes) {
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes - 1];
}

// ================= REMOVER APENAS EMOJIS (MANTÉM ACENTOS E º) =================
function removerEmojis(texto) {
    if (!texto) return '';
    
    return texto
        .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
        .replace(/[\u{FE00}-\u{FEFF}]/gu, '')
        .replace(/[\u{2600}-\u{27BF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        .replace(/[\u{1F000}-\u{1F02F}]/gu, '')
        .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')
        .replace(/[\u{1F100}-\u{1F1FF}]/gu, '')
        .replace(/[\u{1F200}-\u{1F2FF}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{1F700}-\u{1F77F}]/gu, '')
        .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')
        .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
        .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '')
        .replace(/[€£¥©®™]/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// ================= RELATÓRIO QUINZENAL MENSAL =================
function gerarPDFQuinzenalMensal(dados, motoristaNome) {
    if (!dados || dados.length === 0) {
        mostrarToastPDF('Sem dados para exportar', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const corPrimaria = [26, 115, 232];
    const corSecundaria = [52, 168, 83];
    const corDanger = [234, 67, 53];
    const corWarning = [251, 188, 4];

    // Remover apenas emojis do nome do motorista (mantém acentos)
    const nomeLimpo = removerEmojis(motoristaNome);

    // Agrupar por mês
    const meses = {};
    dados.forEach(item => {
        const data = new Date(item.data);
        const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        if (!meses[mesAno]) meses[mesAno] = [];
        meses[mesAno].push(item);
    });

    // Ordenar meses
    const mesesOrdenados = Object.keys(meses).sort();

    let pagina = 1;

    mesesOrdenados.forEach((mesAno, idx) => {
        if (idx > 0) {
            doc.addPage();
            pagina++;
        }

        const [ano, mes] = mesAno.split('-').map(Number);
        const nomeMes = getNomeMes(mes);
        const itensMes = meses[mesAno];

        // ===== CABEÇALHO (SEM EMOJIS, COM ACENTOS) =====
        doc.setFontSize(18);
        doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
        doc.text(`Relatório Quinzenal - ${nomeMes}/${ano}`, 14, 25);
        
        doc.setFontSize(14);
        doc.setTextColor(51, 51, 51);
        doc.text(`Motorista: ${nomeLimpo}`, 14, 35);
        
        doc.setFontSize(10);
        doc.setTextColor(119, 119, 119);
        doc.text(`Total de lançamentos no mês: ${itensMes.length}`, 14, 42);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 48);

        doc.setDrawColor(200, 200, 200);
        doc.line(14, 54, 196, 54);

        // ===== SEPARAR POR QUINZENA =====
        const quinzena1 = itensMes.filter(item => getQuinzena(item.data) === 1);
        const quinzena2 = itensMes.filter(item => getQuinzena(item.data) === 2);

        // Ordenar por data
        quinzena1.sort((a, b) => new Date(a.data) - new Date(b.data));
        quinzena2.sort((a, b) => new Date(a.data) - new Date(b.data));

        let yPos = 60;

        // ===== FUNÇÃO PARA RENDERIZAR UMA QUINZENA =====
        function renderizarQuinzena(quizenData, titulo, cor) {
            // Título da quinzena (SEM EMOJIS, COM ACENTOS)
            doc.setFontSize(12);
            doc.setTextColor(cor[0], cor[1], cor[2]);
            doc.setFont(undefined, 'bold');
            doc.text(titulo, 14, yPos);
            yPos += 6;
            
            // ===== VEÍCULOS UTILIZADOS NA QUINZENA =====
            // Extrair veículos únicos
            const veiculosUnicos = [];
            quizenData.forEach(item => {
                const veiculo = item.veiculo_utilizado || item.agregados?.veiculo || '';
                if (veiculo && !veiculosUnicos.includes(veiculo)) {
                    veiculosUnicos.push(veiculo);
                }
            });

            if (veiculosUnicos.length > 0) {
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                doc.setFont(undefined, 'normal');
                const veiculosText = `Veículos utilizados: ${veiculosUnicos.join(', ')}`;
                doc.text(veiculosText, 14, yPos + 2);
                yPos += 6;
            }

            // ===== TOTAIS DA QUINZENA =====
            const totalDiarias = quizenData.reduce((s, l) => s + (Number(l.valor_diaria) || 0), 0);
            const totalPedagios = quizenData.reduce((s, l) => s + (Number(l.pedagio) || 0), 0);
            const totalAlmoco = quizenData.reduce((s, l) => s + (Number(l.almoco) || 0), 0);
            const totalChapa = quizenData.reduce((s, l) => s + (Number(l.chapa) || 0), 0);
            const totalDescontos = quizenData.reduce((s, l) => s + (Number(l.desconto) || 0), 0);
            const totalLiquido = totalDiarias + totalPedagios + totalAlmoco + totalChapa - totalDescontos;

            // Resumo da quinzena (SEM EMOJIS, COM ACENTOS)
            doc.setFontSize(9);
            doc.setTextColor(60, 60, 60);
            doc.setFont(undefined, 'normal');
            
            const resumoText = `Diárias: ${formatarMoedaPDF(totalDiarias)} | Pedágios: ${formatarMoedaPDF(totalPedagios)} | Almoço: ${formatarMoedaPDF(totalAlmoco)} | Chapa: ${formatarMoedaPDF(totalChapa)} | Descontos: ${formatarMoedaPDF(totalDescontos)}`;
            doc.text(resumoText, 14, yPos + 2);
            yPos += 6;
            
            // Total a pagar (SEM EMOJIS, COM ACENTOS)
            doc.setFontSize(11);
            doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
            doc.setFont(undefined, 'bold');
            doc.text(`Total a Pagar: ${formatarMoedaPDF(totalLiquido)}`, 14, yPos + 2);
            yPos += 8;

            // Linha separadora
            doc.setDrawColor(220, 220, 220);
            doc.line(14, yPos, 196, yPos);
            yPos += 4;

            if (quizenData.length === 0) {
                doc.setFontSize(9);
                doc.setTextColor(150, 150, 150);
                doc.setFont(undefined, 'italic');
                doc.text('Nenhum lançamento nesta quinzena', 14, yPos + 2);
                yPos += 10;
                return yPos;
            }

            // ===== TABELA DA QUINZENA =====
            const headers = ['Data', 'Rota', 'Diária', 'Pedágio', 'Almoço', 'Chapa', 'Desconto', 'Total'];

            const rows = quizenData.map(item => {
                const total = calcularTotalPDF(item);
                return [
                    formatarDataPDF(item.data),
                    removerEmojis(item.rota || '-'),
                    formatarMoedaPDF(item.valor_diaria),
                    formatarMoedaPDF(item.pedagio),
                    formatarMoedaPDF(item.almoco),
                    formatarMoedaPDF(item.chapa),
                    formatarMoedaPDF(item.desconto),
                    formatarMoedaPDF(total)
                ];
            });

            // Verificar se cabe na página
            const alturaNecessaria = 20 + (rows.length * 7);
            if (yPos + alturaNecessaria > 275) {
                doc.addPage();
                pagina++;
                yPos = 20;
                
                // Repetir cabeçalho na nova página
                doc.setFontSize(12);
                doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
                doc.text(`${titulo} (continuação)`, 14, yPos);
                yPos += 8;
            }

            doc.autoTable({
                startY: yPos,
                head: [headers],
                body: rows,
                theme: 'striped',
                headStyles: {
                    fillColor: cor,
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                styles: {
                    fontSize: 7,
                    cellPadding: 2,
                    lineColor: [220, 220, 220],
                    lineWidth: 0.1,
                    overflow: 'linebreak'
                },
                columnStyles: {
                    0: { cellWidth: 22, halign: 'center' },
                    1: { cellWidth: 38 },
                    2: { cellWidth: 22, halign: 'right' },
                    3: { cellWidth: 22, halign: 'right' },
                    4: { cellWidth: 20, halign: 'right' },
                    5: { cellWidth: 18, halign: 'right' },
                    6: { cellWidth: 22, halign: 'right' },
                    7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250]
                },
                didParseCell: function(data) {
                    if (data.column.index === 6 && data.cell.raw) {
                        const valor = parseFloat(data.cell.raw.replace('R$ ', '').replace('.', '').replace(',', '.'));
                        if (valor > 0) {
                            data.cell.styles.textColor = [234, 67, 53];
                        }
                    }
                    if (data.column.index === 7) {
                        data.cell.styles.textColor = [26, 115, 232];
                    }
                },
                margin: { left: 14, right: 14 }
            });

            yPos = doc.lastAutoTable.finalY + 6;

            // Rodapé da quinzena (SEM EMOJIS, COM ACENTOS)
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.setFont(undefined, 'normal');
            const totalRegistros = quizenData.length;
            doc.text(`Total de registros: ${totalRegistros}  |  Total líquido: ${formatarMoedaPDF(totalLiquido)}`, 14, yPos);
            yPos += 4;

            // Linha separadora grossa entre quinzenas
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.5);
            doc.line(14, yPos, 196, yPos);
            doc.setLineWidth(0.1);
            yPos += 6;

            return yPos;
        }

        // ===== RENDERIZAR 1ª QUINZENA =====
        yPos = renderizarQuinzena(quinzena1, '1ª Quinzena', [26, 115, 232]);

        // Espaço entre quinzenas
        yPos += 4;

        // ===== RENDERIZAR 2ª QUINZENA =====
        yPos = renderizarQuinzena(quinzena2, '2ª Quinzena', [52, 168, 83]);

        // ===== RESUMO DO MÊS (SEM EMOJIS, COM ACENTOS) =====
        if (yPos < 260) {
            yPos += 4;
            doc.setDrawColor(200, 200, 200);
            doc.line(14, yPos, 196, yPos);
            yPos += 4;

            // Total do mês
            const totalMesDiarias = itensMes.reduce((s, l) => s + (Number(l.valor_diaria) || 0), 0);
            const totalMesPedagios = itensMes.reduce((s, l) => s + (Number(l.pedagio) || 0), 0);
            const totalMesAlmoco = itensMes.reduce((s, l) => s + (Number(l.almoco) || 0), 0);
            const totalMesChapa = itensMes.reduce((s, l) => s + (Number(l.chapa) || 0), 0);
            const totalMesDescontos = itensMes.reduce((s, l) => s + (Number(l.desconto) || 0), 0);
            const totalMesLiquido = totalMesDiarias + totalMesPedagios + totalMesAlmoco + totalMesChapa - totalMesDescontos;

            // Veículos utilizados no mês
            const veiculosMes = [];
            itensMes.forEach(item => {
                const veiculo = item.veiculo_utilizado || item.agregados?.veiculo || '';
                if (veiculo && !veiculosMes.includes(veiculo)) {
                    veiculosMes.push(veiculo);
                }
            });

            if (veiculosMes.length > 0) {
                doc.setFontSize(8);
                doc.setTextColor(80, 80, 80);
                doc.setFont(undefined, 'normal');
                const veiculosText = `Veículos utilizados no mês: ${veiculosMes.join(', ')}`;
                doc.text(veiculosText, 14, yPos + 2);
                yPos += 6;
            }

            doc.setFontSize(11);
            doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
            doc.setFont(undefined, 'bold');
            doc.text(`Total do Mês: ${formatarMoedaPDF(totalMesLiquido)}`, 14, yPos + 2);
            yPos += 6;

            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.setFont(undefined, 'normal');
            doc.text(`Diárias: ${formatarMoedaPDF(totalMesDiarias)} | Pedágios: ${formatarMoedaPDF(totalMesPedagios)} | Almoço: ${formatarMoedaPDF(totalMesAlmoco)} | Chapa: ${formatarMoedaPDF(totalMesChapa)} | Descontos: ${formatarMoedaPDF(totalMesDescontos)}`, 14, yPos + 2);
        }

        // ===== RODAPÉ DA PÁGINA (SEM EMOJIS, COM ACENTOS) =====
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${pagina}`, 196, 285, { align: 'right' });
        doc.text(`Relatório Quinzenal - ${nomeLimpo}`, 14, 285);
    });

    const filename = `relatorio_quinzenal_${nomeLimpo.toLowerCase().replace(/\s/g, '_')}.pdf`;
    doc.save(filename);
    mostrarToastPDF(`PDF "${filename}" gerado com sucesso!`);
}

// ================= FUNÇÃO PRINCIPAL DE EXPORTAÇÃO =================
function exportarPDF(dados, titulo = 'Relatório de Lançamentos', filename = 'relatorio_agregados.pdf') {
    gerarPDFGeral(dados, titulo);
}

// ================= EXPORTAR RELATÓRIO QUINZENAL =================
function exportarQuinzenalMotorista(dados, motoristaId, dataInicio, dataFim) {
    // Filtrar dados do motorista
    const dadosMotorista = dados.filter(item => item.agregado_id === motoristaId);
    
    if (dadosMotorista.length === 0) {
        mostrarToastPDF('Nenhum dado encontrado para este motorista', 'error');
        return;
    }

    // Filtrar por período se informado
    let dadosFiltrados = dadosMotorista;
    if (dataInicio) {
        dadosFiltrados = dadosFiltrados.filter(item => item.data >= dataInicio);
    }
    if (dataFim) {
        dadosFiltrados = dadosFiltrados.filter(item => item.data <= dataFim);
    }

    if (dadosFiltrados.length === 0) {
        mostrarToastPDF('Nenhum dado encontrado para este motorista no período', 'error');
        return;
    }

    const motorista = dadosMotorista[0]?.agregados?.nome || 'Motorista';
    
    // Chamar a nova função de relatório quinzenal mensal
    gerarPDFQuinzenalMensal(dadosFiltrados, motorista);
}

// ================= RELATÓRIO GERAL (Mantido) =================
function gerarPDFGeral(dados, titulo = 'Relatório Geral de Lançamentos') {
    if (!dados || dados.length === 0) {
        mostrarToastPDF('Sem dados para exportar', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const corPrimaria = [26, 115, 232];
    const corSecundaria = [52, 168, 83];
    const corDanger = [234, 67, 53];
    const corWarning = [251, 188, 4];

    // Títulos sem emojis, com acentos
    const tituloLimpo = removerEmojis(titulo);

    // ===== CABEÇALHO =====
    doc.setFontSize(22);
    doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.text('Controle de Agregados', 14, 25);
    
    doc.setFontSize(16);
    doc.setTextColor(51, 51, 51);
    doc.text(tituloLimpo, 14, 35);
    
    doc.setFontSize(10);
    doc.setTextColor(119, 119, 119);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 42);
    doc.text(`Total de registros: ${dados.length}`, 14, 48);

    // ===== RESUMO ESTATÍSTICO =====
    const totalDiarias = dados.reduce((s, l) => s + (Number(l.valor_diaria) || 0), 0);
    const totalPedagios = dados.reduce((s, l) => s + (Number(l.pedagio) || 0), 0);
    const totalAlmoco = dados.reduce((s, l) => s + (Number(l.almoco) || 0), 0);
    const totalChapa = dados.reduce((s, l) => s + (Number(l.chapa) || 0), 0);
    const totalDescontos = dados.reduce((s, l) => s + (Number(l.desconto) || 0), 0);
    const totalLiquido = totalDiarias + totalPedagios + totalAlmoco + totalChapa - totalDescontos;

    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 54, 196, 54);

    let yPos = 60;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);

    // Grid de resumo
    const resumo = [
        ['Diárias', formatarMoedaPDF(totalDiarias), corPrimaria],
        ['Pedágios', formatarMoedaPDF(totalPedagios), corSecundaria],
        ['Almoço/Chapa', formatarMoedaPDF(totalAlmoco + totalChapa), corWarning],
        ['Descontos', formatarMoedaPDF(totalDescontos), corDanger],
        ['Total Líquido', formatarMoedaPDF(totalLiquido), corPrimaria]
    ];

    const colWidth = 35;
    const startX = 14;
    resumo.forEach((item, index) => {
        const x = startX + (index * colWidth);
        const cor = item[2];
        
        // Fundo
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(x, yPos, colWidth - 2, 18, 3, 3, 'F');
        
        // Borda lateral
        doc.setDrawColor(cor[0], cor[1], cor[2]);
        doc.setLineWidth(1.5);
        doc.line(x, yPos + 2, x, yPos + 16);
        
        // Valor
        doc.setFontSize(11);
        doc.setTextColor(cor[0], cor[1], cor[2]);
        doc.setFont(undefined, 'bold');
        doc.text(item[1], x + colWidth / 2, yPos + 8, { align: 'center' });
        
        // Label
        doc.setFontSize(8);
        doc.setTextColor(119, 119, 119);
        doc.setFont(undefined, 'normal');
        doc.text(item[0], x + colWidth / 2, yPos + 15, { align: 'center' });
    });

    yPos += 24;

    // ===== TABELA =====
    const headers = ['Data', 'Motorista', 'Rota', 'Diária', 'Pedágio', 'Almoço', 'Chapa', 'Desconto', 'Total'];

    const rows = dados.map(item => {
        const total = calcularTotalPDF(item);
        const nome = item.agregados?.nome || 'N/A';
        return [
            formatarDataPDF(item.data),
            removerEmojis(nome),
            removerEmojis(item.rota || '-'),
            formatarMoedaPDF(item.valor_diaria),
            formatarMoedaPDF(item.pedagio),
            formatarMoedaPDF(item.almoco),
            formatarMoedaPDF(item.chapa),
            formatarMoedaPDF(item.desconto),
            formatarMoedaPDF(total)
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: [headers],
        body: rows,
        theme: 'striped',
        headStyles: {
            fillColor: corPrimaria,
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 7,
            cellPadding: 2.5,
            lineColor: [220, 220, 220],
            lineWidth: 0.1,
            overflow: 'linebreak'
        },
        columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 28, fontStyle: 'bold' },
            2: { cellWidth: 32 },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 22, halign: 'right' },
            5: { cellWidth: 20, halign: 'right' },
            6: { cellWidth: 18, halign: 'right' },
            7: { cellWidth: 22, halign: 'right' },
            8: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: {
            fillColor: [248, 249, 250]
        },
        didParseCell: function(data) {
            if (data.column.index === 7 && data.cell.raw) {
                const valor = parseFloat(data.cell.raw.replace('R$ ', '').replace('.', '').replace(',', '.'));
                if (valor > 0) {
                    data.cell.styles.textColor = [234, 67, 53];
                }
            }
            if (data.column.index === 8) {
                data.cell.styles.textColor = [26, 115, 232];
            }
        },
        margin: { left: 12, right: 12 }
    });

    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${pageCount}`, 196, 285, { align: 'right' });
    doc.text('Sistema de Controle de Agregados', 14, 285);

    doc.save(filename || 'relatorio_agregados.pdf');
    mostrarToastPDF(`PDF "${filename || 'relatorio_agregados.pdf'}" gerado com sucesso!`);
}