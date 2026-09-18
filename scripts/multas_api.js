// =====================================================
// multas_api.js - Serviço de Integração API SERPRO / SENATRAN
// =====================================================

const MULTAS_CONFIG_KEY = 'serpro_api_config';

/**
 * Obter ou definir credenciais e configuração da API Serpro
 */
function obterConfigSerpro() {
    const salvo = localStorage.getItem(MULTAS_CONFIG_KEY);
    if (salvo) {
        try {
            return JSON.parse(salvo);
        } catch (e) {
            console.error('Erro ao ler config Serpro:', e);
        }
    }
    return {
        ambiente: 'homologacao', // 'homologacao' ou 'producao'
        baseUrlHomologacao: 'https://hom-wsdenatran.estaleiro.serpro.gov.br',
        baseUrlProducao: 'https://wsdenatran.estaleiro.serpro.gov.br',
        cnpjPadrao: '',
        cpfUsuario: '',
        tokenOuChave: '',
        usarModoSimuladoSeFalhar: true
    };
}

function salvarConfigSerpro(config) {
    localStorage.setItem(MULTAS_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Consulta de infrações por CNPJ
 * @param {Object} params { cnpj, cpfUsuario, dataInicio, dataFim, idUltimoRegistro }
 */
async function consultarInfracoesPorCnpjApi(params) {
    const config = obterConfigSerpro();
    const cnpj = (params.cnpj || config.cnpjPadrao || '').replace(/\D/g, '');
    const cpf = (params.cpfUsuario || config.cpfUsuario || '').replace(/\D/g, '');

    if (!cnpj) {
        throw new Error('Informe o CNPJ da empresa para realizar a consulta.');
    }
    if (!cpf) {
        throw new Error('Informe o CPF do operador (x-cpf-usuario) para a consulta SERPRO.');
    }

    const baseUrl = config.ambiente === 'producao' ? config.baseUrlProducao : config.baseUrlHomologacao;
    let url = `${baseUrl}/v1/infracoes/cnpj/${cnpj}`;
    
    const queryParams = new URLSearchParams();
    if (params.dataInicio) queryParams.append('dataInicio', params.dataInicio);
    if (params.dataFim) queryParams.append('dataFim', params.dataFim);
    if (params.idUltimoRegistro) queryParams.append('idUltimoRegistro', params.idUltimoRegistro);

    const queryString = queryParams.toString();
    if (queryString) {
        url += `?${queryString}`;
    }

    try {
        console.log(`[SERPRO API] Consultando: ${url}`);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-cpf-usuario': cpf,
                'Accept': 'application/json; charset=utf-8',
                ...(config.tokenOuChave ? { 'Authorization': `Bearer ${config.tokenOuChave}` } : {})
            }
        });

        if (response.ok) {
            const data = await response.json();
            return {
                sucesso: true,
                simulado: false,
                dados: data
            };
        } else {
            const erroTexto = await response.text();
            console.warn(`[SERPRO API] Resposta HTTP ${response.status}:`, erroTexto);
            
            // Se o usuário permitiu fallback de simulação ou se foi bloqueado por CORS/Certificado de teste
            if (config.usarModoSimuladoSeFalhar) {
                console.info('[SERPRO API] Ativando dados de homologação simulados para teste.');
                return {
                    sucesso: true,
                    simulado: true,
                    aviso: `A API SERPRO retornou status ${response.status} (provável restrição de Certificado mTLS ou CORS no browser). Geramos dados de demonstração da estrutura oficial.`,
                    dados: gerarDadosSimuladosSerpro(cnpj)
                };
            }
            throw new Error(`Erro na API SERPRO (${response.status}): ${erroTexto || response.statusText}`);
        }
    } catch (err) {
        console.error('[SERPRO API] Falha na requisição:', err);
        if (config.usarModoSimuladoSeFalhar) {
            return {
                sucesso: true,
                simulado: true,
                aviso: `Não foi possível conectar diretamente ao endpoint Serpro via browser (${err.message}). Carregando amostra oficial simulada.`,
                dados: gerarDadosSimuladosSerpro(cnpj)
            };
        }
        throw err;
    }
}

/**
 * Gera dados simulados estritamente compatíveis com o Swagger da Senatran/Serpro
 * para quando não houver certificado mTLS instalado no navegador do usuário.
 */
function gerarDadosSimuladosSerpro(cnpj) {
    const hoje = new Date();
    
    // Data limite autuação (ex: 30 dias a frente)
    const dtLimiteAutuacao = new Date(hoje);
    dtLimiteAutuacao.setDate(hoje.getDate() + 25);

    // Data vencimento penalidade (ex: 45 dias a frente)
    const dtVencPenalidade = new Date(hoje);
    dtVencPenalidade.setDate(hoje.getDate() + 45);

    return {
        quantidadeInfracoes: 3,
        quantidadeInfracoesReal: 3,
        idUltimoRegistro: 1003,
        infracoes: [
            {
                codigoInfracao: "7455",
                codigoDesdobramentoInfracao: "0",
                descricaoInfracao: "Transitar em velocidade superior a maxima permitida em ate 20%",
                codigoRenainf: "1009827364",
                numeroAutoInfracao: "R004928172",
                placa: "KOR6942",
                codigoRenavam: "982374921",
                codigoOrgaoAutuador: "108100",
                descricaoOrgaoAutuador: "POLICIA RODOVIARIA FEDERAL - PRF",
                dataInfracao: new Date(hoje.getTime() - 15 * 24 * 3600 * 1000).toISOString().split('T')[0],
                horaInfracao: "14:35",
                localOcorrenciaInfracao: "BR 101 KM 124 SENTIDO SUL",
                valorIntegralInfracao: 130.16,
                
                // FASE 1: AUTUAÇÃO
                dataEmissaoNotificacaoAutuacao: new Date(hoje.getTime() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
                dataLimiteDefesaAutuacao: dtLimiteAutuacao.toISOString().split('T')[0],
                
                // Ainda sem penalidade emitida
                numeroNotificacaoPenalidade: null,
                dataEmissaoNotificacaoPenalidade: null,
                dataVencimentoNotificacaoPenalidade: null,
                valorPagoInfracao: 0
            },
            {
                codigoInfracao: "5746",
                codigoDesdobramentoInfracao: "3",
                descricaoInfracao: "Transitar em local/horario nao permitido pela regulamentacao estabelecida pela autoridade",
                codigoRenainf: "1009827365",
                numeroAutoInfracao: "E029381734",
                placa: "ABC1D23",
                codigoRenavam: "736452819",
                codigoOrgaoAutuador: "291070",
                descricaoOrgaoAutuador: "DETRAN - DEPARTAMENTO ESTADUAL DE TRANSITO",
                dataInfracao: new Date(hoje.getTime() - 40 * 24 * 3600 * 1000).toISOString().split('T')[0],
                horaInfracao: "09:12",
                localOcorrenciaInfracao: "AV. CENTRAL, PROXIMO AO N 500",
                valorIntegralInfracao: 195.23,
                
                // FASE 2: PENALIDADE
                dataEmissaoNotificacaoAutuacao: new Date(hoje.getTime() - 35 * 24 * 3600 * 1000).toISOString().split('T')[0],
                dataLimiteDefesaAutuacao: new Date(hoje.getTime() - 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
                numeroNotificacaoPenalidade: "PEN-2026-9988",
                dataEmissaoNotificacaoPenalidade: new Date(hoje.getTime() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
                dataVencimentoNotificacaoPenalidade: dtVencPenalidade.toISOString().split('T')[0],
                valorPagoInfracao: 0
            },
            {
                codigoInfracao: "5002",
                codigoDesdobramentoInfracao: "0",
                descricaoInfracao: "Multa por Nao Identificacao do Condutor Infrator imposta a pessoa juridica (NIC)",
                codigoRenainf: "1009827366",
                numeroAutoInfracao: "NIC-8827361",
                placa: "ABC1D23",
                codigoRenavam: "736452819",
                codigoOrgaoAutuador: "291070",
                descricaoOrgaoAutuador: "DETRAN - DEPARTAMENTO ESTADUAL DE TRANSITO",
                dataInfracao: new Date(hoje.getTime() - 20 * 24 * 3600 * 1000).toISOString().split('T')[0],
                horaInfracao: "10:00",
                localOcorrenciaInfracao: "SISTEMA RENAINF - VINCULADA AO AUTO E029381734",
                valorIntegralInfracao: 390.46,
                
                // FASE 2: PENALIDADE
                dataEmissaoNotificacaoAutuacao: new Date(hoje.getTime() - 18 * 24 * 3600 * 1000).toISOString().split('T')[0],
                dataLimiteDefesaAutuacao: new Date(hoje.getTime() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
                numeroNotificacaoPenalidade: "PEN-NIC-2026-01",
                dataEmissaoNotificacaoPenalidade: new Date(hoje.getTime() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
                dataVencimentoNotificacaoPenalidade: dtVencPenalidade.toISOString().split('T')[0],
                valorPagoInfracao: 0
            }
        ]
    };
}
