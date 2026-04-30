import { useState, useEffect } from 'react';
import { 
  Plus, 
  History, 
  Settings, 
  Zap, 
  LayoutDashboard, 
  ChevronRight, 
  AlertTriangle,
  Info,
  LogOut,
  User as UserIcon,
  LogIn,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SidebarItem } from './components/SidebarItem';
import { BlueprintDropzone } from './components/BlueprintDropzone';
import { AnalysisReport } from './components/AnalysisReport';
import { SurveyModule } from './components/SurveyModule';
import { analyzeBlueprint } from './services/geminiService';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  handleFirestoreError,
  OperationType,
  User
} from './lib/firebase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('new');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const path = 'analyses';
    const q = query(
      collection(db, path),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      setHistory(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError('Falha ao autenticar com Google.');
    }
  };

  const handleLogout = () => {
    auth.signOut();
    setActiveTab('new');
    setReport(null);
  };

  const handleFileSelect = (file: File) => {
    if (!user) return;
    setSelectedFile(file);
    setCurrentFileName(file.name);
    setReport(null);
    setError(null);
  };

  const handleStartAnalysis = async () => {
    if (!user || !selectedFile) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const reader = new FileReader();
      const fileType = selectedFile.type;
      
      reader.onloadend = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        if (base64) {
          try {
            const result = await analyzeBlueprint(base64, fileType);
            setReport(result);
            setSelectedFile(null); // Clear selected file once report is ready
          } catch (e: any) {
            console.error("Analysis inner error:", e);
            setError(`Falha na análise: ${e.message || 'Erro desconhecido'}`);
          } finally {
            setIsAnalyzing(false);
          }
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (e) {
      setError('Erro ao processar arquivo.');
      setIsAnalyzing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    if (!user || !report) return;
    const path = 'analyses';
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        fileName: currentFileName,
        report: report,
        timestamp: serverTimestamp(),
        status: 'completed'
      });
      alert('Relatório salvo com sucesso no seu histórico!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const viewHistoricalReport = (item: any) => {
    setReport(item.report);
    setCurrentFileName(item.fileName);
    setActiveTab('new');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-technical-bg">
        <div className="w-12 h-1 bg-technical-accent animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-technical-bg relative overflow-hidden">
        <div className="fixed inset-0 technical-grid pointer-events-none" />
        <div className="z-10 max-w-md space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-technical-ink rounded-sm flex items-center justify-center">
              <Zap className="text-white" size={32} />
            </div>
            <h1 className="font-serif italic text-4xl font-bold">VoltScan AI</h1>
            <p className="text-technical-ink/60 uppercase tracking-widest text-[10px] font-mono">Plataforma Profissional de Análise Elétrica</p>
          </div>
          
          <div className="card-technical bg-white/50 backdrop-blur-sm space-y-6">
            <p className="text-sm border-l-2 border-technical-accent pl-4 text-left italic">
              "Análise de conformidade técnica NBR 5410 com inteligência artificial de última geração."
            </p>
            <button 
              onClick={handleLogin}
              className="btn-primary w-full flex items-center justify-center gap-3 h-12"
            >
              <LogIn size={20} />
              Acessar com Google
            </button>
          </div>
          
          <p className="text-[9px] uppercase tracking-tighter opacity-40 font-mono">
            Uso restrito a profissionais qualificados e engenharia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex text-technical-ink">
      <div className="fixed inset-0 technical-grid pointer-events-none" />

      <aside className="w-64 border-r border-technical-line/20 flex flex-col no-print z-10 bg-technical-bg/80 backdrop-blur-sm">
        <div className="p-6 border-b border-technical-line/20 flex items-center gap-3">
          <div className="w-8 h-8 bg-technical-accent rounded-sm flex items-center justify-center">
            <Zap className="text-white" size={20} />
          </div>
          <span className="font-serif italic text-xl font-bold tracking-tight">VoltScan AI</span>
        </div>

        <nav className="flex-1 py-4">
          <SidebarItem 
            icon={Plus} 
            label="Nova Análise" 
            active={activeTab === 'new'} 
            onClick={() => { setActiveTab('new'); setReport(null); }} 
          />
          <SidebarItem 
            icon={History} 
            label="Histórico" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
          />
          <SidebarItem 
            icon={Calculator} 
            label="Levantamento" 
            active={activeTab === 'survey'} 
            onClick={() => setActiveTab('survey')} 
          />
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Estatísticas" 
            active={activeTab === 'stats'} 
            onClick={() => setActiveTab('stats')} 
          />
        </nav>

        <div className="mt-auto border-t border-technical-line/20">
          <SidebarItem icon={Settings} label="Configurações" onClick={() => {}} />
          <div className="p-4 bg-technical-ink text-technical-bg flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-technical-bg/20 flex items-center justify-center overflow-hidden">
              {user.photoURL ? <img src={user.photoURL} referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <UserIcon size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase font-mono opacity-60">Operador</p>
              <p className="text-xs font-mono truncate">{user.displayName || user.email}</p>
            </div>
            <LogOut size={14} className="opacity-60 cursor-pointer hover:text-technical-accent" onClick={handleLogout} />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto relative z-10 p-8 md:p-12 lg:p-16">
        <AnimatePresence mode="wait">
          {activeTab === 'new' && (
            <motion.div
              key="new-analysis"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              {!report ? (
                <>
                  <div className="space-y-2">
                    <div className="label-tech no-print inline-block px-2 py-1 border border-technical-line/20">Modo: Analisador Autônomo</div>
                    <h1 className="font-serif italic text-4xl md:text-5xl lg:text-6xl text-technical-ink leading-tight">
                      Interpretador de <span className="text-technical-accent">Plantas Elétricas</span>
                    </h1>
                    <p className="text-technical-ink/60 max-w-2xl text-sm leading-relaxed">
                      Carregue sua planta técnica em formato JPG, PNG ou PDF. Nossa IA irá identificar componentes, verificar conformidade com normas e gerar um relatório detalhado.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                    <div className="card-technical space-y-3">
                      <div className="w-10 h-10 bg-technical-line/5 flex items-center justify-center">
                        <Zap size={20} />
                      </div>
                      <h3 className="font-bold text-xs uppercase tracking-wider">Identificação</h3>
                      <p className="text-[11px] opacity-60 leading-relaxed uppercase">Detecção automática de símbolos por visão computacional.</p>
                    </div>
                    <div className="card-technical space-y-3">
                      <div className="w-10 h-10 bg-technical-line/5 flex items-center justify-center">
                        <AlertTriangle size={20} />
                      </div>
                      <h3 className="font-bold text-xs uppercase tracking-wider">Segurança</h3>
                      <p className="text-[11px] opacity-60 leading-relaxed uppercase">Verificação de conformidade NBR 5410.</p>
                    </div>
                    <div className="card-technical space-y-3">
                      <div className="w-10 h-10 bg-technical-line/5 flex items-center justify-center">
                        <Info size={20} />
                      </div>
                      <h3 className="font-bold text-xs uppercase tracking-wider">Laudos</h3>
                      <p className="text-[11px] opacity-60 leading-relaxed uppercase">Geração de PDF técnico para auditoria.</p>
                    </div>
                  </div>

                  <div className="pt-4 no-print">
                    <BlueprintDropzone 
                      onFileSelect={handleFileSelect} 
                      isLoading={isAnalyzing} 
                    />
                  </div>

                  {selectedFile && !isAnalyzing && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card-technical bg-technical-ink text-technical-bg flex items-center justify-between no-print"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-technical-bg/10 border border-technical-bg/20">
                          <Zap className="text-technical-accent" size={20} />
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase opacity-60">Arquivo Pronto</p>
                          <p className="font-mono text-xs font-bold truncate max-w-[200px]">{selectedFile.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setSelectedFile(null)}
                          className="font-mono text-[10px] uppercase hover:text-technical-accent transition-colors"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={handleStartAnalysis}
                          className="btn-primary !bg-technical-accent !text-white !border-technical-accent flex items-center gap-2"
                        >
                          <Zap size={16} />
                          Gerar Relatório Técnico
                        </button>
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                <AnalysisReport 
                  report={report} 
                  onPrint={handlePrint} 
                  onSave={handleSave} 
                />
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 no-print">
                  <AlertTriangle size={20} />
                  <span className="font-mono text-xs uppercase tracking-wider font-bold">{error}</span>
                </div>
              )}

              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 no-print">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scaleY: [1, 2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                        className="w-1 h-8 bg-technical-accent"
                      />
                    ))}
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] font-bold">
                    Processando diagrama técnico...
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              <div className="flex items-end justify-between border-b border-technical-line/20 pb-4">
                <h1 className="font-serif italic text-4xl">Histórico de Análises</h1>
                <span className="font-mono text-[10px] uppercase opacity-50 tracking-widest">Total: {history.length}</span>
              </div>

              <div className="space-y-4">
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => viewHistoricalReport(item)}
                    className="flex items-center gap-6 p-4 border border-technical-line/10 bg-white/50 hover:bg-white transition-colors cursor-pointer group"
                  >
                    <div className="w-16 h-16 bg-technical-ink flex items-center justify-center">
                      <div className="w-10 h-10 border border-white/20 dotted-border flex items-center justify-center">
                        <History className="text-white opacity-40" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1 bg-green-100 text-green-700 text-[9px] font-bold uppercase tracking-widest">Concluído</span>
                        <span className="font-mono text-[9px] opacity-40 uppercase tracking-widest">
                          {item.timestamp.toLocaleDateString()} {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm uppercase tracking-wider">{item.fileName}</h3>
                      <p className="text-[11px] opacity-60 uppercase tracking-tight">Relatório técnico pronto para visualização</p>
                    </div>
                    <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 group-hover:text-technical-accent transition-all translate-x-0 group-hover:translate-x-2" />
                  </div>
                ))}

                {history.length === 0 && (
                  <div className="border border-dashed border-technical-line/20 p-20 text-center flex flex-col items-center gap-4">
                    <div className="p-3 bg-technical-line/5 rounded-full">
                      <History className="opacity-20" />
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-40">Nenhuma análise registrada</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'survey' && (
            <motion.div
              key="survey"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-6xl mx-auto"
            >
              <SurveyModule />
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 text-center space-y-4">
              <LayoutDashboard size={48} className="opacity-10" />
              <p className="font-mono text-sm uppercase tracking-widest opacity-40">Módulo de Estatísticas em Desenvolvimento</p>
              <div className="w-32 h-1 bg-technical-line/10 overflow-hidden">
                <motion.div animate={{ x: [-128, 128] }} transition={{ repeat: Infinity, duration: 2 }} className="w-16 h-full bg-technical-accent" />
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-4 right-4 no-print z-50">
        <div className="flex items-center gap-4 bg-technical-ink/90 text-technical-bg px-4 py-2 text-[10px] font-mono uppercase tracking-[0.2em]">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {user.email}
        </div>
      </footer>
    </div>
  );
}

