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
  // --- 상태 관리 ---
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
  
  const [bankCategoryFilter, setBankCategoryFilter] = useState<string>('all');

  // --- 초기 데이터 로드 ---
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
    const unsubBank = onSnapshot(collection(db, 'questionBank'), (snap) => {
      setQuestionBank(snap.docs.map(d => ({ id: d.id, ...d.data() } as BankQuestion)));
    });
    return () => { unsubAuth(); unsubExams(); unsubBank(); };
  }, []);

  const showToast = (message: string) => { setToastMessage(message); setTimeout(() => setToastMessage(null), 3000); };

  // --- 인증 로직 ---
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
    } catch (e) { showToast('사번을 확인하시거나 최초 등록을 해주세요.'); }
  };

  // --- 시험 로직 ---
  const startExam = async () => {
    const exam = exams.find(e => e.id === currentExamId);
    if (!exam) return;
    const selected = [...exam.questions].sort(() => Math.random() - 0.5).slice(0, exam.displayCount || exam.questions.length);
    setActiveQuestions(selected);
    if (exam.mode === 'test') { setTestAnswers({}); } 
    else { setQuestionQueue(selected.map((q, idx) => ({q, originalIndex: idx}))); setIsAnswerChecked(false); }
    setView('student-take');
  };

  const submitExam = async (finalAnswers: Record<number, number>) => {
    const correctCount = activeQuestions.reduce((cnt, q, idx) => finalAnswers[idx] === q.answerIndex ? cnt + 1 : cnt, 0);
    setStudentScore(Math.round((correctCount / activeQuestions.length) * 100));
    setView('student-result');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Tailwind CDN을 가장 먼저 배치하여 로딩 지연 방지 */}
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      
      {/* 상단 네비바 */}
      <nav className="p-4 bg-white/90 backdrop-blur shadow-sm border-b flex justify-between items-center sticky top-0 z-50">
        <h1 onClick={() => setView('home')} className="cursor-pointer flex items-center gap-2">
          <img src={APP_CONFIG.logoImageUrl} alt="Logo" className="h-8" />
          <span className="font-bold text-slate-800 hidden sm:block">{APP_CONFIG.logoText}</span>
        </h1>
        {userProfile && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-600">{userProfile.name} 님</span>
            <button onClick={() => signOut(auth)} className="text-xs bg-slate-100 px-3 py-2 rounded-lg font-bold">로그아웃</button>
          </div>
        )}
      </nav>

      {/* 메인 컨텐츠 영역 */}
      <main className="p-4 sm:p-8 max-w-4xl mx-auto w-full flex-1 flex flex-col">
        
        {/* [1] 홈 화면: 사번 입력 (개선된 UI) */}
        {view === 'home' && !userProfile && (
          <div className="flex flex-col items-center justify-center py-10 animate-fade-in w-full">
            <div className="bg-white w-full max-w-[420px] rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 sm:p-12 transition-all">
              <h2 className="text-3xl font-black text-center mb-2 tracking-tight text-slate-800">교육 센터</h2>
              <p className="text-slate-400 text-center text-sm font-medium mb-10">사번을 입력하여 로그인하세요</p>

              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
                <button onClick={() => setAuthMode('login')} className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all ${authMode === 'login' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>로그인</button>
                <button onClick={() => setAuthMode('register')} className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all ${authMode === 'register' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>최초 등록</button>
              </div>

              <div className="space-y-5">
                <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition-all p-1 overflow-hidden">
                  <span className="pl-5 pr-1 font-black text-blue-600 text-xl italic">WN</span>
                  <input type="text" value={empIdInput} onChange={e => setEmpIdInput(e.target.value.replace(/[^0-9]/g, ''))} maxLength={8} className="w-full bg-transparent py-4 font-bold text-xl outline-none" placeholder="사번 8자리" />
                </div>
                {authMode === 'register' && (
                  <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-[1.25rem] text-lg font-bold text-center outline-none focus:border-blue-500 transition-all" placeholder="성함 입력 (예: 홍길동)" />
                )}
                <button onClick={handleStudentAuth} className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.25rem] shadow-xl hover:bg-blue-600 transition-all text-xl active:scale-95">입장하기</button>
              </div>
              <button onClick={() => setView('admin-login')} className="w-full text-slate-300 text-xs mt-10 font-bold hover:text-slate-500 transition-colors">⚙️ 관리자 모드</button>
            </div>
          </div>
        )}

        {/* [2] 학생 대시보드 */}
        {view === 'home' && userProfile && (
          <div className="animate-fade-in space-y-8 w-full">
            <h2 className="text-3xl font-black text-slate-800">환영합니다, {userProfile.name}님! 👋</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col">
                <h3 className="font-black text-xl mb-6 flex items-center gap-2"><span className="text-2xl">📖</span> 자율 학습</h3>
                <div className="space-y-3">
                  {exams.filter(e => e.mode === 'study').map(ex => (
                    <div key={ex.id} className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center hover:border-emerald-300 transition-all">
                      <span className="font-bold text-slate-700">{ex.title}</span>
                      <button onClick={() => { setCurrentExamId(ex.id); setView('student-entry'); }} className="bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-black shadow-sm">학습시작</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col">
                <h3 className="font-black text-xl mb-6 flex items-center gap-2"><span className="text-2xl">🏆</span> 실전 퀴즈</h3>
                <div className="space-y-3">
                  {exams.filter(e => e.mode === 'test').map(ex => (
                    <div key={ex.id} className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center hover:border-purple-300 transition-all">
                      <span className="font-bold text-slate-700">{ex.title}</span>
                      <button onClick={() => { setCurrentExamId(ex.id); setView('student-entry'); }} className="bg-purple-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-sm">응시하기</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* [3] 시험/학습 대기 화면 */}
        {view === 'student-entry' && (
          <div className="py-20 text-center animate-fade-in space-y-10">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">{exams.find(e => e.id === currentExamId)?.title}</h2>
            <div className="flex flex-col items-center gap-4">
              <button onClick={startExam} className="bg-blue-600 text-white px-16 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all">과정 시작하기 👉</button>
              <p className="text-slate-400 font-bold">준비가 되었다면 버튼을 눌러주세요.</p>
            </div>
          </div>
        )}

        {/* [4] 시험/학습 진행 화면 */}
        {view === 'student-take' && (
          <div className="max-w-2xl mx-auto w-full space-y-6 animate-fade-in pb-20">
            {/* 자율 학습 (큐 방식) */}
            {questionQueue.length > 0 && (
              <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border border-slate-100 space-y-8">
                <div className="flex justify-between items-center">
                  <span className="bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full font-black text-xs uppercase">Learning</span>
                  <span className="font-bold text-slate-400 text-sm">남은 문제: {questionQueue.length}</span>
                </div>
                <h2 className="text-2xl font-black leading-tight text-slate-800">{questionQueue[0].q.text}</h2>
                <div className="grid gap-4">
                  {questionQueue[0].q.options.map((opt, i) => (
                    <button key={i} onClick={() => { if(!isAnswerChecked) { setCurrentSelectedOption(i); setIsAnswerChecked(true); } }} className={`text-left p-6 rounded-2xl border-2 font-black transition-all ${isAnswerChecked ? (i === questionQueue[0].q.answerIndex ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : (i === currentSelectedOption ? 'border-red-500 bg-red-50 text-red-600 shadow-inner' : 'opacity-30 border-slate-50')) : 'hover:border-blue-400 hover:bg-blue-50 border-slate-100'}`}>
                      <span className="mr-4 text-slate-300">{i+1}.</span>{opt}
                    </button>
                  ))}
                </div>
                {isAnswerChecked && (
                  <div className="space-y-4 animate-fade-in">
                    {questionQueue[0].q.explanation && <div className="p-5 bg-slate-50 rounded-2xl border text-sm text-slate-600 leading-relaxed font-medium">💡 {questionQueue[0].q.explanation}</div>}
                    <button onClick={() => {
                      const correct = currentSelectedOption === questionQueue[0].q.answerIndex;
                      let next = [...questionQueue]; const item = next.shift();
                      if(!correct && item) next.push(item);
                      setQuestionQueue(next); setIsAnswerChecked(false); setCurrentSelectedOption(null);
                      if(next.length === 0) submitExam({});
                    }} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">다음 문제로</button>
                  </div>
                )}
              </div>
            )}
            
            {/* 실전 퀴즈 (목록 방식) */}
            {exams.find(e => e.id === currentExamId)?.mode === 'test' && (
              <div className="space-y-6">
                {activeQuestions.map((q, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                    <p className="font-black text-lg text-slate-800 leading-snug"><span className="text-blue-500 mr-2">Q{idx+1}.</span>{q.text}</p>
                    <div className="grid gap-3">
                      {q.options.map((opt, oi) => (
                        <button key={oi} onClick={() => setTestAnswers({...testAnswers, [idx]: oi})} className={`p-5 rounded-2xl border-2 text-left font-bold transition-all ${testAnswers[idx] === oi ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-50 hover:bg-slate-50'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={() => submitExam(testAnswers)} className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-blue-700 active:scale-95 transition-all">전체 답안 제출하기</button>
              </div>
            )}
          </div>
        )}

        {/* [5] 결과 화면 */}
        {view === 'student-result' && (
          <div className="py-20 text-center animate-fade-in space-y-10">
            <h2 className="text-4xl font-black text-slate-800">수고하셨습니다!</h2>
            <div className="flex flex-col items-center">
              <div className="text-8xl font-black text-blue-600 drop-shadow-2xl">{studentScore}<span className="text-3xl text-slate-400 font-bold ml-2">점</span></div>
              <div className="mt-4 bg-blue-50 text-blue-700 px-6 py-2 rounded-full font-black text-sm">성공적으로 완료됨</div>
            </div>
            <button onClick={() => { setView('home'); window.history.replaceState({}, '', window.location.pathname); }} className="bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black text-xl hover:bg-slate-800 shadow-xl transition-all">목록으로 돌아가기</button>
          </div>
        )}

        {/* [6] 관리자 로그인 */}
        {view === 'admin-login' && (
          <div className="max-w-xs mx-auto py-20 text-center animate-fade-in space-y-8">
            <h2 className="text-3xl font-black text-slate-800">Admin Login</h2>
            <div className="space-y-4">
              <input type="password" value={adminPasswordInput} onChange={e => setAdminPasswordInput(e.target.value)} className="w-full border-2 p-5 rounded-2xl text-center text-xl font-bold outline-none focus:border-slate-800" placeholder="Password" />
              <button onClick={() => adminPasswordInput === '2026' ? setView('admin-dash') : showToast('비밀번호가 틀립니다')} className="w-full bg-slate-800 text-white py-5 rounded-2xl font-black text-lg">인증하기</button>
            </div>
          </div>
        )}

        {/* [7] 관리자 대시보드 (간소화 버전) */}
        {view === 'admin-dash' && (
          <div className="animate-fade-in space-y-8 w-full pb-20">
            <div className="flex justify-between items-center border-b pb-6">
              <h2 className="text-3xl font-black text-slate-800">Admin Dashboard</h2>
              <button onClick={() => setView('home')} className="text-blue-600 font-bold underline">Home</button>
            </div>
            <div className="flex bg-white p-2 rounded-2xl border w-fit font-bold text-sm shadow-sm">
              <button onClick={() => setAdminTab('exams')} className={`px-6 py-3 rounded-xl transition-all ${adminTab === 'exams' ? 'bg-blue-600 text-white shadow' : 'text-slate-500'}`}>세트 관리</button>
              <button onClick={() => setAdminTab('bank')} className={`px-6 py-3 rounded-xl transition-all ${adminTab === 'bank' ? 'bg-blue-600 text-white shadow' : 'text-slate-500'}`}>문제 보관소</button>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm text-center">
              <p className="text-slate-400 font-bold italic">관리자 세부 기능은 현재 안정화 중입니다.</p>
            </div>
          </div>
        )}

      </main>

      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur text-white px-10 py-5 rounded-full text-sm font-black shadow-2xl z-[100] animate-fade-in flex items-center gap-3">
          <span className="text-blue-400">●</span> {toastMessage}
        </div>
      )}

      {/* 전역 애니메이션 스타일 */}
      <style>{`
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
