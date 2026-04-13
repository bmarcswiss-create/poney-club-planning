import React, { useState, useEffect } from 'react';
import { Phone, ArrowLeft, ShieldAlert, Activity, Hammer, HelpCircle, Plus, X, Trash2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const Urgences = ({ onNavigate }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // États pour le nouveau contact
  const [newNom, setNewNom] = useState('');
  const [newNumero, setNewNumero] = useState('');
  const [newCategorie, setNewCategorie] = useState('Vétérinaire');

  useEffect(() => {
    fetchUrgences();
  }, []);

  const fetchUrgences = async () => {
    const { data, error } = await supabase
      .from('urgences')
      .select('*')
      .order('nom', { ascending: true });
    
    if (!error && data) setContacts(data);
    setLoading(false);
  };

  const ajouterContact = async () => {
    if (!newNom.trim() || !newNumero.trim()) return;
    
    const { data, error } = await supabase.from('urgences').insert([{ 
      nom: newNom, 
      numero: newNumero, 
      categorie: newCategorie 
    }]).select();

    if (!error) {
      setContacts([...contacts, data[0]]);
      setNewNom('');
      setNewNumero('');
      setIsAdminOpen(false);
    }
  };

  const supprimerContact = async (id) => {
    if (window.confirm("Supprimer ce contact d'urgence ?")) {
      const { error } = await supabase.from('urgences').delete().eq('id', id);
      if (!error) setContacts(contacts.filter(c => c.id !== id));
    }
  };

  const categories = [
    { id: 'Vétérinaire', icon: Activity, color: 'bg-red-500' },
    { id: 'Maréchal', icon: Hammer, color: 'bg-orange-500' },
    { id: 'Autre', icon: HelpCircle, color: 'bg-[#1B2A49]' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {/* Header Alerte */}
      <header className="bg-red-600 px-6 pt-12 pb-10 rounded-b-[45px] shadow-xl flex flex-col items-center relative text-white">
        <button onClick={() => onNavigate('accueil')} className="absolute top-8 left-6 bg-white/20 p-2 rounded-xl active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        
        <button onClick={() => setIsAdminOpen(true)} className="absolute top-8 right-6 bg-white text-red-600 p-2 rounded-xl shadow-lg active:scale-90 transition-all">
          <Plus size={20} strokeWidth={3} />
        </button>

        <ShieldAlert size={36} className="mb-2" />
        <h1 className="font-black uppercase tracking-tighter text-xl text-center">Numéros d'Urgence</h1>
        <p className="text-red-100 text-[10px] font-bold uppercase tracking-widest mt-1">Appel immédiat en un clic</p>
      </header>

      <main className="max-w-md mx-auto p-6 mt-4">
        {loading ? (
          <div className="text-center p-10 text-gray-300 font-black uppercase text-[10px] animate-pulse">Recherche des contacts...</div>
        ) : contacts.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <p className="text-gray-400 text-sm font-medium">Aucun numéro enregistré.</p>
            <button onClick={() => setIsAdminOpen(true)} className="text-red-500 font-bold text-xs uppercase mt-2 underline">Ajouter le premier</button>
          </div>
        ) : (
          categories.map(cat => {
            const list = contacts.filter(c => c.categorie === cat.id);
            if (list.length === 0) return null;

            return (
              <div key={cat.id} className="mb-10">
                <h3 className="flex items-center gap-2 font-black text-[11px] uppercase tracking-[0.2em] text-gray-400 mb-5 ml-2">
                  <cat.icon size={16} className="text-red-500" /> {cat.id}s
                </h3>
                <div className="space-y-4">
                  {list.map(contact => (
                    <div key={contact.id} className="group relative">
                      <a 
                        href={`tel:${contact.numero}`}
                        className="bg-white p-5 rounded-[32px] shadow-sm border border-gray-100 flex items-center justify-between active:scale-95 transition-all"
                      >
                        <div className="flex flex-col">
                          <span className="font-black text-[#1B2A49] text-base leading-tight">{contact.nom}</span>
                          <span className="text-gray-400 font-bold text-xs mt-1">{contact.numero}</span>
                        </div>
                        <div className={`${cat.color} p-4 rounded-2xl text-white shadow-lg`}>
                          <Phone size={22} fill="currentColor" />
                        </div>
                      </a>
                      {/* Bouton supprimer discret au-dessus */}
                      <button 
                        onClick={(e) => { e.preventDefault(); supprimerContact(contact.id); }}
                        className="absolute -top-2 -right-2 bg-gray-100 text-gray-400 p-1.5 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Modal d'ajout de contact */}
      {isAdminOpen && (
        <div className="fixed inset-0 bg-[#1B2A49]/95 z-50 flex items-end justify-center px-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-black text-2xl uppercase text-[#1B2A49] tracking-tighter">Nouveau Contact</h2>
              <button onClick={() => setIsAdminOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Nom du contact / Clinique</label>
                <input type="text" value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Ex: Dr. Martin" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 mt-1 outline-none focus:border-red-500 font-bold text-[#1B2A49]" />
              </div>

              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Numéro de téléphone</label>
                <input type="tel" value={newNumero} onChange={(e) => setNewNumero(e.target.value)} placeholder="Ex: 06 12 34 56 78" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 mt-1 outline-none focus:border-red-500 font-bold text-[#1B2A49]" />
              </div>

              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Catégorie</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['Vétérinaire', 'Maréchal', 'Autre'].map(c => (
                    <button key={c} onClick={() => setNewCategorie(c)} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${newCategorie === c ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              
              <button onClick={ajouterContact} className="w-full bg-red-600 text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-lg mt-4 active:scale-95 transition-all">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation basse */}
      <footer className="fixed bottom-8 left-0 right-0 p-8 z-40 pointer-events-none">
        <button 
          onClick={() => onNavigate('accueil')}
          className="max-w-[200px] mx-auto flex items-center justify-center gap-3 bg-[#1B2A49] text-white p-4 rounded-full shadow-2xl pointer-events-auto active:scale-95 transition-all font-black uppercase text-[10px] tracking-widest border border-white/10"
        >
          <ArrowLeft size={16} /> Retour Board
        </button>
      </footer>
    </div>
  );
};

export default Urgences;