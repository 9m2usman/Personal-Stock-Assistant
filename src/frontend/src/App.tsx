import React, { useState } from 'react';
import { AppShell } from './components/AppShell.tsx';
import { ChatWorkspace } from './views/ChatWorkspace.tsx';
import { MarketResearch } from './views/MarketResearch.tsx';
import { TechnicalStudio } from './views/TechnicalStudio.tsx';
import { PortfolioDashboard } from './views/PortfolioDashboard.tsx';
import { ScenarioLab } from './views/ScenarioLab.tsx';
import { NewsTerminal } from './views/NewsTerminal.tsx';
import { JobsMonitor } from './views/JobsMonitor.tsx';

export function App() {
  const [activeTab, setActiveTab] = useState('chat');
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
      {activeTab === 'chat' && <ChatWorkspace onSelectSymbol={(sym) => handleSelectSymbol(sym, 'technical')} />}
      {activeTab === 'research' && <MarketResearch initialSymbol={selectedSymbol} onSelectSymbol={(sym) => handleSelectSymbol(sym)} />}
      {activeTab === 'technical' && <TechnicalStudio initialSymbol={selectedSymbol} onSelectSymbol={(sym) => handleSelectSymbol(sym)} />}
      {activeTab === 'portfolio' && <PortfolioDashboard />}
      {activeTab === 'scenarios' && <ScenarioLab />}
      {activeTab === 'news' && <NewsTerminal initialSymbol={selectedSymbol} />}
      {activeTab === 'jobs' && <JobsMonitor initialSymbol={selectedSymbol} />}
    </AppShell>
  );
}

export default App;
