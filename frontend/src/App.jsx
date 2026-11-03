import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, User, Send, Trash2, Edit2, Plus, Search, 
  BarChart3, PieChart, LineChart, Cpu, Check, X, Loader2, Database, Music, Building2, ShoppingBag, Activity,
  Mic, MicOff
} from 'lucide-react';
import BIChart from './components/BIChart';

const API_BASE = "http://localhost:8000";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => "session_" + Date.now());
  const [historySessions, setHistorySessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [dbTables, setDbTables] = useState([]);

  // Voice Typing States & Recognition Reference
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
    fetchDbTables();

    // Initialize Web Speech API for Voice Typing
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setIsListening(false);
      }
    }
  };

  const fetchDbTables = async () => {
    try {
      const res = await fetch(`${API_BASE}/db/tables`);
      if (res.ok) {
        const data = await res.json();
        if (data.tables) setDbTables(data.tables);
      }
    } catch (err) {
      console.error("Error fetching database tables:", err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/history/sessions`);
      if (res.ok) {
        const data = await res.json();
        setHistorySessions(data);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  };

  const loadSession = async (sid) => {
    setSessionId(sid);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/history/session/${sid}`);
      if (res.ok) {
        const historyMsgs = await res.json();
        setMessages(historyMsgs);
      }
    } catch (err) {
      console.error("Error loading session history:", err);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    const newSid = "session_" + Date.now();
    setSessionId(newSid);
    setMessages([]);
  };

  const handleDeleteSession = async (e, sid) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/history/session/${sid}`, { method: 'DELETE' });
      if (res.ok) {
        setHistorySessions(prev => prev.filter(s => s.session_id !== sid));
        if (sessionId === sid) {
          startNewChat();
        }
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  const handleStartRename = (e, session) => {
    e.stopPropagation();
    setEditingSessionId(session.session_id);
    setEditTitleInput(session.title);
  };

  const handleSaveRename = async (e, sid) => {
    e.stopPropagation();
    if (!editTitleInput.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/history/session/${sid}?new_title=${encodeURIComponent(editTitleInput)}`, {
        method: 'PUT'
      });
      if (res.ok) {
        setHistorySessions(prev =>
          prev.map(s => (s.session_id === sid ? { ...s, title: editTitleInput } : s))
        );
        setEditingSessionId(null);
      }
    } catch (err) {
      console.error("Error renaming session:", err);
    }
  };

  const handleSendMessage = async (customPrompt) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || loading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMsg = { sender: "user", reply: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat?session_id=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend })
      });
      const data = await res.json();
      const botMsg = { sender: "bot", reply: data.reply };
      setMessages(prev => [...prev, botMsg]);
      fetchSessions();
    } catch (err) {
      setMessages(prev => [...prev, { sender: "bot", reply: "Error connecting to the BI Analytics Engine." }]);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Workspace Detection
  const isSpotifyConnected = dbTables.some(t => t.toLowerCase().includes('spotify'));
  const isEcommerceConnected = dbTables.some(t => t.toLowerCase().includes('order') || t.toLowerCase().includes('product'));
  const isHealthcareConnected = dbTables.some(t => t.toLowerCase().includes('patient') || t.toLowerCase().includes('hospital'));

  let activeSource = {
    name: "Enterprise SQL Database",
    icon: <Database className="w-3.5 h-3.5 text-blue-400" />,
    badgeColor: "bg-blue-500/10 border-blue-500/30 text-blue-300",
    description: "Query enterprise relational tables using natural language to generate executive summaries and automated charts."
  };

  if (isSpotifyConnected) {
    activeSource = {
      name: "Spotify Global Streaming DB",
      icon: <Music className="w-3.5 h-3.5 text-emerald-400" />,
      badgeColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
      description: "Connected to Spotify's global streaming catalog, artist distributions, and subscription monetization ledger."
    };
  } else if (isEcommerceConnected) {
    activeSource = {
      name: "E-Commerce Commerce DB",
      icon: <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />,
      badgeColor: "bg-orange-500/10 border-orange-500/30 text-orange-300",
      description: "Connected to live orders, fulfillment logs, and store product catalogs."
    };
  } else if (isHealthcareConnected) {
    activeSource = {
      name: "Healthcare Clinical DB",
      icon: <Activity className="w-3.5 h-3.5 text-red-400" />,
      badgeColor: "bg-red-500/10 border-red-500/30 text-red-300",
      description: "Connected to patient records, clinical admissions, and department operations."
    };
  }

  // Dynamic Prompt Suggestion Cards with Balanced Hierarchy & Title Case
  const suggestionCards = isSpotifyConnected ? [
    {
      title: "Top Streams & Genres",
      desc: "Streaming volume & track popularity",
      icon: <BarChart3 className="w-4 h-4 text-amber-400" />,
      iconBg: "bg-amber-500/10 border-amber-500/25 group-hover:border-amber-400/50",
      hoverBorder: "hover:border-amber-500/40 hover:shadow-amber-500/5",
      prompt: "Give me an executive summary of total streams across genres and top performing tracks."
    },
    {
      title: "Subscription Monetization",
      desc: "Regional revenue & tier breakdown",
      icon: <LineChart className="w-4 h-4 text-amber-400" />,
      iconBg: "bg-amber-500/10 border-amber-500/25 group-hover:border-amber-400/50",
      hoverBorder: "hover:border-amber-500/40 hover:shadow-amber-500/5",
      prompt: "Show me monthly revenue and subscriber distribution across Spotify subscription tiers."
    },
    {
      title: "Artist Stream Comparison",
      desc: "Artist stream share & metrics",
      icon: <User className="w-4 h-4 text-amber-400" />,
      iconBg: "bg-amber-500/10 border-amber-500/25 group-hover:border-amber-400/50",
      hoverBorder: "hover:border-amber-500/40 hover:shadow-amber-500/5",
      prompt: "Compare total streams and track popularity across our top featured artists."
    },
    {
      title: "Full Executive Audit",
      desc: "Complete narrative & all visual charts",
      icon: <PieChart className="w-4 h-4 text-amber-400" />,
      iconBg: "bg-amber-500/10 border-amber-500/25 group-hover:border-amber-400/50",
      hoverBorder: "hover:border-amber-500/40 hover:shadow-amber-500/5",
      prompt: "Give me a full quarterly Spotify executive report combining streaming engagement and subscription revenue."
    }
  ] : [
    {
      title: "Executive Overview",
      desc: "High-level KPIs & performance summary",
      icon: <BarChart3 className="w-4 h-4 text-amber-400" />,
      iconBg: "bg-amber-500/10 border-amber-500/25 group-hover:border-amber-400/50",
      hoverBorder: "hover:border-amber-500/40 hover:shadow-amber-500/5",
      prompt: "Give me an executive summary of our overall business performance."
    },
    {
      title: "Sales & Revenue Trends",
      desc: "Line chart trends & region revenue",
      icon: <LineChart className="w-4 h-4 text-amber-400" />,
      iconBg: "bg-amber-500/10 border-amber-500/25 group-hover:border-amber-400/50",
      hoverBorder: "hover:border-amber-500/40 hover:shadow-amber-500/5",
      prompt: "Show me total revenue and sales trends across our core offerings."
    },
    {
      title: "Operational Metrics",
      desc: "Breakdown & resource allocation",
      icon: <User className="w-4 h-4 text-amber-400" />,
      iconBg: "bg-amber-500/10 border-amber-500/25 group-hover:border-amber-400/50",
      hoverBorder: "hover:border-amber-500/40 hover:shadow-amber-500/5",
      prompt: "Show me operational performance and distribution analysis."
    },
    {
      title: "Full Quarterly Report",
      desc: "Complete narrative & all visual charts",
      icon: <PieChart className="w-4 h-4 text-amber-400" />,
      iconBg: "bg-amber-500/10 border-amber-500/25 group-hover:border-amber-400/50",
      hoverBorder: "hover:border-amber-500/40 hover:shadow-amber-500/5",
      prompt: "Give me a full quarterly executive analytics report."
    }
  ];

  const filteredSessions = historySessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#070b12] text-slate-100 font-sans antialiased overflow-hidden select-none">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-72 bg-[#090d16] border-r border-slate-800/80 flex flex-col justify-between shrink-0">
        <div className="p-4 space-y-4">
          
          {/* BRAND IDENTITY */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 border border-amber-300/30">
              <svg 
                className="w-4 h-4 text-slate-950 stroke-[2.5]" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
                <circle cx="18" cy="6" r="2" fill="currentColor" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                Agentic BI
              </span>
              <span className="text-[9px] font-semibold text-amber-400/90 tracking-wider uppercase -mt-0.5">
                Enterprise Copilot
              </span>
            </div>
          </div>

          <button 
            onClick={startNewChat}
            className="w-full py-2.5 px-4 bg-[#111827] hover:bg-[#1f293d] border border-slate-800 text-slate-200 font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-500" /> New chat
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search chat history..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1321] border border-slate-800/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-slate-700"
            />
          </div>

          {/* HISTORY SESSIONS LIST */}
          <div className="space-y-1 mt-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 block mb-2">Today</span>
            {filteredSessions.map((s) => {
              const isActive = s.session_id === sessionId;
              const isEditing = editingSessionId === s.session_id;

              return (
                <div
                  key={s.session_id}
                  onClick={() => loadSession(s.session_id)}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                    isActive ? 'bg-[#162035] text-white border border-slate-700/50' : 'text-slate-400 hover:bg-[#0d1321] hover:text-slate-200'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitleInput}
                        onChange={e => setEditTitleInput(e.target.value)}
                        className="bg-[#090d16] border border-amber-500 text-xs text-white px-2 py-1 rounded w-full focus:outline-none"
                        autoFocus
                      />
                      <button onClick={e => handleSaveRename(e, s.session_id)} className="p-1 text-emerald-400 hover:text-emerald-300">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setEditingSessionId(null); }} className="p-1 text-slate-400 hover:text-slate-200">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="truncate pr-4 text-[11px]">{s.title}</span>
                      <div className="hidden group-hover:flex items-center gap-1 shrink-0 bg-[#0d1321] px-1 py-0.5 rounded border border-slate-800">
                        <button onClick={(e) => handleStartRename(e, s)} className="p-1 text-slate-400 hover:text-amber-400">
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => handleDeleteSession(e, s.session_id)} className="p-1 text-slate-400 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* USER PROFILE FOOTER */}
        <div className="p-3 border-t border-slate-800/80 flex items-center gap-3 bg-[#070b12]">
          <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700">
            S
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">Surya</span>
            <span className="text-[10px] text-slate-500">Workspace Controller</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col justify-between bg-[#070b12] relative overflow-hidden">
        
        {/* HEADER */}
        <header className="h-14 border-b border-slate-800/80 flex items-center justify-between px-6 bg-[#090d16]/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 border border-amber-300/40">
              <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                Autonomous Analytics Hub
              </span>
              <span className="text-[9px] font-medium text-slate-500 tracking-wider -mt-0.5">
                AI Query & Visual Engine
              </span>
            </div>
          </div>

          {/* DYNAMIC COMPANY / SOURCE BADGE */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-semibold ${activeSource.badgeColor}`}>
              {activeSource.icon}
              <span>Source: {activeSource.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">DB Live</span>
            </div>
          </div>
        </header>

        {/* MESSAGES / CHAT CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-7 max-w-3xl mx-auto text-center px-4 py-8">
              
              {/* SYSTEM FEATURE BADGES */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] font-semibold text-slate-400 shadow-inner">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-slate-300">Agentic Engine v2.4</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400/90 font-medium">Automated SQL & Multi-Dimensional Analytics</span>
              </div>

              {/* CORE APP HERO ICON */}
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-amber-500/15 blur-2xl"></div>
                <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-orange-500/5 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-2xl shadow-amber-500/10">
                  <Cpu className="w-8 h-8 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                </div>
              </div>

              {/* HEADINGS */}
              <div className="space-y-2.5 max-w-xl mx-auto">
                <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-amber-200">
                  Agentic Business Intelligence Copilot
                </h1>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  {activeSource.description}
                </p>
              </div>

              {/* DYNAMIC 4-CARD QUICK PROMPT GRID */}
              <div className="grid grid-cols-2 gap-3.5 w-full max-w-2xl pt-2">
                {suggestionCards.map((card, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSendMessage(card.prompt)}
                    className={`p-4 bg-[#0c121e]/90 hover:bg-[#131c2e] border border-slate-800/80 ${card.hoverBorder} rounded-2xl text-left transition-all duration-200 flex items-start gap-3.5 group cursor-pointer shadow-md hover:-translate-y-0.5`}
                  >
                    <div className={`p-2.5 rounded-xl border ${card.iconBg} group-hover:scale-105 transition duration-200 shadow-sm`}>
                      {card.icon}
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xs font-semibold text-slate-100 group-hover:text-amber-300 transition duration-150">
                        {card.title}
                      </div>
                      <div className="text-[11px] text-slate-400 group-hover:text-slate-300 mt-0.5 leading-snug font-normal">
                        {card.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* CONNECTED DATASETS FOOTER BAR */}
              <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500 flex-wrap justify-center font-medium">
                <span>Active Database Schemas:</span>
                {(dbTables.length > 0 ? dbTables : ["spotify_tracks", "spotify_revenue"]).map((table) => (
                  <span 
                    key={table} 
                    className="px-2.5 py-1 rounded-lg bg-[#0d1321] border border-slate-800/90 text-amber-400 font-mono text-[10px] shadow-sm hover:border-slate-700 transition"
                  >
                    `{table}`
                  </span>
                ))}
              </div>

            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2`}>
                {msg.sender === 'user' ? (
                  <div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl text-xs max-w-md shadow-lg font-medium">
                    {msg.reply}
                  </div>
                ) : (
                  <div className="w-full space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                      <span className="h-1 w-1 rounded-full bg-amber-500"></span> Co-Pilot Insights
                    </div>
                    <BIChart replyText={msg.reply} />
                  </div>
                )}
              </div>
            ))
          )}

          {/* LOADING STATE INDICATOR */}
          {loading && (
            <div className="flex items-center gap-3 p-4 bg-[#0d1321] border border-slate-800/80 rounded-2xl w-fit animate-pulse">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-xs text-slate-400 font-medium">Executing queries & compiling analytics...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* INPUT PROMPT BAR */}
        <div className="p-4 border-t border-slate-800/80 bg-[#070b12]">
          <div className="max-w-3xl mx-auto relative flex items-center">
            <input
              type="text"
              placeholder={isListening ? "Listening... Speak your executive question..." : "Ask an executive question about active business datasets..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className={`w-full bg-[#0d1321] border ${
                isListening ? 'border-amber-500 ring-1 ring-amber-500/50 text-amber-200' : 'border-slate-800/80 text-slate-200'
              } rounded-2xl pl-4 pr-24 py-3 text-xs placeholder-slate-500 focus:outline-none focus:border-slate-700 shadow-inner transition-all`}
            />

            {/* MICROPHONE VOICE TYPING BUTTON */}
            <button
              type="button"
              onClick={toggleListening}
              className={`absolute right-12 p-2 rounded-xl transition cursor-pointer ${
                isListening 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' 
                  : 'text-slate-400 hover:text-amber-400 hover:bg-[#162035]'
              }`}
              title={isListening ? "Stop voice listening" : "Start voice input"}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            {/* SEND BUTTON */}
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputMessage.trim()}
              className="absolute right-2 p-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-black disabled:text-slate-600 rounded-xl transition shadow-md cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}