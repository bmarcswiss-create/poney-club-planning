import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X, Trash2, Pill, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

const Soins = ({ onNavigate }) => {
  const [soins, setSoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newSoin, setNewSoin] = useState({
    cheval: '', traitement: '', dosage: '',
    matin: false, midi: false, soir: false,
    date_fin: ''
  });

  useEffect(() => {
    fetchSoins();
  }, []);

  const fetchSoins = async () => {
    const { data, error } = await supabase
      .from('soins')
      .select('*')
      .eq('termine', false)
      .order('cheval', { ascending: true });
    if (!error) setSoins(data);
    setLoading(false);
  };

  const ajouterSoin = async () => {
    if (!newSoin.cheval || !newSoin.traitement) return;

    // CORRECTION ICI : On transforme "" en null pour la date
    const donneesAEnvoyer = {
      ...newSoin,
      date_fin: newSoin.date_fin === "" ? null : newSoin.date_fin
    };

    const { error } = await supabase.from('soins').insert([donneesAEnvoyer]);
    
    if (!error) {
      fetchSoins();
      setIsModalOpen(false);
      setNewSoin({ cheval: '', traitement: '', dosage: '', matin: false, midi: false, soir: false, date_fin: '' });
    } else {
      alert("Erreur de base de données : " + error.message);
    }
  };

  const supprimerSoin = async (id) => {
    if (window.confirm("Supprimer ce traitement ?")) {
      const { error } = await supabase.from('soins').delete().eq('id', id);
      if (!error) setSoins(soins.filter(s => s.id !== id));
    }
  };

  const ColonneSoin = ({ titre, moment, icon }) => (
    <div className="bg-white rounded-[30px] shadow-sm p-5 border border-gray-100 h-full">
      <div className="flex items-center gap-2 mb-4 text-[#1B2A49] opacity-40 font-black text-[10px] uppercase tracking-widest">
        {icon} {titre}
      </div>
      <div className="space-y-3">
        {soins.filter(s => s[moment]).map(s => (
          <div key={s.id} className="bg-gray-50 p-4 rounded-2xl relative group">
            <button onClick={() => supprimerSoin(s.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 size={14}/>
            </button>
            <div className="font-black text-sm text-[#1B2A49] uppercase leading-tight">{s.cheval}</div>
            <div className="text-blue-600 font-bold text-xs mt-1">{s.traitement}</div>
            <div className="text-gray-400 font-bold text-[10px] mt-1 italic">{s.dosage}</div>
            
            {/* AFFICHAGE DE LA DATE CORRIGÉ */}
            {s.date_fin ? (
              <div className="text-[9px] font-black text-orange-400 mt-2 uppercase tracking-tighter">
                Fin : {new Date(s.date_fin).toLocaleDateString()}
              </div>
            ) : (
              <div className="text-[9px] font-black text-blue-400 mt-2 uppercase tracking-tighter">
                Traitement continu
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <header className="bg-[#1B2A49] p-8 pt-12 rounded-b-[45px] shadow-xl text-center relative text-white">
        <button onClick={() => onNavigate('accueil')} className="absolute top-8 left-6 bg-white/10 p-2 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <Pill size={32} className="text-red-400 mx-auto mb-2" />
        <h1 className="font-black uppercase text-xl tracking-tighter">Pharmacie & Soins</h1>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-white border-2 border-dashed border-gray-200 p-6 rounded-3xl text-gray-400 font-bold text-xs mb-8 flex flex-col items-center justify-center gap-2"
        >
          <Plus size={24} /> <span>NOUVEAU TRAITEMENT</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ColonneSoin titre="Matin" moment="matin" icon={<Clock size={14}/>} />
          <ColonneSoin titre="Midi" moment="midi" icon={<Clock size={14}/>} />
          <ColonneSoin titre="Soir" moment="soir" icon={<Clock size={14}/>} />
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1B2A49]/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-xl uppercase text-[#1B2A49]">Nouveau Soin</h2>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <input type="text" placeholder="NOM DU CHEVAL" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold" 
                value={newSoin.cheval} onChange={e => setNewSoin({...newSoin, cheval: e.target.value.toUpperCase()})} />
              
              <input type="text" placeholder="MÉDICAMENT / SOIN" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-blue-600" 
                value={newSoin.traitement} onChange={e => setNewSoin({...newSoin, traitement: e.target.value})} />
              
              <input type="text" placeholder="DOSAGE (ex: 2 sachets)" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold" 
                value={newSoin.dosage} onChange={e => setNewSoin({...newSoin, dosage: e.target.value})} />

              <div className="grid grid-cols-3 gap-2">
                {['matin', 'midi', 'soir'].map(m => (
                  <button key={m} onClick={() => setNewSoin({...newSoin, [m]: !newSoin[m]})}
                    className={`p-3 rounded-xl font-black uppercase text-[10px] border-2 transition-all ${newSoin[m] ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-100 text-gray-300'}`}>
                    {m}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Date de fin (Optionnel)</label>
                <input type="date" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold mt-1" 
                  value={newSoin.date_fin} onChange={e => setNewSoin({...newSoin, date_fin: e.target.value})} />
              </div>

              <button onClick={ajouterSoin} className="w-full bg-[#1B2A49] text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-lg mt-4">
                ENREGISTRER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Soins;