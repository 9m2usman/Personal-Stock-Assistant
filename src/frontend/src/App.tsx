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

  const handleSelectSymbol = (sym: string) => {
    setSelectedSymbol(sym);
    setActiveTab('technical');
  };

  const handleQuickSearch = (sym: string) => {
    setSelectedSymbol(sym);
    setActiveTab('research');
  };

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onSearchSymbol={handleQuickSearch}
    >
      {activeTab === 'chat' && <ChatWorkspace onSelectSymbol={handleSelectSymbol} />}
      {activeTab === 'research' && <MarketResearch initialSymbol={selectedSymbol} />}
      {activeTab === 'technical' && <TechnicalStudio initialSymbol={selectedSymbol} />}
      {activeTab === 'portfolio' && <PortfolioDashboard />}
      {activeTab === 'scenarios' && <ScenarioLab />}
      {activeTab === 'news' && <NewsTerminal />}
      {activeTab === 'jobs' && <JobsMonitor />}
    </AppShell>
  );
}

export default App;
