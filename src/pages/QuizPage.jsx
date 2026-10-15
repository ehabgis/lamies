import { useState, useEffect } from 'react';

import { useParams, useNavigate } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';

import confetti from 'canvas-confetti';

import { useGameStore } from '../store/gameStore';

import { MAP_LOCATIONS } from '../data/curriculumData';
import { useVoiceNarration } from '../context/VoiceNarrationContext';

import { SpeakerHigh } from 'phosphor-react';



const Mascot = ({ mood }) => {

  const emojis = {

    normal: '😊',

    happy: '😄',

    thinking: '🤔',

    sad: '😢',

    excited: '🤩'

  };



  return (

    <motion.div

      animate={{

        y: [0, -10, 0],

        rotate: [0, 5, -5, 0]

      }}

      transition={{

        y: { duration: 2, repeat: Infinity },

        rotate: { duration: 3, repeat: Infinity }

      }}

      className="text-8xl filter drop-shadow-2xl cursor-pointer hover:scale-110 transition-transform"

    >

      {emojis[mood] || emojis.normal}

    </motion.div>

  );

};



export default function QuizPage() {
  const { locationId } = useParams();

  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const [showResult, setShowResult] = useState(false);

  const [score, setScore] = useState(0);

  const [isFinished, setIsFinished] = useState(false);

  const [mascotMood, setMascotMood] = useState('normal');

  const [shake, setShake] = useState(false);
  const { speak, enabled: voiceEnabled } = useVoiceNarration();



  const { addPoints, completeQuiz } = useGameStore();



  const allLocations = [

    ...MAP_LOCATIONS.minerals,

    ...MAP_LOCATIONS.energy,

    ...MAP_LOCATIONS.water,

    ...MAP_LOCATIONS.projects

  ];



  const location = allLocations.find(l => l.id === locationId);



  useEffect(() => {

    // Entrance sound effect (optional/future)

    setMascotMood('thinking');

    const timer = setTimeout(() => setMascotMood('normal'), 1000);

    return () => clearTimeout(timer);

  }, [currentQuestion]);



  if (!location || !location.quiz) return null;



  const baseQuiz = location.quiz || [];
  const bonusQuestions = [
    {
      question: "أي معدن يُستخرج من الصحراء الشرقية؟",
      options: ["الذهب", "الفوسفات", "النحاس"],
      correct: 0,
      hint: "معدن ثمين يلمع وله لون أصفر."
    },
    {
      question: "ما مصدر الطاقة النظيفة من الشمس؟",
      options: ["الطاقة الشمسية", "الغاز الطبيعي", "الفحم"],
      correct: 0,
      hint: "تأتي من الشمس وتعتبر صديقة للبيئة."
    },
    {
      question: "أين يقع أكبر مصدر مياه في مصر؟",
      options: ["البحر الأحمر", "النيل", "البحر المتوسط"],
      correct: 0,
      hint: "نهر عظيم يسير عبر مصر."
    },
    {
      question: "ما أهم استخدام للفوسفات في الزراعة؟",
      options: ["تحسين التربة", "تنظيف الماء", "بناء الطرق"],
      correct: 0,
      hint: "يدخل في صنع الأسمدة المهمة."
    },
    {
      question: "أي مشروع قومي جديد تعلمت عنه؟",
      options: ["العاصمة الإدارية", "فندق قديم", "متحف صغير"],
      correct: 0,
      hint: "مدينة جديدة حديثة في مصر."
    },
    {
      question: "ما أهمية قناة السويس الجديدة للتجارة العالمية؟",
      options: ["تسهيل النقل", "تربية الأسماك", "السياحة"],
      correct: 0,
      hint: "طريق مهمة للسفن والتجارة."
    },
    {
      question: "من يستفيد من تحلية مياه البحر؟",
      options: ["السكان", "الحيوانات", "النباتات"],
      correct: 0,
      hint: "في المناطق الصحراوية والساحلية."
    },
    {
      question: "ما دور السد العالي في مصر؟",
      options: ["الكهرباء", "السياحة", "الصيد"],
      correct: 0,
      hint: "ينتج الطاقة الكهربائية المهمة."
    }
  ];

  const quiz = [...baseQuiz, ...bonusQuestions];
  const question = quiz[currentQuestion];
  const progress = ((currentQuestion) / quiz.length) * 100;


  const handleAnswer = (index) => {

    setSelectedAnswer(index);

    setShowResult(true);



    const isCorrect = index === question.correct;

    if (isCorrect) {

      setScore(prev => prev + 20);

      addPoints(20);

      setMascotMood('excited');

      confetti({

        particleCount: 100,

        spread: 70,

        origin: { y: 0.6 },

        colors: ['#FFB8E1', '#9AD9FF', '#C6F5DD', '#FFE07A']
      });

      speak('إجابة صحيحة! ممتاز جداً!', { channel: 'quiz-feedback', profile: 'child' });

    } else {

      setMascotMood('sad');

      setShake(true);

      setTimeout(() => setShake(false), 500);

      speak('خطأ! حاول مرة أخرى وركز أكثر قليلاً.', { channel: 'quiz-feedback', profile: 'child' });

    }



    setTimeout(() => {

      if (currentQuestion < quiz.length - 1) {

        setCurrentQuestion(prev => prev + 1);

        setSelectedAnswer(null);

        setShowResult(false);

        setMascotMood('normal');

      } else {

        setIsFinished(true);

        completeQuiz(locationId, 0);

        setMascotMood('happy');

        fireworks();

      }

    }, 2000); // Gives time to read feedback

  };



  const fireworks = () => {

    const duration = 5 * 1000;

    const animationEnd = Date.now() + duration;

    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };



    const random = (min, max) => Math.random() * (max - min) + min;



    const interval = setInterval(function () {

      const timeLeft = animationEnd - Date.now();



      if (timeLeft <= 0) {

        return clearInterval(interval);

      }



      const particleCount = 50 * (timeLeft / duration);

      confetti({ ...defaults, particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } });

      confetti({ ...defaults, particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } });

    }, 250);

  };



  const speakQuestion = () => {
    speak(question.question, { channel: 'quiz-question', profile: 'child' });

  };



  if (isFinished) {

    return (

      <div data-tts-root className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative" style={{backgroundImage: 'linear-gradient(to bottom, #FF69B4 0%, #87CEEB 18%, #FFD700 36%, #90EE90 54%, #FFB347 72%, #DDA0DD 90%, #FF7F50 100%)'}}>

        {/* Animated Background Shapes */}

        <div className="absolute inset-0 overflow-hidden pointer-events-none">

          {[...Array(5)].map((_, i) => (

            <motion.div

              key={i}

              className="absolute bg-white/10 rounded-full"

              initial={{ y: "100vh", x: Math.random() * 100 + "vw", scale: Math.random() }}

              animate={{ y: "-20vh", rotate: 360 }}

              transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, ease: "linear" }}

              style={{ width: Math.random() * 200 + 50, height: Math.random() * 200 + 50 }}

            />

          ))}

        </div>



        <motion.div

          initial={{ scale: 0.8, opacity: 0, rotate: -10 }}

          animate={{ scale: 1, opacity: 1, rotate: 0 }}

          className="bg-white/95 backdrop-blur-xl rounded-[40px] p-8 md:p-12 max-w-lg w-full shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-center border-8 border-yellow-300 relative z-10"

        >

          <motion.div

            animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.2, 1] }}

            transition={{ duration: 2, repeat: Infinity }}

            className="text-9xl mb-6 filter drop-shadow-lg"

          >

            🎉

          </motion.div>



          <h1 className="text-5xl font-black text-purple-600 mb-2 font-comic">ممتاز جداً!</h1>

          <p className="text-xl text-slate-600 mb-8 font-bold">انتهيت من {location.name} بنجاح! 🎉</p>



          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl p-6 mb-8 text-white transform rotate-2 hover:rotate-0 transition-transform shadow-lg">

            <p className="text-sm font-black opacity-90 uppercase tracking-widest">نقاطك النهائية</p>

            <p className="text-7xl font-black drop-shadow-md">{score}</p>

          </div>



          <motion.button

            whileHover={{ scale: 1.05 }}

            whileTap={{ scale: 0.95 }}

            onClick={() => navigate('/map')}

            className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-xl shadow-lg border-b-8 border-purple-800 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-3"

          >

            <span>العودة للخريطة</span> 🗺️

          </motion.button>

        </motion.div>

      </div>

    );

  }



  return (

    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-sky-400 via-indigo-500 to-purple-600 overflow-hidden font-comic">



      {/* Gamified Header */}

      <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-white/10 backdrop-blur-md shadow-lg border-b border-white/20">

        <motion.div

          initial={{ x: -50, opacity: 0 }}

          animate={{ x: 0, opacity: 1 }}

          className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-2xl border-2 border-white/30"

        >

          <span className="text-3xl filter drop-shadow-md">⭐</span>

          <span className="text-2xl font-black text-white">{score}</span>

        </motion.div>



        <div className="flex-1 max-w-md mx-4 relative h-6 bg-black/20 rounded-full overflow-hidden border-2 border-white/30 hidden md:block">

          <motion.div

            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 relative"

            initial={{ width: 0 }}

            animate={{ width: `${progress}%` }}

            transition={{ type: "spring", stiffness: 50 }}

          >

            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-xl">⭐</div>

          </motion.div>

        </div>



        <motion.button

          whileHover={{ scale: 1.1 }}

          whileTap={{ scale: 0.9 }}

          onClick={() => navigate('/map')}

          className="bg-white/20 p-2 rounded-xl text-white hover:bg-white/30 transition-colors"

        >

          ← رجوع

        </motion.button>

      </div>



      <div className="w-full max-w-4xl flex flex-col md:flex-row items-center gap-8 z-10 mt-20 md:mt-0">



        {/* Mascot Column */}

        <div className="hidden md:flex flex-col items-center gap-4">

          <Mascot mood={mascotMood} />

          <div className="bg-white/90 p-4 rounded-2xl shadow-xl border-4 border-white text-center max-w-[200px]">

            <p className="font-bold text-slate-700 text-sm">

              {mascotMood === 'thinking' ? "فكر... ما هي الإجابة الصحيحة؟" :

                mascotMood === 'excited' ? "إجابة صحيحة! رائع جداً!" :

                  mascotMood === 'sad' ? "هذه ليست الإجابة الصحيحة!" :

                    "اختر الإجابة الصحيحة!"}

            </p>

          </div>

        </div>



        {/* Quiz Content */}

        <motion.div

          initial={{ y: 50, opacity: 0 }}

          animate={{ y: 0, opacity: 1 }}

          className={`flex-1 bg-white/95 backdrop-blur-xl rounded-[40px] p-6 md:p-10 w-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-[8px] ${shake ? 'border-red-400' : 'border-white'} ${shake ? 'animate-shake' : ''}`}

        >

          {/* Question Header */}

          <div className="text-center mb-8 relative">

            <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4 rounded-full shadow-lg border-4 border-white text-4xl w-24 h-24 flex items-center justify-center animate-bounce-slow">

              {location.emoji}

            </div>



            <motion.div

              key={currentQuestion}

              initial={{ opacity: 0, scale: 0.9 }}

            animate={{ opacity: 1, scale: 1 }}
            className="mt-10"
          >
            <p className="text-sm font-black text-slate-500 mb-2">السؤال {currentQuestion + 1} من {quiz.length}</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 leading-relaxed mb-4">
              {question.question}
            </h2>
            <button
              onClick={speakQuestion}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-colors ${voiceEnabled ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-500'}`}
              title={voiceEnabled ? '\u0627\u0633\u0645\u0639 \u0627\u0644\u0633\u0624\u0627\u0644 \u0628\u0635\u0648\u062a \u0631\u0627\u062c\u0644' : '\u0627\u0644\u0635\u0648\u062a \u0627\u0644\u0639\u0627\u0645 \u0645\u0642\u0641\u0648\u0644'}
            >
              <SpeakerHigh size={20} weight="fill" />
              <span>{voiceEnabled ? 'صوت مشغل' : 'صوت معطل'}</span>
            </button>
            {question.hint && (
              <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3 text-sm font-bold">
                تلميح مهم: {question.hint}
              </div>
            )}
          </motion.div>
          </div>



            <div className="mt-6 bg-white/90 border-2 border-indigo-100 rounded-3xl p-4 md:p-6 text-right">

              <h3 className="text-lg md:text-xl font-black text-slate-800 mb-3">نصائح مهمة</h3>

              <ul className="space-y-2 text-sm text-slate-600 font-bold">

                <li className="flex items-start gap-2"><span className="text-emerald-500">{'✓'}</span><span>اختر الإجابة الصحيحة ببطء مع التفكير.</span></li>

                <li className="flex items-start gap-2"><span className="text-emerald-500">{'✓'}</span><span>استخدم التلميح إذا وجدت السؤال صعباً جداً.</span></li>

                <li className="flex items-start gap-2"><span className="text-emerald-500">{'✓'}</span><span>الإجابة المتميزة تحصل على +20 نقطة.</span></li>

              </ul>

            </div>





          {/* Options Grid with Stagger Animations */}

          <div className="grid grid-cols-1 gap-4 mt-8">

            <AnimatePresence mode='wait'>

              {question.options.map((option, index) => {

                let stateStyle = 'bg-white border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300';

                if (showResult) {

                  if (index === question.correct) stateStyle = 'bg-green-100 border-green-500 text-green-800 shadow-[0_0_20px_rgba(74,222,128,0.5)] scale-105 animate-bounce-kids';

                  else if (index === selectedAnswer) stateStyle = 'bg-red-100 border-red-500 text-red-800 opacity-60';

                  else stateStyle = 'bg-slate-50 border-slate-200 opacity-50';

                }



                return (

                  <motion.button

                    key={index}

                    initial={{ opacity: 0, x: -50, rotateY: -90 }}

                    animate={{ opacity: 1, x: 0, rotateY: 0 }}

                    transition={{ delay: index * 0.15, type: "spring", stiffness: 100, damping: 20 }}

                    whileHover={!showResult ? { scale: 1.05, x: 15 } : {}}

                    whileTap={!showResult ? { scale: 0.95, rotateY: 10 } : {}}

                    onClick={() => !showResult && handleAnswer(index)}

                    disabled={showResult}

                    className={`relative w-full p-5 rounded-3xl font-bold text-xl text-right border-[3px] transition-all duration-300 flex items-center justify-between group stagger-item ${stateStyle} shadow-md interactive-card`}
                  >

                    <div className="flex items-center gap-4">

                      <span className={`w-10 h-10 flex items-center justify-center rounded-full text-lg font-black ${showResult && index === question.correct ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-200 group-hover:text-indigo-700'}`}>

                        {['?', '?', '?', '?'][index]}

                      </span>

                      <span>{option}</span>

                    </div>



                    {showResult && index === question.correct && (

                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl">

                        ?

                      </motion.div>

                    )}

                    {showResult && index === selectedAnswer && index !== question.correct && (

                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl">

                        ?

                      </motion.div>

                    )}

                  </motion.button>

                );

              })}

            </AnimatePresence>

          </div>



        </motion.div>

      </div>



      {/* Mobile Mascot (Bottom) */}

      <div className="md:hidden fixed bottom-4 right-4 z-50">

        <div className="relative">

          <div className="absolute bottom-full right-0 mb-2 bg-white p-2 rounded-xl text-xs font-bold shadow-lg w-32 text-center pointer-events-none">

            {mascotMood === 'thinking' ? "جاري التفكير!" : "ممتاز جداً!"}

          </div>

          <Mascot mood={mascotMood} />

        </div>

      </div>



    </div>

  );

}






