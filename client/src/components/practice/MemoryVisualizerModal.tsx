import React, { useState } from 'react';
import { X, Layers, ArrowRight, Play, RotateCcw, Cpu, Database, Eye, Info, Sparkles } from 'lucide-react';

interface MemorySlot {
  address: string;
  name: string;
  type: string;
  value: string;
  pointsTo?: string; // Address it points to (if pointer)
  isHighlighted?: boolean;
}

interface StepData {
  stepTitle: string;
  codeSnippet: string;
  explanation: string;
  stackSlots: MemorySlot[];
  heapSlots?: MemorySlot[];
}

const PRESETS: Record<string, { title: string; description: string; steps: StepData[] }> = {
  pointer_swap: {
    title: 'Pointer Dereferencing & Modification',
    description: 'Learn how pointers hold memory addresses and modify target variables directly using the * operator.',
    steps: [
      {
        stepTitle: 'Step 1: Declare Variable',
        codeSnippet: 'int a = 42;',
        explanation: 'The system allocates 4 bytes on the Stack at address 0x7ffd10 and stores the value 42.',
        stackSlots: [
          { address: '0x7ffd10', name: 'a', type: 'int', value: '42', isHighlighted: true },
        ],
      },
      {
        stepTitle: 'Step 2: Declare Pointer & Store Address',
        codeSnippet: 'int *p = &a;',
        explanation: 'The pointer variable `p` is allocated 8 bytes on the Stack. Its value is the memory address of `a` (&a = 0x7ffd10).',
        stackSlots: [
          { address: '0x7ffd10', name: 'a', type: 'int', value: '42' },
          { address: '0x7ffd18', name: 'p', type: 'int *', value: '0x7ffd10', pointsTo: '0x7ffd10', isHighlighted: true },
        ],
      },
      {
        stepTitle: 'Step 3: Modify via Pointer Dereference (*p)',
        codeSnippet: '*p = 99;',
        explanation: 'Dereferencing (*p) follows the address stored in p (0x7ffd10) and mutates the value of `a` from 42 to 99!',
        stackSlots: [
          { address: '0x7ffd10', name: 'a', type: 'int', value: '99', isHighlighted: true },
          { address: '0x7ffd18', name: 'p', type: 'int *', value: '0x7ffd10', pointsTo: '0x7ffd10' },
        ],
      },
    ],
  },
  array_pointers: {
    title: 'Arrays are Pointers in Disguise',
    description: 'Understand why arr[i] is strictly identical to *(arr + i) in C memory representation.',
    steps: [
      {
        stepTitle: 'Step 1: Allocate Array',
        codeSnippet: 'int arr[3] = {10, 20, 30};',
        explanation: '3 consecutive 4-byte integers are allocated on the Stack: arr[0], arr[1], arr[2]. Notice addresses increase by 4 bytes.',
        stackSlots: [
          { address: '0x7ffd00', name: 'arr[0]', type: 'int', value: '10', isHighlighted: true },
          { address: '0x7ffd04', name: 'arr[1]', type: 'int', value: '20' },
          { address: '0x7ffd08', name: 'arr[2]', type: 'int', value: '30' },
        ],
      },
      {
        stepTitle: 'Step 2: Pointer Arithmetic (*(arr + 1))',
        codeSnippet: 'int val = *(arr + 1); // Returns 20',
        explanation: 'Adding 1 to arr moves by 1 sizeof(int) (4 bytes), pointing directly to 0x7ffd04.',
        stackSlots: [
          { address: '0x7ffd00', name: 'arr[0]', type: 'int', value: '10' },
          { address: '0x7ffd04', name: 'arr[1]', type: 'int', value: '20', isHighlighted: true },
          { address: '0x7ffd08', name: 'arr[2]', type: 'int', value: '30' },
          { address: '0x7ffd10', name: 'val', type: 'int', value: '20', isHighlighted: true },
        ],
      },
    ],
  },
  heap_dma: {
    title: 'Heap Allocation with malloc() & free()',
    description: 'Visualizing the difference between Stack (local variables) and Heap (dynamic memory).',
    steps: [
      {
        stepTitle: 'Step 1: Allocate on Heap with malloc',
        codeSnippet: 'int *ptr = (int *)malloc(sizeof(int));\n*ptr = 100;',
        explanation: '`ptr` lives on the Stack, but it points to an address (0x9000a0) located on the Heap!',
        stackSlots: [
          { address: '0x7ffd20', name: 'ptr', type: 'int *', value: '0x9000a0', pointsTo: '0x9000a0', isHighlighted: true },
        ],
        heapSlots: [
          { address: '0x9000a0', name: '*ptr (Heap block)', type: 'int', value: '100', isHighlighted: true },
        ],
      },
      {
        stepTitle: 'Step 2: Free Memory to Avoid Leaks',
        codeSnippet: 'free(ptr);\nptr = NULL;',
        explanation: '`free(ptr)` deallocates the Heap block. Setting `ptr = NULL` avoids a dangling pointer bug.',
        stackSlots: [
          { address: '0x7ffd20', name: 'ptr', type: 'int *', value: '0x0 (NULL)', isHighlighted: true },
        ],
        heapSlots: [
          { address: '0x9000a0', name: 'Freed Memory', type: '—', value: 'DEALLOCATED', isHighlighted: false },
        ],
      },
    ],
  },
};

interface MemoryVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryVisualizerModal: React.FC<MemoryVisualizerModalProps> = ({ isOpen, onClose }) => {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('pointer_swap');
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  if (!isOpen) return null;

  const currentPreset = PRESETS[selectedPresetKey] || PRESETS.pointer_swap;
  const currentStep = currentPreset.steps[currentStepIdx] || currentPreset.steps[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0C0F1F] border border-[#252C4F] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-[#252C4F] bg-[#141932] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>C Memory &amp; Pointer Stack Visualizer</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Interactive
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Understand memory addresses, pointer dereferencing (*p), and stack vs heap layout.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Tabs */}
        <div className="px-4 py-2.5 border-b border-[#252C4F] bg-[#0E1326] flex items-center gap-2 overflow-x-auto no-scrollbar">
          {Object.entries(PRESETS).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setSelectedPresetKey(k);
                setCurrentStepIdx(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedPresetKey === k
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-[#141932] text-slate-400 border border-[#252C4F] hover:text-slate-200'
              }`}
            >
              {v.title}
            </button>
          ))}
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Step Controls & Code Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 bg-[#141932] p-4 rounded-xl border border-[#252C4F]">
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                  {currentStep.stepTitle}
                </span>
                <span className="text-[11px] text-slate-400">
                  Step {currentStepIdx + 1} of {currentPreset.steps.length}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#080B16] border border-[#252C4F] text-emerald-400 font-mono text-xs whitespace-pre-wrap">
                {currentStep.codeSnippet}
              </div>

              <p className="text-slate-300 text-xs font-sans leading-relaxed">
                {currentStep.explanation}
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={currentStepIdx === 0}
                  onClick={() => setCurrentStepIdx((i) => Math.max(0, i - 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold transition cursor-pointer"
                >
                  &lt; Prev Step
                </button>
                <button
                  type="button"
                  disabled={currentStepIdx === currentPreset.steps.length - 1}
                  onClick={() => setCurrentStepIdx((i) => Math.min(currentPreset.steps.length - 1, i + 1))}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStepIdx(0)}
                  title="Reset to first step"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer ml-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Memory Theory Callout */}
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 text-xs font-sans space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Key C Principle: Memory Addresses</span>
                </h4>
                <ul className="list-disc pl-4 space-y-1 mt-2 text-[11px] text-slate-300">
                  <li><strong>&amp; (Address-Of) operator:</strong> Finds where a variable lives in RAM (e.g. `&amp;a` = `0x7ffd10`).</li>
                  <li><strong>* (Dereference) operator:</strong> Goes to that address and reads or writes the actual data.</li>
                  <li><strong>Pointer size:</strong> On 64-bit modern computers, all pointers take 8 bytes (64 bits) regardless of data type.</li>
                </ul>
              </div>
              <div className="text-[11px] font-mono text-cyan-300 bg-black/40 p-2.5 rounded-lg border border-indigo-500/20">
                Formula: `arr[i] == *(arr + i)`
              </div>
            </div>
          </div>

          {/* Visual Memory Map */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>RAM Memory Layout (Stack &amp; Heap)</span>
              </h4>
              <span className="text-[10px] text-slate-400">
                Hex addresses (high to low on Stack)
              </span>
            </div>

            {/* Stack Segment */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-indigo-400 flex items-center gap-1.5">
                <span>[STACK SEGMENT: main()]</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentStep.stackSlots.map((slot) => (
                  <div
                    key={slot.address}
                    className={`p-3 rounded-xl border transition-all ${
                      slot.isHighlighted
                        ? 'bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/10 ring-2 ring-cyan-500/30'
                        : 'bg-[#141932] border-[#252C4F]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-[#252C4F]">
                      <span className="font-mono text-cyan-400 font-semibold">{slot.address}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] uppercase">
                        {slot.type}
                      </span>
                    </div>
                    <div className="pt-2 flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{slot.name}</span>
                      <span className="text-emerald-400 font-bold text-sm">{slot.value}</span>
                    </div>
                    {slot.pointsTo && (
                      <div className="mt-2 text-[10px] text-amber-300 flex items-center gap-1 pt-1.5 border-t border-slate-800/80">
                        <ArrowRight className="w-3 h-3 text-amber-400" />
                        <span>Points to address {slot.pointsTo}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Heap Segment (If present) */}
            {currentStep.heapSlots && currentStep.heapSlots.length > 0 && (
              <div className="space-y-2 pt-3">
                <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <span>[HEAP SEGMENT: Dynamic malloc() Memory]</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {currentStep.heapSlots.map((slot) => (
                    <div
                      key={slot.address}
                      className={`p-3 rounded-xl border transition-all ${
                        slot.isHighlighted
                          ? 'bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/30'
                          : 'bg-[#141932] border-[#252C4F]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-[#252C4F]">
                        <span className="font-mono text-amber-400 font-semibold">{slot.address}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] uppercase">
                          {slot.type}
                        </span>
                      </div>
                      <div className="pt-2 flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{slot.name}</span>
                        <span className="text-amber-300 font-bold text-sm">{slot.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#252C4F] bg-[#141932] flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-sans">
            LogicQ Interactive Pedagogical Memory Visualizer
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
};
