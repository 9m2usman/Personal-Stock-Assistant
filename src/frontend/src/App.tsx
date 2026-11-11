import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { AppShell } from './components/AppShell.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { OverviewDashboard } from './views/OverviewDashboard.tsx';
import { MarketsDiscoveryView } from './views/MarketsDiscoveryView.tsx';
import { StockDetailWorkspace } from './views/StockDetailWorkspace.tsx';
import { WatchlistsWorkspace } from './views/WatchlistsWorkspace.tsx';
import { PortfolioWorkspace } from './views/PortfolioWorkspace.tsx';
import { ResearchWorkspace } from './views/ResearchWorkspace.tsx';
import { NewsSentimentView } from './views/NewsSentimentView.tsx';
import { AiAssistantView } from './views/AiAssistantView.tsx';
import { AnalysisLabView } from './views/AnalysisLabView.tsx';
import { SavedResearchView } from './views/SavedResearchView.tsx';
import { SettingsView } from './views/SettingsView.tsx';

export function AppContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSymbol, setSelectedSymbol] = useState('NVDA');

  const handleSelectSymbol = (sym: string, targetTab?: string) => {
    setSelectedSymbol(sym.toUpperCase());
    if (targetTab) {
      setActiveTab(targetTab);
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      selectedSymbol={selectedSymbol}
      onSelectSymbol={(sym) => handleSelectSymbol(sym)}
    >
      <ErrorBoundary key={activeTab}>
        {activeTab === 'overview' && (
          <OverviewDashboard
            selectedSymbol={selectedSymbol}
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectSymbol={(sym) => handleSelectSymbol(sym)}
          />
        )}

        {activeTab === 'markets' && (
          <MarketsDiscoveryView
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectSymbol={(sym) => handleSelectSymbol(sym, 'stock_detail')}
          />
        )}

        {activeTab === 'stock_detail' && (
          <StockDetailWorkspace
            symbol={selectedSymbol}
            onSelectSymbol={(sym) => handleSelectSymbol(sym)}
            onNavigateToAssistant={() => setActiveTab('assistant')}
          />
        )}

        {activeTab === 'watchlists' && (
          <WatchlistsWorkspace
            onSelectSymbol={(sym) => handleSelectSymbol(sym, 'stock_detail')}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioWorkspace
            onNavigateToAssistant={() => setActiveTab('assistant')}
          />
        )}

        {activeTab === 'research' && (
          <ResearchWorkspace
            onSelectSymbol={(sym) => handleSelectSymbol(sym, 'stock_detail')}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'news' && (
          <NewsSentimentView
            initialSymbol={selectedSymbol}
            onSelectSymbol={(sym) => handleSelectSymbol(sym)}
          />
        )}

        {activeTab === 'assistant' && (
          <AiAssistantView
            onSelectSymbol={(sym) => handleSelectSymbol(sym)}
          />
        )}

        {activeTab === 'analysis_lab' && (
          <AnalysisLabView
            initialSymbol={selectedSymbol}
          />
        )}

        {activeTab === 'saved' && (
          <SavedResearchView
            onSelectSymbol={(sym) => handleSelectSymbol(sym, 'stock_detail')}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView />
        )}
      </ErrorBoundary>
    </AppShell>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary fallbackTitle="INKVECTOR Global Workspace Initialization Error">
        <AppContent />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
