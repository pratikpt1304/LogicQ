import React from 'react';
import { motion } from 'framer-motion';

// ─── Fade Up Animation ───────────────────────────────────────────────────────
// Smoothly rises and fades in on mount / viewport entry.
// Uses `animate` to guarantee items NEVER get stuck at opacity: 0.

interface FadeUpProps {
  children: React.ReactNode;
  delay?: number;       // seconds (default 0)
  duration?: number;    // seconds (default 0.35)
  className?: string;
}

export const FadeUp: React.FC<FadeUpProps> = ({
  children,
  delay = 0,
  duration = 0.35,
  className = '',
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

// ─── Stagger Container ───────────────────────────────────────────────────────
// Smooth stagger animation for cards and lists.
// Staggers quickly (0.02s) so even lists of 100+ items appear instantly without lag.

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;  // delay between each item (default 0.025s)
  initialDelay?: number;  // delay for first item (default 0)
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className = '',
  staggerDelay = 0.025,
  initialDelay = 0,
}) => (
  <motion.div
    className={className}
    initial="hidden"
    animate="visible"
    variants={{
      hidden: { opacity: 1 },   // container ALWAYS visible — only children animate
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
          delayChildren: initialDelay,
        },
      },
    }}
  >
    {children}
  </motion.div>
);

// ─── Stagger Item ────────────────────────────────────────────────────────────
// Individual item inside StaggerContainer

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({ children, className = '' }) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 14 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
      },
    }}
  >
    {children}
  </motion.div>
);

// ─── Scale In ────────────────────────────────────────────────────────────────
// Slightly zooms in on mount

interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const ScaleIn: React.FC<ScaleInProps> = ({ children, delay = 0, className = '' }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

