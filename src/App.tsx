import React, { useState } from 'react';
import Accueil from './Accueil';
import Soins from './soins';
import Documents from './Documents';
import Urgences from './Urgences';
import PlanningPersonnel from './PlanningPersonnel';
import GestionSorties from './GestionSorties'; 
// 1. IMPORTATION DU COMPOSANT METEO
import Meteo from './Meteo'; 

export default function App() {
  const [currentPage, setCurrentPage] = useState('accueil');

  return (
    <div className="App">
      {currentPage === 'accueil' && (
        <Accueil onNavigate={setCurrentPage} />
      )}

      {currentPage === 'planning-sorties' && (
        <GestionSorties onNavigate={setCurrentPage} />
      )}

      {/* Correction pour que Soins puisse naviguer vers d'autres pages si besoin */}
      {currentPage === 'soins' && (
        <Soins onNavigate={setCurrentPage} />
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

      {/* 2. AJOUT DE LA NAVIGATION POUR LA METEO */}
      {currentPage === 'meteo' && (
        <Meteo onNavigate={setCurrentPage} />
      )}
    </div>
  );
}