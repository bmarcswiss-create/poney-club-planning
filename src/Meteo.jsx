import React from 'react';
import { ArrowLeft, CloudSun, Wind, Thermometer } from 'lucide-react';

const Meteo = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-40 flex flex-col font-sans text-[#1B2A49]">
      {/* Header Sombre Style Board */}
      <header className="bg-[#1B2A49] p-8 pt-12 rounded-b-[45px] shadow-xl text-center text-white relative">
        <button 
          onClick={() => onNavigate('accueil')} 
          className="absolute top-8 left-6 bg-white/10 p-2 rounded-xl active:scale-90 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <CloudSun size={32} className="text-[#8DC63F] mx-auto mb-2" />
        <h1 className="font-black uppercase text-xl tracking-tighter">Météo Presinge</h1>
        <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Prévisions 5 jours</p>
      </header>

      <main className="max-w-md mx-auto w-full p-6 mt-4 flex-1">
        {/* Nouveau Widget Météo - Fixé sur Presinge */}
        <div className="bg-white rounded-[40px] shadow-sm p-4 border-4 border-white overflow-hidden shadow-xl shadow-blue-900/5 min-h-[400px]">
          <iframe 
            src="https://www.tameteo.com/get_widget/66567/v2/c1/f:0/m:1/p:1/l:1/h:1/w:1/s:1/t:1" 
            frameBorder="0" 
            scrolling="NO" 
            allowTransparency="true" 
            style={{ width: '100%', height: '410px' }}
            title="Météo Presinge"
          ></iframe>
        </div>

        {/* Aide à la décision pour l'écurie */}
        <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-[30px] flex flex-col items-center shadow-sm border border-gray-100">
                <Wind className="text-blue-400 mb-2" size={20} />
                <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest text-center">Sols & Paddock</span>
                <span className="text-[10px] font-bold mt-1 italic">Vérifier le vent</span>
            </div>
            <div className="bg-white p-5 rounded-[30px] flex flex-col items-center shadow-sm border border-gray-100">
                <Thermometer className="text-red-400 mb-2" size={20} />
                <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest text-center">Couvertures</span>
                <span className="text-[10px] font-bold mt-1 italic">T° ressentie</span>
            </div>
        </div>
      </main>

      {/* CAPSULE DE RETOUR BOARD */}
      <footer className="fixed bottom-8 left-0 right-0 p-8 z-40 flex justify-center pointer-events-none">
        <button 
          onClick={() => onNavigate('accueil')}
          className="bg-[#1B2A49] text-white px-8 py-4 rounded-full shadow-2xl pointer-events-auto active:scale-95 transition-all font-black uppercase text-[10px] tracking-widest border border-white/10 flex items-center gap-3"
        >
          <ArrowLeft size={16} /> Retour Board
        </button>
      </footer>
    </div>
  );
};

export default Meteo;