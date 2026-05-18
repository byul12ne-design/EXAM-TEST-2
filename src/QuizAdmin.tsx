import React from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import type { Exam, Question, BankQuestion } from './types';

interface QuizAdminProps {
  exams: Exam[];
  editingExamId: string | null;
  customExamId: string;
  newExamTitle: string;
  newExamNotice: string;
  newExamMode: 'study' | 'test';
  displayCount: string;
  timeLimitMinutes: string;
  maxAttempts: string;
  warnOnExit: boolean;
  exitPolicy: 'continue' | 'forfeit';
  newQuestions: Question[];
  isBankModalOpen: boolean;
  selectedBankIds: string[];
  bankCategoryFilter: string;
  editingBankId: string | null;
  newBankQuestion: Question;
  filteredBank: BankQuestion[];
  bankCategories: string[];
  setView: React.Dispatch<React.SetStateAction<string>>;
  setEditingExamId: React.Dispatch<React.SetStateAction<string | null>>;
  setCustomExamId: React.Dispatch<React.SetStateAction<string>>;
  setNewExamTitle: React.Dispatch<React.SetStateAction<string>>;
  setNewExamNotice: React.Dispatch<React.SetStateAction<string>>;
  setNewExamMode: React.Dispatch<React.SetStateAction<'study' | 'test'>>;
  setDisplayCount: React.Dispatch<React.SetStateAction<string>>;
  setTimeLimitMinutes: React.Dispatch<React.SetStateAction<string>>;
  setMaxAttempts: React.Dispatch<React.SetStateAction<string>>;
  setNewQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  setIsBankModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedBankIds: React.Dispatch<React.SetStateAction<string[]>>;
  setBankCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
  setEditingBankId: React.Dispatch<React.SetStateAction<string | null>>;
  setNewBankQuestion: React.Dispatch<React.SetStateAction<Question>>;
  setWarnOnExit: React.Dispatch<React.SetStateAction<boolean>>;
  setExitPolicy: React.Dispatch<React.SetStateAction<'continue' | 'forfeit'>>;
  handleBankFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExamFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveExam: () => Promise<void>;
  handleSaveBankQuestion: () => Promise<void>;
}

export default function QuizAdmin({
  exams,
  editingExamId,
  customExamId,
  newExamTitle,
  newExamNotice,
  newExamMode,
  displayCount,
  timeLimitMinutes,
  maxAttempts,
  newQuestions,
  isBankModalOpen,
  selectedBankIds,
  bankCategoryFilter,
  editingBankId,
  newBankQuestion,
  filteredBank,
  bankCategories,
  setView,
  setEditingExamId,
  setCustomExamId,
  setNewExamTitle,
  setNewExamNotice,
  setNewExamMode,
  setDisplayCount,
  setTimeLimitMinutes,
  setMaxAttempts,
  setNewQuestions,
  setIsBankModalOpen,
  setSelectedBankIds,
  setBankCategoryFilter,
  setEditingBankId,
  setNewBankQuestion,
  warnOnExit,
  exitPolicy,
  setWarnOnExit,
  setExitPolicy,
  handleBankFileUpload,
  handleExamFileUpload,
  handleSaveExam,
  handleSaveBankQuestion,
}: QuizAdminProps) {
  return (
    <div className="animate-in space-y-6 pb-20 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <button onClick={() => setView('admin-dash')} className="text-3xl hover:bg-white p-2 rounded-full transition-colors shrink-0">⬅️</button>
        <div className="flex-1 w-full flex flex-col gap-1">
          <input value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} className="w-full text-2xl sm:text-3xl font-black outline-none bg-transparent focus:border-blue-500 transition-all text-slate-800" placeholder="학습 또는 퀴즈 제목 입력" />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs font-bold text-slate-400">과정 코드:</span>
            <input value={customExamId} onChange={e => setCustomExamId(e.target.value)} className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-1 rounded outline-none border border-blue-100 min-w-[150px]" placeholder="(선택) 직접 지정 시 입력" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
        <span className="text-xs font-black text-slate-400 tracking-widest uppercase">📢 과정 안내사항 작성 (선택사항)</span>
        <textarea
          value={newExamNotice}
          onChange={e => setNewExamNotice(e.target.value)}
          className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-sm font-medium outline-none focus:border-blue-400 mt-4"
          placeholder="참가자가 '시작하기'를 누르기 전에 읽어야 할 안내사항이나 시험 규칙을 입력하세요."
          rows={3}
        />
      </div>

      <div className="flex gap-4">
        <button onClick={() => setNewExamMode('study')} className={`flex-1 py-4 rounded-xl font-black border-2 ${newExamMode === 'study' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-100 text-slate-400'}`}>📖 학습 모드</button>
        <button onClick={() => setNewExamMode('test')} className={`flex-1 py-4 rounded-xl font-black border-2 ${newExamMode === 'test' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-100 text-slate-400'}`}>🏆 실전 퀴즈 모드</button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h5 className="font-bold text-slate-700">🔀 랜덤 출제 문항 수 제한</h5>
          <p className="text-[10px] text-slate-500 mt-1">입력한 수만큼 아래 목록에서 무작위 출제됩니다. (비워두면 등록된 전체 출제)</p>
        </div>
        <input type="number" value={displayCount} onChange={e => setDisplayCount(e.target.value)} className="w-24 p-3 rounded-xl border-2 bg-slate-50 text-center outline-none focus:border-blue-500 text-slate-800 font-bold" placeholder="전체" />
      </div>

      <div className="bg-white p-6 rounded-[2rem] border shadow-sm grid gap-4 sm:grid-cols-2">
        <div>
          <h5 className="font-bold text-slate-700">⏱️ 제한 시간</h5>
          <p className="text-[10px] text-slate-500 mt-1">퀴즈 응시 중 타이머를 활성화합니다.</p>
          <select value={timeLimitMinutes} onChange={e => setTimeLimitMinutes(e.target.value)} className="mt-3 w-full p-3 rounded-xl border-2 bg-slate-50 outline-none focus:border-blue-500 text-slate-800 font-bold">
            <option value="0">No Limit</option>
            <option value="10">10분</option>
            <option value="20">20분</option>
            <option value="30">30분</option>
            <option value="40">40분</option>
            <option value="50">50분</option>
            <option value="60">60분</option>
          </select>
        </div>
        <div>
          <h5 className="font-bold text-slate-700">🔁 최대 응시 횟수</h5>
          <p className="text-[10px] text-slate-500 mt-1">사용자가 이 퀴즈에 응시할 수 있는 최대 횟수입니다.</p>
          <select value={maxAttempts} onChange={e => setMaxAttempts(e.target.value)} className="mt-3 w-full p-3 rounded-xl border-2 bg-slate-50 outline-none focus:border-blue-500 text-slate-800 font-bold">
            <option value="0">Unlimited</option>
            <option value="1">1 Time</option>
            <option value="2">2 Times</option>
            <option value="3">3 Times</option>
            <option value="5">5 Times</option>
          </select>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border shadow-sm grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <input id="warn-on-exit" type="checkbox" checked={warnOnExit} onChange={e => setWarnOnExit(e.target.checked)} className="w-5 h-5 accent-blue-600 rounded-sm mt-1" />
          <div>
            <h5 className="font-bold text-slate-700">🚨 이탈 경고창 띄우기</h5>
            <p className="text-[10px] text-slate-500 mt-1">활성화하면 새로고침, 뒤로가기, 창 닫기 시 브라우저 경고가 표시됩니다.</p>
          </div>
        </div>
        <div>
          <h5 className="font-bold text-slate-700">🚫 이탈 및 재접속 정책</h5>
          <p className="text-[10px] text-slate-500 mt-1">사용자가 시험 중 페이지를 벗어났을 때 재접속 시 행동을 결정합니다.</p>
          <select value={exitPolicy} onChange={e => setExitPolicy(e.target.value as 'continue' | 'forfeit')} className="mt-3 w-full p-3 rounded-xl border-2 bg-slate-50 outline-none focus:border-blue-500 text-slate-800 font-bold">
            <option value="continue">옵션 A: 이어서 풀기 허용 (남은 시간 유지)</option>
            <option value="forfeit">옵션 B: 이탈 시 즉시 기회 박탈 (자동 0점 제출)</option>
          </select>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-100 pb-4 gap-4">
          <span className="font-black text-lg text-slate-800">📝 문제 세팅 (총 {newQuestions.length}문항)</span>
          <div className="flex flex-wrap gap-2">
            <label className="text-xs bg-emerald-600 text-white px-3 py-2 rounded-xl font-bold hover:bg-emerald-700 cursor-pointer shadow-sm flex items-center gap-1">
              📊 엑셀 대량 업로드<input type="file" accept=".csv" className="hidden" onChange={handleExamFileUpload} />
            </label>
            <button onClick={() => setIsBankModalOpen(true)} className="text-xs bg-blue-100 text-blue-700 px-3 py-2 rounded-xl font-bold hover:bg-blue-200">🗃️ 저장고 불러오기</button>
            <button onClick={() => setNewQuestions([...newQuestions, { category: '', text: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' }])} className="text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-xl font-bold hover:bg-slate-200">+ 수동 문항 추가</button>
          </div>
        </div>

        <div className="space-y-6 pt-2">
          {newQuestions.map((q, i) => (
            <div key={i} className="bg-slate-50 p-6 rounded-[2rem] border relative">
              <span className="text-sm font-black text-blue-500 mb-4 block">Q{i + 1}.</span>
              <textarea value={q?.text || ''} onChange={e => { const n = [...newQuestions]; n[i].text = e.target.value; setNewQuestions(n); }} className="w-full bg-white border-2 p-4 rounded-2xl font-bold mb-4 outline-none focus:border-blue-400" placeholder="문제 내용을 입력하세요" rows={2} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {q?.options?.map((opt, oi) => (
                  <div key={oi} className={`flex items-center gap-3 border-2 p-3 rounded-2xl bg-white ${q.answerIndex === oi ? 'border-emerald-400' : 'border-slate-100'}`}>
                    <input type="radio" checked={q.answerIndex === oi} onChange={() => { const n = [...newQuestions]; n[i].answerIndex = oi; setNewQuestions(n); }} className="w-5 h-5 accent-emerald-500 cursor-pointer" />
                    <input value={opt || ''} onChange={e => { const n = [...newQuestions]; n[i].options[oi] = e.target.value; setNewQuestions(n); }} className="w-full bg-transparent outline-none font-medium text-sm" placeholder={`보기 ${oi + 1}`} />
                  </div>
                ))}
              </div>
              <textarea value={q?.explanation || ''} onChange={e => { const n = [...newQuestions]; n[i].explanation = e.target.value; setNewQuestions(n); }} className="w-full bg-white border p-4 rounded-2xl text-sm font-medium outline-none focus:border-blue-400" placeholder="💡 문제 해설을 입력하세요 (제출 후 오답노트에서 보여집니다)" rows={2} />
              <button onClick={() => setNewQuestions(newQuestions.filter((_, idx) => idx !== i))} className="absolute top-6 right-6 bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-200">삭제</button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSaveExam} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl sticky bottom-6 z-20 hover:bg-slate-800 transition-colors">과정 저장하기</button>

      {isBankModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4 shrink-0">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800">🗃️ 저장고에서 불러오기</h3>
              <button onClick={() => { setIsBankModalOpen(false); setSelectedBankIds([]); }} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center font-bold">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 mb-6 space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-bold text-slate-600">분류 필터:</span>
                <select value={bankCategoryFilter} onChange={e => setBankCategoryFilter(e.target.value)} className="p-2 rounded-xl border outline-none font-bold text-sm bg-white flex-1 sm:w-40 cursor-pointer">
                  <option value="all">전체보기</option>
                  {bankCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {filteredBank.length > 0 && (
                <label className="flex items-center gap-3 p-3 bg-slate-100 rounded-xl cursor-pointer w-fit pr-5 mb-2 hover:bg-slate-200">
                  <input type="checkbox" className="w-5 h-5 accent-blue-600 cursor-pointer" checked={filteredBank.every(q => selectedBankIds.includes(q.id))} onChange={e => {
                    const filteredIds = filteredBank.map(q => q.id);
                    if (e.target.checked) setSelectedBankIds(Array.from(new Set([...selectedBankIds, ...filteredIds])));
                    else setSelectedBankIds(selectedBankIds.filter(id => !filteredIds.includes(id)));
                  }} />
                  <span className="text-sm font-bold text-slate-800">현재 목록 전체 선택</span>
                </label>
              )}
              {filteredBank.map(q => (
                <label key={q.id} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedBankIds.includes(q.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200 bg-white'}`}>
                  <input type="checkbox" checked={selectedBankIds.includes(q.id)} onChange={e => { if (e.target.checked) setSelectedBankIds([...selectedBankIds, q.id]); else setSelectedBankIds(selectedBankIds.filter(id => id !== q.id)); }} className="w-5 h-5 cursor-pointer accent-blue-600 mt-1" />
                  <div>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold mb-1 block w-fit">{q?.category || '미분류'}</span>
                    <p className="font-bold text-sm text-slate-800">{q?.text}</p>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={() => {
              const selected = filteredBank.filter(q => selectedBankIds.includes(q.id)).map(({ id, createdAt, ...rest }) => rest);
              const existing = newQuestions.filter(q => q.text.trim() !== '');
              setNewQuestions([...existing, ...selected]);
              setIsBankModalOpen(false);
              setSelectedBankIds([]);
            }} disabled={selectedBankIds.length === 0} className={`w-full py-4 rounded-xl font-bold text-white shrink-0 ${selectedBankIds.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300'}`}>
              선택한 {selectedBankIds.length}개 세트에 추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
