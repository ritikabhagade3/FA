import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import toast from 'react-hot-toast';

// Quiz Question Model
export interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct answer
  explanation?: string;
}

// Quiz Model
export interface Quiz {
  id?: string;
  userId: string;
  title: string;
  sourceType: 'youtube' | 'pdf' | 'audio' | 'text';
  sourceUrl?: string;
  questions: QuizQuestion[];
  answers: number[]; // User's answers
  score: number;
  totalQuestions: number;
  timeSpent: number; // in seconds
  completedAt: Timestamp | Date;
  aiFeedback?: string;
  badge?: string;
}

// Save quiz result
export const saveQuizResult = async (quizData: Omit<Quiz, 'id' | 'completedAt'>): Promise<string> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const quizzesRef = collection(db, 'quizzes');
    const newQuizRef = doc(quizzesRef);
    const quiz = {
      ...quizData,
      completedAt: Timestamp.now(),
    };
    await setDoc(newQuizRef, quiz);
    return newQuizRef.id;
  } catch (error: any) {
    console.error('Error saving quiz:', error);
    toast.error('Error saving quiz result');
    throw error;
  }
};

// Get user's quiz history
export const getUserQuizzes = async (userId: string): Promise<Quiz[]> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const quizzesRef = collection(db, 'quizzes');
    // Avoid composite index by filtering only, then sorting client-side
    const q = query(
      quizzesRef,
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      completedAt: doc.data().completedAt?.toDate() || new Date(),
    })) as Quiz[];
    return items.sort((a, b) => (b.completedAt as Date).getTime() - (a.completedAt as Date).getTime());
  } catch (error: any) {
    const msg = (error?.code === 'unavailable' || /offline|Could not reach/i.test(String(error?.message)))
      ? 'You appear to be offline. Please check your connection and try again.'
      : 'Error fetching quizzes.';
    console.error('Error fetching quizzes:', error);
    toast.error(msg);
    throw error;
  }
 
};

// Get quiz by ID
export const getQuizById = async (quizId: string): Promise<Quiz | null> => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  try {
    const quizRef = doc(db, 'quizzes', quizId);
    const quizSnap = await getDoc(quizRef);
    if (quizSnap.exists()) {
      return {
        id: quizSnap.id,
        ...quizSnap.data(),
        completedAt: quizSnap.data().completedAt?.toDate() || new Date(),
      } as Quiz;
    }
    return null;
  } catch (error: any) {
    console.error('Error fetching quiz:', error);
    throw error;
  }
};

// Extract text from YouTube URL (placeholder - would use YouTube API or transcript service)
export const extractTextFromYouTube = async (url: string): Promise<string> => {
  // In a real implementation, you would:
  // 1. Extract video ID from URL
  // 2. Use YouTube Transcript API or similar service
  // 3. Return transcript text
  
  // Placeholder - in production, use actual API
  return `Transcript for ${url}\n\nThis is a placeholder transcript. In production, this would be extracted using YouTube Transcript API or Whisper API for audio transcription.`;
};

// Extract text from PDF (placeholder)
export const extractTextFromPDF = async (file: File): Promise<string> => {
  // In a real implementation, you would:
  // 1. Use a PDF parsing library like pdf-parse
  // 2. Extract text content
  // 3. Return text
  
  // Placeholder
  return `PDF text extraction for ${file.name}\n\nThis is a placeholder. In production, use pdf-parse or similar library to extract text from PDF files.`;
};

// Extract text from Audio using Whisper (placeholder)
export const extractTextFromAudio = async (file: File): Promise<string> => {
  // In a real implementation, you would:
  // 1. Upload audio to OpenAI Whisper API or similar
  // 2. Get transcription
  // 3. Return text
  
  // Placeholder
  return `Audio transcription for ${file.name}\n\nThis is a placeholder. In production, use OpenAI Whisper API or GROQ Whisper to transcribe audio files.`;
};

// Generate quiz questions using AI (GROQ or OpenAI)
export const generateQuizQuestions = async (
  text: string,
  numQuestions: number = 20
): Promise<QuizQuestion[]> => {
  try {
    // Check if API key is available
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey) {
      // Generate mock questions if no API key
      return generateMockQuestions(text, numQuestions);
    }

    // Use GROQ if available, otherwise OpenAI
    const useGroq = !!process.env.NEXT_PUBLIC_GROQ_API_KEY;
    
    const prompt = `Based on the following text, generate exactly ${numQuestions} multiple-choice quiz questions. Each question should have 4 options and clearly indicate the correct answer.

Text:
${text.substring(0, 2000)}

Format your response as JSON array with this structure:
[
  {
    "question": "Question text",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]`;

    if (useGroq) {
      const { Groq } = await import('groq-sdk');
      const groq = new Groq({ 
        apiKey,
        dangerouslyAllowBrowser: true 
      });
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful quiz generator. Always respond with valid JSON only, no markdown formatting.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        // Use a currently supported Groq model
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || '[]';
      try {
        const questions = JSON.parse(response);
        return questions.map((q: any, index: number) => ({
          id: `q${index + 1}`,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        }));
      } catch (error) {
        console.error('Error parsing AI response:', error);
        return generateMockQuestions(text, numQuestions);
      }
    } else {
      // Use OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful quiz generator. Always respond with valid JSON only, no markdown formatting.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '[]';
      try {
        const questions = JSON.parse(content);
        return questions.map((q: any, index: number) => ({
          id: `q${index + 1}`,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        }));
      } catch (error) {
        console.error('Error parsing AI response:', error);
        return generateMockQuestions(text, numQuestions);
      }
    }
  } catch (error) {
    console.error('Error generating quiz:', error);
    toast.error('Error generating quiz. Using sample questions.');
    return generateMockQuestions(text, numQuestions);
  }
};

// Generate mock questions (fallback)
const generateMockQuestions = (text: string, numQuestions: number): QuizQuestion[] => {
  const questions: QuizQuestion[] = [];
  const sampleQuestions = [
    {
      question: 'What is the main topic discussed in the text?',
      options: ['Technology', 'Education', 'Science', 'History'],
      correctAnswer: 1,
      explanation: 'The text primarily discusses educational concepts and learning methods.',
    },
    {
      question: 'According to the text, what is an important learning strategy?',
      options: ['Memorization', 'Active Practice', 'Passive Reading', 'Skipping Difficult Topics'],
      correctAnswer: 1,
      explanation: 'Active practice is emphasized as a key learning strategy in the text.',
    },
    {
      question: 'What does the text suggest about spaced repetition?',
      options: ['It is ineffective', 'It enhances long-term retention', 'It only works for some people', 'It is outdated'],
      correctAnswer: 1,
      explanation: 'The text highlights spaced repetition as an effective method for long-term retention.',
    },
    {
      question: 'How does the text describe the learning process?',
      options: ['Linear and simple', 'Complex and iterative', 'Fast and easy', 'Unnecessary'],
      correctAnswer: 1,
      explanation: 'The text describes learning as a complex, iterative process.',
    },
    {
      question: 'What is a key takeaway from the text?',
      options: ['Learning is always easy', 'Consistent practice is important', 'Only experts can learn', 'Learning requires no effort'],
      correctAnswer: 1,
      explanation: 'The text emphasizes that consistent practice is crucial for effective learning.',
    },
  ];

  for (let i = 0; i < Math.min(numQuestions, sampleQuestions.length); i++) {
    questions.push({
      id: `q${i + 1}`,
      ...sampleQuestions[i],
    });
  }

  return questions;
};

// Generate AI feedback based on score
export const generateFeedback = async (score: number, totalQuestions: number): Promise<string> => {
  const percentage = (score / totalQuestions) * 100;
  
  if (percentage >= 90) {
    return `Excellent work! You scored ${score}/${totalQuestions} (${percentage.toFixed(0)}%). You have a strong understanding of the material. Keep up the great work! 🌟`;
  } else if (percentage >= 70) {
    return `Good job! You scored ${score}/${totalQuestions} (${percentage.toFixed(0)}%). You have a solid grasp of most concepts. Review the areas you missed to strengthen your knowledge. 👍`;
  } else if (percentage >= 50) {
    return `Not bad! You scored ${score}/${totalQuestions} (${percentage.toFixed(0)}%). Consider reviewing the material more thoroughly. Focus on the topics you found challenging. 💪`;
  } else {
    return `You scored ${score}/${totalQuestions} (${percentage.toFixed(0)}%). Don't worry, learning is a process! Review the material again and try the quiz once more. Every attempt helps you learn better. 📚`;
  }
};

// Get badge based on performance
export const getBadge = (score: number, totalQuestions: number): string => {
  const percentage = (score / totalQuestions) * 100;
  
  if (percentage === 100) return '🏆 Perfect Score';
  if (percentage >= 90) return '⭐ Excellent';
  if (percentage >= 80) return '🎯 Great Job';
  if (percentage >= 70) return '👍 Good Work';
  if (percentage >= 60) return '📚 Keep Learning';
  return '💪 Keep Trying';
};

