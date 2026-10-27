-- =====================================================
-- TABELA DE MULTAS E DESCONTOS_LANCAMENTOS
-- =====================================================

-- 1. TABELA PRINCIPAL DE MULTAS
CREATE TABLE IF NOT EXISTS multas (
    id BIGSERIAL PRIMARY KEY,
    
    -- Identificação
    cnpj_empresa VARCHAR(20) NOT NULL DEFAULT '11.216.118/0001-78',
    codigo_renainf VARCHAR(50),
    numero_auto_infracao VARCHAR(50) NOT NULL,
    auto_origem_id BIGINT REFERENCES multas(id) ON DELETE SET NULL, -- Vínculo de AIT originário
    
    -- Veículo e Motorista Vinculados
    placa VARCHAR(10) NOT NULL,
    codigo_renavam VARCHAR(30),
    veiculo_id BIGINT REFERENCES veiculos(id) ON DELETE SET NULL,
    motorista_id BIGINT REFERENCES motoristas(id) ON DELETE SET NULL,
    motorista_nome VARCHAR(255),
    
    -- Dados da Infração
    codigo_infracao VARCHAR(20) NOT NULL,
    desdobramento_infracao VARCHAR(10) DEFAULT '0',
    descricao_infracao TEXT NOT NULL,
    codigo_orgao_autuador VARCHAR(50),
    orgao_autuador VARCHAR(255),
    data_hora_infracao TIMESTAMP WITH TIME ZONE,
    local_infracao TEXT,
    municipio_infracao VARCHAR(150),
    uf_infracao VARCHAR(5),
    
    -- Controle de Fases (1 = AUTUACAO, 2 = PENALIDADE)
    fase VARCHAR(20) NOT NULL DEFAULT 'AUTUACAO', -- 'AUTUACAO' ou 'PENALIDADE'
    
    -- Dados da Fase 1: Autuação
    data_emissao_autuacao DATE,
    data_limite_defesa_autuacao DATE, -- Prazo para defesa da autuação
    
    -- Dados da Fase 2: Penalidade
    numero_notificacao_penalidade VARCHAR(50),
    data_emissao_penalidade DATE,
    data_vencimento_penalidade DATE, -- Validade de pagamento da guia/boleto
    
    -- Valores Financeiros
    valor_integral NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    valor_com_desconto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    valor_pago NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    data_pagamento DATE,
    
    -- Status de Pagamento
    status_pagamento VARCHAR(30) NOT NULL DEFAULT 'PENDENTE', -- 'PENDENTE', 'EM_DEFESA', 'PAGO', 'VENCIDO', 'CANCELADA'
    
    -- Controle de Desconto do Motorista
    descontar_motorista BOOLEAN NOT NULL DEFAULT FALSE,
    status_desconto VARCHAR(30) NOT NULL DEFAULT 'NAO_APLICAVEL', -- 'NAO_APLICAVEL', 'PENDENTE', 'DESCONTADO', 'ISENTO'
    
    -- Aceite do Motorista Infrator (Indicação no App da CNH / CDT)
    aceite_motorista BOOLEAN NOT NULL DEFAULT FALSE,
    data_aceite_motorista DATE,
    
    observacoes TEXT,
    dados_brutos_api JSONB, -- Payload completo da API Serpro para histórico
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT uq_auto_orgao UNIQUE (numero_auto_infracao, codigo_orgao_autuador)
);

-- 2. TABELA DE DESCONTOS_LANCAMENTOS (Separada para controle financeiro dos descontos)
CREATE TABLE IF NOT EXISTS descontos_lancamentos (
    id BIGSERIAL PRIMARY KEY,
    multa_id BIGINT REFERENCES multas(id) ON DELETE CASCADE,
    motorista_id BIGINT REFERENCES motoristas(id) ON DELETE SET NULL,
    veiculo_id BIGINT REFERENCES veiculos(id) ON DELETE SET NULL,
    
    valor_desconto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    data_desconto DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Parcelamento ou desconto total
    parcela_atual INT DEFAULT 1,
    total_parcelas INT DEFAULT 1,
    
    tipo_desconto VARCHAR(50) DEFAULT 'MULTA_TRANSITO',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE', -- 'PENDENTE', 'DESCONTADO', 'CANCELADO'
    
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_multas_cnpj ON multas(cnpj_empresa);
CREATE INDEX IF NOT EXISTS idx_multas_placa ON multas(placa);
CREATE INDEX IF NOT EXISTS idx_multas_motorista ON multas(motorista_id);
CREATE INDEX IF NOT EXISTS idx_multas_auto ON multas(numero_auto_infracao);
CREATE INDEX IF NOT EXISTS idx_multas_auto_origem ON multas(auto_origem_id);
CREATE INDEX IF NOT EXISTS idx_descontos_multa ON descontos_lancamentos(multa_id);
CREATE INDEX IF NOT EXISTS idx_descontos_motorista ON descontos_lancamentos(motorista_id);

-- 3. VIEW PARA CONSULTA COMPLETA DAS MULTAS
CREATE OR REPLACE VIEW view_multas_completas AS
SELECT 
    m.*,
    v.nome AS veiculo_modelo,
    COALESCE(m.motorista_nome, mot.nome) AS motorista_nome_exibicao,
    mot.telefone AS motorista_telefone,
    orig.numero_auto_infracao AS auto_origem_numero,
    orig.descricao_infracao AS auto_origem_descricao,
    (SELECT COUNT(*) FROM multas sub WHERE sub.auto_origem_id = m.id) AS total_autos_derivados,
    (SELECT COALESCE(SUM(dl.valor_desconto), 0) FROM descontos_lancamentos dl WHERE dl.multa_id = m.id AND dl.status = 'DESCONTADO') AS total_descontado_motorista
FROM multas m
LEFT JOIN veiculos v ON v.id = m.veiculo_id
LEFT JOIN motoristas mot ON mot.id = m.motorista_id
LEFT JOIN multas orig ON orig.id = m.auto_origem_id;
