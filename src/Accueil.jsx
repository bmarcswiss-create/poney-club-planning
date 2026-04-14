import React, { useState, useEffect } from 'react';
import { Calendar, GraduationCap, Plus, X, CheckCircle2, Circle, Trash2, HeartPulse, DoorOpen, Ban, Phone, FileText, Info, Forward, Pill, Edit3 } from 'lucide-react';
import { supabase } from './supabaseClient';

const LOGO_URL = "https://lnwvlyswsmtafyoepovq.supabase.co/storage/v1/object/public/logo/logo.png";

const Accueil = ({ onNavigate }) => {
  const [consignes, setConsignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // États pour les boules rouges
  const [notifSoins, setNotifSoins] = useState(false);
  const [notifPlanning, setNotifPlanning] = useState(false);

  const [newTexte, setNewTexte] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSection, setSelectedSection] = useState('Sortie');

  const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const jourActuel = joursSemaine[new Date().getDay()];

  const dateInfo = new Intl.DateTimeFormat('fr-FR', { 
    weekday: 'long', day: 'numeric', month: 'long' 
  }).format(new Date());

  useEffect(() => {
    fetchConsignes();
    checkNotifications();
  }, []);

  const fetchConsignes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('consignes').select('*').order('created_at', { ascending: false });
    if (!error && data) setConsignes(data);
    setLoading(false);
  };

  const checkNotifications = async () => {
    // On définit "récent" comme moins de 24h pour ton test
    const delaiMs = 24 * 60 * 60 * 1000; 
    const maintenant = new Date().getTime();

    try {
      // 1. Vérification des Soins
      const { data: lastSoin } = await supabase
        .from('soins')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastSoin?.[0]) {
        const dateSoin = new Date(lastSoin[0].created_at).getTime();
        if (maintenant - dateSoin < delaiMs) setNotifSoins(true);
      }

      // 2. Vérification du Planning via ta table app_state
      const { data: lastState } = await supabase
        .from('app_state')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastState?.[0]) {
        const dateState = new Date(lastState[0].created_at).getTime();
        if (maintenant - dateState < delaiMs) setNotifPlanning(true);
      }
    } catch (e) {
      console.log("Erreur de notif:", e);
    }
  };

  const handleOpenModal = (tache = null) => {
    if (tache) {
      setEditingId(tache.id);
      setNewTexte(tache.texte);
      setNewNotes(tache.notes || '');
      setSelectedSection(tache.section || 'Sortie');
      setSelectedDay(tache.jour_semaine || '');
    } else {
      setEditingId(null);
      setNewTexte('');
      setNewNotes('');
      setSelectedSection('Sortie');
      setSelectedDay('');
    }
    setIsAdminOpen(true);
  };

  const enregistrerTache = async () => {
    if (!newTexte.trim()) return;
    const payload = { texte: newTexte, notes: newNotes, section: selectedSection, jour_semaine: selectedDay || null };
    let error;
    if (editingId) {
      const { error: err } = await supabase.from('consignes').update(payload).eq('id', editingId);
      error = err;
    } else {
      const { error: err } = await supabase.from('consignes').insert([{ ...payload, est_fait: false }]);
      error = err;
    }
    if (!error) {
      fetchConsignes();
      setIsAdminOpen(false);
    }
  };

  const toggleTache = async (id, etatActuel, isActive) => {
    if (!isActive) return;
    const { error } = await supabase.from('consignes').update({ est_fait: !etatActuel }).eq('id', id);
    if (!error) fetchConsignes();
  };

  const supprimerTache = async (id) => {
    if (window.confirm("Supprimer cette fiche ?")) {
      const { error } = await supabase.from('consignes').delete().eq('id', id);
      if (!error) setConsignes(consignes.filter(t => t.id !== id));
    }
  };

  const Badge = () => (
    <span className="absolute -top-1 -right-1 flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
    </span>
  );

  const tasksActive = consignes.filter(t => !t.jour_semaine || t.jour_semaine === jourActuel || t.jour_semaine === 'permanent');
  const tasksFuture = consignes.filter(t => t.jour_semaine && t.jour_semaine !== jourActuel && t.jour_semaine !== 'permanent');

  const TaskCard = ({ t, isActive }) => (
    <div className={`flex flex-col p-4 rounded-3xl border-2 transition-all shadow-sm ${isActive ? 'bg-white border-white' : 'bg-white/40 border-transparent opacity-60'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1" onClick={() => toggleTache(t.id, t.est_fait, isActive)}>
          {isActive ? (
            t.est_fait ? <CheckCircle2 className="text-[#8DC63F]" size={22} /> : <Circle className="text-gray-300" size={22} />
          ) : (
            <Calendar className="text-gray-400" size={18} />
          )}
          <div className="flex flex-col">
            <span className={`text-[15px] font-bold leading-tight ${t.est_fait ? 'line-through text-gray-400' : 'text-[#1B2A49]'}`}>{t.texte}</span>
            <span className="text-[9px] font-black uppercase text-[#8DC63F] mt-0.5">
              {t.jour_semaine === 'permanent' ? "Jusqu'à effacement" : !t.jour_semaine ? "Aujourd'hui" : `Chaque ${t.jour_semaine}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => handleOpenModal(t)} className="text-gray-200 hover:text-blue-400 p-2"><Edit3 size={16} /></button>
          <button onClick={() => supprimerTache(t.id)} className="text-gray-200 hover:text-red-400 p-2"><Trash2 size={16} /></button>
        </div>
      </div>
      {t.notes && (
        <div className="mt-2 ml-10 p-2 bg-gray-50 rounded-xl border-l-4 border-[#8DC63F]/30 text-[11px] font-medium text-gray-600 italic">
          {t.notes}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-40">
      <header className="fixed top-0 left-0 right-0 bg-[#1B2A49] z-40 px-6 pt-12 pb-8 rounded-b-[45px] shadow-2xl flex flex-col items-center">
        <button onClick={() => handleOpenModal()} className="absolute top-6 right-6 bg-[#8DC63F] text-[#1B2A49] p-3.5 rounded-2xl shadow-lg font-bold">
          <Plus size={24} strokeWidth={3} />
        </button>
        <img src={LOGO_URL} alt="Logo" className="h-16 w-16 rounded-full border-4 border-[#8DC63F] mb-3 bg-white" />
        <h1 className="text-white font-black uppercase text-lg tracking-tighter">Espace Collaborateur</h1>
        <p className="text-[#8DC63F] font-bold text-[10px] uppercase tracking-[0.2em] mt-1">{dateInfo}</p>
      </header>

      <main className="w-full max-w-md mx-auto px-6 pt-64">
        <div className="grid grid-cols-3 gap-3 mb-10">
          <button onClick={() => onNavigate('urgences')} className="bg-white p-4 rounded-3xl shadow-sm border border-red-50 flex flex-col items-center gap-2 relative">
            <div className="bg-red-500 p-2 rounded-xl text-white"><Phone size={18} /></div>
            <span className="text-[8px] font-black uppercase text-[#1B2A49]">Urgences</span>
          </button>
          <button onClick={() => onNavigate('soins')} className="bg-white p-4 rounded-3xl shadow-sm border border-blue-50 flex flex-col items-center gap-2 relative">
            <div className="bg-red-100 p-2 rounded-xl text-red-600"><Pill size={18} /></div>
            <span className="text-[8px] font-black uppercase text-[#1B2A49]">Soins</span>
            {notifSoins && <Badge />}
          </button>
          <button onClick={() => onNavigate('documents')} className="bg-white p-4 rounded-3xl shadow-sm border border-blue-50 flex flex-col items-center gap-2">
            <div className="bg-[#1B2A49] p-2 rounded-xl text-white"><FileText size={18} /></div>
            <span className="text-[8px] font-black uppercase text-[#1B2A49]">Docs</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-20 text-gray-300 animate-pulse font-black uppercase text-[10px] tracking-widest text-center">Mise à jour...</div>
        ) : (
          <div className="space-y-10">
            {[
              { id: 'Sortie', label: 'Chevaux à sortir', icon: DoorOpen, color: 'text-blue-500' },
              { id: 'Arret', label: 'Chevaux à l\'arrêt', icon: Ban, color: 'text-orange-500' },
              { id: 'Soins', label: 'Chevaux en soins', icon: HeartPulse, color: 'text-red-500' },
              { id: 'Autres', label: 'Autres consignes', icon: Info, color: 'text-purple-500' }
            ].map(section => {
              const tasks = tasksActive.filter(t => t.section === section.id);
              if (tasks.length === 0) return null;
              return (
                <div key={section.id}>
                  <h3 className={`flex items-center gap-2 font-black text-[11px] uppercase tracking-[0.2em] mb-4 ml-2 ${section.color}`}>
                    <section.icon size={16} /> {section.label}
                  </h3>
                  <div className="space-y-3">
                    {tasks.map(t => <TaskCard key={t.id} t={t} isActive={true} />)}
                  </div>
                </div>
              );
            })}

            {tasksFuture.length > 0 && (
              <div className="mt-16 pt-10 border-t-2 border-gray-200/50">
                <h3 className="flex items-center gap-2 font-black text-[11px] uppercase tracking-[0.2em] mb-6 ml-2 text-gray-400">
                  <Forward size={16} /> Prévisions pour la semaine
                </h3>
                <div className="space-y-3">
                  {tasksFuture.map(t => <TaskCard key={t.id} t={t} isActive={false} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {isAdminOpen && (
        <div className="fixed inset-0 bg-[#1B2A49]/95 z-50 flex items-end justify-center px-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-2xl uppercase text-[#1B2A49] tracking-tighter">{editingId ? 'Modifier' : 'Nouvelle'} Fiche</h2>
              <button onClick={() => setIsAdminOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={20}/></button>
            </div>
            <div className="space-y-5">
              <input type="text" value={newTexte} onChange={(e) => setNewTexte(e.target.value)} placeholder="Nom du cheval..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none" />
              <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Notes..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold h-20 outline-none" />
              <div className="grid grid-cols-2 gap-2">
                {['Sortie', 'Arret', 'Soins', 'Autres'].map(s => (
                  <button key={s} onClick={() => setSelectedSection(s)} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${selectedSection === s ? 'bg-[#1B2A49] text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}>{s}</button>
                ))}
              </div>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold">
                <option value="">Aujourd'hui</option>
                <option value="permanent">Permanent</option>
                {joursSemaine.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
              <button onClick={enregistrerTache} className="w-full bg-[#8DC63F] text-[#1B2A49] py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-lg">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 p-8 z-40 pointer-events-none">
        <div className="max-w-xs mx-auto flex items-center justify-around bg-[#1B2A49] p-4 rounded-[32px] shadow-2xl border border-white/10 pointer-events-auto">
          <button onClick={() => onNavigate('accueil')} className="flex flex-col items-center text-[#8DC63F] flex-1">
            <DoorOpen size={20} />
            <span className="text-[7px] font-black uppercase mt-1">Tableau</span>
          </button>
          <div className="h-6 w-[1px] bg-white/10"></div>
          <button onClick={() => onNavigate('planning-ecurie')} className="flex flex-col items-center text-white/40 flex-1 relative">
            <Calendar size={20} />
            <span className="text-[7px] font-black uppercase mt-1">Écurie</span>
            {notifPlanning && <Badge />}
          </button>
          <div className="h-6 w-[1px] bg-white/10"></div>
          <button onClick={() => onNavigate('planning-monitrices')} className="flex flex-col items-center text-white/40 flex-1">
            <GraduationCap size={20} />
            <span className="text-[7px] font-black uppercase mt-1">Cours</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Accueil;