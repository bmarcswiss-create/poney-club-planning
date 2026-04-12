import React from 'react';
import { Calendar, GraduationCap, ClipboardList, FileText, Phone } from 'lucide-react';

const LOGO_URL = "https://lnwvlyswsmtafyoepovq.supabase.co/storage/v1/object/public/logo/logo.png";

const Accueil = ({ onNavigate }) => {
  // On récupère la date du jour pour les tâches automatiques
  const dateInfo = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-10">
      
      {/* HEADER avec ton Logo */}
      <header className="w-full bg-[#1B2A49] p-6 flex flex-col items-center shadow-lg">
      <img 
  src={LOGO_URL} 
  alt="Logo" 
  className="h-24 w-24 rounded-full border-4 border-[#8DC63F] object-cover shadow-md mb-2 bg-white" 
/>
        <h1 className="text-white font-black uppercase tracking-tighter text-xl">Espace Collaborateur</h1>
        <p className="text-[#8DC63F] font-bold capitalize">{dateInfo}</p>
      </header>

      <div className="w-full max-w-md p-4 space-y-6">
        
        {/* SECTION PRIORITÉS (Tâches du jour) */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border-l-8 border-[#8DC63F]">
          <h2 className="text-[#1B2A49] font-black uppercase text-sm mb-4 flex items-center">
            <ClipboardList className="mr-2" size={18} /> À faire aujourd'hui
          </h2>
          <ul className="space-y-3">
            <li className="flex items-center text-gray-700 font-medium">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
              Vérification des abreuvoirs
            </li>
            <li className="flex items-center text-gray-700 font-medium">
              <span className="w-2 h-2 bg-[#8DC63F] rounded-full mr-3"></span>
              Sortie Poneys (Grand Manège)
            </li>
          </ul>
        </section>

        {/* GRILLE DU MENU PRINCIPAL */}
        <div className="grid grid-cols-2 gap-4">
          
          <button 
            onClick={() => onNavigate('planning-ecurie')}
            className="bg-white p-6 rounded-3xl shadow-sm flex flex-col items-center border-2 border-transparent hover:border-[#8DC63F] transition-all">
            <Calendar className="text-[#1B2A49] mb-3" size={32} />
            <span className="text-[#1B2A49] font-black text-[10px] uppercase">Planning Écurie</span>
          </button>

          <button 
            onClick={() => onNavigate('planning-monitrices')}
            className="bg-white p-6 rounded-3xl shadow-sm flex flex-col items-center border-2 border-transparent hover:border-[#8DC63F] transition-all">
            <GraduationCap className="text-[#1B2A49] mb-3" size={32} />
            <span className="text-[#1B2A49] font-black text-[10px] uppercase">Monitrices</span>
          </button>

          <button className="bg-white p-6 rounded-3xl shadow-sm flex flex-col items-center opacity-60">
            <FileText className="text-[#1B2A49] mb-3" size={32} />
            <span className="text-[#1B2A49] font-black text-[10px] uppercase">Documents</span>
          </button>

          <button className="bg-white p-6 rounded-3xl shadow-sm flex flex-col items-center opacity-60">
            <Phone className="text-red-500 mb-3" size={32} />
            <span className="text-[#1B2A49] font-black text-[10px] uppercase">Urgences</span>
          </button>

        </div>

      </div>
    </div>
  );
};

export default Accueil;