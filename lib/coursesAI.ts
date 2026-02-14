import { Timestamp } from 'firebase/firestore';
import { createCourse, createLesson, Course, Lesson, createCourseQuiz, CourseQuizQuestion } from './courses';
import toast from 'react-hot-toast';

export interface BasicCourseInput {
  title: string;
  description: string;
  category: string;
  price: number;
  duration: number; // minutes
  level: 'beginner' | 'intermediate' | 'advanced';
  instructor: string;
  instructorId: string;
}

interface GeneratedCourseContent {
  fullDescription: string;
  learningOutcomes: string[];
  modules: Array<{
    title: string;
    lessons: Array<{ title: string; description: string; notes?: string; duration: number; videoURL?: string }>;
  }>;
  thumbnailURL?: string;
  sampleVideoURL?: string;
}

const getSupportedGroqModel = () => 'llama-3.3-70b-versatile';

function normalizeVideoUrl(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
      let id = '';
      if (u.hostname === 'youtu.be') {
        id = u.pathname.replace('/', '');
      } else if (u.searchParams.get('v')) {
        id = u.searchParams.get('v') as string;
      } else if (u.pathname.startsWith('/embed/')) {
        id = u.pathname.split('/').pop() || '';
      }
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  } catch {
    return url;
  }
}

async function callAIForCourse(input: BasicCourseInput): Promise<GeneratedCourseContent | null> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) return null;
  const useGroq = !!process.env.NEXT_PUBLIC_GROQ_API_KEY;

  const prompt = `Generate a complete online course structure as strict JSON. Do not include markdown. Fields:
{
  "fullDescription": string,
  "learningOutcomes": string[],
  "modules": [
    {
      "title": string,
      "lessons": [
        { "title": string, "description": string, "notes": string, "duration": number, "videoURL": string }
      ]
    }
  ],
  "thumbnailURL": string,
  "sampleVideoURL": string
}

Context:
Title: ${input.title}
Category: ${input.category}
Level: ${input.level}
Target Duration (minutes): ${input.duration}
Short Description: ${input.description}
Audience: Beginner to ${input.level}
Ensure durations roughly sum to target duration.
Require at least 5 lessons total across modules. Description should be ~5 lines.
`;

  try {
    if (useGroq) {
      const { Groq } = await import('groq-sdk');
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
      const completion = await groq.chat.completions.create({
        model: getSupportedGroqModel(),
        temperature: 0.5,
        messages: [
          { role: 'system', content: 'You produce strict JSON only.' },
          { role: 'user', content: prompt },
        ],
      });
      const content = completion.choices[0]?.message?.content || '';
      return JSON.parse(content);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        messages: [
          { role: 'system', content: 'You produce strict JSON only.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return JSON.parse(content);
  } catch (e) {
    console.error('AI generation failed, using fallback:', e);
    return null;
  }
}

function placeholderThumbnail(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/450`;
}

function placeholderVideo() {
  // Big Buck Bunny on YouTube (embed URL)
  return 'https://www.youtube.com/embed/aqz-KE-bpKQ';
}

export async function generateAndCreateCourse(input: BasicCourseInput): Promise<{ courseId: string; lessonIds: string[] }>{
  // Get AI plan or use fallback
  const ai = await callAIForCourse(input);

  const fullDescription = ai?.fullDescription || `${input.description}\n\nThis course covers ${input.category} at ${input.level} level.`;
  const outcomes = ai?.learningOutcomes?.length ? ai.learningOutcomes : [
    'Understand core concepts',
    'Apply techniques to real examples',
    'Build a small project',
  ];

  const thumb = ai?.thumbnailURL || placeholderThumbnail(input.title);
  const sampleVid = ai?.sampleVideoURL || placeholderVideo();

  // Create course first
  const baseCourse: Omit<Course, 'id' | 'createdAt' | 'updatedAt'> = {
    title: input.title,
    description: `${fullDescription}\n\nLearning Outcomes:\n- ${outcomes.join('\n- ')}`,
    category: input.category,
    instructor: input.instructor,
    instructorId: input.instructorId,
    imageURL: thumb,
    price: input.price,
    rating: 0,
    totalRatings: 0,
    lessons: [],
    enrolledStudents: [],
    level: input.level,
    duration: input.duration,
  };

  const courseId = await createCourse(baseCourse);

  // Create lessons from AI or a minimal fallback structure
  const modules = ai?.modules && ai.modules.length ? ai.modules : [
    { title: 'Introduction', lessons: [ { title: 'Welcome', description: 'Course overview', duration: Math.max(5, Math.round(input.duration * 0.05)), videoURL: sampleVid } ] },
    { title: 'Core Concepts', lessons: [ { title: 'Fundamentals', description: 'Key ideas', duration: Math.max(15, Math.round(input.duration * 0.3)), videoURL: sampleVid } ] },
    { title: 'Project', lessons: [ { title: 'Hands-on', description: 'Apply what you learned', duration: Math.max(20, Math.round(input.duration * 0.4)), videoURL: sampleVid } ] },
    { title: 'Conclusion', lessons: [ { title: 'Wrap-up', description: 'Summary and next steps', duration: Math.max(5, Math.round(input.duration * 0.05)), videoURL: sampleVid } ] },
  ];

  const lessonIds: string[] = [];
  let orderCounter = 1;
  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      const id = await createLesson({
        courseId,
        title: `${mod.title}: ${lesson.title}`,
        description: lesson.description,
        notes: lesson.notes || '',
        videoURL: normalizeVideoUrl(lesson.videoURL || sampleVid),
        duration: Math.max(3, Math.min(180, Math.round(lesson.duration || 10))),
        order: orderCounter++,
      } as Omit<Lesson, 'id' | 'createdAt'>);
      lessonIds.push(id);
    }
  }

  // Generate and persist 20 MCQs for the course
  try {
    const quizQuestions = await generateCourseQuizViaAI({
      title: input.title,
      description: fullDescription,
      notes: modules.flatMap(m => m.lessons.map(l => `${l.title}: ${l.description}\n${l.notes || ''}`)).join('\n\n').slice(0, 6000),
    });
    if (quizQuestions && quizQuestions.length) {
      await createCourseQuiz(courseId, quizQuestions);
    }
  } catch (e) {
    console.error('AI course quiz generation failed:', e);
  }

  toast.success('AI course generated!');
  return { courseId, lessonIds };
}

async function generateCourseQuizViaAI(context: { title: string; description: string; notes: string; }): Promise<CourseQuizQuestion[] | null> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) return null;
  const useGroq = !!process.env.NEXT_PUBLIC_GROQ_API_KEY;

  const prompt = `Create exactly 20 multiple-choice questions (MCQs) for a course. Respond with strict JSON array only.
Each item format: {"question": string, "options": [string, string, string, string], "correctAnswer": number, "explanation": string}
Context Title: ${context.title}
Course Description: ${context.description}
Course Notes: ${context.notes}
`;

  try {
    if (useGroq) {
      const { Groq } = await import('groq-sdk');
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
      const completion = await groq.chat.completions.create({
        model: getSupportedGroqModel(),
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'You produce strict JSON only.' },
          { role: 'user', content: prompt },
        ],
      });
      const content = completion.choices[0]?.message?.content || '';
      const parsed = JSON.parse(content);
      return (parsed as any[]).map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }));
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'You produce strict JSON only.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(content);
    return (parsed as any[]).map((q) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));
  } catch (e) {
    console.error('AI generation failed for course quiz:', e);
    return null;
  }
}


