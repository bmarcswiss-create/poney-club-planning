import React, { useState, useEffect } from 'react';
import { Calendar, GraduationCap, Plus, X, CheckCircle2, Circle, Trash2, HeartPulse, DoorOpen, Ban, Phone, FileText, Info, Forward, Pill, Edit3, BellRing } from 'lucide-react';
import { supabase } from './supabaseClient';

const LOGO_URL = "https://lnwvlyswsmtafyoepovq.supabase.co/storage/v1/object/public/logo/logo.png";

const Accueil = ({ onNavigate }) => {
  const [consignes, setConsignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  
  const [notifSoins, setNotifSoins] = useState(false);
  const [notifPlanning, setNotifPlanning] = useState(false);

  const [newTexte, setNewTexte] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSection, setSelectedSection] = useState('Sortie');

  const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const jourActuel = joursSemaine[new Date().getDay()];
  const todayStr = new Date().toLocaleDateString('en-CA');
  const dateInfo = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  useEffect(() => {
    fetchConsignes();
    checkNotifications();
  }, []);

  const fetchConsignes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('consignes').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setConsignes(data);
      const lastCheck = localStorage.getItem('consignes_last_check') || "0";
      const mostRecent = data.length > 0 ? new Date(data[0].created_at).getTime() : 0;
      if (mostRecent > parseInt(lastCheck)) setShowAlert(true);
    }
    setLoading(false);
  };

  const closeAlert = () => {
    setShowAlert(false);
    localStorage.setItem('consignes_last_check', Date.now().toString());
  };

  const checkNotifications = async () => {
    try {
      const lastVisitSoins = localStorage.getItem('lastVisitSoins') || "0";
      const lastVisitPlanning = localStorage.getItem('lastVisitPlanning') || "0";
      const { data: lastSoin } = await supabase.from('soins').select('created_at').order('created_at', { ascending: false }).limit(1);
      if (lastSoin?.[0] && new Date(lastSoin[0].created_at).getTime() > parseInt(lastVisitSoins)) setNotifSoins(true);
      const { data: lastState } = await supabase.from('app_state').select('created_at').order('created_at', { ascending: false }).limit(1);
      if (lastState?.[0] && new Date(lastState[0].created_at).getTime() > parseInt(lastVisitPlanning)) setNotifPlanning(true);
    } catch (e) { console.log(e); }
  };

  const handleNavigateWithNotif = (target) => {
    if (target === 'soins') localStorage.setItem('lastVisitSoins', Date.now().toString());
    if (target === 'planning-ecurie') localStorage.setItem('lastVisitPlanning', Date.now().toString());
    onNavigate(target);
  };

  const enregistrerTache = async () => {
    if (!newTexte.trim()) return;
    const payload = { texte: newTexte, notes: newNotes, section: selectedSection, jour_semaine: selectedDay || null };
    if (editingId) { await supabase.from('consignes').update(payload).eq('id', editingId); }
    else { await supabase.from('consignes').insert([{ ...payload, est_fait: false, last_done_at: null }]); }
    fetchConsignes();
    setIsAdminOpen(false);
  };

  const toggleTache = async (id, currentLastDone, isActive) => {
    if (!isActive) return;
    const isDoneToday = currentLastDone === todayStr;
    await supabase.from('consignes').update({ last_done_at: isDoneToday ? null : todayStr }).eq('id', id);
    fetchConsignes();
  };

  const supprimerTache = async (id) => {
    if (window.confirm("Supprimer cette fiche ?")) {
      await supabase.from('consignes').delete().eq('id', id);
      fetchConsignes();
    }
  };

  const Badge = () => (
    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span>
  );

  const tasksActive = consignes.filter(t => !t.jour_semaine || t.jour_semaine === jourActuel || t.jour_semaine === 'permanent');
  const tasksFuture = consignes.filter(t => t.jour_semaine && t.jour_semaine !== jourActuel && t.jour_semaine !== 'permanent');

  const TaskCard = ({ t, isActive }) => {
    const estFaitAujourdhui = t.last_done_at === todayStr;
    return (
      <div className={`flex flex-col p-4 rounded-3xl border-2 transition-all shadow-sm ${isActive ? 'bg-white border-white' : 'bg-white/40 border-transparent opacity-60'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1" onClick={() => toggleTache(t.id, t.last_done_at, isActive)}>
            {isActive ? (estFaitAujourdhui ? <CheckCircle2 className="text-[#8DC63F]" size={22} /> : <Circle className="text-gray-300" size={22} />) : <Calendar className="text-gray-400" size={18} />}
            <div className="flex flex-col text-left">
              <span className={`text-[15px] font-black leading-tight ${estFaitAujourdhui ? 'line-through text-gray-400 opacity-50' : 'text-[#1B2A49]'}`}>{t.texte}</span>
              <span className="text-[9px] font-black uppercase text-[#8DC63F] mt-0.5">
                {t.jour_semaine === 'permanent' ? "Jusqu'à rétablissement" : !t.jour_semaine ? "Aujourd'hui" : `Chaque ${t.jour_semaine}`}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => { setEditingId(t.id); setNewTexte(t.texte); setNewNotes(t.notes || ''); setSelectedSection(t.section); setSelectedDay(t.jour_semaine || ''); setIsAdminOpen(true); }} className="text-gray-200 p-2"><Edit3 size={16} /></button>
            <button onClick={() => supprimerTache(t.id)} className="text-gray-200 p-2"><Trash2 size={16} /></button>
          </div>
        </div>
        {t.notes && <div className="mt-2 ml-10 p-2 bg-gray-50 rounded-xl border-l-4 border-[#8DC63F]/30 text-[11px] text-gray-600 italic text-left">{t.notes}</div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-40 text-left">
      <header className="fixed top-0 left-0 right-0 bg-[#1B2A49] z-40 px-6 pt-12 pb-8 rounded-b-[45px] shadow-2xl flex flex-col items-center">
        <button onClick={() => { setEditingId(null); setNewTexte(''); setNewNotes(''); setSelectedSection('Sortie'); setIsAdminOpen(true); }} className="absolute top-6 right-6 bg-[#8DC63F] text-[#1B2A49] p-3.5 rounded-2xl shadow-lg font-bold"><Plus size={24} /></button>
        <img src={LOGO_URL} alt="Logo" className="h-16 w-16 rounded-full border-4 border-[#8DC63F] mb-3 bg-white" />
        <h1 className="text-white font-black uppercase text-lg tracking-tighter">Tableau de bord</h1>
        <p className="text-[#8DC63F] font-bold text-[10px] uppercase mt-1 tracking-[0.2em]">{dateInfo}</p>
      </header>

      <main className="w-full max-w-md mx-auto px-6 pt-64">
        {showAlert && (
          <div className="mb-6 bg-[#8DC63F] p-4 rounded-[25px] flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3"><BellRing size={20} className="text-[#1B2A49]" /><span className="text-[11px] font-black uppercase text-[#1B2A49]">Nouvelle tâche ajoutée !</span></div>
            <button onClick={closeAlert} className="bg-[#1B2A49] text-white p-1.5 rounded-full"><X size={14} /></button>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-10">
          <button onClick={() => onNavigate('urgences')} className="bg-white p-3 rounded-[24px] flex flex-col items-center gap-2 shadow-sm"><div className="bg-red-500 p-2 rounded-xl text-white"><Phone size={16} /></div><span className="text-[7px] font-black uppercase text-[#1B2A49]">Urgences</span></button>
          <button onClick={() => handleNavigateWithNotif('soins')} className="bg-white p-3 rounded-[24px] flex flex-col items-center gap-2 relative shadow-sm"><div className="bg-red-100 p-2 rounded-xl text-red-600"><Pill size={16} /></div><span className="text-[7px] font-black uppercase text-[#1B2A49]">Soins</span>{notifSoins && <Badge />}</button>
          <button onClick={() => onNavigate('planning-sorties')} className="bg-white p-3 rounded-[24px] flex flex-col items-center gap-2 shadow-sm"><div className="bg-[#8DC63F]/20 p-2 rounded-xl text-[#1B2A49]"><DoorOpen size={16} /></div><span className="text-[7px] font-black uppercase text-[#1B2A49] text-center">Sorties Proprios</span></button>
          <button onClick={() => onNavigate('documents')} className="bg-white p-3 rounded-[24px] flex flex-col items-center gap-2 shadow-sm"><div className="bg-[#1B2A49] p-2 rounded-xl text-white"><FileText size={16} /></div><span className="text-[7px] font-black uppercase text-[#1B2A49]">Docs</span></button>
        </div>

        <div className="space-y-10">
          <h2 className="font-black text-[12px] uppercase tracking-[0.3em] text-[#1B2A49] ml-2 -mb-6 italic">Tâches du jour</h2>
          
          <div onClick={() => onNavigate('planning-sorties')} className="bg-white border-2 border-[#8DC63F] p-5 rounded-[35px] flex items-center justify-between shadow-sm cursor-pointer active:scale-95 transition-transform">
            <div className="flex items-center gap-4"><div className="bg-[#8DC63F]/10 p-2.5 rounded-2xl text-[#1B2A49]"><DoorOpen size={24} /></div><div className="flex flex-col"><span className="text-[14px] font-black text-[#1B2A49] uppercase">Sorties Propriétaires</span><span className="text-[9px] font-bold text-[#8DC63F] uppercase">Voir le planning complet</span></div></div>
            <Forward size={20} className="text-[#1B2A49]" />
          </div>

          {loading ? ( <div className="text-center p-10 opacity-20 font-black uppercase text-[10px]">Chargement...</div> ) : (
            <>
              {[
                { id: 'Sortie', label: 'CHEVAUX CLUB À SORTIR', icon: DoorOpen, color: 'text-blue-600' },
                { id: 'Arret', label: 'Chevaux à l\'arrêt', icon: Ban, color: 'text-orange-500' },
                { id: 'Soins', label: 'Chevaux en soins', icon: HeartPulse, color: 'text-red-500' },
                { id: 'Autres', label: 'Autres consignes', icon: Info, color: 'text-purple-500' }
              ].map(section => {
                const tasks = tasksActive.filter(t => t.section === section.id);
                if (tasks.length === 0) return null;
                return (
                  <div key={section.id} className="pt-2">
                    <h3 className={`flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-4 ml-2 ${section.color}`}>
                       {section.id === 'Sortie' ? <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[10px] mr-1">CLUB</span> : <section.icon size={14} />} 
                       {section.label}
                    </h3>
                    <div className="space-y-3">{tasks.map(t => <TaskCard key={t.id} t={t} isActive={true} />)}</div>
                  </div>
                );
              })}

              {tasksFuture.length > 0 && (
                <div className="mt-16 pt-10 border-t-2 border-gray-200/50">
                  <h3 className="flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-6 ml-2 text-gray-400"><Forward size={14} /> Prévisions pour la semaine</h3>
                  <div className="space-y-3">{tasksFuture.map(t => <TaskCard key={t.id} t={t} isActive={false} />)}</div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-8 z-40 pointer-events-none text-center">
        <div className="max-w-xs mx-auto flex items-center justify-around bg-[#1B2A49] p-4 rounded-[32px] shadow-2xl border border-white/10 pointer-events-auto">
          <button onClick={() => onNavigate('accueil')} className="flex flex-col items-center text-[#8DC63F] flex-1"><DoorOpen size={20} /><span className="text-[7px] font-black uppercase mt-1">Tableau</span></button>
          <div className="h-6 w-[1px] bg-white/10"></div>
          <button onClick={() => handleNavigateWithNotif('planning-ecurie')} className="flex flex-col items-center text-white/40 flex-1 relative"><Calendar size={20} /><span className="text-[7px] font-black uppercase mt-1">Écurie</span>{notifPlanning && <Badge />}</button>
          <div className="h-6 w-[1px] bg-white/10"></div>
          <button onClick={() => onNavigate('planning-monitrices')} className="flex flex-col items-center text-white/40 flex-1"><GraduationCap size={20} /><span className="text-[7px] font-black uppercase mt-1">Cours</span></button>
        </div>
      </footer>

      {isAdminOpen && (
        <div className="fixed inset-0 bg-[#1B2A49]/95 z-[100] flex items-end justify-center px-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10 shadow-2xl text-left overflow-y-auto max-h-[90vh]">
            <h2 className="font-black text-2xl uppercase mb-6">Nouvelle Tâche</h2>
            <div className="space-y-5">
              <input type="text" value={newTexte} onChange={(e) => setNewTexte(e.target.value)} placeholder="Nom..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none" />
              <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Détails..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold h-20 outline-none" />
              <div className="grid grid-cols-2 gap-2">
                {['Sortie', 'Arret', 'Soins', 'Autres'].map(s => <button key={s} onClick={() => setSelectedSection(s)} className={`py-3 rounded-xl text-[9px] font-black uppercase ${selectedSection === s ? 'bg-[#1B2A49] text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}>{s}</button>)}
              </div>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold">
                <option value="">Aujourd'hui</option>
                <option value="permanent">Jusqu'à rétablissement</option>
                {joursSemaine.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
              <button onClick={enregistrerTache} className="w-full bg-[#8DC63F] text-[#1B2A49] py-5 rounded-3xl font-black uppercase shadow-lg">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accueil;