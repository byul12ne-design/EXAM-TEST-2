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
  arrayUnion
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
interface Exam { id: string; title: string; questions: Question[]; displayCount: number; createdAt: number; mode: 'study' | 'test'; isVisible: boolean; }
interface ExamResult { id: string; examId: string; examTitle: string; studentId: string; studentName: string; score: number; correctCount: number; totalCount: number; answers: Record<number, number>; activeQuestions: Question[]; createdAt: number; mode: 'study' | 'test'; }
interface UserProfile { uid: string; employeeId: string; name: string; role: 'student' | 'admin'; }

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [questionBank, setQuestionBank] = useState<BankQuestion[]>([]);
  const [view, setView] = useState('home');
  const [adminTab, setAdminTab] = useState<'exams' | 'bank' | 'analytics'>('exams');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentExamId, setCurrentExamId] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [empIdInput, setEmpIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState(''); 
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]); 
  const [studentScore, setStudentScore] = useState(0);
  const [lastResult, setLastResult] = useState<ExamResult | null>(null); 
  const [selectedResultDetail, setSelectedResultDetail] = useState<ExamResult | null>(null); 

  const [questionQueue, setQuestionQueue] = useState<{q: Question, originalIndex: number}[]>([]); 
  const [isAnswerChecked, setIsAnswerChecked] = useState(false); 
  const [currentSelectedOption, setCurrentSelectedOption] = useState<number | null>(null); 
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});

  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamMode, setNewExamMode] = useState<'study' | 'test'>('study');
  const [displayCount, setDisplayCount] = useState('');
  const [newQuestions, setNewQuestions] = useState<Question[]>([{ category: '', text: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' }]);

  // 💡 통계 데이터 관리용 상태 추가
  const [resultFilterExamId, setResultFilterExamId] = useState<string>('all');
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);

  const [isStyleLoaded, setIsStyleLoaded] = useState(false);

  useEffect(() => {
    let script = document.getElementById('tailwind-cdn') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
    const handleLoad = () => setIsStyleLoaded(true);
    if ((window as any).tailwind) setIsStyleLoaded(true);
    else script.addEventListener('load', handleLoad);
    return () => script.removeEventListener('load', handleLoad);
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) setUserProfile(snap.data() as UserProfile);
      } else setUserProfile(null);
    });
    const unsubExams = onSnapshot(collection(db, 'exams'), (snap) => setExams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam)).sort((a,b) => b.createdAt - a.createdAt)));
    const unsubResults = onSnapshot(collection(db, 'results'), (snap) => setResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamResult)).sort((a,b) => b.createdAt - a.createdAt)));
    const unsubBank = onSnapshot(collection(db, 'questionBank'), (snap) => setQuestionBank(snap.docs.map(d => ({ id: d.id, ...d.data() } as BankQuestion))));
    return () => { unsubAuth(); unsubExams(); unsubResults(); unsubBank(); };
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
      } else await signInWithEmailAndPassword(auth, pseudoEmail, PWD);
      showToast('반갑습니다!');
    } catch (e) { showToast('사번 확인 또는 최초 등록이 필요합니다.'); }
  };

  const handleAdminLogin = () => {
    if (adminPasswordInput === '2026') { setView('admin-dash'); setAdminPasswordInput(''); } 
    else showToast('비밀번호 불일치');
  };

  const startExam = async () => {
    const exam = exams.find(e => e.id === currentExamId);
    if (!exam || !userProfile) return;
    const selected = [...exam.questions].sort(() => Math.random() - 0.5).slice(0, exam.displayCount || exam.questions.length);
    setActiveQuestions(selected);
    if (exam.mode === 'test') { setTestAnswers({}); } 
    else { setQuestionQueue(selected.map((q, idx) => ({q, originalIndex: idx}))); setIsAnswerChecked(false); }
    setView('student-take');
  };

  const submitExam = async (finalAnswers: Record<number, number>) => {
    const exam = exams.find(e => e.id === currentExamId);
    if (!exam || !userProfile) return;

    const correctCount = activeQuestions.reduce((cnt, q, idx) => finalAnswers[idx] === q.answerIndex ? cnt + 1 : cnt, 0);
    const score = Math.round((correctCount / activeQuestions.length) * 100);
    setStudentScore(score);

    const resultData = {
      examId: currentExamId, examTitle: exam.title, 
      studentId: userProfile.employeeId, studentName: userProfile.name, 
      score, correctCount, totalCount: activeQuestions.length, 
      answers: finalAnswers, activeQuestions, createdAt: Date.now(), mode: exam.mode
    };

    try {
      const docRef = await addDoc(collection(db, 'results'), resultData);
      setLastResult({ id: docRef.id, ...resultData });
    } catch(e) { console.error("결과 저장 오류"); }
    
    setView('student-result');
  };

  const handleSaveExam = async () => {
    if (!newExamTitle.trim()) return showToast('제목을 입력해주세요.');
    const cleaned = newQuestions.filter(q => q.text.trim());
    if (cleaned.length === 0) return showToast('문제를 추가해주세요.');
    const examData = { title: newExamTitle, mode: newExamMode, questions: cleaned, displayCount: parseInt(displayCount) || cleaned.length, isVisible: false, createdAt: Date.now() };
    try {
      if (editingExamId) { await updateDoc(doc(db, 'exams', editingExamId), { ...examData, isVisible: exams.find(e=>e.id===editingExamId)?.isVisible || false }); }
      else { await addDoc(collection(db, 'exams'), examData); }
      setView('admin-dash'); showToast('저장되었습니다! (기본값: 숨김)');
    } catch(e) { showToast('저장 실패'); }
  };

  const toggleVisibility = async (examId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'exams', examId), { isVisible: !currentStatus });
      showToast(currentStatus ? '비공개 처리됨' : '출시 완료!');
    } catch (e) { showToast('오류 발생'); }
  };

  // 💡 통계: 필터링된 결과 데이터
  const filteredResults = useMemo(() => {
    return results.filter(r => resultFilterExamId === 'all' || r.examId === resultFilterExamId);
  }, [results, resultFilterExamId]);

  // 💡 통계: 드롭다운용 시험 목록 생성
  const resultExamOptions = useMemo(() => {
    const map = new Map();
    results.forEach(r => map.set(r.examId, r.examTitle));
    return Array.from(map.entries());
  }, [results]);

  // 💡 통계: 선택 삭제 로직
  const handleDeleteResults = async () => {
    if (selectedResultIds.length === 0) return;
    if (!window.confirm(`선택한 ${selectedResultIds.length}개의 결과를 영구 삭제하시겠습니까?`)) return;
    try {
      const batch = writeBatch(db);
      selectedResultIds.forEach(id => batch.delete(doc(db, 'results', id)));
      await batch.commit();
      setSelectedResultIds([]);
      showToast('✅ 삭제 완료');
    } catch(e) { showToast('❌ 삭제 실패'); }
  };

  // 💡 통계: 엑셀(CSV) 다운로드 로직
  const handleExportCSV = () => {
    if (filteredResults.length === 0) return showToast('출력할 데이터가 없습니다.');
    const headers = ['응시일시', '시험/학습명', '유형', '사번', '이름', '점수(점)'];
    const rows = filteredResults.map(r => [
      new Date(r.createdAt).toLocaleString(),
      `"${r.examTitle}"`, // 쉼표 포함 대비
      r.mode === 'test' ? '실전 퀴즈' : '자율 학습',
      r.studentId,
      r.studentName,
      r.score
    ]);
    
    // \uFEFF 를 추가해야 엑셀에서 한글이 안 깨짐
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n"); 
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `뷔르트_결과통계_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isStyleLoaded) {
    return <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc' }}><p style={{ color: '#94a3b8', fontWeight: 'bold' }}>디자인 준비 중...</p></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col items-center">
      <style>{`
        .force-show { display: block !important; opacity: 1 !important; visibility: visible !important; }
        .animate-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <nav className="w-full p-4 bg-white shadow-sm border-b flex justify-between items-center sticky top-0 z-50">
        <h1 onClick={() => setView('home')} className="cursor-pointer flex items-center gap-2 ml-4">
          <img src={APP_CONFIG.logoImageUrl} alt="Logo" className="h-8" />
          <span className="font-bold text-slate-800 hidden sm:block">{APP_CONFIG.logoText}</span>
        </h1>
        {userProfile && <button onClick={() => signOut(auth)} className="mr-4 text-xs bg-slate-100 px-3 py-2 rounded-lg font-bold">로그아웃</button>}
      </nav>

      <main className="p-4 sm:p-8 max-w-4xl mx-auto w-full flex-1">
        
        {/* [1] 홈 화면 */}
        {view === 'home' && !userProfile && (
          <div className="w-full flex justify-center py-10 animate-in">
            <div className="bg-white w-full max-w-[420px] rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 sm:p-12">
              <h2 className="text-3xl font-black text-center mb-10 text-slate-800">교육 센터</h2>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
                <button onClick={() => setAuthMode('login')} className={`flex-1 py-3.5 rounded-xl font-bold text-sm ${authMode === 'login' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>로그인</button>
                <button onClick={() => setAuthMode('register')} className={`flex-1 py-3.5 rounded-xl font-bold text-sm ${authMode === 'register' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>최초 등록</button>
              </div>
              <div className="space-y-5">
                <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] focus-within:border-blue-600 p-1">
                  <span className="pl-5 pr-1 font-black text-blue-600 text-xl italic">WN</span>
                  <input type="text" value={empIdInput} onChange={e => setEmpIdInput(e.target.value.replace(/[^0-9]/g, ''))} maxLength={8} className="w-full bg-transparent py-4 font-bold text-xl outline-none" placeholder="사번 8자리" />
                </div>
                {authMode === 'register' && <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-[1.25rem] text-lg font-bold text-center outline-none" placeholder="성함 입력" />}
                <button onClick={handleStudentAuth} className="force-show w-full bg-slate-900 text-white font-black py-5 rounded-[1.25rem] shadow-xl text-xl hover:bg-blue-600 transition-colors">교육장 입장하기</button>
              </div>
              <button onClick={() => setView('admin-login')} className="w-full text-slate-300 text-xs mt-10 font-bold hover:text-slate-500">⚙️ 관리자 모드</button>
            </div>
          </div>
        )}

        {/* [2] 학생 대시보드 */}
        {view === 'home' && userProfile && (
          <div className="animate-in space-y-8 w-full">
            <h2 className="text-3xl font-black text-slate-800">환영합니다, {userProfile.name}님! 👋</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
                <h3 className="font-black text-xl text-emerald-600 flex items-center gap-2">📖 자율 학습</h3>
                {exams.filter(e => e.mode === 'study' && e.isVisible).length === 0 && <p className="text-sm text-slate-400">등록된 학습이 없습니다.</p>}
                {exams.filter(e => e.mode === 'study' && e.isVisible).map(ex => (
                  <div key={ex.id} className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center hover:border-emerald-300">
                    <span className="font-bold text-sm text-slate-700">{ex.title}</span>
                    <button onClick={() => { setCurrentExamId(ex.id); setView('student-entry'); }} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black">학습시작</button>
                  </div>
                ))}
              </div>
              <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
                <h3 className="font-black text-xl text-purple-600 flex items-center gap-2">🏆 실전 퀴즈</h3>
                {exams.filter(e => e.mode === 'test' && e.isVisible).length === 0 && <p className="text-sm text-slate-400">등록된 퀴즈가 없습니다.</p>}
                {exams.filter(e => e.mode === 'test' && e.isVisible).map(ex => (
                  <div key={ex.id} className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center hover:border-purple-300">
                    <span className="font-bold text-sm text-slate-700">{ex.title}</span>
                    <button onClick={() => { setCurrentExamId(ex.id); setView('student-entry'); }} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black">응시하기</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* [3] 관리자 대시보드 */}
        {view === 'admin-dash' && (
          <div className="animate-in space-y-6 pb-20">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black">Admin Dash</h2>
              <button onClick={() => setView('home')} className="text-blue-600 font-bold underline">메인으로</button>
            </div>
            
            <div className="flex bg-white p-2 rounded-2xl border w-fit font-bold text-sm shadow-sm">
              <button onClick={() => setAdminTab('exams')} className={`px-5 py-2.5 rounded-xl ${adminTab === 'exams' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>세트 관리</button>
              <button onClick={() => setAdminTab('analytics')} className={`px-5 py-2.5 rounded-xl ${adminTab === 'analytics' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>📊 결과 및 통계</button>
            </div>

            {/* 세트 관리 탭 */}
            {adminTab === 'exams' && (
              <div className="space-y-6">
                <button onClick={() => { setEditingExamId(null); setNewExamTitle(''); setNewQuestions([{ category: '', text: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' }]); setView('admin-create'); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-slate-800">➕ 새 과정 만들기</button>
                <div className="bg-white p-6 rounded-[2rem] border shadow-sm grid gap-4">
                  {exams.map(ex => (
                    <div key={ex.id} className="p-5 bg-slate-50 rounded-2xl border flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <span className={`text-[10px] font-black px-2 py-1 rounded mr-2 ${ex.mode === 'test' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>{ex.mode === 'test' ? '시험' : '학습'}</span>
                        <span className="font-bold text-slate-800">{ex.title}</span>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => toggleVisibility(ex.id, ex.isVisible)} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-colors ${ex.isVisible ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          {ex.isVisible ? '● 학생에게 노출 중' : '○ 숨김 (대기 중)'}
                        </button>
                        <button onClick={() => { setEditingExamId(ex.id); setNewExamTitle(ex.title); setNewExamMode(ex.mode); setNewQuestions(ex.questions); setView('admin-create'); }} className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-xs font-black text-slate-600">수정</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 💡 통계 탭 */}
            {adminTab === 'analytics' && (
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] border shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                  <h3 className="font-black text-xl">📊 제출된 결과 리스트</h3>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleExportCSV} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center gap-1 shadow-sm">
                      📥 엑셀 다운로드
                    </button>
                    <button disabled={selectedResultIds.length === 0} onClick={handleDeleteResults} className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${selectedResultIds.length > 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-400'}`}>
                      선택 삭제 ({selectedResultIds.length})
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-2xl items-center">
                  <span className="font-bold text-sm text-slate-600">과정별 필터:</span>
                  <select value={resultFilterExamId} onChange={e => setResultFilterExamId(e.target.value)} className="p-2 rounded-xl border outline-none font-bold text-sm bg-white flex-1 w-full max-w-xs cursor-pointer">
                    <option value="all">전체 과정 보기</option>
                    {resultExamOptions.map(([id, title]) => <option key={id} value={id as string}>{title as string}</option>)}
                  </select>
                </div>

                <div className="grid gap-3">
                  {filteredResults.length > 0 && (
                    <label className="flex items-center gap-3 p-3 bg-slate-100 rounded-xl cursor-pointer w-fit pr-5">
                      <input type="checkbox" className="w-4 h-4 accent-blue-600 cursor-pointer" checked={selectedResultIds.length === filteredResults.length} onChange={e => {
                        if (e.target.checked) setSelectedResultIds(filteredResults.map(r => r.id));
                        else setSelectedResultIds([]);
                      }}/>
                      <span className="text-xs font-bold text-slate-600">전체 선택</span>
                    </label>
                  )}
                  {filteredResults.map(r => (
                    <div key={r.id} className="flex gap-3 items-center">
                      <input type="checkbox" className="w-5 h-5 accent-blue-600 cursor-pointer shrink-0" checked={selectedResultIds.includes(r.id)} onChange={e => {
                        if (e.target.checked) setSelectedResultIds([...selectedResultIds, r.id]);
                        else setSelectedResultIds(selectedResultIds.filter(id => id !== r.id));
                      }} />
                      <div className="flex-1 p-4 bg-white border rounded-2xl flex justify-between items-center cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setSelectedResultDetail(r)}>
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-black ${r.mode === 'test' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.mode === 'test' ? '퀴즈' : '학습'}</span>
                            {r.examTitle}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{r.studentName} ({r.studentId}) | {new Date(r.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="text-xl font-black text-blue-600">{r.score}점</div>
                      </div>
                    </div>
                  ))}
                  {filteredResults.length === 0 && <p className="text-center py-10 text-slate-400 font-bold">결과 데이터가 없습니다.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'student-entry' && (
          <div className="py-20 text-center animate-in w-full flex flex-col items-center">
            <h2 className="text-4xl font-black mb-8">{exams.find(e => e.id === currentExamId)?.title}</h2>
            <button onClick={startExam} className="bg-blue-600 text-white px-16 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all">과정 시작하기 👉</button>
          </div>
        )}

        {view === 'student-take' && (
          <div className="max-w-2xl mx-auto w-full animate-in pb-20">
            {exams.find(e => e.id === currentExamId)?.mode === 'study' && questionQueue.length > 0 && (
               <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border border-slate-100 space-y-8">
                 <h2 className="text-2xl font-black leading-tight text-slate-800">{questionQueue[0].q.text}</h2>
                 <div className="grid gap-4">
                   {questionQueue[0].q.options.map((opt, i) => (
                     <button key={i} onClick={() => { if(!isAnswerChecked) { setCurrentSelectedOption(i); setIsAnswerChecked(true); } }} className={`text-left p-6 rounded-2xl border-2 font-black transition-all ${isAnswerChecked ? (i === questionQueue[0].q.answerIndex ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : (i === currentSelectedOption ? 'border-red-500 bg-red-50 text-red-600 shadow-inner' : 'opacity-30 border-slate-50')) : 'hover:border-blue-400 hover:bg-blue-50 border-slate-100'}`}>
                       {opt}
                     </button>
                   ))}
                 </div>
                 {isAnswerChecked && (
                   <div className="space-y-4 animate-in">
                     {questionQueue[0].q.explanation && <div className="p-5 bg-slate-50 rounded-2xl border text-sm text-slate-600 leading-relaxed font-medium">💡 해설: {questionQueue[0].q.explanation}</div>}
                     <button onClick={() => {
                        const correct = currentSelectedOption === questionQueue[0].q.answerIndex;
                        let next = [...questionQueue]; const item = next.shift();
                        if(!correct && item) next.push(item);
                        setQuestionQueue(next); setIsAnswerChecked(false); setCurrentSelectedOption(null);
                        if(next.length === 0) submitExam(firstAttemptAnswers);
                     }} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">다음 문제로</button>
                   </div>
                 )}
               </div>
            )}
            
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

        {/* 💡 [결과지 화면] 학생 제출 직후 & 관리자 상세조회 모달 */}
        {(view === 'student-result' || selectedResultDetail) && (
          <div className={`animate-in space-y-8 w-full max-w-2xl mx-auto pb-20 ${selectedResultDetail ? 'fixed inset-0 bg-slate-50 z-[100] p-6 sm:p-10 overflow-y-auto' : 'py-10'}`}>
            <div className="text-center mb-10">
              {view === 'student-result' && <h2 className="text-4xl font-black text-slate-800 mb-6">수고하셨습니다!</h2>}
              {selectedResultDetail && <h2 className="text-2xl font-black text-slate-800 mb-4">{selectedResultDetail.studentName}님의 결과지</h2>}
              <div className="text-7xl font-black text-blue-600 drop-shadow-md">{selectedResultDetail ? selectedResultDetail.score : studentScore}<span className="text-3xl text-slate-400 ml-2">점</span></div>
            </div>

            <div className="space-y-6">
              <h3 className="font-black text-xl border-b-2 pb-2 border-slate-200">📝 상세 결과 및 해설</h3>
              {(selectedResultDetail || lastResult)?.activeQuestions.map((q, idx) => {
                const ansObj = selectedResultDetail ? selectedResultDetail.answers : lastResult?.answers;
                const studentAns = ansObj?.[idx];
                const isCorrect = studentAns === q.answerIndex;
                return (
                  <div key={idx} className={`p-6 rounded-[2rem] border-2 shadow-sm ${isCorrect ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                    <p className="font-bold text-slate-800 mb-4 text-lg">Q{idx+1}. {q.text}</p>
                    <div className="grid gap-2 mb-4">
                      {q.options.map((opt, oi) => {
                        let style = "bg-white border-slate-100 opacity-60";
                        if (oi === q.answerIndex) style = "bg-emerald-100 border-emerald-500 font-black text-emerald-800 ring-2 ring-emerald-200 opacity-100";
                        else if (oi === studentAns) style = "bg-red-100 border-red-500 font-bold text-red-800 line-through opacity-100";
                        return (
                          <div key={oi} className={`p-4 rounded-xl border ${style} flex justify-between items-center`}>
                            <span>{opt}</span>
                            {oi === q.answerIndex && <span>✅ 정답</span>}
                            {oi === studentAns && oi !== q.answerIndex && <span>❌ 내 답안</span>}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div className="bg-white/80 p-5 rounded-2xl border text-sm font-medium text-slate-700 shadow-inner">
                        <span className="font-black text-blue-600 mb-1 block">💡 해설</span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {view === 'student-result' ? (
               <button onClick={() => { setView('home'); setLastResult(null); window.history.replaceState({}, '', window.location.pathname); }} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl mt-10">목록으로 돌아가기</button>
            ) : (
               <button onClick={() => setSelectedResultDetail(null)} className="w-full bg-slate-300 text-slate-700 py-5 rounded-[2rem] font-black text-xl mt-10 hover:bg-slate-400">닫기</button>
            )}
          </div>
        )}

        {/* 폼 생성 뷰 */}
        {view === 'admin-create' && (
          <div className="animate-in space-y-6 pb-20">
            <input value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} className="text-3xl font-black bg-transparent outline-none w-full border-b-2 border-slate-200 focus:border-blue-500 p-2" placeholder="과정 제목 입력" />
            <div className="flex gap-4">
              <button onClick={() => setNewExamMode('study')} className={`flex-1 py-3 rounded-xl font-bold border-2 ${newExamMode === 'study' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-100 text-slate-400'}`}>학습 모드</button>
              <button onClick={() => setNewExamMode('test')} className={`flex-1 py-3 rounded-xl font-bold border-2 ${newExamMode === 'test' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-100 text-slate-400'}`}>시험 모드</button>
            </div>
            <div className="space-y-6">
              {newQuestions.map((q, i) => (
                <div key={i} className="bg-white p-6 sm:p-8 rounded-[2rem] border shadow-sm relative">
                  <span className="text-sm font-black text-blue-500 mb-4 block">Q{i+1}.</span>
                  <textarea value={q.text} onChange={e => { const n = [...newQuestions]; n[i].text = e.target.value; setNewQuestions(n); }} className="w-full bg-slate-50 border-2 p-4 rounded-2xl font-bold mb-4 outline-none focus:border-blue-400" placeholder="문제 내용을 입력하세요" rows={2}/>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={`flex items-center gap-3 border-2 p-3 rounded-2xl ${q.answerIndex === oi ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}>
                        <input type="radio" checked={q.answerIndex === oi} onChange={() => { const n = [...newQuestions]; n[i].answerIndex = oi; setNewQuestions(n); }} className="w-5 h-5 accent-emerald-500 cursor-pointer"/>
                        <input value={opt} onChange={e => { const n = [...newQuestions]; n[i].options[oi] = e.target.value; setNewQuestions(n); }} className="w-full bg-transparent outline-none font-medium" placeholder={`보기 ${oi+1}`} />
                      </div>
                    ))}
                  </div>
                  <textarea value={q.explanation || ''} onChange={e => { const n = [...newQuestions]; n[i].explanation = e.target.value; setNewQuestions(n); }} className="w-full bg-blue-50/50 border p-4 rounded-2xl text-sm font-medium outline-none focus:border-blue-400" placeholder="💡 문제 해설을 입력하세요 (제출 후 결과지에 노출됩니다)" rows={2}/>
                  <button onClick={() => setNewQuestions(newQuestions.filter((_, idx) => idx !== i))} className="absolute top-6 right-6 bg-red-50 text-red-500 px-3 py-1 rounded-lg text-xs font-bold">삭제</button>
                </div>
              ))}
              <button onClick={() => setNewQuestions([...newQuestions, { text: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' }])} className="w-full py-5 border-2 border-dashed border-slate-300 rounded-[2rem] text-slate-500 font-bold hover:bg-slate-50">+ 새로운 빈 문항 추가</button>
            </div>
            <button onClick={handleSaveExam} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl sticky bottom-6 z-20 hover:bg-slate-800 transition-colors">과정 저장하기 (기본 비공개 상태로 저장됨)</button>
          </div>
        )}

        {view === 'admin-login' && (
          <div className="max-w-xs mx-auto py-20 text-center animate-in space-y-8">
            <h2 className="text-3xl font-black">Admin Access</h2>
            <input type="password" value={adminPasswordInput} onChange={e => setAdminPasswordInput(e.target.value)} className="w-full border-2 p-5 rounded-2xl text-center text-xl font-bold outline-none" placeholder="Password" />
            <button onClick={handleAdminLogin} className="w-full bg-slate-800 text-white py-5 rounded-2xl font-black text-lg shadow-lg">인증</button>
          </div>
        )}

      </main>

      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-10 py-5 rounded-full text-sm font-black shadow-2xl z-[100] animate-in flex items-center gap-3">
          <span className="text-emerald-400">●</span> {toastMessage}
        </div>
      )}
    </div>
  );
}
