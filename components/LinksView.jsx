'use client';

import React from 'react';

export default function LinksView() {
  const planilhas = [
    {
      id: 1,
      titulo: 'Planilha de HIDE e Postagem (Imp. Módico)',
      desc: 'Tabela prioritária de vendedores com regras de geração de postagem e valores.',
      url: 'https://docs.google.com/spreadsheets/d/1ifj092jgLsOnonKHb_tQydqak8p_2zyMn_nGgzr7t4c/edit?pli=1&gid=969001123#gid=969001123',
      icone: '📊',
    },
    {
      id: 2,
      titulo: 'Comprovantes de Reembolso',
      desc: 'Pasta no Google Drive com os comprovantes salvos via formulário.',
      url: 'https://drive.google.com/drive/u/0/folders/1TNAXsNBl_sR6ZEo_JIiRQ4gCOXpRkxeY',
      icone: '📁'
    },
    {
      id: 3,
      titulo: 'Considerações do Time',
      desc: 'Planilha de apoio para registros e considerações diárias da equipe.',
      url: 'https://docs.google.com/spreadsheets/d/1zLItumxHHQRqqEzav56wfHawkofeTVM0zOKDmKBOYPM/edit?gid=0#gid=0',
      icone: '📝'
    },
    {
      id: 4,
      titulo: 'Erros no Cadastro',
      desc: 'Mapeamento e controle de erros cadastrais de usuários e livreiros.',
      url: 'https://docs.google.com/spreadsheets/d/16HeVOVhgekY1l6QvlJK_rBcDmogiEdNIgOBbArmz7m0/edit?gid=662262634#gid=662262634',
      icone: '⚠️'
    }
  ];

  const sistemas = [
    { id: 11, titulo: 'Zendesk (Tickets)', desc: 'Fila de tickets de atendimento atribuídos.', url: 'https://estantevirtual.zendesk.com/agent/filters/assigned', icone: '🎧' },
    { id: 12, titulo: 'NCA Virtual', desc: 'Sistema de controle e apoio de chamados NCA.', url: 'https://nca.virtualshelf.net/', icone: '💻' },
    { id: 13, titulo: 'Magalu Pagamentos', desc: 'Backoffice financeiro para consulta de transações.', url: 'https://magalupagamentosbackoffice.magazineluiza.com.br/home', icone: '💸' },
    { id: 14, titulo: 'EVadmin', desc: 'Painel administrativo (Devoluções/Vendas).', url: 'https://evadmin.estantevirtual.com.br/admin/marketplace/venda/52546820/change/?_changelist_filters=q%3D52546820#refund_request', icone: '⚙️' },
    { id: 15, titulo: 'ADM Estante Virtual', desc: 'Painel de administração raiz (CGI).', url: 'https://adm.estantevirtual.com.br/adm.cgi?origem=2', icone: '🔐' },
    { id: 16, titulo: 'Freedom Admin', desc: 'Consulta de cadastro dos clientes', url: 'https://freedom-admin.luizalabs.com/call-center/customer/', icone: '🕊️'},
    { id: 17, titulo: 'Gerar Postagem MLE', desc: 'Sistema logístico dos Correios para postagens.', url: 'https://www2.correios.com.br/encomendas/servicosonline/', icone: '📦' },
    { id: 18, titulo: 'Comprovantes AR (MLE)', desc: 'Aviso de Recebimento Eletrônico dos Correios.', url: 'https://cas.correios.com.br/login?service=https://areletronico.correios.com.br/bem-vindo', icone: '🧾' },
    { id: 19, titulo: 'Rastreamento Correios', desc: 'Consulta unificada de objetos postais.', url: 'https://rastreamento.correios.com.br/app/index.php', icone: '🔎' },
    { id: 20, titulo: 'Abrir PI', desc: 'Abertura de Pedido de Informação (Correios).', url: 'https://faleconosco.correios.com.br/inicio', icone: '📢' },
    { id: 21, titulo: 'Docs: Colinhas', desc: 'Documento original de colinhas de atendimento.', url: 'https://docs.google.com/document/u/0/d/19tId3uC9IkcCQGlRF0L2t_beqy9KSjOi6B7oZV8gD0A/edit', icone: '📄' },
    { id: 22, titulo: 'Central de Encantamento', desc: 'Registro de cases de atendimento', url: 'https://casesmagazineluiza.zendesk.com/hc/pt-br', icone: '🧡'},
  ];

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '36px 20px 80px 20px' }}>
      
      {/* VARIÁVEIS DE CORES E HOVER NATIVO (Sem Javascript inline) */}
      <style>{`
        :root {
          /* Cores Originais do Modo Claro (Verdes Saturados) */
          --link-card-bg: #D6EFEA;
          --link-card-hover: #C2E7E0;
          --link-border: #5EBFA8;
          --link-border-hover: #004D4C;
          --link-title: #003635;
          --link-desc: #1B423F;
          --link-icon-bg: #FFFFFF;
          --link-icon-border: rgba(94, 191, 168, 0.3);
          --link-shadow: 0 4px 12px rgba(0, 77, 76, 0.08);
          --link-shadow-hover: 0 10px 24px rgba(0, 77, 76, 0.16);
        }

        [data-theme="dark"] {
          /* Adaptação Elegante para o Modo Escuro */
          --link-card-bg: #13222D;
          --link-card-hover: #1A2F3D;
          --link-border: #1E3545;
          --link-border-hover: #2DD4BF;
          --link-title: #F8FAFC;
          --link-desc: #94A3B8;
          --link-icon-bg: #0F1A22;
          --link-icon-border: #1E3545;
          --link-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          --link-shadow-hover: 0 10px 24px rgba(0, 0, 0, 0.4);
        }

        .card-link-item {
          display: block;
          text-decoration: none;
          background-color: var(--link-card-bg);
          border: 2px solid var(--link-border);
          border-radius: 16px;
          padding: 22px;
          box-shadow: var(--link-shadow);
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }

        .card-link-item:hover {
          transform: translateY(-4px);
          background-color: var(--link-card-hover);
          border-color: var(--link-border-hover);
          box-shadow: var(--link-shadow-hover);
        }

        /* Regra Especial para Cards em Destaque */
        .card-link-item.destaque {
          border: 2.5px solid #F59E0B;
          box-shadow: 0 6px 18px rgba(245, 158, 11, 0.15);
        }
        .card-link-item.destaque:hover {
          border-color: #F59E0B; /* Mantém laranja no hover */
        }
      `}</style>

      {/* CABEÇALHO */}
      <div style={{ borderBottom: '2px solid var(--border-search, #CBD5E1)', paddingBottom: '24px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--texto-titulo-verde, #004D4C)', margin: '0 0 8px 0' }}>
          🔗 Diretório de Links Úteis
        </h2>
        <p style={{ margin: 0, fontSize: '1rem', color: 'var(--texto-secundario, #64748B)' }}>
          Central de links diretos, formulários de apoio, sistemas e planilhas essenciais da operação.
        </p>
      </div>

      {/* SEÇÃO 1: PLANILHAS DA EQUIPE */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ fontSize: '1.4rem' }}>📊</span>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--texto-primario, #1E293B)', fontWeight: '800', margin: 0 }}>
            Planilhas Operacionais da Equipe
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {planilhas.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`card-link-item ${item.destaque ? 'destaque' : ''}`}
            >
              {item.destaque && (
                <div style={{
                  position: 'absolute', top: '-11px', right: '18px',
                  background: '#F59E0B', color: '#FFF',
                  fontSize: '0.68rem', fontWeight: '800', padding: '3px 10px',
                  borderRadius: '9999px', letterSpacing: '0.5px'
                }}>
                  PRIORIDADE
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--link-icon-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.45rem',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  border: '1px solid var(--link-icon-border)'
                }}>
                  {item.icone}
                </div>
                <span style={{ color: '#2DD4BF', fontSize: '1.15rem', fontWeight: '800' }}>↗</span>
              </div>

              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.02rem', color: 'var(--link-title)', fontWeight: '800' }}>
                {item.titulo}
              </h4>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--link-desc)', lineHeight: '1.5', fontWeight: '600' }}>
                {item.desc}
              </p>
            </a>
          ))}
        </div>
      </div>

      {/* SEÇÃO 2: SISTEMAS E APOIO EXTERNO */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ fontSize: '1.4rem' }}>🌐</span>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--texto-primario, #1E293B)', fontWeight: '800', margin: 0 }}>
            Links e Formas de Apoio Externo
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {sistemas.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-link-item"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--link-icon-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.45rem',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  border: '1px solid var(--link-icon-border)'
                }}>
                  {item.icone}
                </div>
                <span style={{ color: '#2DD4BF', fontSize: '1.15rem', fontWeight: '800' }}>↗</span>
              </div>

              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.02rem', color: 'var(--link-title)', fontWeight: '800' }}>
                {item.titulo}
              </h4>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--link-desc)', lineHeight: '1.5', fontWeight: '600' }}>
                {item.desc}
              </p>
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}