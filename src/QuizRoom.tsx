import type { Exam, Question } from './types';
import { useState, useEffect } from 'react';

interface QuizRoomProps {
  view: string;
  currentExamId: string;
  currentExam: Exam | undefined;
  currentExamAttemptCount: number;
  currentExamMaxAttempts: number;
  isAttemptLimitExceeded: boolean;
  startExam: () => Promise<void>;
  remainingSeconds: number;
  handleMobileBack: () => Promise<void>;
  activeQuestions: Question[];
  questionQueue: { q: Question; originalIndex: number }[];
  currentSelectedOption: number | null;
  isAnswerChecked: boolean;
  testAnswers: Record<number, number>;
  handleStudyNextQuestion: () => Promise<void>;
  handleStudyOptionClick: (oi: number) => void | Promise<void>;
  handleTestOptionClick: (qIndex: number, oi: number) => Promise<void>;
  submitExam: (answers: Record<number, number>) => Promise<void>;
}

export default function QuizRoom({
  view,
  currentExamId,
  currentExam,
  currentExamAttemptCount,
  currentExamMaxAttempts,
  isAttemptLimitExceeded,
  startExam,
  remainingSeconds,
  handleMobileBack,
  activeQuestions,
  questionQueue,
  currentSelectedOption,
  isAnswerChecked,
  testAnswers,
  handleStudyNextQuestion,
  handleStudyOptionClick,
  handleTestOptionClick,
  submitExam,
}: QuizRoomProps) {
  const [hasForfeited, setHasForfeited] = useState(false);

  useEffect(() => {
    if (view !== 'student-take' || !currentExamId || !currentExam) return;

    const storageKey = `quizExitPolicy_${currentExamId}`;
    const shouldForfeit = currentExam.exitPolicy === 'forfeit';
    const warnOnExit = currentExam.warnOnExit;

    const markLeft = () => {
      if (shouldForfeit) {
        localStorage.setItem(storageKey, 'left');
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!warnOnExit) return;
      e.preventDefault();
      e.returnValue = '시험을 떠나면 응시가 취소될 수 있습니다.';
      return e.returnValue;
    };

    const handlePageHide = () => {
      // pagehide and unload fire only when navigation is confirmed.
      // markLeft here to record actual departure; do NOT mark on visibilitychange
      markLeft();
    };

    const handleUnload = () => {
      // unload also indicates user actually left the page (after beforeunload confirmed)
      markLeft();
    };

    if (shouldForfeit) {
      localStorage.setItem(storageKey, 'active');
    }
    if (warnOnExit) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    // Only mark left on pagehide/unload (these run when navigation actually happens),
    // not on visibilitychange which can fire when the browser shows the beforeunload prompt.
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('unload', handleUnload);

    return () => {
      if (warnOnExit) {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('unload', handleUnload);
    };
  }, [view, currentExamId, currentExam]);

  useEffect(() => {
    if (view !== 'student-take' || !currentExamId || !currentExam || hasForfeited) return;
    if (currentExam.exitPolicy !== 'forfeit') return;

    const storageKey = `quizExitPolicy_${currentExamId}`;
    const status = localStorage.getItem(storageKey);
    if (status !== 'left') return;

    setHasForfeited(true);
    window.alert('시험 도중 이탈하여 자동으로 0점 처리 및 응시 횟수가 차감되었습니다.');
    submitExam({});
  }, [view, currentExamId, currentExam, hasForfeited, submitExam]);

  if (view === 'student-entry') {
    return (
      <div className="py-10 sm:py-20 text-center animate-in w-full flex flex-col items-center max-w-2xl mx-auto">
        <h2 className="text-4xl font-black mb-8 tracking-tight text-slate-800">{currentExam?.title}</h2>

        {currentExam?.notice && (
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm mb-10 w-full text-left whitespace-pre-wrap text-slate-600 leading-relaxed font-medium">
            {currentExam.notice}
          </div>
        )}

        {currentExam && currentExamMaxAttempts > 0 && (
          <div className="bg-slate-50 p-5 rounded-3xl border border-amber-200 text-amber-700 mb-6">
            <p className="font-black text-sm">최대 응시 횟수: {currentExamMaxAttempts}회</p>
            <p className="text-sm mt-1">현재 응시 횟수: {currentExamAttemptCount}회</p>
            {isAttemptLimitExceeded && (
              <p className="mt-3 text-sm font-bold text-red-700">You have exceeded the maximum allowed attempts ({currentExamMaxAttempts} times) for this quiz.</p>
            )}
          </div>
        )}

        <button type="button" onClick={startExam} disabled={isAttemptLimitExceeded} className={`relative z-50 bg-blue-600 text-white px-16 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all ${isAttemptLimitExceeded ? 'opacity-50 cursor-not-allowed' : ''}`}>
          과정 시작하기 👉
        </button>
      </div>
    );
  }

  if (view === 'student-take') {
    return (
      <div className="max-w-2xl mx-auto w-full animate-in pb-20">
        {currentExam?.timeLimitMinutes && currentExam.timeLimitMinutes > 0 && (
          <div className="sticky top-28 z-40 mb-6">
            <div className={`rounded-3xl px-6 py-4 text-center font-black text-xl shadow-xl border ${remainingSeconds < 60 ? 'bg-red-700 text-white border-red-800 animate-pulse' : 'bg-red-600 text-white border-red-700'}`}>
              제한시간: {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:{String(remainingSeconds % 60).padStart(2, '0')}
            </div>
          </div>
        )}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <button onClick={handleMobileBack} className="md:hidden inline-flex items-center gap-2 text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-2xl font-bold shadow-sm">
            <span className="text-lg">←</span> 뒤로
          </button>
          <button onClick={handleMobileBack} className="hidden md:inline-flex text-slate-600 font-bold hover:text-blue-600 flex items-center gap-2">
            <span>⬅️</span> 나가기
          </button>
          {currentExam?.mode === 'study' ? (
            questionQueue.length > 0 ? (
              <div className="font-bold text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                남은 문제: <span className="text-blue-600">{questionQueue.length}</span>개
              </div>
            ) : null
          ) : (
            <div className="font-bold text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
              총 <span className="text-purple-600">{activeQuestions.length}</span> 문항
            </div>
          )}
        </div>

       {currentExam?.mode === 'study' && questionQueue.length > 0 && (
          <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border border-slate-100 space-y-8">
            <h2 className="text-2xl font-black leading-tight text-slate-800">{questionQueue[0].q.text}</h2>
            <div className="grid gap-4">
              {questionQueue[0].q.options.map((opt, i) => (
                <button key={i} onClick={() => handleStudyOptionClick(i)} className={`text-left p-6 rounded-2xl border-2 font-black transition-all ${isAnswerChecked ? (i === questionQueue[0].q.answerIndex ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : (i === currentSelectedOption ? 'border-red-500 bg-red-50 text-red-600 shadow-inner' : 'opacity-30 border-slate-50')) : 'hover:border-blue-400 hover:bg-blue-50 border-slate-100'}`}>
                  {opt}
                </button>
              ))}
            </div>
            {isAnswerChecked && (
              <div className="space-y-4 animate-in">
                {questionQueue[0].q.explanation && <div className="p-5 bg-slate-50 rounded-2xl border text-sm text-slate-600 leading-relaxed font-medium">💡 해설: {questionQueue[0].q.explanation}</div>}
                <button onClick={handleStudyNextQuestion} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">다음 문제로</button>
              </div>
            )}
          </div>
        )}

        {currentExam?.mode === 'test' && (
          <div className="space-y-6">
            {activeQuestions.map((q, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                <p className="font-black text-lg text-slate-800 leading-snug"><span className="text-blue-500 mr-2">Q{idx + 1}.</span>{q.text}</p>
                <div className="grid gap-3">
                  {q.options.map((opt, oi) => (
                    <button key={oi} onClick={() => handleTestOptionClick(idx, oi)} className={`p-5 rounded-2xl border-2 text-left font-bold transition-all ${testAnswers[idx] === oi ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-50 hover:bg-slate-50'}`}>{opt}</button>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => submitExam(testAnswers)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-95 transition-all">전체 답안 제출하기</button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
