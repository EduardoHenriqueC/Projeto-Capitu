'use client';

import React, { useState } from 'react';
import HomeView from '@/components/HomeView';
import ColinhasBoard from '@/components/ColinhasBoard';
import RegulamentosView from '@/components/RegulamentosView';

export default function AppPrincipal() {
  const [activeView, setActiveView] = useState('home');
  const [isSupervisor, setIsSupervisor] = useState(false);

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

        {/* MENU SUPERIOR */}
        <nav>
          <ul className="hub-nav-menu">
            <li>
              <button
                className={`nav-link-btn ${activeView === 'home' ? 'active' : ''}`}
                onClick={() => setActiveView('home')}
              >
                <span>🏠</span> Início
              </button>
            </li>
            <li>
              <button
                className={`nav-link-btn ${activeView === 'colinhas' ? 'active' : ''}`}
                onClick={() => setActiveView('colinhas')}
              >
                <span>📝</span> Colinhas
              </button>
            </li>
            <li>
              <button
                className={`nav-link-btn ${activeView === 'regulamentos' ? 'active' : ''}`}
                onClick={() => setActiveView('regulamentos')}
              >
                <span>📜</span> Regulamentos
              </button>
            </li>
            <li>
              <button
                className={`nav-link-btn ${activeView === 'tecnico' ? 'active' : ''}`}
                onClick={() => setActiveView('tecnico')}
              >
                <span>🛠️</span> Técnico
              </button>
            </li>
          </ul>
        </nav>

        {/* LADO DIREITO (ACESSO LÍDER & PERFIL EQUIPE EV) */}
        <div className="navbar-actions">
          <button
            className={`btn-leader-access ${isSupervisor ? 'logged-in' : ''}`}
            onClick={() => setIsSupervisor(!isSupervisor)}
          >
            <span>🔐</span>
            <span>{isSupervisor ? 'Líder Ativo' : 'Acesso Líder'}</span>
          </button>

          <div className="user-chip">
            <div className="avatar-circle">EV</div>
            <div className="user-caption">
              Equipe EV
              <span>Estante Virtual</span>
            </div>
          </div>
        </div>
      </header>

      {/* ÁREA DE VISUALIZAÇÃO ATIVA */}
      <main style={{ flex: 1 }}>
        {activeView === 'home' && <HomeView setView={setActiveView} />}
        {activeView === 'colinhas' && <ColinhasBoard isSupervisor={isSupervisor} />}
        {activeView === 'regulamentos' && <RegulamentosView />}
        {activeView === 'tecnico' && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
            <h2>🛠️ Suporte Técnico</h2>
            <p>Em breve: checklists e diagnósticos de infraestrutura.</p>
          </div>
        )}
      </main>

    </div>
  );
}