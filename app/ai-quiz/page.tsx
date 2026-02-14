'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { getUserData, UserData } from '@/lib/auth';
import {
  extractTextFromYouTube,
  extractTextFromPDF,
  extractTextFromAudio,
  generateQuizQuestions,
  saveQuizResult,
  generateFeedback,
  getBadge,
  QuizQuestion,
} from '@/lib/quiz';
import { generateCertificatePDF } from '@/lib/certificates';
import toast from 'react-hot-toast';

type UploadType = 'youtube' | 'pdf' | 'audio' | 'text' | null;

export default function AIQuizPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [uploadType, setUploadType] = useState<UploadType>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeSpent, setTimeSpent] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Initialize auth check - redirect to login if not authenticated
  useEffect(() => {
    if (!auth) {
      setCheckingAuth(false);
      toast.error('Please log in to access AI Quiz');
      router.push('/login');
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setCheckingAuth(false);
      if (currentUser && currentUser.emailVerified) {
        setUser(currentUser);
        const data = await getUserData(currentUser.uid);
        setUserData(data);
      } else {
        // User not authenticated or email not verified
        toast.error('Please log in to access AI Quiz');
        router.push('/login');
      }
    });
    
    return () => unsubscribe();
  }, [router]);

  // Timer effect
  useEffect(() => {
    if (questions.length > 0 && !showResults) {
      const interval = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [questions.length, showResults]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'audio') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'pdf' && file.type === 'application/pdf') {
        setPdfFile(file);
      } else if (type === 'audio' && file.type.startsWith('audio/')) {
        setAudioFile(file);
      } else {
        toast.error(`Please select a valid ${type === 'pdf' ? 'PDF' : 'audio'} file`);
      }
    }
  };

  const handleGenerateQuiz = async () => {
    if (!user) {
      toast.error('Please log in to generate quizzes');
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      let extractedText = '';

      switch (uploadType) {
        case 'youtube':
          if (!youtubeUrl) {
            toast.error('Please enter a YouTube URL');
            setLoading(false);
            return;
          }
          extractedText = await extractTextFromYouTube(youtubeUrl);
          break;
        case 'pdf':
          if (!pdfFile) {
            toast.error('Please select a PDF file');
            setLoading(false);
            return;
          }
          extractedText = await extractTextFromPDF(pdfFile);
          break;
        case 'audio':
          if (!audioFile) {
            toast.error('Please select an audio file');
            setLoading(false);
            return;
          }
          extractedText = await extractTextFromAudio(audioFile);
          break;
        case 'text':
          if (!textInput.trim()) {
            toast.error('Please enter some text');
            setLoading(false);
            return;
          }
          extractedText = textInput;
          break;
        default:
          toast.error('Please select an input method');
          setLoading(false);
          return;
      }

      toast.success('Generating quiz questions...');
      const generatedQuestions = await generateQuizQuestions(extractedText, 20);
      setQuestions(generatedQuestions);
      setAnswers(new Array(generatedQuestions.length).fill(-1));
      setCurrentQuestion(0);
      setTimeSpent(0);
      toast.success('Quiz generated successfully!');
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast.error('Error generating quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  // Show loading screen while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render (will redirect)
  if (!user || !user.emailVerified) {
    return null;
  }

  if (showResults) {
    return (
      <QuizResults
        questions={questions}
        answers={answers}
        timeSpent={timeSpent}
        userId={user?.uid || ''}
        userName={userData?.name || ''}
      />
    );
  }

  if (questions.length > 0) {
    return (
      <QuizInterface
        questions={questions}
        currentQuestion={currentQuestion}
        answers={answers}
        timeSpent={timeSpent}
        onAnswerSelect={handleAnswerSelect}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            AI Quiz Generator
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Upload content and let AI generate personalized quiz questions
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Choose Input Method
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { type: 'youtube', icon: '🎥', label: 'YouTube' },
              { type: 'pdf', icon: '📄', label: 'PDF' },
              { type: 'audio', icon: '🎵', label: 'Audio' },
              { type: 'text', icon: '📝', label: 'Text' },
            ].map((option) => (
              <motion.button
                key={option.type}
                onClick={() => setUploadType(option.type as UploadType)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`p-6 rounded-xl border-2 transition-all ${
                  uploadType === option.type
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-2">{option.icon}</div>
                <div className="font-semibold text-gray-900 dark:text-white">{option.label}</div>
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {uploadType === 'youtube' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  YouTube URL
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </motion.div>
            )}

            {uploadType === 'pdf' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload PDF File
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e, 'pdf')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {pdfFile && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Selected: {pdfFile.name}
                  </p>
                )}
              </motion.div>
            )}

            {uploadType === 'audio' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Audio File
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleFileChange(e, 'audio')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {audioFile && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Selected: {audioFile.name}
                  </p>
                )}
              </motion.div>
            )}

            {uploadType === 'text' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter Text
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={6}
                  placeholder="Paste or type your text here..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleGenerateQuiz}
            disabled={loading || !uploadType}
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Generating Quiz...' : 'Generate Quiz'}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

// Quiz Interface Component
function QuizInterface({
  questions,
  currentQuestion,
  answers,
  timeSpent,
  onAnswerSelect,
  onNext,
  onPrevious,
  onSubmit,
}: {
  questions: QuizQuestion[];
  currentQuestion: number;
  answers: number[];
  timeSpent: number;
  onAnswerSelect: (index: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
}) {
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Question {currentQuestion + 1} of {questions.length}
            </h1>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ⏱️ {formatTime(timeSpent)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Time Spent</div>
          </div>
        </div>

        {/* Question Card */}
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {question.question}
          </h2>

          <div className="space-y-4">
            {question.options.map((option, index) => (
              <motion.button
                key={index}
                onClick={() => onAnswerSelect(index)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  answers[currentQuestion] === index
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center ${
                    answers[currentQuestion] === index
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-gray-900 dark:text-white font-medium">{option}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={onPrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
          >
            ← Previous
          </button>
          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={onSubmit}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              Submit Quiz ✓
            </button>
          ) : (
            <button
              onClick={onNext}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold transition-colors"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Quiz Results Component
function QuizResults({
  questions,
  answers,
  timeSpent,
  userId,
  userName,
}: {
  questions: QuizQuestion[];
  answers: number[];
  timeSpent: number;
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [badge, setBadge] = useState('');
  const [saved, setSaved] = useState(false);

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const score = calculateScore();
  const percentage = (score / questions.length) * 100;

  useEffect(() => {
    // Generate feedback and badge
    const loadFeedback = async () => {
      const feedbackText = await generateFeedback(score, questions.length);
      const badgeText = getBadge(score, questions.length);
      setFeedback(feedbackText);
      setBadge(badgeText);
    };
    loadFeedback();
  }, [score, questions.length]);

  useEffect(() => {
    // Save quiz result
    const saveResult = async () => {
      if (!userId || loading || saved || !feedback) return;
      setLoading(true);
      try {
        await saveQuizResult({
          userId,
          title: 'AI Generated Quiz',
          sourceType: 'text',
          questions,
          answers,
          score,
          totalQuestions: questions.length,
          timeSpent,
          aiFeedback: feedback,
          badge,
        });
        setSaved(true);
        toast.success('Quiz result saved!');
      } catch (error) {
        console.error('Error saving quiz:', error);
      } finally {
        setLoading(false);
      }
    };
    saveResult();
  }, [userId, loading, saved, feedback, badge, questions, answers, score, timeSpent]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-8xl mb-4"
          >
            {percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : '📚'}
          </motion.div>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Quiz Complete!
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <div className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              {score}/{questions.length}
            </div>
            <div className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
              {percentage.toFixed(0)}% Correct
            </div>
            {badge && (
              <div className="mt-4 inline-block px-6 py-2 bg-yellow-400 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 rounded-full font-bold text-lg">
                {badge}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6"
          >
            <p className="text-gray-700 dark:text-gray-300">{feedback || 'Calculating feedback...'}</p>
          </motion.div>

          {/* Questions Review */}
          <div className="mt-8 space-y-4">
            {questions.map((q, index) => {
              const isCorrect = answers[index] === q.correctAnswer;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className={`p-4 rounded-lg border-2 ${
                    isCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Q{index + 1}: {q.question}
                    </h3>
                    <span className="text-2xl">{isCorrect ? '✓' : '✗'}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Your answer: {q.options[answers[index]]}</p>
                    {!isCorrect && (
                      <p className="text-green-600 dark:text-green-400">
                        Correct answer: {q.options[q.correctAnswer]}
                      </p>
                    )}
                    {q.explanation && (
                      <p className="mt-2 italic">{q.explanation}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 flex gap-4 justify-center">
            <button
              onClick={() => router.push('/ai-quiz')}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
            >
              Take Another Quiz
            </button>
            <motion.button
              onClick={async () => {
                try {
                  await generateCertificatePDF({
                    userName,
                    quizTitle: 'AI Generated Quiz',
                    type: 'quiz',
                    completionDate: new Date(),
                    score,
                    totalQuestions: questions.length,
                    badge,
                  });
                  toast.success('Certificate downloaded!');
                } catch (error) {
                  console.error('Error generating certificate:', error);
                  toast.error('Error generating certificate');
                }
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg font-semibold transition-colors"
            >
              Download Certificate
            </motion.button>
            <button
              onClick={() => router.push('/dashboard/user/certificates')}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
            >
              View All Certificates
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

