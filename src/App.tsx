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
// 🛠️ 앱 기본 설정
// ==========================================
const APP_CONFIG = {
  logoText: "뷔르트 교육 센터",
  logoImageUrl: "https://eshop.wuerth.de/is-bin/intershop.static/WFS/1401-B1-Site/-/en_US/webkit_bootstrap/dist/img/wuerth-logo.svg",
};

// --- Firebase Config ---
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

// --- 인터페이스 정의 ---
interface Question {
  category?: string;
  text: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

interface BankQuestion extends Question {
  id: string;
  createdAt: number;
}

interface Exam {
  id: string;
  title: string;
  notice?: string;
  questions: Question[];
  displayCount: number;
  createdAt: number;
  mode: 'study' | 'test';
  requireName: boolean;
  recordScores?: boolean; 
}

interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string; 
  studentName: string;
  score: number;
  correctCount: number;
  totalCount: number;
  answers: Record<number, number>;
  activeQuestions: Question[]; 
  createdAt: number;
  mode: 'study' | 'test';
}

interface UserProfile {
  uid: string;
  employeeId: string;
  name: string;
  role: 'student' | 'admin';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [questionBank, setQuestionBank] = useState<BankQuestion[]>([]);
  
  const [view, setView] = useState('home');
  const [adminTab, setAdminTab] = useState<'exams' | 'analytics' | 'bank'>('exams');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [currentExamId, setCurrentExamId] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [empIdInput, setEmpIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState(''); 

  const [selectedAnalyticsExamId, setSelectedAnalyticsExamId] = useState<string>('');
  const [selectedResultDetail, setSelectedResultDetail] = useState<ExamResult | null>(null);

  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]); 
  const [firstAttemptAnswers, setFirstAttemptAnswers] = useState<Record<number, number>>({}); 
  const [studentScore, setStudentScore] = useState(0);

  const [questionQueue, setQuestionQueue] = useState<{q: Question, originalIndex: number}[]>([]); 
  const [isAnswerChecked, setIsAnswerChecked] = useState(false); 
  const [currentSelectedOption, setCurrentSelectedOption] = useState<number | null>(null); 
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});

  // 폼 상태
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [customExamId, setCustomExamId] = useState(''); 
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamNotice, setNewExamNotice] = useState('');
  const [newExamMode, setNewExamMode] = useState<'study' | 'test'>('study');
  const [displayCount, setDisplayCount] = useState('');
  const [requireName, setRequireName] = useState(true);
  const [recordScores, setRecordScores] = useState(true); 
  
  const [newQuestions, setNewQuestions] = useState<Question[]>([
    { category: '', text: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' }
  ]);

  // 문제 저장고 상태
  const [newBankQuestion, setNewBankQuestion] = useState<Question>({ category: '', text: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' });
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [bankCategoryFilter, setBankCategoryFilter] = useState<string>('all');

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
    const params = new URLSearchParams(window.location.search);
    const linkExamId = params.get('examId');
    if (linkExamId) {
      setCurrentExamId(linkExamId);
      setView('home'); 
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setUserProfile(docSnap.data() as UserProfile);
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
      const loadedExams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam)).sort((a, b) => b.createdAt - a.createdAt);
      setExams(loadedExams);
      if (loadedExams.length > 0 && !selectedAnalyticsExamId) setSelectedAnalyticsExamId(loadedExams[0].id);
    });
    const unsubResults = onSnapshot(collection(db, 'results'), (snapshot) => {
      setResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult)).sort((a, b) => b.createdAt - a.createdAt));
    });
    const unsubBank = onSnapshot(query(collection(db, 'questionBank'), orderBy('createdAt', 'desc')), (snapshot) => {
      setQuestionBank(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankQuestion)));
    });
    return () => { unsubExams(); unsubResults(); unsubBank(); };
  }, [user, selectedAnalyticsExamId]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (examId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?examId=${examId}`;
    navigator.clipboard.writeText(url);
    showToast('링크가 복사되었습니다!');
  };

  // --- 💡 CSV 파싱 및 대량 업로드 로직 원상 복구 ---
  const parseCSV = (text: string) => {
    const rows = [];
    const lines = text.split(/\r?\n/);
    for (let line of lines) {
      if (!line.trim()) continue;
      const cols = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          cols.push(cur.replace(/^"|"$/g, '').trim());
          cur = '';
        } else cur += char;
      }
      cols.push(cur.replace(/^"|"$/g, '').trim());
      rows.push(cols);
    }
    // 컬럼: 문제, 보기1, 보기2, 보기3, 보기4, 정답번호, 해설, 카테고리
    return rows.map(cols => ({
      text: cols[0] || '', 
      options: [cols[1] || '', cols[2] || '', cols[3] || '', cols[4] || ''], 
      answerIndex: parseInt(cols[5]) - 1 || 0,
      explanation: cols[6] || '',
      category: cols[7] || '미분류'
    })).filter(q => q.text && q.options.length >= 4 && !isNaN(q.answerIndex));
  };

  const handleBankFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const parsedFromFile = parseCSV(evt.target?.result as string);
      if (parsedFromFile.length > 0) { 
        try {
          const batch = writeBatch(db);
          parsedFromFile.forEach(q => {
            const docRef = doc(collection(db, 'questionBank'));
            batch.set(docRef, { ...q, createdAt: Date.now() });
          });
          await batch.commit();
          showToast(`저장고에 ${parsedFromFile.length}문제가 등록되었습니다!`); 
        } catch(error) {
          showToast('업로드 중 오류가 발생했습니다.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleExamFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const parsedFromFile = parseCSV(evt.target?.result as string);
      if (parsedFromFile.length > 0) { 
        const existingNotEmpty = newQuestions.filter(q => q.text.trim() !== '');
        setNewQuestions([...existingNotEmpty, ...parsedFromFile]); 
        showToast(`${parsedFromFile.length}문제가 세트에 추가되었습니다!`); 
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };
  // ----------------------------------------------------

  const filteredBank = useMemo(() => {
    return questionBank.filter(q => bankCategoryFilter === 'all' || (q.category || '미분류') === bankCategoryFilter);
  }, [questionBank, bankCategoryFilter]);

  const categories = useMemo(() => {
    return Array.from(new Set(questionBank.map(q => q.category || '미분류')));
  }, [questionBank]);

  const isAllFilteredSelected = filteredBank.length > 0 && filteredBank.every(q => selectedBankIds.includes(q.id));
  
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const idsToAdd = filteredBank.map(q => q.id);
      setSelectedBankIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
    } else {
      const idsToRemove = filteredBank.map(q => q.id);
      setSelectedBankIds(prev => prev.filter(id => !idsToRemove.includes(id)));
    }
  };

  const handleStudentAuth = async () => {
    if (empIdInput.length !== 8) return showToast('사번 8자리 숫자를 입력해주세요.');
    
    const finalEmpId = `WN${empIdInput}`;
    const pseudoEmail = `${finalEmpId.toLowerCase()}@wuerth.exam`;
    const HIDDEN_SYSTEM_PASSWORD = "WuerthExamSecretPassword2026!";

    try {
      let currentUser;
      if (authMode === 'register') {
        if (!nameInput.trim()) return showToast('이름을 입력해주세요.');
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, pseudoEmail, HIDDEN_SYSTEM_PASSWORD);
          currentUser = userCredential.user;
          await setDoc(doc(db, 'users', currentUser.uid), { uid: currentUser.uid, employeeId: finalEmpId, name: nameInput.trim(), role: 'student' });
          showToast('가입이 완료되었습니다!');
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
             const userCredential = await signInWithEmailAndPassword(auth, pseudoEmail, HIDDEN_SYSTEM_PASSWORD);
             currentUser = userCredential.user;
             await setDoc(doc(db, 'users', currentUser.uid), { uid: currentUser.uid, employeeId: finalEmpId, name: nameInput.trim(), role: 'student' }, { merge: true });
             showToast('기존 등록 정보를 연동하여 접속했습니다!');
          } else {
             throw err;
          }
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, pseudoEmail, HIDDEN_SYSTEM_PASSWORD);
        currentUser = userCredential.user;
        const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (docSnap.exists()) {
          showToast('로그인 성공!');
        } else {
          return showToast('이름 정보가 없습니다. 최초 등록을 진행해주세요.');
        }
      }

      setUser(currentUser);
      const profileSnap = await getDoc(doc(db, 'users', currentUser.uid));
      if (profileSnap.exists()) setUserProfile(profileSnap.data() as UserProfile);
      
      setEmpIdInput(''); setNameInput('');
      if (currentExamId) setView('student-entry'); 
    } catch (error: any) {
      showToast('사번이 등록되지 않았거나 오류가 발생했습니다.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    setView('home');
    showToast('로그아웃 되었습니다.');
  };

  const handleAdminLogin = () => {
    if (adminPasswordInput === '2026') { 
      setView('admin-dash'); setAdminPasswordInput(''); 
      window.history.replaceState({}, '', window.location.pathname);
    } else showToast('비밀번호 불일치');
  };

  const resetAdminForm = () => {
    setEditingExamId(null); setCustomExamId(''); setNewExamTitle(''); 
    setNewExamNotice(''); setNewExamMode('study'); setRequireName(true);
    setRecordScores(true); setDisplayCount('');
    setNewQuestions([{ category: '', text: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' }]); 
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExamId(exam.id);
    setCustomExamId(exam.id);
    setNewExamTitle(exam.title);
    setNewExamNotice(exam.notice || '');
    setNewExamMode(exam.mode || 'study');
    setRequireName(exam.requireName !== false);
    setRecordScores(exam.recordScores !== false); 
    setNewQuestions(JSON.parse(JSON.stringify(exam.questions)));
    setDisplayCount(exam.displayCount?.toString() || '');
    setView('admin-create');
  };

  const handleSaveExam = async () => {
    if (!newExamTitle.trim()) return showToast('제목을 입력해주세요.');
    let finalId = customExamId.trim().replace(/\s+/g, '-'); 
    if (!finalId) finalId = editingExamId || Math.random().toString(36).substring(2, 8).toUpperCase();

    const cleanedQuestions = newQuestions.filter(q => q.text.trim() !== '').map(q => ({...q, category: q.category || '미분류', explanation: q.explanation || ''}));
    if (cleanedQuestions.length === 0) return showToast('최소 1개 이상의 문제를 등록해주세요.');
    
    const examData = { 
      title: newExamTitle, notice: newExamNotice, mode: newExamMode,
      requireName, recordScores, questions: cleanedQuestions, 
      displayCount: parseInt(displayCount) || cleanedQuestions.length, 
      createdAt: Date.now() 
    };

    try {
      if (editingExamId && editingExamId !== finalId) {
        await deleteDoc(doc(db, 'exams', editingExamId));
      }
      await setDoc(doc(db, 'exams', finalId), examData);
      setView('admin-dash'); 
      showToast('✅ 성공적으로 저장되었습니다.');
      resetAdminForm();
    } catch (e) { 
      console.error(e);
      showToast('❌ 저장 실패! 권한을 확인하세요.'); 
    }
  };

  const handleSaveBankQuestion = async () => {
    if (!newBankQuestion.text.trim()) return showToast('문제를 입력해주세요.');
    try {
      await addDoc(collection(db, 'questionBank'), { ...newBankQuestion, category: newBankQuestion.category || '미분류', createdAt: Date.now() });
      setNewBankQuestion({ category: newBankQuestion.category, text: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' });
      showToast('✅ 문제 저장고에 추가되었습니다.');
    } catch(e) { 
      console.error(e);
      showToast('❌ 저장 실패!'); 
    }
  };

  const handleCreateQuizFromBank = () => {
    const selected = questionBank.filter(q => selectedBankIds.includes(q.id));
    if (selected.length === 0) return showToast('선택된 문제가 없습니다.');
    
    resetAdminForm();
    setNewQuestions(selected.map(({ id, createdAt, ...rest }) => rest));
    setView('admin-create');
    setSelectedBankIds([]); 
    setIsBankModalOpen(false);
    showToast(`${selected.length}개 문제로 세트를 구성합니다.`);
  };

  const handleDeleteBankQuestions = async () => {
    if (selectedBankIds.length === 0) return;
    if (!window.confirm(`선택한 ${selectedBankIds.length}개의 문제를 완전히 삭제하시겠습니까?`)) return;
    
    try {
      const batch = writeBatch(db);
      selectedBankIds.forEach(id => batch.delete(doc(db, 'questionBank', id)));
      await batch.commit();
      setSelectedBankIds([]); 
      showToast('✅ 삭제되었습니다.');
    } catch (error) {
      console.error("삭제 에러:", error);
      showToast('❌ 삭제 실패! Firebase 규칙을 확인해주세요.');
    }
  };

  const startExam = async () => {
    const exam = exams.find(e => e.id === currentExamId);
    if (!exam || !userProfile) return;

    let masteredQuestions: string[] = [];
    if (exam.mode === 'study') {
      const progressDoc = await getDoc(doc(db, 'progress', `${user.uid}_${currentExamId}`));
      if (progressDoc.exists()) masteredQuestions = progressDoc.data().masteredQuestionTexts || [];
    }

    const pool = exam.questions.filter(q => !masteredQuestions.includes(q.text));
    if (pool.length === 0) {
      showToast('이미 모든 문제를 마스터하셨습니다!');
      setStudentScore(100); setView('student-result'); return;
    }

    const finalCount = parseInt(exam.displayCount?.toString() || pool.length.toString());
    const selectedQuestions = pool.sort(() => Math.random() - 0.5).slice(0, finalCount);
    
    setActiveQuestions(selectedQuestions);
    setFirstAttemptAnswers({});
    if (exam.mode === 'test') {
      setTestAnswers({});
    } else {
      setQuestionQueue(selectedQuestions.map((q, idx) => ({q, originalIndex: idx})));
      setIsAnswerChecked(false); setCurrentSelectedOption(null);
    }
    setView('student-take');
  };

  const handleStudyNextQuestion = () => {
    if (questionQueue.length === 0) return;
    const currentItem = questionQueue[0];
    const isCorrect = currentSelectedOption === currentItem.q.answerIndex;
    let nextQueue = [...questionQueue];
    const shiftedItem = nextQueue.shift();

    if (!isCorrect && shiftedItem) nextQueue.push(shiftedItem);

    setQuestionQueue(nextQueue);
    setIsAnswerChecked(false);
    setCurrentSelectedOption(null);

    if (nextQueue.length === 0) submitExam(firstAttemptAnswers);
  };

  const submitExam = async (finalAnswers: Record<number, number>) => {
    const exam = exams.find(e => e.id === currentExamId);
    if (!exam || !userProfile) return;

    let newlyMasteredTexts: string[] = [];
    const correctCount = activeQuestions.reduce((count, q, idx) => {
        if (finalAnswers[idx] === q.answerIndex) {
          if (exam.mode === 'study') newlyMasteredTexts.push(q.text); 
          return count + 1;
        }
        return count;
    }, 0);

    const score = Math.round((correctCount / activeQuestions.length) * 100);
    setStudentScore(score);
    
    if (exam.recordScores !== false) {
      await addDoc(collection(db, 'results'), {
        examId: currentExamId, examTitle: exam.title, 
        studentId: userProfile.employeeId, studentName: userProfile.name, 
        score, correctCount, totalCount: activeQuestions.length, 
        answers: finalAnswers, activeQuestions, createdAt: Date.now(), mode: exam.mode
      });
    }

    if (exam.mode === 'study' && newlyMasteredTexts.length > 0) {
      await setDoc(doc(db, 'progress', `${userProfile.uid}_${currentExamId}`), {
        masteredQuestionTexts: arrayUnion(...newlyMasteredTexts), updatedAt: Date.now()
      }, { merge: true });
    }
    setView('student-result');
  };

  return (
    <>
      <style>{`body, html { background-color: #f8fafc !important; color-scheme: light; }`}</style>
      <div className="min-h-[100dvh] font-sans bg-slate-50 text-slate-900 flex flex-col relative">
        <nav className="p-4 bg-white/90 backdrop-blur-md border-b flex justify-between items-center sticky top-0 z-50 shadow-sm">
          <h1 onClick={() => setView('home')} className="cursor-pointer flex items-center gap-2">
            <img src={APP_CONFIG.logoImageUrl} alt="Logo" className="h-8 sm:h-10 object-contain" />
            <span className="font-bold text-slate-800 hidden sm:inline ml-2">{APP_CONFIG.logoText}</span>
          </h1>
          {userProfile && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-600">{userProfile.name} 님</span>
              <button onClick={handleLogout} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 px-3 py-1.5 rounded-lg font-bold transition-colors">로그아웃</button>
            </div>
          )}
        </nav>

        <main className="p-4 sm:p-6 max-w-5xl mx-auto w-full flex-1 flex flex-col">
          
          {view === 'home' && !userProfile && (
            <div className="flex flex-col items-center gap-12 py-10 sm:py-20 text-center flex-1 justify-center">
              <h2 className="text-3xl sm:text-5xl font-black text-slate-800">뷔르트 교육 센터</h2>
              
              <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-sm border w-full max-w-md space-y-6">
                <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
                  <button onClick={() => setAuthMode('login')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${authMode === 'login' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>로그인</button>
                  <button onClick={() => setAuthMode('register')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${authMode === 'register' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>최초 등록</button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center bg-slate-50 border rounded-2xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all overflow-hidden">
                    <span className="pl-5 pr-2 font-black text-slate-400">WN</span>
                    <input 
                      type="text" 
                      value={empIdInput} 
                      onChange={e => setEmpIdInput(e.target.value.replace(/[^0-9]/g, ''))} 
                      maxLength={8}
                      className="w-full bg-transparent p-4 pl-1 text-sm outline-none font-bold placeholder:font-normal text-slate-700" 
                      placeholder="숫자 8자리 입력"
                    />
                  </div>
                  {authMode === 'register' && (
                    <input 
                      type="text" 
                      value={nameInput} 
                      onChange={e => setNameInput(e.target.value)} 
                      placeholder="실명 입력 (예: 홍길동)" 
                      className="w-full bg-slate-50 border p-4 rounded-2xl text-sm outline-none focus:border-blue-500 transition-colors text-center font-bold"
                    />
                  )}
                  <button onClick={handleStudentAuth} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-md hover:bg-blue-700 transition-colors mt-2">
                    {authMode === 'login' ? '입장하기' : '등록하고 입장하기'}
                  </button>
                </div>
              </div>
              <button onClick={() => setView('admin-login')} className="text-slate-300 hover:text-slate-500 text-xs font-bold transition-colors">⚙️ 관리자 접속</button>
            </div>
          )}

          {view === 'home' && userProfile && (
            <div className="py-6 sm:py-10 animate-fade-in-up w-full">
              <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-800 break-keep">환영합니다, {userProfile.name}님! 👋</h2>
                  <p className="text-slate-500 mt-2 font-medium">원하시는 교육 메뉴를 선택해주세요.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-2xl">📖</div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800">자율 학습하기</h3>
                      <p className="text-xs font-bold text-slate-400">오답을 반복하며 익히는 훈련 과정</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {exams.filter(e => e.mode === 'study').length === 0 ? (
                       <p className="text-center text-slate-400 py-8 text-sm">현재 배정된 학습 과정이 없습니다.</p>
                    ) : (
                      exams.filter(e => e.mode === 'study').map(exam => (
                        <div key={exam.id} className="p-4 bg-slate-50 rounded-2xl border hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <h4 className="font-bold text-slate-800">{exam.title}</h4>
                            <p className="text-[10px] text-slate-500 mt-1">총 {exam.displayCount || exam.questions.length}문항</p>
                          </div>
                          <button onClick={() => { setCurrentExamId(exam.id); setView('student-entry'); }} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm whitespace-nowrap">학습 시작 👉</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl">🏆</div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800">실전 퀴즈 응시</h3>
                      <p className="text-xs font-bold text-slate-400">한 번에 풀고 제출하는 실전 과정</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {exams.filter(e => e.mode === 'test').length === 0 ? (
                       <p className="text-center text-slate-400 py-8 text-sm">현재 배정된 퀴즈가 없습니다.</p>
                    ) : (
                      exams.filter(e => e.mode === 'test').map(exam => (
                        <div key={exam.id} className="p-4 bg-slate-50 rounded-2xl border hover:border-purple-300 hover:bg-purple-50/30 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <h4 className="font-bold text-slate-800">{exam.title}</h4>
                            <p className="text-[10px] text-slate-500 mt-1">총 {exam.displayCount || exam.questions.length}문항</p>
                          </div>
                          <button onClick={() => { setCurrentExamId(exam.id); setView('student-entry'); }} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm whitespace-nowrap">퀴즈 응시 🎯</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'admin-login' && (
            <div className="max-w-xs mx-auto py-20">
              <h2 className="text-2xl font-black text-center mb-8">관리자 접속</h2>
              <input type="password" value={adminPasswordInput} onChange={e => setAdminPasswordInput(e.target.value)} className="w-full border p-4 rounded-2xl mb-4 text-center" placeholder="비밀번호"/>
              <button onClick={handleAdminLogin} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold">인증하기</button>
              <button onClick={() => setView('home')} className="w-full text-slate-400 text-sm mt-4">뒤로가기</button>
            </div>
          )}

          {view === 'admin-dash' && (
            <div className="space-y-6">
              <div className="flex bg-white p-2 rounded-2xl border w-fit shadow-sm">
                <button onClick={() => setAdminTab('exams')} className={`px-5 py-2 rounded-xl text-sm font-bold ${adminTab === 'exams' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>학습/퀴즈 목록</button>
                <button onClick={() => setAdminTab('bank')} className={`px-5 py-2 rounded-xl text-sm font-bold ${adminTab === 'bank' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>🗃️ 문제 저장고</button>
              </div>

              {adminTab === 'bank' && (
                <div className="space-y-6">
                  {/* 단건 등록 영역 */}
                  <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-blue-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-blue-700">새로운 문제 저장고에 보관하기</h3>
                      <label className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold cursor-pointer hover:bg-green-700 transition-all text-xs shadow-md whitespace-nowrap">
                        <span>📊</span> CSV 엑셀 대량 업로드<input type="file" accept=".csv" className="hidden" onChange={handleBankFileUpload} />
                      </label>
                    </div>
                    <input value={newBankQuestion.category} onChange={e => setNewBankQuestion({...newBankQuestion, category: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-sm outline-none focus:border-blue-400" placeholder="카테고리 분류 (예: 화학제품, 공구, 엔진오일)"/>
                    <textarea value={newBankQuestion.text} onChange={e => setNewBankQuestion({...newBankQuestion, text: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-400" placeholder="문제 내용을 입력하세요" rows={2}/>
                    <div className="grid grid-cols-2 gap-3">
                      {newBankQuestion.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="radio" name="bankAnswer" checked={newBankQuestion.answerIndex === i} onChange={() => setNewBankQuestion({...newBankQuestion, answerIndex: i})} className="accent-blue-600 w-4 h-4"/>
                          <input value={opt} onChange={e => { const opts = [...newBankQuestion.options]; opts[i] = e.target.value; setNewBankQuestion({...newBankQuestion, options: opts}); }} className="w-full border p-2 rounded-lg text-xs" placeholder={`보기 ${i+1}`}/>
                        </div>
                      ))}
                    </div>
                    <textarea value={newBankQuestion.explanation} onChange={e => setNewBankQuestion({...newBankQuestion, explanation: e.target.value})} className="w-full bg-slate-50 border p-2 rounded-xl text-xs outline-none" placeholder="오답 해설 (선택)"/>
                    <button onClick={handleSaveBankQuestion} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold shadow-sm">저장고에 넣기</button>
                  </div>

                  {/* 목록 필터 영역 */}
                  <div className="bg-slate-100 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <span className="text-sm font-bold text-slate-600">분류 필터:</span>
                      <select value={bankCategoryFilter} onChange={e => setBankCategoryFilter(e.target.value)} className="p-2 rounded-xl border outline-none font-bold text-sm bg-white flex-1 sm:w-40">
                        <option value="all">전체보기</option>
                        {Array.from(new Set(questionBank.map(q => q.category || '미분류'))).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      <button disabled={selectedBankIds.length === 0} onClick={handleCreateQuizFromBank} className={`px-4 py-2.5 rounded-xl text-sm font-bold flex-1 sm:flex-none transition-colors ${selectedBankIds.length > 0 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-400'}`}>
                        선택 문제로 세트 만들기
                      </button>
                      <button disabled={selectedBankIds.length === 0} onClick={handleDeleteBankQuestions} className={`px-4 py-2.5 rounded-xl text-sm font-bold flex-1 sm:flex-none transition-colors ${selectedBankIds.length > 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-200 text-slate-400'}`}>
                        선택 삭제 ({selectedBankIds.length})
                      </button>
                    </div>
                  </div>

                  {/* 목록 표시 영역 */}
                  <div className="grid gap-3">
                    {filteredBank.length > 0 && (
                      <label className="bg-slate-200 p-4 rounded-2xl flex gap-4 cursor-pointer hover:bg-slate-300 transition-all items-center shadow-sm">
                        <input 
                          type="checkbox" 
                          checked={isAllFilteredSelected} 
                          onChange={(e) => handleToggleSelectAll(e.target.checked)} 
                          className="accent-blue-600 w-5 h-5 cursor-pointer" 
                        />
                        <span className="font-black text-slate-800 text-sm">현재 필터링된 {filteredBank.length}개 문제 전체 선택</span>
                      </label>
                    )}

                    {filteredBank.map(q => (
                      <label key={q.id} className={`bg-white p-5 rounded-2xl border flex gap-4 cursor-pointer transition-all items-start ${selectedBankIds.includes(q.id) ? 'border-blue-400 ring-2 ring-blue-50' : 'hover:border-blue-300'}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedBankIds.includes(q.id)} 
                          onChange={e => {
                            if(e.target.checked) {
                              setSelectedBankIds(prev => Array.from(new Set([...prev, q.id])));
                            } else {
                              setSelectedBankIds(prev => prev.filter(id => id !== q.id));
                            }
                          }} 
                          className="accent-blue-600 w-5 h-5 mt-1 cursor-pointer" 
                        />
                        <div>
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-1 rounded font-black uppercase mb-2 inline-block">{q.category || '미분류'}</span>
                          <p className="font-bold text-slate-800 leading-snug">{q.text}</p>
                          <p className="text-xs text-slate-500 mt-2 bg-slate-50 inline-block px-2 py-1 rounded border">정답: {q.options[q.answerIndex]}</p>
                        </div>
                      </label>
                    ))}
                    {questionBank.length === 0 && <p className="text-center py-10 text-slate-400">저장고가 비어있습니다.</p>}
                  </div>
                </div>
              )}

              {adminTab === 'exams' && (
                <div className="space-y-4">
                  <button onClick={() => { resetAdminForm(); setView('admin-create'); }} className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md">➕ 새로운 학습/퀴즈 세트 만들기</button>
                  <div className="grid gap-3">
                    {exams.map(ex => (
                      <div key={ex.id} className="bg-white p-6 rounded-2xl border flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div>
                          <div className="flex gap-2 items-center mb-2">
                            <span className={`px-2 py-1 rounded text-[10px] font-black ${ex.mode === 'test' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>{ex.mode === 'test' ? '실전 퀴즈' : '자율 학습'}</span>
                            <h4 className="font-bold text-lg text-slate-800">{ex.title}</h4>
                          </div>
                          <p className="text-xs text-slate-500">문항: {ex.questions.length}개 / 접속코드: {ex.id}</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => copyToClipboard(ex.id)} className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">링크복사</button>
                          <button onClick={() => handleEditExam(ex)} className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">수정</button>
                          <button 
                            onClick={async () => { 
                              if(window.confirm('정말 삭제하시겠습니까?')) {
                                try {
                                  await deleteDoc(doc(db, 'exams', ex.id));
                                  showToast('✅ 삭제 성공!');
                                } catch(e) {
                                  console.error(e);
                                  showToast('❌ 삭제 실패! 권한을 확인하세요.');
                                }
                              }
                            }} 
                            className="flex-1 sm:flex-none px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'admin-create' && (
            <div className="space-y-8 pb-20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button onClick={() => setView('admin-dash')} className="text-2xl hover:bg-white p-2 rounded-full transition-colors shrink-0">⬅️</button>
                <div className="flex-1 w-full flex flex-col gap-1">
                   <input value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} className="w-full text-2xl sm:text-3xl font-black outline-none bg-transparent border-b-2 border-transparent focus:border-blue-500 transition-all text-slate-800" placeholder="학습 또는 퀴즈 제목 입력"/>
                   <div className="flex flex-wrap items-center gap-2 mt-2">
                     <span className="text-xs font-bold text-slate-400">코드(자동생성):</span>
                     <input value={customExamId} onChange={e => setCustomExamId(e.target.value)} className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-1 rounded outline-none border border-blue-100 min-w-[150px]" placeholder="선택사항"/>
                   </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
                <span className="text-xs font-black text-slate-400 tracking-widest uppercase">🎯 학생 화면 배치 선택</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div onClick={() => setNewExamMode('study')} className={`cursor-pointer p-5 rounded-2xl border-2 transition-all ${newExamMode === 'study' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'}`}>
                    <h5 className={`font-black text-lg flex items-center gap-2 mb-2 ${newExamMode === 'study' ? 'text-emerald-700' : 'text-slate-700'}`}>📖 자율 학습하기 메뉴에 노출</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">오답은 맞출 때까지 반복 출제되며, 재접속 시 이미 완벽히 맞춘 문제는 자동으로 패스됩니다. 성적 부담 없는 훈련용입니다.</p>
                  </div>
                  <div onClick={() => setNewExamMode('test')} className={`cursor-pointer p-5 rounded-2xl border-2 transition-all ${newExamMode === 'test' ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-purple-200'}`}>
                    <h5 className={`font-black text-lg flex items-center gap-2 mb-2 ${newExamMode === 'test' ? 'text-purple-700' : 'text-slate-700'}`}>🏆 실전 퀴즈응시 메뉴에 노출</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">한 번에 끝까지 풀고 점수를 확인합니다. 재접속 시에도 항상 모든 문항이 새롭게 출제됩니다. 최종 평가용입니다.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black text-slate-400 tracking-widest uppercase">📝 출제할 문제 목록 (총 {newQuestions.length}개)</span>
                  <div className="flex gap-2">
                    <label className="text-xs bg-green-600 text-white px-3 py-1.5 rounded font-bold hover:bg-green-700 cursor-pointer transition-colors shadow-sm">
                       📊 CSV 파일로 덮어쓰기<input type="file" accept=".csv" className="hidden" onChange={handleExamFileUpload} />
                    </label>
                    <button onClick={() => setIsBankModalOpen(true)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded font-bold hover:bg-blue-100 transition-colors">🗃️ 저장고에서 불러오기</button>
                    <button onClick={() => setNewQuestions([...newQuestions, {category:'', text:'', options:['','','',''], answerIndex:0, explanation:''}])} className="text-xs bg-slate-100 px-3 py-1.5 rounded font-bold hover:bg-slate-200">+ 수동 빈 문항 추가</button>
                  </div>
                </div>
                <div className="space-y-6">
                  {newQuestions.map((q, i) => (
                    <div key={i} className="p-6 bg-slate-50 rounded-2xl border relative">
                      <button onClick={() => setNewQuestions(newQuestions.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 text-xs font-bold">삭제</button>
                      <span className="text-xs font-black text-blue-400 mb-2 block">Q{i+1}.</span>
                      <textarea value={q.text} onChange={e => setNewQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, text: e.target.value } : item))} className="w-full bg-white border p-3 rounded-xl mb-3 text-sm font-bold" rows={2} placeholder="문제 입력"/>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2 bg-white p-2 rounded-xl border">
                            <input type="radio" checked={q.answerIndex === oi} onChange={() => setNewQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, answerIndex: oi } : item))} className="accent-blue-600 w-4 h-4 ml-2"/>
                            <input value={opt} onChange={e => setNewQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, options: item.options.map((o, oIdx) => oIdx === oi ? e.target.value : o) } : item))} className="w-full outline-none text-sm" placeholder={`보기 ${oi+1}`}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleSaveExam} className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black text-xl shadow-xl hover:bg-slate-800 transition-colors sticky bottom-6 z-20">세트 발행하기</button>
            </div>
          )}

          {isBankModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-center mb-6 shrink-0 border-b pb-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800">🗃️ 문제 저장고에서 불러오기</h3>
                    <p className="text-sm text-slate-500 mt-1">현재 세트에 추가할 문제를 선택하세요.</p>
                  </div>
                  <button onClick={() => {setIsBankModalOpen(false); setSelectedBankIds([]);}} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center font-bold transition-colors">✕</button>
                </div>

                <div className="mb-4">
                  <select value={bankCategoryFilter} onChange={e => setBankCategoryFilter(e.target.value)} className="p-3 rounded-xl border outline-none font-bold text-sm bg-slate-50 w-full sm:w-auto">
                    <option value="all">전체 카테고리 보기</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 mb-6">
                  {filteredBank.length > 0 && (
                    <label className="bg-slate-200 p-4 rounded-2xl flex gap-4 cursor-pointer hover:bg-slate-300 transition-all items-center shadow-sm">
                      <input 
                        type="checkbox" 
                        checked={isAllFilteredSelected} 
                        onChange={(e) => handleToggleSelectAll(e.target.checked)} 
                        className="accent-blue-600 w-5 h-5 cursor-pointer" 
                      />
                      <span className="font-black text-slate-800 text-sm">현재 필터링된 {filteredBank.length}개 문제 전체 선택</span>
                    </label>
                  )}

                  {filteredBank.map((q) => (
                    <label key={q.id} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedBankIds.includes(q.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200 bg-white'}`}>
                      <div className="mt-1">
                        <input 
                          type="checkbox" 
                          checked={selectedBankIds.includes(q.id)}
                          onChange={e => {
                            if(e.target.checked) setSelectedBankIds(prev => Array.from(new Set([...prev, q.id])));
                            else setSelectedBankIds(prev => prev.filter(id => id !== q.id));
                          }}
                          className="w-5 h-5 cursor-pointer accent-blue-600"
                        />
                      </div>
                      <div>
                        <div className="flex gap-2 mb-1">
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">{q.category || '미분류'}</span>
                        </div>
                        <p className={`font-bold text-sm sm:text-base line-clamp-2 ${selectedBankIds.includes(q.id) ? 'text-blue-800' : 'text-slate-700'}`}>{q.text}</p>
                        <p className="text-xs text-slate-400 mt-1">정답: {q.options[q.answerIndex]}</p>
                      </div>
                    </label>
                  ))}
                  {filteredBank.length === 0 && <p className="text-center text-slate-400 py-10">해당 조건의 문제가 없습니다.</p>}
                </div>
                
                <button 
                  onClick={() => {
                    const selected = questionBank.filter(q => selectedBankIds.includes(q.id)).map(({ id, createdAt, ...rest }) => rest);
                    const existing = newQuestions.filter(q => q.text.trim() !== '');
                    setNewQuestions([...existing, ...selected]);
                    setIsBankModalOpen(false);
                    setSelectedBankIds([]);
                    showToast(`${selected.length}개 문제가 추가되었습니다.`);
                  }} 
                  disabled={selectedBankIds.length === 0}
                  className={`w-full py-4 rounded-xl font-bold text-white transition-colors shrink-0 ${selectedBankIds.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}
                >
                  선택한 {selectedBankIds.length}개 문제 시험지에 추가하기
                </button>
              </div>
            </div>
          )}

          {view === 'student-entry' && (
            <div className="py-20 text-center space-y-6">
              <h2 className="text-3xl font-black text-slate-800">{exams.find(e => e.id === currentExamId)?.title}</h2>
              <button onClick={startExam} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-xl text-lg hover:bg-blue-700">과정 시작하기 👉</button>
            </div>
          )}

          {view === 'student-take' && questionQueue.length > 0 && (
            <div className="max-w-xl mx-auto space-y-6 pb-20">
              <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                <h2 className="text-xl font-bold leading-relaxed">{questionQueue[0].q.text}</h2>
                <div className="grid gap-3">
                  {questionQueue[0].q.options.map((opt, i) => (
                    <button key={i} onClick={() => { if(!isAnswerChecked) { setCurrentSelectedOption(i); setIsAnswerChecked(true); } }} className={`text-left p-5 rounded-2xl border-2 font-bold transition-all ${isAnswerChecked ? (i === questionQueue[0].q.answerIndex ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : (i === currentSelectedOption ? 'border-red-500 bg-red-50 text-red-700' : 'opacity-40 border-slate-100')) : 'hover:border-blue-400 hover:bg-blue-50 border-slate-100'}`}>{i+1}. {opt}</button>
                  ))}
                </div>
                {isAnswerChecked && <button onClick={handleStudyNextQuestion} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold mt-4 shadow-lg active:scale-95 transition-all">다음 문제</button>}
              </div>
            </div>
          )}

          {view === 'student-result' && (
            <div className="py-20 text-center space-y-6">
              <h2 className="text-4xl font-black text-slate-800">수고하셨습니다!</h2>
              <div className="text-6xl font-black text-blue-600 drop-shadow-md">{studentScore}점</div>
              <button onClick={() => {setView('home'); window.history.replaceState({}, '', window.location.pathname);}} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold hover:bg-slate-800 shadow-xl mt-8">목록으로 돌아가기</button>
            </div>
          )}
        </main>
      </div>
      {toastMessage && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-full text-sm shadow-2xl font-bold whitespace-nowrap z-[100] animate-fade-in-up">{toastMessage}</div>}
    </>
  );
}
