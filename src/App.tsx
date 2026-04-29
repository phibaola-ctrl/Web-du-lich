import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Heart, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  Utensils, 
  Camera, 
  Info,
  Map as MapIcon,
  PieChart as ChartIcon,
  Navigation,
  ExternalLink,
  Loader2,
  ShieldCheck,
  X,
  Plus,
  Zap,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { generateTravelPlan } from './services/geminiService';
import { TravelPlan, UserPreferences, MapPoint } from './types';
import PanoramaViewer from './components/PanoramaViewer';

// --- Components ---

const Header = ({ onExport, hasPlan }: { onExport: () => void, hasPlan: boolean }) => (
  <header className="fixed top-0 left-0 right-0 z-50 h-16 px-8 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
        <Compass className="w-5 h-5 text-white" />
      </div>
      <span className="text-xl font-bold tracking-tight text-slate-900 uppercase">
        Phi
      </span>
    </div>
    <div className="flex items-center gap-6">
      <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        Trình Tối Ưu Đang Hoạt Động
      </div>
      <button 
        onClick={onExport}
        disabled={!hasPlan}
        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Xuất Lịch Trình
      </button>
    </div>
  </header>
);

const InputField = ({ label, icon: Icon, children }: { label: string, icon: any, children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
      <Icon className="w-3 h-3" />
      {label}
    </label>
    {children}
  </div>
);

const BudgetChart = ({ data }: { data: { name: string, value: number }[] }) => (
  <div className="h-48 w-full bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis 
          dataKey="name" 
          stroke="#94a3b8" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
        />
        <YAxis 
          stroke="#94a3b8" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
        />
        <Tooltip 
          cursor={{ fill: '#f8fafc' }}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// --- Main App ---

export default function App() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<TravelPlan[]>([]);
  const [historyPlans, setHistoryPlans] = useState<TravelPlan[]>([]);
  const [activePanorama, setActivePanorama] = useState<{ url: string, title: string } | null>(null);
  const [activeMapPoint, setActiveMapPoint] = useState<MapPoint | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences>({
    budget: 10000000,
    duration: 5,
    startLocation: 'Hà Nội, Việt Nam',
    interests: ['Ẩm thực', 'Bảo tàng'],
    mood: 'Khám phá',
    wishlist: []
  });

  const [wishlistInput, setWishlistInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const moods = ['Phiêu lưu', 'Thư giãn', 'Văn hóa', 'Lãng mạn', 'Chữa lành', 'Khám phá', 'Hành trình cô độc'];
  const interests = ['Ẩm thực', 'Thiên nhiên', 'Lịch sử', 'Mua sắm', 'Đời sống về đêm', 'Bảo tàng', 'Leo núi', 'Sức khỏe'];
  
  const suggestions = [
    'Đà Lạt', 'Phú Quốc', 'Hạ Long', 'Sa Pa', 'Hội An', 'Nha Trang', 'Huế', 'Đà Nẵng', 'Hà Giang', 'Ninh Bình', 'Phan Thiết', 'Cần Thơ',
    'Tokyo', 'Paris', 'Seoul', 'Bangkok', 'Singapore', 'London', 'Kyoto', 'Bali', 'New York', 'Sydney', 'Rome', 'Barcelona'
  ].filter(s => s.toLowerCase().includes(wishlistInput.toLowerCase()) && !prefs.wishlist.includes(s));

  useEffect(() => {
    const saved = localStorage.getItem('phi_saved_travel_plans');
    if (saved) {
      try {
        setSavedPlans(JSON.parse(saved));
      } catch (e) {
        console.error('Lỗi khi tải các bản kế hoạch đã lưu:', e);
      }
    }

    const history = localStorage.getItem('phi_travel_history');
    if (history) {
      try {
        setHistoryPlans(JSON.parse(history));
      } catch (e) {
        console.error('Lỗi khi tải lịch sử:', e);
      }
    }
  }, []);

  const savePlan = () => {
    if (!plan) return;
    const exists = savedPlans.find(p => p.tourName === plan.tourName);
    if (exists) {
      alert('Hành trình này đã tồn tại trong danh sách đã lưu!');
      return;
    }
    const newSaved = [plan, ...savedPlans].slice(0, 10); // Limit to 10
    setSavedPlans(newSaved);
    localStorage.setItem('phi_saved_travel_plans', JSON.stringify(newSaved));
    alert('Đã lưu hành trình thành công!');
  };

  const deletePlan = (tourName: string) => {
    const newSaved = savedPlans.filter(p => p.tourName !== tourName);
    setSavedPlans(newSaved);
    localStorage.setItem('phi_saved_travel_plans', JSON.stringify(newSaved));
  };

  const deleteHistory = (tourName: string) => {
    const newHistory = historyPlans.filter(p => p.tourName !== tourName);
    setHistoryPlans(newHistory);
    localStorage.setItem('phi_travel_history', JSON.stringify(newHistory));
  };

  const exportPlan = () => {
    if (!plan) return;

    let content = `HÀNH TRÌNH DU LỊCH: ${plan.tourName.toUpperCase()}\n`;
    content += `==========================================\n\n`;
    content += `Câu chuyện chuyến đi:\n${plan.story}\n\n`;
    content += `Thông số:\n`;
    content += `- Điểm khởi hành: ${prefs.startLocation}\n`;
    content += `- Thời gian: ${prefs.duration} ngày\n`;
    content += `- Ngân sách dự kiến: ${plan.totalEstimatedCost.toLocaleString('vi-VN')} ₫\n`;
    content += `- Tâm trạng: ${prefs.mood}\n\n`;
    content += `CHI TIẾT LỊCH TRÌNH:\n`;
    content += `------------------------------------------\n`;

    plan.itinerary.forEach(day => {
      content += `\nNGÀY ${day.day}:\n`;
      const slots = [
        { label: 'Sáng', data: day.morning },
        { label: 'Chiều', data: day.afternoon },
        { label: 'Tối', data: day.evening }
      ];
      
      slots.forEach(slot => {
        content += `- ${slot.label}: ${slot.data.activity} tại ${slot.data.location}\n`;
        content += `  Mô tả: ${slot.data.description}\n`;
        content += `  Chi phí: ${slot.data.cost.toLocaleString('vi-VN')} ₫\n`;
      });
      content += `Tổng chi phí ngày: ${day.totalDayCost.toLocaleString('vi-VN')} ₫\n`;
    });

    content += `\n\nPHÂN TÍCH TÀI CHÍNH:\n`;
    content += `${plan.budgetAnalysis}\n\n`;
    content += `Cảm ơn bạn đã sử dụng dịch vụ của Phi AI.\n`;
    content += `Donate cho người tạo trang web tại Mb bank: 0357829602\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lich-trinh-${plan.tourName.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addWishlistItem = (item: string) => {
    if (item && !prefs.wishlist.includes(item)) {
      setPrefs({ ...prefs, wishlist: [...prefs.wishlist, item] });
      setWishlistInput('');
      setShowSuggestions(false);
    }
  };

  const removeWishlistItem = (item: string) => {
    setPrefs({ ...prefs, wishlist: prefs.wishlist.filter(i => i !== item) });
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateTravelPlan(prefs);
      setPlan(result);
      if (result.mapPoints.length > 0) {
        setActiveMapPoint(result.mapPoints[0]);
      }

      // Add to history
      const newHistory = [result, ...historyPlans.filter(p => p.tourName !== result.tourName)].slice(0, 10);
      setHistoryPlans(newHistory);
      localStorage.setItem('phi_travel_history', JSON.stringify(newHistory));

      setTimeout(() => {
        const resultsEl = document.getElementById('travel-results');
        resultsEl?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      alert("Không thể tạo kế hoạch. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = plan?.itinerary.map(day => ({
    name: `Ngày ${day.day}`,
    value: day.totalDayCost
  })) || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Header onExport={exportPlan} hasPlan={!!plan} />

      {/* Input Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <motion.h1 
              className="text-5xl md:text-7xl font-black tracking-tight text-slate-900"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Kiến Tạo <span className="text-indigo-600">Hành Trình</span> Của Bạn.
            </motion.h1>
            <p className="text-slate-500 text-lg max-w-xl mx-auto font-semibold">
              Hãy cho chúng tôi biết tâm trạng, ngân sách và ước mơ của bạn.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <InputField label="Điểm Khởi Hành" icon={MapPin}>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                  placeholder="Ví dụ: Tokyo, Nhật Bản"
                  value={prefs.startLocation}
                  onChange={e => setPrefs({...prefs, startLocation: e.target.value})}
                />
              </InputField>

              <InputField label="Thời Gian (Ngày)" icon={Calendar}>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                  value={prefs.duration}
                  onChange={e => setPrefs({...prefs, duration: parseInt(e.target.value)})}
                />
              </InputField>

              <InputField label="Tổng Ngân Sách (₫)" icon={DollarSign}>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                  value={prefs.budget}
                  onChange={e => setPrefs({...prefs, budget: parseInt(e.target.value)})}
                />
              </InputField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InputField label="Điểm Đến Ưu Tiên" icon={Zap}>
                <div className="relative">
                  <div className="flex gap-2 mb-3">
                    <input 
                      type="text" 
                      className="flex-grow bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold"
                      placeholder="Nhập địa điểm bạn muốn đến..."
                      value={wishlistInput}
                      onChange={e => {
                        setWishlistInput(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addWishlistItem(wishlistInput);
                        }
                      }}
                    />
                    <button 
                      onClick={() => addWishlistItem(wishlistInput)}
                      className="px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && wishlistInput && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
                      {suggestions.map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            addWishlistItem(s);
                            setShowSuggestions(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                        >
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Wishlist Tags */}
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {prefs.wishlist.map(item => (
                        <motion.span
                          key={item}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-indigo-100 flex items-center gap-2 shadow-sm"
                        >
                          {item}
                          <button 
                            onClick={() => removeWishlistItem(item)}
                            className="hover:text-indigo-900 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </InputField>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MapIcon className="w-3 h-3" />
                  Xem Trước Lộ Trình Ước Tính
                </label>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl h-[120px] relative overflow-hidden flex items-center justify-center">
                  {prefs.wishlist.length > 0 ? (
                    <iframe 
                      className="w-full h-full grayscale opacity-50 contrast-125"
                      frameBorder="0" 
                      src={`https://www.google.com/maps?q=${encodeURIComponent(prefs.wishlist[prefs.wishlist.length - 1])}&output=embed`}
                    ></iframe>
                  ) : (
                    <div className="text-center p-4">
                      <p className="text-[10px] text-slate-400 font-bold uppercase brightness-90">Bản đồ sẽ hiển thị khi bạn thêm điểm đến</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-50/80 to-transparent pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InputField label="Tâm Trạng / Vibe" icon={Heart}>
                <select 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold appearance-none"
                  value={prefs.mood}
                  onChange={e => setPrefs({...prefs, mood: e.target.value})}
                >
                  {moods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </InputField>

              <InputField label="Sở Thích" icon={Sparkles}>
                <div className="flex flex-wrap gap-2">
                  {interests.map(interest => (
                    <button
                      key={interest}
                      onClick={() => {
                        const newInterests = prefs.interests.includes(interest) 
                          ? prefs.interests.filter(i => i !== interest)
                          : [...prefs.interests, interest];
                        setPrefs({...prefs, interests: newInterests});
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        prefs.interests.includes(interest) 
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </InputField>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-bold uppercase tracking-[0.15em] rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-900/10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang Tối Ưu Kế Hoạch...
                  </>
                ) : (
                  <>
                    Tạo Lịch Trình
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <AnimatePresence>
        {plan && (
          <motion.section 
            id="travel-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-t border-slate-200"
          >
            <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row min-h-screen">
              
              {/* Left Sidebar: Context & Personalization */}
              <aside className="w-full lg:w-80 border-r border-slate-200 bg-white p-8 flex flex-col gap-10 shrink-0">
                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Thông Số Chuyến Đi</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Tổng Đầu Tư</p>
                      <p className="text-2xl font-black text-slate-900">{plan.totalEstimatedCost.toLocaleString('vi-VN')} ₫</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Kiểm Soát Ngân Sách Hoạt Động</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Hành trình đã lưu</h3>
                  <div className="space-y-2">
                    {savedPlans.length > 0 ? (
                      savedPlans.map((p, idx) => (
                        <div key={idx} className="group flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 transition-all">
                          <button 
                            onClick={() => {
                              setPlan(p);
                              if (p.mapPoints.length > 0) setActiveMapPoint(p.mapPoints[0]);
                            }}
                            className="text-[11px] font-bold text-slate-700 truncate max-w-[150px] text-left hover:text-indigo-600"
                          >
                            {p.tourName}
                          </button>
                          <button 
                            onClick={() => deletePlan(p.tourName)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">Chưa có hành trình nào được lưu.</p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Lịch sử chuyến đi</h3>
                  <div className="space-y-2">
                    {historyPlans.length > 0 ? (
                      historyPlans.map((p, idx) => (
                        <div key={idx} className="group flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 transition-all opacity-80 hover:opacity-100">
                          <button 
                            onClick={() => {
                              setPlan(p);
                              if (p.mapPoints.length > 0) setActiveMapPoint(p.mapPoints[0]);
                            }}
                            className="text-[11px] font-bold text-slate-600 truncate max-w-[150px] text-left hover:text-indigo-600"
                          >
                            {p.tourName}
                          </button>
                          <button 
                            onClick={() => deleteHistory(p.tourName)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">Lịch sử trống.</p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Tại sao chọn các địa điểm này?</h3>
                  <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-900 relative overflow-hidden">
                    <Sparkles className="absolute -top-2 -right-2 w-12 h-12 opacity-10" />
                    <p className="text-xs leading-relaxed font-bold">
                      "{plan.personalizationLogic}"
                    </p>
                  </div>
                </section>

                <section className="mt-auto hidden lg:block">
                  <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giao Thức Tối Ưu</p>
                    <p className="text-[11px] text-slate-500 italic">Lộ trình được tối ưu cho tâm trạng {prefs.mood.toLowerCase()} và hiệu quả chi phí.</p>
                  </div>
                </section>
              </aside>

              {/* Middle: Itinerary */}
              <main className="flex-grow p-8 md:p-12 space-y-12 bg-white">
                <div className="space-y-4 max-w-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase tracking-wide">
                        Tâm trạng: {prefs.mood}
                      </span>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight">{plan.tourName}</h2>
                    </div>
                    <button 
                      onClick={savePlan}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 whitespace-nowrap md:self-start"
                    >
                      <Plus className="w-4 h-4" />
                      Lưu Hành Trình
                    </button>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line font-medium italic">"{plan.story.split('\n')[0]}"</p>
                </div>

                {/* Daily Timeline */}
                <div className="space-y-16">
                  {plan.itinerary.map((day) => (
                    <div key={day.day} className="space-y-8">
                      <div className="flex items-center gap-4">
                        <button className="px-6 py-3 bg-slate-900 text-white rounded-full text-xs font-bold ring-4 ring-slate-100">
                          Ngày {day.day.toString().padStart(2, '0')}
                        </button>
                        <div className="h-px flex-grow bg-slate-100" />
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { title: 'Sáng', data: day.morning, time: '08:30', icon: Clock },
                          { title: 'Chiều', data: day.afternoon, time: '13:00', icon: Camera },
                          { title: 'Tối', data: day.evening, time: '19:00', icon: Utensils }
                        ].map((slot, i) => (
                          <div key={i} className="group relative flex items-start gap-6 p-5 rounded-2xl bg-white border border-slate-100 hover:shadow-md transition-all">
                            <div className="text-center w-12 pt-1">
                              <p className="text-xs font-black text-slate-900">{slot.time}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{i === 2 ? 'PM' : i === 0 ? 'AM' : 'PM'}</p>
                            </div>
                            <div className="space-y-2 flex-grow">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-base text-slate-900">{slot.data.activity}</h4>
                                <span className="px-2 py-1 bg-slate-50 text-slate-500 text-[9px] font-bold rounded uppercase border border-slate-100">{slot.data.cost.toLocaleString('vi-VN')} ₫</span>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed">{slot.data.description}</p>
                              <div className="flex items-center gap-3 pt-1">
                                <div className="flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded text-orange-600">
                                  <Star className="w-2.5 h-2.5 fill-orange-600" />
                                  <span className="text-[10px] font-black">{slot.data.rating}</span>
                                  <span className="text-[9px] text-orange-400 font-bold">({slot.data.reviewCount})</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-indigo-500" /> {slot.data.location}
                                </span>
                                {day.preview360Url && i === 1 && (
                                  <button 
                                    onClick={() => setActivePanorama({ url: day.preview360Url!, title: slot.data.location })}
                                    className="text-[10px] text-indigo-600 font-bold underline flex items-center gap-1"
                                  >
                                    Xem Panorama 360°
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </main>

              {/* Right Sidebar: Optimized Data */}
              <aside className="w-full lg:w-80 bg-slate-50 p-8 flex flex-col gap-8 shrink-0 border-l border-slate-200">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sơ Đồ Tài Chính</h3>
                  <BudgetChart data={chartData} />
                  <div className="p-4 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-600 font-medium italic">
                    "{plan.budgetAnalysis}"
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Địa Điểm</h3>
                  <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 flex flex-col">
                    <div className="h-48 bg-slate-100 relative">
                       {activeMapPoint ? (
                         <iframe
                           width="100%"
                           height="100%"
                           frameBorder="0"
                           scrolling="no"
                           marginHeight={0}
                           marginWidth={0}
                           src={`https://maps.google.com/maps?q=${activeMapPoint.lat},${activeMapPoint.lng}&hl=vi&z=14&output=embed`}
                           className="grayscale contrast-110"
                         ></iframe>
                       ) : (
                         <div className="absolute inset-0 flex items-center justify-center">
                           <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:15px_15px]"></div>
                           <div className="p-2 bg-indigo-600 rounded-lg text-white font-bold text-[10px] z-10">BẢN ĐỒ HOẠT ĐỘNG</div>
                         </div>
                       )}
                    </div>
                    <div className="p-4 space-y-3 overflow-y-auto max-h-64">
                      {plan.mapPoints.map((point, i) => (
                        <button 
                          key={i} 
                          onClick={() => setActiveMapPoint(point)}
                          className={`w-full flex items-center gap-3 text-left p-2 rounded-xl transition-all ${activeMapPoint?.name === point.name ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}
                        >
                          <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${activeMapPoint?.name === point.name ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <MapPin className="w-3 h-3" />
                          </div>
                          <div className="min-w-0 flex-grow">
                            <div className="flex justify-between items-center gap-2">
                              <p className={`text-[11px] font-bold truncate ${activeMapPoint?.name === point.name ? 'text-indigo-600' : 'text-slate-600'}`}>{point.name}</p>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Star className={`w-2.5 h-2.5 ${activeMapPoint?.name === point.name ? 'fill-indigo-600 text-indigo-600' : 'fill-orange-400 text-orange-400'}`} />
                                <span className={`text-[9px] font-black ${activeMapPoint?.name === point.name ? 'text-indigo-600' : 'text-slate-600'}`}>{point.rating}</span>
                              </div>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{point.type}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
                
                <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-indigo-400">
                    ✦ AI Insight
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {plan.aiInsight}
                  </p>
                </div>
              </aside>

            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="py-12 px-8 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900">Phi</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400">Donate cho người tạo trang web tại Mb bank: 0357829602</p>
          <div className="flex gap-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            <button className="hover:text-indigo-600">Tích hợp</button>
            <button className="hover:text-indigo-600">Bảo mật</button>
          </div>
        </div>
      </footer>

      {activePanorama && (
        <PanoramaViewer 
          imageUrl={activePanorama.url} 
          title={activePanorama.title} 
          onClose={() => setActivePanorama(null)} 
        />
      )}
    </div>
  );
}
