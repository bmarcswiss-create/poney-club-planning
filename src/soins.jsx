import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X, Trash2, Pill, Clock, Edit3, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

const Soins = ({ onNavigate }) => {
  const [soins, setSoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    cheval: '', traitement: '', dosage: '',
    matin: false, midi: false, soir: false,
    date_debut: new Date().toISOString().split('T')[0], // Par défaut aujourd'hui
    date_fin: '', notes: ''
  });

  useEffect(() => {
    fetchSoins();
    localStorage.setItem('lastVisitSoins', Date.now().toString());
  }, []);

  const fetchSoins = async () => {
    try {
      const { data, error } = await supabase
        .from('soins')
        .select('*')
        .order('date_debut', { ascending: false }); // Les plus récents en haut
      if (!error) setSoins(data || []);
    } catch (err) {
      console.error("Erreur fetch:", err);
    }
    setLoading(false);
  };

  const handleOpenModal = (soin = null) => {
    if (soin) {
      setEditingId(soin.id);
      setFormData({
        cheval: soin.cheval || '',
        traitement: soin.traitement || '',
        dosage: soin.dosage || '',
        matin: !!soin.matin,
        midi: !!soin.midi,
        soir: !!soin.soir,
        date_debut: soin.date_debut || new Date().toISOString().split('T')[0],
        date_fin: soin.date_fin || '',
        notes: soin.notes || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        cheval: '', traitement: '', dosage: '',
        matin: false, midi: false, soir: false,
        date_debut: new Date().toISOString().split('T')[0],
        date_fin: '', notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const enregistrerSoin = async () => {
    if (!formData.cheval || !formData.traitement) return;

    const payload = {
      cheval: formData.cheval,
      traitement: formData.traitement,
      dosage: formData.dosage,
      matin: formData.matin,
      midi: formData.midi,
      soir: formData.soir,
      notes: formData.notes,
      date_debut: formData.date_debut,
      date_fin: formData.date_fin === "" ? null : formData.date_fin
    };

    let error;
    if (editingId) {
      const { error: err } = await supabase.from('soins').update(payload).eq('id', editingId);
      error = err;
    } else {
      const { error: err } = await supabase.from('soins').insert([payload]);
      error = err;
    }

    if (!error) {
      fetchSoins();
      setIsModalOpen(false);
    } else {
      alert("Erreur base de données : " + error.message);
    }
  };

  const supprimerSoin = async (id) => {
    if (window.confirm("Supprimer ce traitement ?")) {
      const { error } = await supabase.from('soins').delete().eq('id', id);
      if (!error) fetchSoins();
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen font-black text-gray-300 uppercase tracking-widest">Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <header className="bg-[#1B2A49] p-8 pt-12 rounded-b-[45px] shadow-xl text-center relative text-white">
        <button onClick={() => onNavigate('accueil')} className="absolute top-8 left-6 bg-white/10 p-2 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <Pill size={32} className="text-red-400 mx-auto mb-2" />
        <h1 className="font-black uppercase text-xl tracking-tighter">Gestion des Soins</h1>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <button onClick={() => handleOpenModal()} className="w-full bg-white border-2 border-dashed border-gray-200 p-6 rounded-3xl text-gray-400 font-bold text-xs mb-8 flex flex-col items-center justify-center gap-2">
          <Plus size={24} /> <span>AJOUTER UN TRAITEMENT</span>
        </button>

        <div className="space-y-4">
          {soins.map(s => {
            const isDopant = s.notes?.toLowerCase().includes('dopant');
            const dateDebut = new Date(s.date_debut);
            const aujourdhui = new Date();
            aujourdhui.setHours(0,0,0,0);
            const estFutur = dateDebut > aujourdhui;

            return (
              <div key={s.id} className={`bg-white p-6 rounded-[35px] shadow-sm border-2 flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${isDopant ? 'border-red-100 bg-red-50/10' : 'border-white'} ${estFutur ? 'opacity-60' : ''}`}>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xl text-[#1B2A49] uppercase tracking-tighter">{s.cheval}</span>
                    {isDopant && <span className="bg-red-500 text-white text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1"><AlertTriangle size={12}/> DOPANT</span>}
                    {estFutur && <span className="bg-blue-100 text-blue-600 text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1"><CalendarIcon size={12}/> PRÉVU LE {dateDebut.toLocaleDateString()}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <span className="text-blue-600 font-black text-sm uppercase">{s.traitement}</span>
                    <span className="text-gray-400 font-bold text-xs italic">{s.dosage}</span>
                  </div>
                  {s.notes && (
                    <div className="mt-3 text-[11px] font-bold text-[#1B2A49]/70 bg-gray-50 p-3 rounded-2xl border-l-4 border-blue-400 whitespace-pre-line text-left">
                      {s.notes}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {['matin', 'midi', 'soir'].map(moment => s[moment] && (
                    <div key={moment} className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[10px] uppercase ${moment === 'matin' ? 'bg-orange-100 text-orange-600' : moment === 'midi' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      <Clock size={14} /> {moment}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0">
                  <div className="text-right px-4">
                    <span className="block text-[8px] font-black uppercase text-gray-400 tracking-widest">Période</span>
                    <span className="text-[10px] font-black text-[#1B2A49] uppercase">
                      {new Date(s.date_debut).toLocaleDateString()} {s.date_fin ? `au ${new Date(s.date_fin).toLocaleDateString()}` : '(Continu)'}
                    </span>
                  </div>
                  <button onClick={() => handleOpenModal(s)} className="p-4 bg-gray-50 text-gray-400 hover:text-blue-500 rounded-2xl transition-all">
                    <Edit3 size={20} />
                  </button>
                  <button onClick={() => supprimerSoin(s.id)} className="p-4 bg-gray-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1B2A49]/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[45px] p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-xl uppercase text-[#1B2A49] tracking-tighter">{editingId ? 'Modifier' : 'Nouveau'} Soin</h2>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={20}/></button>
            </div>
            
            <div className="space-y-4 text-left">
              <input type="text" placeholder="NOM DU CHEVAL" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none uppercase" 
                value={formData.cheval} onChange={e => setFormData({...formData, cheval: e.target.value.toUpperCase()})} />
              <input type="text" placeholder="MÉDICAMENT / SOIN" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-blue-600 outline-none" 
                value={formData.traitement} onChange={e => setFormData({...formData, traitement: e.target.value})} />
              <input type="text" placeholder="DOSAGE" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none" 
                value={formData.dosage} onChange={e => setFormData({...formData, dosage: e.target.value})} />

              <div className="grid grid-cols-3 gap-2">
                {['matin', 'midi', 'soir'].map(m => (
                  <button key={m} onClick={() => setFormData({...formData, [m]: !formData[m]})}
                    className={`p-3 rounded-2xl font-black uppercase text-[10px] border-2 transition-all ${formData[m] ? 'bg-blue-500 border-blue-500 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-300'}`}>
                    {m}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Annotations</label>
                <textarea className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold mt-1 h-20 outline-none" 
                  value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Date prévue</label>
                  <input type="date" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold mt-1 outline-none text-xs" 
                    value={formData.date_debut} onChange={e => setFormData({...formData, date_debut: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Date de fin</label>
                  <input type="date" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold mt-1 outline-none text-xs" 
                    value={formData.date_fin} onChange={e => setFormData({...formData, date_fin: e.target.value})} />
                </div>
              </div>

              <button onClick={enregistrerSoin} className="w-full bg-[#1B2A49] text-white py-5 rounded-[25px] font-black uppercase tracking-widest shadow-xl mt-4">
                {editingId ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Soins;