'use client';

import React, { useState, useEffect } from 'react';
import HomeView from '@/components/HomeView';
import ColinhasBoard from '@/components/ColinhasBoard';
import RegulamentosView from '@/components/RegulamentosView';
import LinksView from '@/components/LinksView';

export default function AppPrincipal() {
  const [activeView, setActiveView] = useState('home');

  // SIMULAÇÃO DO ESTADO DE SESSÃO CORPORATIVA (Futuramente via NextAuth / Auth.js)
  // Altere o email aqui para testar:
  // Se for um dos emails autorizados da liderança, isSupervisor vira true automaticamente.
  const [usuarioLogado, setUsuarioLogado] = useState({
    nome: 'Mariana Paiva',
    email: 'supervisao@estantevirtual.com.br', // Teste trocando para 'analista@estantevirtual.com.br'
    avatar: 'EV'
  });

  // Lista de e-mails de líderes autorizados (espelho do que estará na tabela do Railway)
  const lideresAutorizados = [
    'supervisao@estantevirtual.com.br'
  ];

  // A validação de supervisor é automática baseada no e-mail
  const isSupervisor = lideresAutorizados.includes(usuarioLogado.email.toLowerCase());

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* NAVBAR UNIFICADA */}
      <header className="hub-navbar">
        <a className="brand-container" onClick={() => setActiveView('home')}>
          <div className="brand-badge">📚</div>
          <div className="brand-text-col">
            <div className="brand-eyebrow">Estante Virtual</div>
            <div className="brand-name">Portal <span>Capitu</span></div>
          </div>
        </a>

        {/* MENU */}
        <nav>
          <ul className="hub-nav-menu">
            <li>
              <button
                className={`nav-link-btn ${activeView === 'home' ? 'active' : ''}`}
                onClick={() => setActiveView('home')}
              >
                <span className="nav-icon">🏠</span> Início
              </button>
            </li>
            <li>
              <button
                className={`nav-link-btn ${activeView === 'colinhas' ? 'active' : ''}`}
                onClick={() => setActiveView('colinhas')}
              >
                <span className="nav-icon">📝</span> Colinhas
              </button>
            </li>
            <li>
              <button
                className={`nav-link-btn ${activeView === 'regulamentos' ? 'active' : ''}`}
                onClick={() => setActiveView('regulamentos')}
              >
                <span className="nav-icon">📜</span> Regulamentos
              </button>
            </li>
            <li>
              <button
                className={`nav-link-btn ${activeView === 'links' ? 'active' : ''}`}
                onClick={() => setActiveView('links')}
              >
                <span className="nav-icon">🔗</span> Links Úteis
              </button>
            </li>
          </ul>
        </nav>

        {/* PERFIL IDENTIFICADO VIA SSO (SEM BOTÃO MANUAL DE LÍDER) */}
        <div className="navbar-actions">
          <div className="user-chip">
            <div className="avatar-circle">
              {usuarioLogado.avatar}
            </div>
            <div className="user-caption">
              {usuarioLogado.nome}
              <span>{isSupervisor ? 'Supervisão EV' : 'Equipe EV'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO */}
      <main style={{ flex: 1 }}>
        {activeView === 'home' && <HomeView isSupervisor={isSupervisor} />}
        {activeView === 'colinhas' && <ColinhasBoard isSupervisor={isSupervisor} />}
        {activeView === 'regulamentos' && <RegulamentosView />}
        {activeView === 'links' && <LinksView />}
      </main>

    </div>
  );
}