import { useState, useEffect, FormEvent } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Plus, 
  LogOut, 
  Clock, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Database,
  Users,
  Home,
  Settings
} from 'lucide-react';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { NameLog } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [inputName, setInputName] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [nameLogs, setNameLogs] = useState<NameLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Track Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync Name Log Data from Firestore in Real-Time
  useEffect(() => {
    // Only subscribe if user is authenticated (as required by security skill)
    if (authLoading) return;
    if (!user) {
      setNameLogs([]);
      setLogsLoading(false);
      return;
    }

    setLogsLoading(true);
    const collectionPath = 'names';
    const q = query(
      collection(db, collectionPath),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const logs: NameLog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          logs.push({
            id: docSnap.id,
            name: data.name,
            userId: data.userId,
            userEmail: data.userEmail,
            userPhoto: data.userPhoto || '',
            createdAt: data.createdAt,
          });
        });
        setNameLogs(logs);
        setLogsLoading(false);
      },
      (error) => {
        // Critical: handle error with strict JSON instrumentation as instructed
        handleFirestoreError(error, OperationType.LIST, collectionPath);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  // Google Sign In Handler
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setSuccessMsg('Berhasil masuk dengan Google!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (error: any) {
      console.error('Sign-In Error: ', error);
      setErrorMsg('Gagal masuk. Silakan coba kembali.');
    }
  };

  // Sign Out Handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSuccessMsg('Berhasil keluar.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      console.error('Sign-Out Error: ', error);
    }
  };

  // Submit Name Entry
  const handleAddName = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const trimmedVal = inputName.trim();
    if (!trimmedVal) {
      setErrorMsg('Nama tidak boleh kosong.');
      return;
    }

    if (trimmedVal.length > 100) {
      setErrorMsg('Nama tidak boleh lebih dari 100 karakter.');
      return;
    }

    setSubmitLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const collectionPath = 'names';
    try {
      // Obtain reference to pre-allocate secure id
      const nameDocRef = doc(collection(db, collectionPath));
      const newId = nameDocRef.id;

      // Construct payload exactly matching schema validator in firestore.rules
      const payload = {
        id: newId,
        name: trimmedVal,
        userId: user.uid,
        userEmail: user.email || '',
        userPhoto: user.photoURL || '',
        createdAt: serverTimestamp()
      };

      await setDoc(nameDocRef, payload);

      setInputName('');
      setSuccessMsg('Nama Anda berhasil disimpan di database!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (error) {
      // Capture error using the strict error instrumentation requested
      try {
        handleFirestoreError(error, OperationType.CREATE, collectionPath);
      } catch (wrappedError: any) {
        setErrorMsg('Gagal menyimpan nama. Terjadi pelanggaran hak akses keamanan.');
        console.error(wrappedError.message);
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filter logs locally based on search
  const filteredLogs = nameLogs.filter((log) => 
    log.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format creation timestamp
  const formatTime = (createdAt: any) => {
    if (!createdAt) return 'Menyinkronkan...';
    // If Firebase Timestamp
    if (createdAt?.seconds) {
      const d = new Date(createdAt.seconds * 1000);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    // If standard Date
    if (createdAt instanceof Date) {
      return createdAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' - ' + createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return 'Baru saja';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-8">
        <div className="flex flex-col gap-4 items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs text-slate-500 font-bold tracking-tight font-sans">Memuat enkripsi autentikasi panel...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl border border-[#e2e8f0] shadow-md p-8 text-center flex flex-col items-center"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center font-bold text-white text-xl mb-4 shadow-sm">
            F
          </div>
          
          <h2 className="text-2xl font-bold text-[#0f172a] tracking-tight">
            Firebase Panel Login
          </h2>
          <p className="text-sm text-slate-500 mt-2 max-w-xs leading-relaxed">
            Masuk dengan Google Workspace untuk mengakes panel database integrasi real-time.
          </p>

          <div className="w-full mt-8">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-5 border border-slate-300 rounded-lg bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer active:scale-98 transition-all duration-200 shadow-xs"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.66-.35-1.36-.35-2.09z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Masuk Dengan Akun Google
            </button>
          </div>

          <p className="text-[11px] text-slate-400 mt-6 leading-relaxed">
            v1.0.4 • Terkoneksi ke Google Cloud Platform Firestore
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col md:flex-row text-[#1e293b]">
      
      {/* 1. Left Sidebar - Desktop Panel Accent */}
      <aside className="w-[260px] bg-[#0f172a] text-white hidden md:flex flex-col p-6 shrink-0 h-screen sticky top-0 border-r border-[#1e293b]">
        {/* Sidebar Header Brand */}
        <div className="flex items-center gap-3 mb-10 mt-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-white text-base shadow-sm">
            F
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-bold tracking-tight text-white leading-tight">FireBase Panel</h2>
            <span className="text-[10px] text-amber-400 font-mono font-semibold tracking-wider uppercase leading-none mt-0.5">Console</span>
          </div>
        </div>

        {/* Navigation Elements */}
        <nav className="flex-1 flex flex-col gap-1.5">
          <div className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest mb-3">
            Menu Utama
          </div>
          <div className="bg-[#1e293b] text-white py-3 px-4 rounded-lg flex items-center gap-3 text-sm font-semibold transition-all shadow-xs cursor-default">
            <span className="text-base">🏠</span>
            Dashboard
          </div>
          <div className="opacity-60 text-slate-300 py-3 px-4 rounded-lg flex items-center gap-3 text-sm font-semibold hover:opacity-100 transition-all cursor-pointer">
            <span className="text-base">👤</span>
            Data Pengguna
          </div>
          <div className="opacity-60 text-slate-300 py-3 px-4 rounded-lg flex items-center gap-3 text-sm font-semibold hover:opacity-100 transition-all cursor-pointer">
            <span className="text-base">⚙️</span>
            Pengaturan
          </div>
        </nav>

        {/* Sidebar Footer Info */}
        <div className="pt-4 border-t border-[#1e293b] flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="" 
                className="w-8 h-8 rounded-full border border-slate-700 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold font-mono text-amber-500 shrink-0">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate leading-tight">{user.displayName || 'Authorized'}</p>
              <p className="text-[9px] text-slate-400 truncate leading-none mt-0.5 font-mono">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[#94a3b8] text-xs">
            <span className="font-mono text-[10px] tracking-wider">v1.0.4</span>
            <span className="flex items-center gap-1 text-[#22c55e] font-semibold text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              Terkoneksi
            </span>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Board */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Interactive Top Header */}
        <header className="h-16 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-6 md:px-8 shrink-0 shadow-3xs z-30">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0">
              F
            </div>
            <h1 className="text-lg font-bold text-[#0f172a] tracking-tight">
              Input Nama Database
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Synchronized Connection Badge */}
            <div className="bg-[#dcfce7] text-[#166534] px-3 py-1 text-xs font-bold rounded-full flex items-center gap-2 shrink-0 border border-emerald-200/40">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              <span>Firebase Live Connected</span>
            </div>

            {/* Signed-in User quick actions (Mobile Only) */}
            <button
              onClick={handleSignOut}
              className="md:hidden flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-50 border border-slate-200 cursor-pointer active:scale-95 transition-all"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Warning and Success Alerts Banner */}
        <div className="w-full max-w-7xl mx-auto px-6 md:px-8 pt-6">
          <AnimatePresence mode="popLayout">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -8 }}
                className="p-4 rounded-xl bg-red-50/90 border border-red-200/60 backdrop-blur-md flex items-start gap-3 shadow-3xs mb-4"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">Error Terjadi</p>
                  <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{errorMsg}</p>
                </div>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -8 }}
                className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-200/60 backdrop-blur-md flex items-start gap-3 shadow-3xs mb-4"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-800">Operasi Sukses</p>
                  <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">{successMsg}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Dashboard Layout (Multi Columns on Desktop) */}
        <main className="p-6 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 overflow-y-auto w-full max-w-7xl mx-auto">
          
          {/* Card Left: Action Panel Form */}
          <section className="flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 md:p-8 flex flex-col">
              <h3 className="text-base font-bold text-[#0f172a] mb-5 pb-3 border-b border-[#f1f5f9]">
                Entri Data Baru
              </h3>

              <form onSubmit={handleAddName} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="name-input" className="block text-xs font-semibold uppercase tracking-wider text-[#475569]">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <input
                      id="name-input"
                      type="text"
                      maxLength={100}
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      placeholder="Masukkan nama di sini..."
                      className="w-full py-3 px-4 border border-[#cbd5e1] rounded-lg focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10 focus:outline-hidden text-sm font-semibold text-[#1e293b] placeholder-[#94a3b8] transition-all bg-[#f8fafc]/50"
                      disabled={submitLoading}
                    />
                    <div className="absolute right-3 top-3 text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm shrink-0">
                      {inputName.length}/100
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitLoading || !inputName.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm transition-all duration-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer active:scale-98 shadow-sm"
                >
                  {submitLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  ) : (
                    <span className="text-base shrink-0">💾</span>
                  )}
                  {submitLoading ? 'Menyinkronkan...' : 'Simpan ke Firebase'}
                </button>
              </form>

              <div className="mt-6 p-4 bg-[#f8fafc] border border-[#f1f5f9] rounded-lg text-xs text-[#64748b] leading-relaxed">
                <strong>Info:</strong> Data akan disinkronkan secara real-time ke koleksi <code>names</code> di cloud Firestore yang diproteksi tinggi.
              </div>
            </div>

            {/* Profile Detail Mini panel (desktop only) */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-4 hidden md:flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="relative">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full object-cover border border-[#e2e8f0]" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center border border-slate-200">
                      {user.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-[#0f172a] truncate">{user.displayName || 'Registered User'}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{user.email}</p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="py-1.5 px-3 bg-red-50 text-red-600 hover:bg-red-100/80 rounded-lg text-xs font-bold transition-all border border-red-100 cursor-pointer active:scale-95 shrink-0"
                title="Keluar"
              >
                Sign Out
              </button>
            </div>
          </section>

          {/* Card Right: Real-Time Grid/Table Data Logs */}
          <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f5f9] pb-4">
              <h3 className="text-base font-bold text-[#0f172a] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#64748b]" />
                Data Terdaftar
              </h3>
              <div className="text-xs text-blue-600 font-extrabold flex items-center gap-1">
                Live Sinkronisasi Firestore • {nameLogs.length} Entri
              </div>
            </div>

            {/* Filter Panel Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama atau email terdaftar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2.5 pl-10 pr-4 border border-[#cbd5e1] rounded-lg text-xs font-semibold text-[#1e293b] placeholder-[#94a3b8] focus:outline-hidden focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10 transition-all bg-[#f8fafc]/50"
              />
            </div>

            {/* Pristine Table Grid */}
            <div className="overflow-x-auto">
              {logsLoading ? (
                <div className="flex flex-col items-center justify-center p-12 gap-2 text-center">
                  <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                  <span className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider">Mendapat metadata Firestore...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50/50 rounded-lg border border-slate-100 text-slate-400">
                  <p className="text-xs font-bold">Tidak ada entri terdaftar</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                    {searchQuery ? 'Ganti filter pencarian Anda' : 'Ketik nama baru Anda di panel kiri kemudian klik simpan.'}
                  </p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#e2e8f0]">
                      <th className="text-left pb-3 px-3 text-xs font-bold text-[#64748b] uppercase tracking-wider">ID</th>
                      <th className="text-left pb-3 px-3 text-xs font-bold text-[#64748b] uppercase tracking-wider">Nama Pengguna</th>
                      <th className="text-left pb-3 px-3 text-xs font-bold text-[#64748b] uppercase tracking-wider">Status Sinkron</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    <AnimatePresence initial={false}>
                      {filteredLogs.map((log) => {
                        const isOwn = log.userId === user.uid;
                        // Format safe ID
                        const displayId = `#${log.id.slice(0, 5).toUpperCase()}`;
                        return (
                          <motion.tr
                            key={log.id}
                            layout
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.18 }}
                            className={`hover:bg-[#f8fafc]/70 transition-colors ${isOwn ? 'bg-[#3b82f6]/5 font-semibold' : ''}`}
                          >
                            <td className="py-3 px-3 text-xs font-mono font-bold text-slate-400 truncate max-w-[80px]">
                              {displayId}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                {log.userPhoto ? (
                                  <img 
                                    src={log.userPhoto} 
                                    alt="" 
                                    className="w-7 h-7 rounded-full object-cover border border-[#e2e8f0] shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-400 font-bold flex items-center justify-center shrink-0 font-sans text-xs">
                                    {log.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="overflow-hidden">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-bold text-[#1e293b] truncate" title={log.name}>
                                      {log.name}
                                    </span>
                                    {isOwn && (
                                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#0f172a] text-white font-mono uppercase shrink-0">
                                        Anda
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-mono truncate">
                                    {log.userEmail}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-0.5 justify-center">
                                <span className="text-[11px] text-[#22c55e] font-semibold flex items-center gap-1 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                                  Sukses
                                </span>
                                <span className="text-[9px] font-mono font-bold text-slate-400 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-slate-300" />
                                  {formatTime(log.createdAt)}
                                </span>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
          </section>

        </main>
      </div>

    </div>
  );
}

