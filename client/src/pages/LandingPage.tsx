import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.js';
import {
  Play,
  ArrowRight,
  Sparkles,
  Terminal,
  Cpu,
  HelpCircle,
  CheckCircle2,
  Code2,
  Zap,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  // Stagger entrance animations
  const containerVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: 'easeOut',
        staggerChildren: 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  // Continuous subtle 3D floating animation for interactive badges
  const floatingAnimation = (delay: number) => ({
    y: [-4, 4, -4],
    transition: {
      duration: 3.8,
      repeat: Infinity,
      ease: 'easeInOut',
      delay,
    },
  });

  return (
    <div className="min-h-[88vh] flex items-center justify-center w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Outer Card Container */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-6xl rounded-[32px] border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl p-6 sm:p-10 lg:p-14 relative overflow-hidden transition-colors"
      >
        {/* Subtle Ambient Gradient Glows */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-gradient-to-tl from-emerald-500/10 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center relative z-10">
          
          {/* ================= LEFT COLUMN: Visual GCC Arena & Floating Interactive Badges ================= */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 relative flex justify-center items-center"
          >
            {/* Visual Main Sandbox Terminal Frame */}
            <div className="relative w-full max-w-[380px] rounded-[26px] overflow-hidden shadow-2xl border border-[var(--border-line)] bg-[var(--bg-surface)]">
              {/* Window Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-panel)] border-b border-[var(--border-line)] text-[11px] font-mono text-[var(--text-muted)]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-semibold text-[var(--text-main)]">matrix_transpose.c</span>
                </div>
                <span className="text-emerald-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  GCC 14
                </span>
              </div>

              {/* Code Snippet in Terminal */}
              <div className="p-4 sm:p-5 font-mono text-xs leading-relaxed text-[var(--text-muted)] bg-[var(--bg-surface)] select-none">
                <div className="text-slate-400 dark:text-slate-500">// O(1) in-place transpose</div>
                <div><span className="text-cyan-500">#include</span> &lt;stdio.h&gt;</div>
                <div className="pt-1.5"><span className="text-purple-500">void</span> <span className="text-[var(--text-main)] font-semibold">transpose</span>(<span className="text-purple-500">int</span> n, <span className="text-purple-500">int</span> m[n][n]) &#123;</div>
                <div className="pl-4"><span className="text-purple-500">for</span> (<span className="text-purple-500">int</span> i = <span className="text-amber-500">0</span>; i &lt; n; i++) &#123;</div>
                <div className="pl-8"><span className="text-purple-500">for</span> (<span className="text-purple-500">int</span> j = i + <span className="text-amber-500">1</span>; j &lt; n; j++) &#123;</div>
                <div className="pl-12"><span className="text-purple-500">int</span> tmp = m[i][j];</div>
                <div className="pl-12">m[i][j] = m[j][i];</div>
                <div className="pl-12">m[j][i] = tmp;</div>
                <div className="pl-8">&#125;</div>
                <div className="pl-4">&#125;</div>
                <div>&#125;</div>
              </div>

              {/* Benchmark Footer */}
              <div className="px-4 py-2.5 bg-[var(--bg-panel)] border-t border-[var(--border-line)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  0 Warnings • Clean Build
                </span>
                <span className="text-[10px]">0.002s</span>
              </div>
            </div>

            {/* Floating Left Mini-Toolbar */}
            <motion.div
              animate={floatingAnimation(0.2)}
              className="absolute -left-3 sm:-left-5 top-1/4 bg-[var(--bg-panel)]/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-[var(--border-line)] flex flex-col gap-2.5 z-20"
            >
              {[Code2, Terminal, Cpu, Zap].map((Icon, idx) => (
                <div
                  key={idx}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-cyan-500 hover:bg-cyan-500/10 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </div>
              ))}
            </motion.div>

            {/* Floating "Question? Socratic AI" Badge (Top-Right) */}
            <motion.div
              animate={floatingAnimation(0.9)}
              className="absolute -right-2 sm:-right-5 top-8 bg-[var(--bg-panel)]/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-[var(--border-line)] flex items-center gap-2.5 z-20"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500 shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[var(--text-main)]">Socratic AI Mentor</div>
                <div className="text-[10px] text-[var(--text-muted)]">C11 Memory Guidance</div>
              </div>
            </motion.div>

            {/* Floating "Result: 100% Passed" Badge (Middle-Right) */}
            <motion.div
              animate={floatingAnimation(1.4)}
              className="absolute -right-3 sm:-right-6 bottom-16 bg-[var(--bg-panel)]/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-[var(--border-line)] flex items-center gap-2.5 z-20"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[var(--text-main)]">Test Suite Passed</div>
                <div className="text-[10px] text-emerald-500 font-semibold">100% Accuracy Score</div>
              </div>
            </motion.div>

            {/* Floating Execution Equalizer Bars (Bottom-Left) */}
            <motion.div
              animate={floatingAnimation(1.8)}
              className="absolute -left-2 sm:-left-4 -bottom-4 bg-[var(--bg-panel)]/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-[var(--border-line)] flex items-center gap-3 w-48 z-20"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-mono text-[var(--text-muted)] mb-1">Execution Pulse</div>
                <div className="flex items-center gap-1 h-3.5 overflow-hidden">
                  {[40, 70, 95, 60, 100, 45, 80, 50, 90, 65, 85, 30].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [`${h * 0.3}%`, `${h}%`, `${h * 0.3}%`] }}
                      transition={{
                        duration: 1.3,
                        repeat: Infinity,
                        delay: i * 0.08,
                        ease: 'easeInOut',
                      }}
                      className="w-1 bg-cyan-500 rounded-full"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ================= RIGHT COLUMN: Hero Headline & Action CTAs ================= */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left space-y-6">
            
            {/* Tagline Pill */}
            <motion.div variants={itemVariants}>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                Institutional C Systems & Evaluation
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--text-main)] tracking-tight leading-[1.12]"
            >
              Think in logic. <br />
              <span className="relative text-cyan-600 dark:text-cyan-400">
                Code in C.
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500 ml-1.5 align-baseline" />
              </span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg text-[var(--text-muted)] max-w-xl leading-relaxed"
            >
              The premier engineering platform for low-level systems programming, algorithmic rigor, automated GCC 14 compiler sandboxing, and proctored CIE evaluation.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              variants={itemVariants}
              className="pt-2 flex flex-wrap items-center gap-3.5"
            >
              {user ? (
                <Link
                  to="/dashboard"
                  className="px-7 py-3.5 rounded-full bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-7 py-3.5 rounded-full bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Sign In with Institutional PRN</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}

              {/* Secondary Student Manual Button */}
              <a
                href="/student-guide.html"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 rounded-full border border-[var(--border-line)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] font-semibold text-sm transition-all flex items-center gap-2.5 cursor-pointer bg-[var(--bg-panel)] active:scale-95"
              >
                <div className="w-6 h-6 rounded-full bg-cyan-500/15 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
                <span>Student Manual & CIE Guide</span>
              </a>
            </motion.div>

          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
