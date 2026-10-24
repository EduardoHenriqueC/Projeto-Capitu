'use client';

import React from 'react';

export default function LinksView() {
  // Dados estruturados dos links
  const planilhas = [
    {
      id: 1,
      titulo: 'Considerações do Time',
      desc: 'Planilha de apoio para registros e considerações diárias da equipe.',
      url: 'https://docs.google.com/spreadsheets/d/1zLItumxHHQRqqEzav56wfHawkofeTVM0zOKDmKBOYPM/edit?gid=0#gid=0',
      icone: '📝'
    },
    {
      id: 2,
      titulo: 'Planilha de HIDE e Postagem (Imp. Módico)',
      desc: 'Tabela prioritária de vendedores com regras de geração de postagem e valores.',
      url: 'https://docs.google.com/spreadsheets/d/1ifj092jgLsOnonKHb_tQydqak8p_2zyMn_nGgzr7t4c/edit?pli=1&gid=969001123#gid=969001123',
      icone: '📊',
    },
    {
      id: 3,
      titulo: 'Erros no Cadastro',
      desc: 'Mapeamento e controle de erros cadastrais de usuários e livreiros.',
      url: 'https://docs.google.com/spreadsheets/d/16HeVOVhgekY1l6QvlJK_rBcDmogiEdNIgOBbArmz7m0/edit?gid=662262634#gid=662262634',
      icone: '⚠️'
    },
    {
      id: 4,
      titulo: 'Comprovantes de Reembolso',
      desc: 'Pasta no Google Drive com os comprovantes salvos via formulário.',
      url: 'https://drive.google.com/drive/u/0/folders/1TNAXsNBl_sR6ZEo_JIiRQ4gCOXpRkxeY',
      icone: '📁'
    }
  ];

  const sistemas = [
    { id: 11, titulo: 'Zendesk (Tickets)', desc: 'Fila de tickets de atendimento atribuídos.', url: 'https://estantevirtual.zendesk.com/agent/filters/assigned', icone: '🎧' },
    { id: 12, titulo: 'NCA Virtual Shelf', desc: 'Sistema de controle e apoio de chamados NCA.', url: 'https://nca.virtualshelf.net/', icone: '💻' },
    { id: 13, titulo: 'Magalu Pagamentos', desc: 'Backoffice financeiro para consulta de transações.', url: 'https://magalupagamentosbackoffice.magazineluiza.com.br/home', icone: '💸' },
    { id: 14, titulo: 'EVadmin', desc: 'Painel administrativo (Devoluções/Vendas).', url: 'https://evadmin.estantevirtual.com.br/admin/marketplace/venda/52546820/change/?_changelist_filters=q%3D52546820#refund_request', icone: '⚙️' },
    { id: 15, titulo: 'ADM Estante Virtual', desc: 'Painel de administração raiz (CGI).', url: 'https://adm.estantevirtual.com.br/adm.cgi?origem=2', icone: '🔐' },
    { id: 16, titulo: 'Gerar Postagem MLE', desc: 'Sistema logístico dos Correios para postagens.', url: 'https://www2.correios.com.br/encomendas/servicosonline/', icone: '📦' },
    { id: 17, titulo: 'Comprovantes AR (MLE)', desc: 'Aviso de Recebimento Eletrônico dos Correios.', url: 'https://cas.correios.com.br/login?service=https://areletronico.correios.com.br/bem-vindo', icone: '🧾' },
    { id: 18, titulo: 'Rastreamento Correios', desc: 'Consulta unificada de objetos postais.', url: 'https://rastreamento.correios.com.br/app/index.php', icone: '🔎' },
    { id: 19, titulo: 'Fale Conosco (P.I.)', desc: 'Abertura de Pedido de Informação (Correios).', url: 'https://faleconosco.correios.com.br/inicio', icone: '📢' },
    { id: 20, titulo: 'Docs: Colinhas', desc: 'Documento original de colinhas de atendimento.', url: 'https://docs.google.com/document/u/0/d/19tId3uC9IkcCQGlRF0L2t_beqy9KSjOi6B7oZV8gD0A/edit', icone: '📄' },
  ];

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '36px 20px 80px 20px' }}>
      
      {/* CABEÇALHO DA PÁGINA */}
      <div style={{ borderBottom: '2px solid #F1F5F9', paddingBottom: '24px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--ev-teal-dark)', margin: '0 0 8px 0' }}>
          🔗 Diretório de Links Úteis
        </h2>
        <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-muted)' }}>
          Central de links diretos, formulários de apoio, sistemas e planilhas essenciais da operação.
        </p>
      </div>

      {/* SEÇÃO 1: PLANILHAS DA EQUIPE */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ fontSize: '1.4rem' }}>📊</span>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--ev-teal-primary)', margin: 0 }}>Planilhas Operacionais da Equipe</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {planilhas.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                textDecoration: 'none',
                backgroundColor: '#FFFFFF',
                border: item.destaque ? '2px solid var(--ev-amber)' : '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: item.destaque ? '0 4px 16px rgba(255, 152, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 77, 76, 0.1)';
                if (!item.destaque) e.currentTarget.style.borderColor = 'var(--ev-teal-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = item.destaque ? '0 4px 16px rgba(255, 152, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.04)';
                if (!item.destaque) e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              {item.destaque && (
                <div style={{
                  position: 'absolute', top: '-12px', right: '20px',
                  background: 'var(--ev-amber)', color: '#FFF',
                  fontSize: '0.7rem', fontWeight: '800', padding: '4px 10px',
                  borderRadius: '9999px', letterSpacing: '0.5px'
                }}>
                  PRIORIDADE
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '2rem' }}>{item.icone}</span>
                <span style={{ color: '#94A3B8', fontSize: '1.1rem' }}>↗</span>
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: 'var(--text-dark)' }}>{item.titulo}</h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{item.desc}</p>
            </a>
          ))}
        </div>
      </div>

      {/* SEÇÃO 2: SISTEMAS E APOIO EXTERNO */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ fontSize: '1.4rem' }}>🌐</span>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--ev-teal-primary)', margin: 0 }}>Links e Formas de Apoio Externo</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {sistemas.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                textDecoration: 'none',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 77, 76, 0.1)';
                e.currentTarget.style.borderColor = 'var(--ev-teal-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '1.8rem' }}>{item.icone}</span>
                <span style={{ color: '#94A3B8', fontSize: '1rem' }}>↗</span>
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-dark)' }}>{item.titulo}</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{item.desc}</p>
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}