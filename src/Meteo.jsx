import React, { useState, useEffect } from 'react';
import { ArrowLeft, CloudSun, Wind, Thermometer, CheckCircle, AlertTriangle, XCircle, Shirt } from 'lucide-react';
import { supabase } from './supabaseClient';

const Meteo = ({ onNavigate }) => {
  const [statusSols, setStatusSols] = useState(0); // 0: OK, 1: Vigilance, 2: Fermé
  const [tempRessentie, setTempRessentie] = useState(null);

  useEffect(() => {
    fetchAppState();
    getLiveWeather();
  }, []);

  // Récupère l'état des paddocks stocké sur Supabase
  const fetchAppState = async () => {
    const { data } = await supabase.from('app_state').select('*').eq('id', 'status_paddocks').single();
    if (data) setStatusSols(data.data.value);
  };

  // Petite fonction pour chopper la température réelle à Presinge (Open-Meteo)
  const getLiveWeather = async () => {
    try {
      const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=46.24&longitude=6.25&current=apparent_temperature");
      const data = await res.json();
      setTempRessentie(Math.round(data.current.apparent_temperature));
    } catch (e) { console.error("Erreur météo live", e); }
  };

  // Change l'état des sols et synchronise avec l'écurie
  const toggleSols = async () => {
    const nextStatus = (statusSols + 1) % 3;
    setStatusSols(nextStatus);
    await supabase.from('app_state').upsert([{ id: 'status_paddocks', data: { value: nextStatus } }]);
  };

  // Logique automatique pour les couvertures
  const getConseilCouverture = () => {
    if (tempRessentie === null) return "Chargement...";
    if (tempRessentie > 18) return "Sans couverture";
    if (tempRessentie > 12) return "Chemise / 0g";
    if (tempRessentie > 5) return "Couverture 100g";
    return "Grosse couverture (200g+)";
  };

  const configSols = [
    { label: "Paddocks Ouverts", color: "text-green-500", bg: "bg-green-50", icon: <CheckCircle size={20} /> },
    { label: "Sols Délicats", color: "text-orange-500", bg: "bg-orange-50", icon: <AlertTriangle size={20} /> },
    { label: "Paddocks Fermés", color: "text-red-500", bg: "bg-red-50", icon: <XCircle size={20} /> }
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-40 flex flex-col font-sans text-[#1B2A49]">
      <header className="bg-[#1B2A49] p-8 pt-12 rounded-b-[45px] shadow-xl text-center text-white relative">
        <button onClick={() => onNavigate('accueil')} className="absolute top-8 left-6 bg-white/10 p-2 rounded-xl active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <CloudSun size={32} className="text-[#8DC63F] mx-auto mb-2" />
        <h1 className="font-black uppercase text-xl tracking-tighter">Météo Presinge</h1>
        <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Pilotage Écurie</p>
      </header>

      <main className="max-w-md mx-auto w-full p-6 mt-4 flex-1">
        {/* Widget principal */}
        <div className="bg-white rounded-[40px] shadow-sm p-4 border-4 border-white overflow-hidden shadow-xl shadow-blue-900/5 min-h-[450px]">
          <iframe 
            src="https://www.prevision-meteo.ch/services/html/presinge/square" 
            frameBorder="0" scrolling="NO" allowTransparency="true" 
            style={{ width: '100%', height: '420px', border: 'none' }}
            title="Météo Presinge"
          ></iframe>
        </div>

        {/* Aide à la décision INTERACTIVE */}
        <div className="mt-6 grid grid-cols-2 gap-4">
            
            {/* BOUTON SOLS : Clique pour changer l'état */}
            <button 
              onClick={toggleSols}
              className={`${configSols[statusSols].bg} p-5 rounded-[30px] flex flex-col items-center shadow-sm border border-gray-100 transition-all active:scale-95`}
            >
                <div className={`${configSols[statusSols].color} mb-2`}>
                  {configSols[statusSols].icon}
                </div>
                <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest text-center">Sols & Paddock</span>
                <span className={`text-[10px] font-black mt-1 uppercase ${configSols[statusSols].color}`}>
                  {configSols[statusSols].label}
                </span>
            </button>

            {/* SECTION COUVERTURES : Automatique via T° ressentie */}
            <div className="bg-white p-5 rounded-[30px] flex flex-col items-center shadow-sm border border-gray-100">
                <Shirt className="text-blue-500 mb-2" size={20} />
                <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest text-center">Conseil Couv'</span>
                <span className="text-[10px] font-black mt-1 uppercase text-[#1B2A49]">
                  {getConseilCouverture()}
                </span>
                {tempRessentie !== null && (
                  <span className="text-[8px] font-bold text-blue-300 mt-1 italic">Ressenti {tempRessentie}°C</span>
                )}
            </div>
        </div>
      </main>

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