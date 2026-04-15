import React, { useState } from 'react';
import Accueil from './Accueil';
import Soins from './soins';
import Documents from './Documents';
import Urgences from './Urgences';
import PlanningPersonnel from './PlanningPersonnel';
import PlanningSorties from './PlanningSorties';

export default function App() {
  // On s'assure que l'application démarre bien sur 'accueil'
  const [currentPage, setCurrentPage] = useState('accueil');

  return (
    <div className="App">
      {/* 1. Page Accueil : s'affiche uniquement si currentPage est 'accueil' */}
      {currentPage === 'accueil' && (
        <Accueil onNavigate={setCurrentPage} />
      )}

      {/* 2. Page Planning Sorties (ton nouveau tableau) */}
      {currentPage === 'planning-sorties' && (
        <PlanningSorties onNavigate={setCurrentPage} />
      )}

      {/* 3. Page Soins */}
      {currentPage === 'soins' && (
        <Soins onNavigate={() => setCurrentPage('accueil')} />
      )}

      {/* 4. Page Documents */}
      {currentPage === 'documents' && (
        <Documents onNavigate={setCurrentPage} />
      )}

      {/* 5. Page Urgences */}
      {currentPage === 'urgences' && (
        <Urgences onNavigate={setCurrentPage} />
      )}

      {/* 6. Page Écurie (Planning Personnel) */}
      {currentPage === 'planning-ecurie' && (
        <PlanningPersonnel onNavigate={setCurrentPage} />
      )}

      {/* 7. Page Cours (Planning Monitrices) */}
      {currentPage === 'planning-monitrices' && (
        <PlanningPersonnel onNavigate={setCurrentPage} />
      )}
    </div>
  );
}