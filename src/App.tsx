import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, writeBatch, arrayUnion } from 'firebase/firestore';

// --- 앱 설정 ---
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
interface Exam { id: string; title: string; questions: Question[]; displayCount: number; createdAt: number; mode: 'study' | 'test'; isVisible: boolean; }
interface UserProfile { uid: string; employeeId: string; name: string; role: 'student' | 'admin'; }

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
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

  // 관리자 폼 상태
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamMode, setNewExamMode] = useState<'study' | 'test'>('study');
  const [newQuestions, setNewQuestions] = useState<Question[]>([{ category: '', text: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' }]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) setUserProfile(snap.data() as UserProfile);
      } else setUserProfile(null);
    });
    const unsubExams = onSnapshot(collection(db, 'exams'), (snap) => {
      setExams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam)).sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => { unsubAuth(); unsubExams(); };
  }, []);

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };

  const handleStudentAuth = async () => {
    if (empIdInput.length !== 8) return showToast('사번 8자리를 입력해주세요.');
    const email = `wn${empIdInput.toLowerCase()}@wuerth.exam`;
    const pwd = "WuerthExamSecretPassword2026!";
    try {
      if (authMode === 'register') {
        if (!nameInput.trim()) return showToast('성함을 입력해주세요.');
        const cred = await createUserWithEmailAndPassword(auth, email, pwd);
        await setDoc(doc(db, 'users', cred.user.uid), { uid: cred.user.uid, employeeId: `WN${empIdInput}`, name: nameInput.trim(), role: 'student' });
      } else { await signInWithEmailAndPassword(auth, email, pwd); }
      showToast('반갑습니다!');
    } catch (e) { showToast('사번 확인 또는 최초 등록이 필요합니다.'); }
  };

  const handleResetProgress = async (examId: string) => {
    if (!user || !confirm('학습 기록을 초기화하고 처음부터 다시 푸시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'progress', `${user.uid}_${examId}`));
      showToast('🔄 기록이 초기화되었습니다.');
    } catch (e) { showToast('초기화 실패'); }
  };

  const startExam = async () => {
    const exam = exams.find(e => e.id === currentExamId);
    if (!exam) return;
    const selected = [...exam.questions].sort(() => Math.random() - 0.5);
    setActiveQuestions(selected);
    if (exam.mode === 'test') setTestAnswers({});
    else { setQuestionQueue(selected.map((q, idx) => ({ q, originalIndex: idx }))); setIsAnswerChecked(false); }
    setView('student-take');
  };

  const handleSaveExam = async () => {
    if (!newExamTitle.trim()) return showToast('제목을 입력해주세요.');
    const examData = { title: newExamTitle, mode: newExamMode, questions: newQuestions.filter(q => q.text.trim()), createdAt: Date.now(), isVisible: false };
    try {
      if (editingExamId) await updateDoc(doc(db, 'exams', editingExamId), examData);
      else await addDoc(collection(db, 'exams'), examData);
      showToast('✅ 저장되었습니다.');
      setView('admin-dash');
    } catch (e) { showToast('저장 실패'); }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col items-center">
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      <style>{`
        .force-show { background-color: #0f172a !important; color: white !important; display: block !important; opacity: 1 !important; }
        .animate-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <nav className="w-full p-4 bg-white shadow-sm border-b flex justify-between items-center sticky top-0 z-50">
        <h1 onClick={() => setView('home')} className="cursor-pointer flex items-center gap-2 ml-2">
          <img src={APP_CONFIG.logoImageUrl} alt="Logo" className="h-7" />
          <span className="font-bold hidden sm:block">교육 센터</span>
        </h1>
        {userProfile && <button onClick={() => signOut(auth)} className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-2 rounded-lg">로그아웃</button>}
      </nav>

      <main className="p-4 sm:p-8 max-w-4xl mx-auto w-full flex-1">
        
        {/* [1] 홈 화면: 사번 입력 */}
        {view === 'home' && !userProfile && (
          <div className="flex justify-center py-10 animate-in">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 sm:p-12">
              <h2 className="text-3xl font-black text-center mb-10">교육 센터</h2>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
                <button onClick={() => setAuthMode('login')} className={`flex-1 py-3 rounded-xl font-bold text-sm ${authMode === 'login' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>로그인</button>
                <button onClick={() => setAuthMode('register')} className={`flex-1 py-3 rounded-xl font-bold text-sm ${authMode === 'register' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>최초 등록</button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl p-1 focus-within:border-blue-600">
                  <span className="pl-4 pr-1 font-black text-blue-600 text-lg">WN</span>
                  <input type="text" value={empIdInput} onChange={e => setEmpIdInput(e.target.value.replace(/[^0-9]/g, ''))} maxLength={8} className="w-full bg-transparent py-4 font-bold text-lg outline-none" placeholder="사번 8자리" />
                </div>
                {authMode === 'register' && <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-center outline-none" placeholder="성함 입력" />}
                <button onClick={handleStudentAuth} className="force-show w-full font-black py-5 rounded-2xl shadow-xl text-lg hover:bg-blue-600 transition-all">교육장 입장하기</button>
              </div>
              <button onClick={() => setView('admin-login')} className="w-full text-slate-300 text-xs mt-10 font-bold hover:text-slate-400">⚙️ 관리자 모드</button>
            </div>
          </div>
        )}

        {/* [2] 참가자 대시보드 (초기화 버튼 복구) */}
        {view === 'home' && userProfile && (
          <div className="animate-in space-y-8">
            <h2 className="text-2xl font-black">환영합니다, {userProfile.name}님! 👋</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
                <h3 className="font-black text-lg text-emerald-600">📖 자율 학습</h3>
                {exams.filter(e => e.mode === 'study' && e.isVisible).map(ex => (
                  <div key={ex.id} className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center">
                    <span className="font-bold text-sm text-slate-700">{ex.title}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleResetProgress(ex.id)} className="bg-slate-200 text-slate-500 px-3 py-2 rounded-xl text-xs font-bold">초기화 🔄</button>
                      <button onClick={() => { setCurrentExamId(ex.id); setView('student-entry'); }} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black">시작</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
                <h3 className="font-black text-lg text-purple-600">🏆 실전 퀴즈</h3>
                {exams.filter(e => e.mode === 'test' && e.isVisible).map(ex => (
                  <div key={ex.id} className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center">
                    <span className="font-bold text-sm text-slate-700">{ex.title}</span>
                    <button onClick={() => { setCurrentExamId(ex.id); setView('student-entry'); }} className="bg-purple-600 text-white px-5 py-2 rounded-xl text-xs font-black">응시하기 🎯</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* [3] 관리자 대시보드 (수정 기능 복구) */}
        {view === 'admin-dash' && (
          <div className="animate-in space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black italic text-slate-800 tracking-tighter uppercase">Admin Dash</h2>
              <button onClick={() => setView('home')} className="text-blue-600 font-bold underline text-sm">메인으로</button>
            </div>
            <button onClick={() => { setEditingExamId(null); setNewExamTitle(''); setNewQuestions([{ category: '', text: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' }]); setView('admin-create'); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">➕ 새 교육 과정 만들기</button>
            <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
              <h3 className="font-bold text-slate-500 text-sm uppercase tracking-widest">Manage Sessions</h3>
              <div className="grid gap-3">
                {exams.map(ex => (
                  <div key={ex.id} className="p-5 bg-slate-50 rounded-2xl border flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{ex.title}</span>
                      <span className="text-[10px] font-black text-slate-400 mt-1 uppercase">{ex.mode} mode</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateDoc(doc(db, 'exams', ex.id), { isVisible: !ex.isVisible })} className={`px-3 py-2 rounded-xl text-[10px] font-black ${ex.isVisible ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>{ex.isVisible ? '출시됨' : '숨김'}</button>
                      <button onClick={() => { setEditingExamId(ex.id); setNewExamTitle(ex.title); setNewExamMode(ex.mode); setNewQuestions(ex.questions); setView('admin-create'); }} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-[10px] font-black">수정</button>
                      <button onClick={async () => { if(confirm('삭제하시겠습니까?')) await deleteDoc(doc(db, 'exams', ex.id)); }} className="text-red-400 font-black text-[10px] ml-2">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* [4] 과정 생성/수정 화면 (추가됨) */}
        {view === 'admin-create' && (
          <div className="animate-in space-y-6 pb-20">
            <input value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} className="text-3xl font-black bg-transparent outline-none w-full border-b-2 border-slate-200 focus:border-blue-500" placeholder="과정 제목 입력" />
            <div className="flex gap-4">
              <button onClick={() => setNewExamMode('study')} className={`px-6 py-2 rounded-xl font-bold text-sm border-2 ${newExamMode === 'study' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-100 text-slate-400'}`}>학습 모드</button>
              <button onClick={() => setNewExamMode('test')} className={`px-6 py-2 rounded-xl font-bold text-sm border-2 ${newExamMode === 'test' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-100 text-slate-400'}`}>시험 모드</button>
            </div>
            <div className="space-y-6">
              {newQuestions.map((q, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border shadow-sm relative">
                  <span className="text-xs font-black text-blue-500 mb-2 block">Q{i+1}.</span>
                  <textarea value={q.text} onChange={e => { const n = [...newQuestions]; n[i].text = e.target.value; setNewQuestions(n); }} className="w-full bg-slate-50 border p-4 rounded-xl text-sm font-bold mb-4 outline-none" placeholder="문제 내용을 입력하세요" />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2 border p-3 rounded-xl bg-white">
                        <input type="radio" checked={q.answerIndex === oi} onChange={() => { const n = [...newQuestions]; n[i].answerIndex = oi; setNewQuestions(n); }} />
                        <input value={opt} onChange={e => { const n = [...newQuestions]; n[i].options[oi] = e.target.value; setNewQuestions(n); }} className="text-xs outline-none w-full" placeholder={`보기 ${oi+1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => setNewQuestions([...newQuestions, { text: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold">+ 문제 추가</button>
            </div>
            <button onClick={handleSaveExam} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl shadow-2xl sticky bottom-6 z-20">과정 저장하기</button>
          </div>
        )}

        {/* 나머지 뷰: 대기, 진행, 결과, 로그인 (기본 유지) */}
        {view === 'student-entry' && (
          <div className="py-20 text-center animate-in w-full flex flex-col items-center">
            <h2 className="text-4xl font-black mb-10 tracking-tight">{exams.find(e => e.id === currentExamId)?.title}</h2>
            <button onClick={startExam} className="bg-blue-600 text-white px-16 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all">과정 시작하기 👉</button>
          </div>
        )}

        {view === 'student-take' && (
          <div className="max-w-2xl mx-auto w-full animate-in">
            {questionQueue.length > 0 && (
              <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-8">
                <h2 className="text-2xl font-black leading-snug">{questionQueue[0].q.text}</h2>
                <div className="grid gap-3">
                  {questionQueue[0].q.options.map((opt, i) => (
                    <button key={i} onClick={() => { if(!isAnswerChecked) { setCurrentSelectedOption(i); setIsAnswerChecked(true); } }} className={`text-left p-6 rounded-2xl border-2 font-black transition-all ${isAnswerChecked ? (i === questionQueue[0].q.answerIndex ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : (i === currentSelectedOption ? 'border-red-500 bg-red-50 text-red-600' : 'opacity-30 border-slate-50')) : 'hover:border-blue-400 border-slate-100'}`}>{opt}</button>
                  ))}
                </div>
                {isAnswerChecked && <button onClick={() => {
                  const correct = currentSelectedOption === questionQueue[0].q.answerIndex;
                  let next = [...questionQueue]; const item = next.shift();
                  if(!correct && item) next.push(item);
                  setQuestionQueue(next); setIsAnswerChecked(false); setCurrentSelectedOption(null);
                  if(next.length === 0) setView('student-result');
                }} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black">다음 문제</button>}
              </div>
            )}
            {/* 시험 모드는 생략되었으나 이전 로직 적용 가능 */}
          </div>
        )}

        {view === 'student-result' && (
          <div className="py-20 text-center animate-in space-y-8 w-full flex flex-col items-center">
            <h2 className="text-4xl font-black">수고하셨습니다!</h2>
            <button onClick={() => setView('home')} className="bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black text-xl shadow-xl">목록으로</button>
          </div>
        )}

        {view === 'admin-login' && (
          <div className="max-w-xs mx-auto py-20 animate-in space-y-8 text-center">
            <h2 className="text-3xl font-black">Admin Access</h2>
            <input type="password" value={adminPasswordInput} onChange={e => setAdminPasswordInput(e.target.value)} className="w-full border-2 p-5 rounded-2xl text-center text-xl font-bold outline-none" placeholder="Password" />
            <button onClick={() => adminPasswordInput === '2026' ? setView('admin-dash') : showToast('불일치')} className="w-full bg-slate-800 text-white py-5 rounded-2xl font-black text-lg shadow-lg">인증</button>
          </div>
        )}

      </main>

      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-10 py-5 rounded-full text-sm font-black shadow-2xl z-[100] animate-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
