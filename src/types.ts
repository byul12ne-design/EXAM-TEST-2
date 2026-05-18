export interface Question {
  category?: string;
  text: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface BankQuestion extends Question {
  id: string;
  createdAt: number;
}

export interface Exam {
  id: string;
  title: string;
  notice?: string;
  questions: Question[];
  displayCount: number;
  createdAt: number;
  mode: 'study' | 'test';
  isVisible: boolean;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  warnOnExit?: boolean;
  exitPolicy?: 'continue' | 'forfeit';
}

export interface ExamResult {
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

export interface UserProfile {
  uid: string;
  employeeId: string;
  name: string;
  role: 'student' | 'admin';
}
