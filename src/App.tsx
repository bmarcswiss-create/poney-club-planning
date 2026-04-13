import React, { useState } from 'react';
import Accueil from './Accueil';
import Urgences from './Urgences';
import PlanningPersonnel from './PlanningPersonnel';

export default function App() {
  const [currentPage, setCurrentPage] = useState('accueil');

  return (
    <div className="App">
      {/* 1. Page Accueil */}
      {currentPage === 'accueil' && (
        <Accueil onNavigate={setCurrentPage} />
      )}

      {/* 2. Page Urgences */}
      {currentPage === 'urgences' && (
        <Urgences onNavigate={setCurrentPage} />
      )}

      {/* 3. Page Écurie -> Affiche TON PLANNING PERSONNEL */}
      {currentPage === 'planning-ecurie' && (
        <PlanningPersonnel onNavigate={setCurrentPage} />
      )}

      {/* 4. Page Cours -> En attente ou doublon */}
      {currentPage === 'planning-monitrices' && (
        <PlanningPersonnel onNavigate={setCurrentPage} />
      )}
    </div>
  );
}