import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TerminalLaserScanProps {
  active: boolean;
  color?: string;
  className?: string;
}

export const TerminalLaserScan: React.FC<TerminalLaserScanProps> = ({
  active,
  color = 'from-transparent via-cyan-400 to-transparent',
  className = '',
}) => {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`relative w-full h-[2px] overflow-hidden bg-slate-900/50 ${className}`}
        >
          {/* Scanning Laser Beam */}
          <motion.div
            className={`absolute top-0 bottom-0 w-1/3 bg-gradient-to-r ${color} shadow-[0_0_12px_rgba(56,189,248,0.9)]`}
            animate={{
              x: ['-100%', '350%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.1,
              ease: 'easeInOut',
            }}
          />

          {/* Ambient Glow Line */}
          <div className="absolute inset-0 bg-cyan-500/20 blur-[1px]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
