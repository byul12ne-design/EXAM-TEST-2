import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  type User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  getDoc, 
  writeBatch, 
  arrayUnion, 
  query, 
  orderBy 
} from 'firebase/firestore';

// ==========================================
// 🛠️ 앱 설정 및 파이어베이스
// ==========================================
const APP_CONFIG = {
  logoText: "뷔르트 교육 센터",
  logoImageUrl: "https://eshop.wuerth.de/is-bin/intershop.static/WFS/1401-B1-Site/-/en_US/webkit_bootstrap/dist/img/wuerth-logo.svg",
};

const firebaseConfig = {
  apiKey: "AIzaSyAIBp1x4DalwhtlFnYjnz2TisQBA0wVBSg",
  authDomain: "product-exam-9b794.firebaseapp.com",
  projectId: "product-exam-9b794",
  storageBucket: "product-exam-9b794.firebasestorage.app",
  messagingSenderId: "443959122996",
  appId: "1:443959122996:web:355714f3a0c809b9ebbe61",
  measurementId: "G-X5NVNL1G96"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 인터페이스 ---
interface Question { category?: string; text: string; options: string[]; answerIndex: number; explanation: string; }
interface BankQuestion extends Question { id: string; createdAt: number; }
interface Exam { id: string; title: string; questions: Question[]; displayCount: number; createdAt: number; mode: 'study' | 'test'; }
interface UserProfile { uid: string; employeeId: string; name: string; role: 'student' | 'admin'; }

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [questionBank, setQuestionBank] = useState<BankQuestion[]>([]);
  const [view, setView] = useState('home');
  const [adminTab, setAdminTab] = useState<'exams' | 'bank'>('exams');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentExamId, setCurrentExamId] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [empIdInput, setEmpIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState(''); 
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]); 
  const [studentScore, setStudentScore] = useState(0);
  const [questionQueue, setQuestionQueue] = useState<{q: Question, originalIndex: number}[]>([]); 
  const [isAnswerChecked, setIsAnswerChecked] = useState(false); 
  const [currentSelectedOption, setCurrentSelectedOption] = useState<number | null>(null); 
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (docSnap.exists()) setUserProfile(docSnap.data() as UserProfile);
      } else { setUserProfile(null); }
    });
    const unsubExams = onSnapshot(collection(db, 'exams'), (snap) => {
      setExams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam)).sort((a,b) => b.createdAt - a.createdAt));
    });
    return () => { unsubAuth(); unsubExams(); };
  }, []);

  const showToast = (message: string) => { setToastMessage(message); setTimeout(() => setToastMessage(null), 3000); };

  const handleStudentAuth = async () => {
    if (empIdInput.length !== 8) return showToast('사번 8자리를 입력해주세요.');
    const finalEmpId = `WN${empIdInput}`;
    const pseudoEmail = `${finalEmpId.toLowerCase()}@wuerth.exam`;
    const PWD = "WuerthExamSecretPassword2026!";
    try {
      if (authMode === 'register') {
        if (!nameInput.trim()) return showToast('이름을 입력해주세요.');
        const cred = await createUserWithEmailAndPassword(auth, pseudoEmail, PWD);
        await setDoc(doc(db, 'users', cred.user.uid), { uid: cred.user.uid, employeeId: finalEmpId, name: nameInput.trim(), role: 'student' });
      } else {
        await signInWithEmailAndPassword(auth, pseudoEmail, PWD);
      }
      showToast('반갑습니다!');
    } catch (e) { showToast('사번 확인 또는 최초 등록이 필요합니다.'); }
  };

  const startExam = async () => {
    const exam = exams.find(e => e.id === currentExamId);
    if (!exam) return;
    const selected = [...exam.questions].sort(() => Math.random() - 0.5).slice(0, exam.displayCount || exam.questions.length);
    setActiveQuestions(selected);
    if (exam.mode === 'test') { setTestAnswers({}); } 
    else { setQuestionQueue(selected.map((q, idx) => ({q, originalIndex: idx}))); setIsAnswerChecked(false); }
    setView('student-take');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      
      <nav className="p-4 bg-white shadow-sm border-b flex justify-between items-center sticky top-0 z-50">
        <h1 onClick={() => setView('home')} className="cursor-pointer flex items-center gap-2">
          <img src={APP_CONFIG.logoImageUrl} alt="Logo" className="h-8" />
          <span className="font-bold text-slate-800 hidden sm:block">{APP_CONFIG.logoText}</span>
        </h1>
        {userProfile && <button onClick={() => signOut(auth)} className="text-xs bg-slate-100 px-3 py-2 rounded-lg font-bold">로그아웃</button>}
      </nav>

      <main className="p-4 sm:p-8 max-w-4xl mx-auto w-full flex-1 flex flex-col items-center">
        
        {view === 'home' && !userProfile && (
          <div className="w-full flex justify-center py-10 animate-fade-in">
            <div className="bg-white w-full max-w-[420px] rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 sm:p-12 overflow-visible">
              <h2 className="text-3xl font-black text-center mb-2 tracking-tight text-slate-800">교육 센터</h2>
              <p className="text-slate-400 text-center text-sm font-medium mb-10">사번을 입력하여 로그인하세요</p>

              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
                <button onClick={() => setAuthMode('login')} className={`flex-1 py-3.5 rounded-xl font-bold text-sm ${authMode === 'login' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>로그인</button>
                <button onClick={() => setAuthMode('register')} className={`flex-1 py-3.5 rounded-xl font-bold text-sm ${authMode === 'register' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>최초 등록</button>
              </div>

              <div className="space-y-5">
                <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] focus-within:border-blue-600 transition-all p-1">
                  <span className="pl-5 pr-1 font-black text-blue-600 text-xl italic">WN</span>
                  <input type="text" value={empIdInput} onChange={e => setEmpIdInput(e.target.value.replace(/[^0-9]/g, ''))} maxLength={8} className="w-full bg-transparent py-4 font-bold text-xl outline-none" placeholder="사번 8자리" />
                </div>
                {authMode === 'register' && (
                  <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-[1.25rem] text-lg font-bold text-center outline-none focus:border-blue-600 transition-all" placeholder="성함 입력" />
                )}
                {/* 💡 가시성 문제를 해결한 고정 스타일 버튼 */}
                <button 
                  onClick={handleStudentAuth} 
                  className="w-full block bg-slate-900 text-white font-black py-5 rounded-[1.25rem] shadow-xl text-xl hover:bg-blue-600 transition-colors cursor-pointer"
                  style={{ opacity: 1, visibility: 'visible', display: 'block' }}
                >
                  교육장 입장하기
                </button>
              </div>
              <button onClick={() => setView('admin-login')} className="w-full text-slate-300 text-xs mt-10 font-bold hover:text-slate-500 transition-colors">⚙️ 관리자 모드</button>
            </div>
          </div>
        )}

        {view === 'home' && userProfile && (
          <div className="animate-fade-in space-y-8 w-full">
            <h2 className="text-3xl font-black text-slate-800">환영합니다, {userProfile.name}님!</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
                <h3 className="font-black text-xl text-emerald-600 flex items-center gap-2">📖 자율 학습</h3>
                {exams.filter(e => e.mode === 'study').map(ex => (
                  <div key={ex.id} className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center">
                    <span className="font-bold text-sm text-slate-700">{ex.title}</span>
                    <button onClick={() => { setCurrentExamId(ex.id); setView('student-entry'); }} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm">학습시작</button>
                  </div>
                ))}
              </div>
              <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
                <h3 className="font-black text-xl text-purple-600 flex items-center gap-2">🏆 실전 퀴즈</h3>
                {exams.filter(e => e.mode === 'test').map(ex => (
                  <div key={ex.id} className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center">
                    <span className="font-bold text-sm text-slate-700">{ex.title}</span>
                    <button onClick={() => { setCurrentExamId(ex.id); setView('student-entry'); }} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm">응시하기</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'student-entry' && (
          <div className="py-20 text-center animate-fade-in space-y-10 w-full flex flex-col items-center">
            <h2 className="text-4xl font-black text-slate-800">{exams.find(e => e.id === currentExamId)?.title}</h2>
            <button 
              onClick={startExam} 
              className="bg-blue-600 text-white px-16 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-105 transition-all"
            >
              과정 시작하기 👉
            </button>
          </div>
        )}

        {/* 푸는 화면 등 나머지 뷰는 이전과 동일 */}
        {view === 'student-result' && (
          <div className="py-20 text-center animate-fade-in space-y-10 w-full flex flex-col items-center">
            <h2 className="text-4xl font-black text-slate-800">수고하셨습니다!</h2>
            <div className="text-8xl font-black text-blue-600">{studentScore}<span className="text-3xl text-slate-400 ml-2">점</span></div>
            <button onClick={() => setView('home')} className="bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black text-xl shadow-xl">목록으로 돌아가기</button>
          </div>
        )}

        {view === 'admin-login' && (
          <div className="max-w-xs mx-auto py-20 text-center animate-fade-in space-y-8">
            <h2 className="text-3xl font-black text-slate-800">Admin Login</h2>
            <input type="password" value={adminPasswordInput} onChange={e => setAdminPasswordInput(e.target.value)} className="w-full border-2 p-5 rounded-2xl text-center text-xl font-bold outline-none focus:border-slate-800" placeholder="Password" />
            <button onClick={() => adminPasswordInput === '2026' ? setView('admin-dash') : showToast('틀렸습니다')} className="w-full bg-slate-800 text-white py-5 rounded-2xl font-black text-lg">인증하기</button>
          </div>
        )}

      </main>

      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-10 py-5 rounded-full text-sm font-black shadow-2xl z-[100] animate-fade-in">
          {toastMessage}
        </div>
      )}

      <style>{`
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
