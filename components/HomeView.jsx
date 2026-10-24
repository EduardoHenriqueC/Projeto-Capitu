'use client';

import React from 'react';

export default function HomeView({ setView }) {
  return (
    <div>
      {/* HERO SECTION */}
      <div className="hero-hub">
        <div className="hero-hub-inner">
          <h1 className="hero-hub-title">Qual a leitura <span>de hoje?</span></h1>
          <p className="hero-hub-subtitle">
            Encontre rapidamente regras operacionais, manuais de atendimento e regulamentos oficiais da Estante Virtual.
          </p>

          <div className="hero-search-box">
            <span className="hero-search-icon">🔍</span>
            <input
              type="text"
              className="hero-search-input"
              placeholder="Digite uma dúvida, erro, regra de frete, devolução ou PIX..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') setView('regulamentos');
              }}
            />
            <button className="hero-search-btn" onClick={() => setView('regulamentos')}>Buscar</button>
          </div>
        </div>
      </div>

      {/* CONTAINER CENTRAL (SOBREPOSIÇÃO) */}
      <div className="hub-content-container">
        
        {/* 4 CARDS PRINCIPAIS */}
        <div className="boxes-grid-central">
          <div className="central-box" onClick={() => setView('regulamentos')}>
            <div>
              <div className="box-icon-wrapper">📦</div>
              <h3 className="central-box-title">Meus Pedidos & Rastreio</h3>
              <p className="central-box-desc">
                Ciclo de vida dos pedidos, status oficiais (Stand by, Aguardando Envio) e particularidades do Frete Econômico nos Correios.
              </p>
            </div>
            <div className="central-box-action">
              <span>Acessar procedimentos de rastreio</span>
              <span>→</span>
            </div>
          </div>

          <div className="central-box" onClick={() => setView('colinhas')}>
            <div>
              <div className="box-icon-wrapper">📝</div>
              <h3 className="central-box-title">Colinhas de Atendimento</h3>
              <p className="central-box-desc">
                Scripts oficiais prontos em estilo Google Keep. Copie com 1 clique com seu nome preenchido automaticamente.
              </p>
            </div>
            <div className="central-box-action">
              <span>Acessar colinhas rápidas</span>
              <span>→</span>
            </div>
          </div>

          <div className="central-box box-purple" onClick={() => setView('regulamentos')}>
            <div>
              <div className="box-icon-wrapper">📜</div>
              <h3 className="central-box-title">Regulamentos</h3>
              <p className="central-box-desc">
                Políticas oficiais consolidadas: prazos de envio pelo vendedor, devoluções CDC (7 dias), normas de estorno Pix e limites de carrinho.
              </p>
            </div>
            <div className="central-box-action">
              <span style={{ color: 'var(--ev-purple-dark)' }}>Ver todos os regulamentos</span>
              <span>→</span>
            </div>
          </div>

          <div className="central-box" onClick={() => setView('tecnico')}>
            <div>
              <div className="box-icon-wrapper">🛠️</div>
              <h3 className="central-box-title">Problemas Técnicos</h3>
              <p className="central-box-desc">
                Checklists de contingência operacional, instabilidades de gateway, fluxo de abertura de chamados para Engenharia.
              </p>
            </div>
            <div className="central-box-action">
              <span>Ver diagnósticos técnicos</span>
              <span>→</span>
            </div>
          </div>
        </div>

        {/* MURAL DE AVISOS */}
        <div className="mural-wrapper">
          <div className="mural-top-row">
            <div className="mural-title-group">
              <h2 className="mural-heading">📢 Mural de Avisos Operacionais</h2>
              <span className="mural-badge">Tempo Real</span>
            </div>
            <button className="btn-leader-trigger" onClick={() => alert('Para publicar, acione o botão "Acesso Líder" no topo da página.')}>
              <span>🔐</span> Publicar Comunicado (Acesso Líder)
            </button>
          </div>

          <div className="notice-card">
            <div className="notice-icon-box">⚠️</div>
            <div>
              <div className="notice-meta">
                <span className="notice-title">Normalização: Gateway de Pagamentos PIX</span>
                <span className="notice-time">Publicado hoje às 09:00 • Supervisão CS</span>
              </div>
              <div className="notice-desc">
                A oscilação temporária no processamento de pagamentos via PIX foi <b>completamente solucionada</b> pelo gateway parceiro. Todos os pedidos anteriormente retidos já foram liberados para separação pelos livreiros. Não há necessidade de abertura de incidentes de TI. Utilize a colinha de cancelamento ou atraso se necessário.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}