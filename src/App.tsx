import React, { useState } from 'react';
import Accueil from './Accueil';
import Soins from './soins';
import Documents from './Documents';
import Urgences from './Urgences';
import PlanningPersonnel from './PlanningPersonnel';
// 1. MODIFICATION ICI : On importe le nouveau fichier
import GestionSorties from './GestionSorties'; 

export default function App() {
  const [currentPage, setCurrentPage] = useState('accueil');

  return (
    <div className="App">
      {currentPage === 'accueil' && (
        <Accueil onNavigate={setCurrentPage} />
      )}

      {/* 2. MODIFICATION ICI : On utilise GestionSorties à la place de PlanningSorties */}
      {currentPage === 'planning-sorties' && (
        <GestionSorties onNavigate={setCurrentPage} />
      )}

      {currentPage === 'soins' && (
        <Soins onNavigate={() => setCurrentPage('accueil')} />
      )}

      {currentPage === 'documents' && (
        <Documents onNavigate={setCurrentPage} />
      )}

      {currentPage === 'urgences' && (
        <Urgences onNavigate={setCurrentPage} />
      )}

      {currentPage === 'planning-ecurie' && (
        <PlanningPersonnel onNavigate={setCurrentPage} />
      )}

      {currentPage === 'planning-monitrices' && (
        <PlanningPersonnel onNavigate={setCurrentPage} />
      )}
    </div>
  );
}