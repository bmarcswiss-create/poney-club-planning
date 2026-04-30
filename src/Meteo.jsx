import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Cloud, CloudRain, CloudLightning, Sun, Wind, 
  Droplets, Thermometer, CheckCircle, AlertTriangle, XCircle, Shirt, Map, CloudSun 
} from 'lucide-react';
import { supabase } from './supabaseClient';

const Meteo = ({ onNavigate }) => {
  const [statusSols, setStatusSols] = useState(0); 
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppState();
    getWeatherData();
  }, []);

  const fetchAppState = async () => {
    try {
      const { data } = await supabase.from('app_state').select('*').eq('id', 'status_paddocks').single();
      if (data) setStatusSols(data.data.value);
    } catch (e) { console.error("Erreur Supabase", e); }
  };

  const getWeatherData = async () => {
    try {
      // Coordonnées Presinge
      const url = "https://api.open-meteo.com/v1/forecast?latitude=46.24&longitude=6.25&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Europe%2FBerlin";
      const res = await fetch(url);
      const data = await res.json();
      setWeatherData(data.current);
    } catch (e) {
      console.error("Erreur API Météo", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSols = async () => {
    const nextStatus = (statusSols + 1) % 3;
    setStatusSols(nextStatus);
    await supabase.from('app_state').upsert([{ id: 'status_paddocks', data: { value: nextStatus } }]);
  };

  const getWeatherInfo = (code) => {
    if (code === undefined || code === null) return { label: "Chargement...", icon: <CloudSun size={48} />, color: "from-blue-400 to-blue-600" };
    if (code === 0) return { label: "Ciel dégagé", icon: <Sun size={48} className="text-yellow-400" />, color: "from-blue-400 to-blue-500" };
    if (code <= 3) return { label: "Partiellement nuageux", icon: <Cloud size={48} className="text-gray-200" />, color: "from-blue-500 to-gray-400" };
    if (code <= 48) return { label: "Brouillard", icon: <Cloud size={48} className="text-gray-300" />, color: "from-gray-400 to-gray-500" };
    if (code <= 67) return { label: "Pluie", icon: <CloudRain size={48} className="text-blue-200" />, color: "from-blue-600 to-indigo-700" };
    if (code <= 77) return { label: "Neige", icon: <Cloud size={48} className="text-white" />, color: "from-blue-100 to-blue-300" };
    if (code <= 82) return { label: "Averses", icon: <CloudRain size={48} className="text-blue-300" />, color: "from-blue-500 to-blue-800" };
    return { label: "Orage", icon: <CloudLightning size={48} className="text-purple-300" />, color: "from-indigo-900 to-purple-800" };
  };

  const getConseilCouverture = () => {
    if (!weatherData?.apparent_temperature) return "Calcul...";
    const temp = weatherData.apparent_temperature;
    if (temp > 18) return "Sans couverture";
    if (temp > 12) return "Chemise / 0g";
    if (temp > 5) return "Couverture 100g";
    return "Hiver (200g+)";
  };

  const configSols = [
    { label: "Paddocks Ouverts", color: "text-green-500", bg: "bg-green-50", icon: <CheckCircle size={20} /> },
    { label: "Sols Délicats", color: "text-orange-500", bg: "bg-orange-50", icon: <AlertTriangle size={20} /> },
    { label: "Paddocks Fermés", color: "text-red-500", bg: "bg-red-50", icon: <XCircle size={20} /> }
  ];

  const infoMeteo = getWeatherInfo(weatherData?.weather_code);

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-40 flex flex-col font-sans text-[#1B2A49]">
      <header className="bg-[#1B2A49] p-8 pt-12 rounded-b-[45px] shadow-xl text-center text-white relative">
        <button onClick={() => onNavigate('accueil')} className="absolute top-8 left-6 bg-white/10 p-2 rounded-xl active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <CloudSun size={32} className="text-[#8DC63F] mx-auto mb-2" />
        <h1 className="font-black uppercase text-xl tracking-tighter">Météo Presinge</h1>
      </header>

      <main className="max-w-md mx-auto w-full p-6 mt-4 flex-1">
        {loading ? (
          <div className="bg-white rounded-[40px] p-12 text-center shadow-sm">
            <div className="animate-spin h-8 w-8 border-4 border-[#8DC63F] border-t-transparent rounded-full mx-auto mb-4"></div>
            <span className="font-black uppercase text-[10px] text-gray-400">Récupération des données...</span>
          </div>
        ) : (
          <div className={`bg-gradient-to-br ${infoMeteo.color} rounded-[40px] p-8 shadow-2xl text-white relative overflow-hidden`}>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <h2 className="text-5xl font-black">{weatherData ? Math.round(weatherData.temperature_2m) : '--'}°</h2>
                <p className="font-bold opacity-80 uppercase text-[10px] mt-1 tracking-widest">{infoMeteo.label}</p>
              </div>
              {infoMeteo.icon}
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/20 relative z-10">
              <div className="flex flex-col items-center text-center">
                <Wind size={16} className="mb-1 opacity-60" />
                <span className="text-[10px] font-black">{weatherData ? Math.round(weatherData.wind_speed_10m) : '--'} km/h</span>
                <span className="text-[7px] uppercase opacity-50 tracking-tighter">Vent</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <Droplets size={16} className="mb-1 opacity-60" />
                <span className="text-[10px] font-black">{weatherData?.relative_humidity_2m || '--'}%</span>
                <span className="text-[7px] uppercase opacity-50 tracking-tighter">Humidité</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <Thermometer size={16} className="mb-1 opacity-60" />
                <span className="text-[10px] font-black">{weatherData ? Math.round(weatherData.apparent_temperature) : '--'}°</span>
                <span className="text-[7px] uppercase opacity-50 tracking-tighter">Ressenti</span>
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={() => window.open("https://www.meteosuisse.admin.ch/#tab=forecast-map", "_blank")}
          className="w-full mt-4 bg-white py-4 rounded-2xl flex items-center justify-center gap-3 shadow-sm active:scale-95 transition-all border border-gray-100"
        >
          <Map size={18} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#1B2A49]">Radar Pluie MétéoSuisse</span>
        </button>

        <div className="mt-6 grid grid-cols-2 gap-4">
            <button 
              onClick={toggleSols}
              className={`${configSols[statusSols].bg} p-5 rounded-[30px] flex flex-col items-center shadow-sm border border-gray-100 transition-all active:scale-95`}
            >
                <div className={`${configSols[statusSols].color} mb-2`}>{configSols[statusSols].icon}</div>
                <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest text-center leading-tight">État des<br/>Paddocks</span>
                <span className={`text-[10px] font-black mt-1 uppercase ${configSols[statusSols].color}`}>{configSols[statusSols].label}</span>
            </button>

            <div className="bg-white p-5 rounded-[30px] flex flex-col items-center shadow-sm border border-gray-100 text-center">
                <Shirt className="text-blue-500 mb-2" size={20} />
                <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest text-center leading-tight">Conseil<br/>Couverture</span>
                <span className="text-[10px] font-black mt-1 uppercase text-[#1B2A49]">{getConseilCouverture()}</span>
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