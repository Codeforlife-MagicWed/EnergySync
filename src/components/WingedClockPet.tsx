import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, animate, AnimatePresence, useAnimation } from 'motion/react';
import { Sparkles, Heart, Zap, Award, X, Clock, Package, Edit3, Calendar, Check, BatteryCharging } from 'lucide-react';
import { EnergyLevel } from '../types';

// Web Audio API Sound Synthesizer for Chrono-Egg Companion
class ChronoSoundSynth {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Soft mechanical chime on pet
  playPetChime() {
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      // Bell chime: C6 -> E6 -> G6
      osc1.frequency.setValueAtTime(1046.5, now);
      osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08);
      osc1.frequency.exponentialRampToValueAtTime(1567.98, now + 0.18);

      osc2.frequency.setValueAtTime(523.25, now);
      osc2.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);
    } catch {
      // Audio fallback
    }
  }

  // Playful Tickle / Spin Arpeggio
  playTickleSound() {
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [659.25, 783.99, 987.77, 1318.5]; // E5, G5, B5, E6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = now + idx * 0.06;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.14, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.22);
      });
    } catch {
      // Audio fallback
    }
  }

  // Cute crisp chomp / nom sound modulated by tier
  playChompSound(tierMultiplier: number = 1.0) {
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [0, 0.07, 0.14].forEach((offset) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450 * tierMultiplier, now + offset);
        osc.frequency.exponentialRampToValueAtTime(200 * tierMultiplier, now + offset + 0.06);

        gain.gain.setValueAtTime(0.14, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.08);
      });

      // Harmonic high chime
      setTimeout(() => {
        if (!this.ctx) return;
        const chimeNow = this.ctx.currentTime;
        const chime = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(880 * tierMultiplier, chimeNow);
        chime.frequency.exponentialRampToValueAtTime(1760 * tierMultiplier, chimeNow + 0.18);

        chimeGain.gain.setValueAtTime(0.18, chimeNow);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, chimeNow + 0.38);

        chime.connect(chimeGain);
        chimeGain.connect(this.ctx.destination);
        chime.start(chimeNow);
        chime.stop(chimeNow + 0.4);
      }, 160);
    } catch {
      // Audio fallback
    }
  }

  // Level up fanfare
  playLevelUpSound() {
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = now + idx * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.32);
      });
    } catch {
      // Audio fallback
    }
  }
}

const synth = new ChronoSoundSynth();

export type BatteryTier = 'low' | 'medium' | 'high';

export interface BatteryConfig {
  id: BatteryTier;
  label: string;
  shortName: string;
  energyRestore: number;
  xpGain: number;
  colorHex: string;
  accentGlow: string;
  bgClass: string;
  badgeBg: string;
  bars: number;
  totalBars: number;
}

export const BATTERY_TIERS: Record<BatteryTier, BatteryConfig> = {
  low: {
    id: 'low',
    label: 'Pulse Battery (Low)',
    shortName: 'Pulse Battery',
    energyRestore: 15,
    xpGain: 10,
    colorHex: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.5)',
    bgClass: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-400 text-emerald-950',
    badgeBg: 'bg-emerald-400 text-slate-950',
    bars: 1,
    totalBars: 3,
  },
  medium: {
    id: 'medium',
    label: 'Focus Battery (Med)',
    shortName: 'Focus Battery',
    energyRestore: 25,
    xpGain: 20,
    colorHex: '#0284c7',
    accentGlow: 'rgba(2, 132, 199, 0.5)',
    bgClass: 'bg-sky-50 hover:bg-sky-100 border-sky-400 text-sky-950',
    badgeBg: 'bg-sky-400 text-slate-950',
    bars: 2,
    totalBars: 3,
  },
  high: {
    id: 'high',
    label: 'Deep Work Core (High)',
    shortName: 'Deep Work Core',
    energyRestore: 40,
    xpGain: 35,
    colorHex: '#9333ea',
    accentGlow: 'rgba(147, 51, 234, 0.5)',
    bgClass: 'bg-purple-50 hover:bg-purple-100 border-purple-400 text-purple-950',
    badgeBg: 'bg-purple-400 text-slate-950',
    bars: 3,
    totalBars: 3,
  },
};

// Premium Redesigned Battery Capsule Graphic Component
export const BatteryGraphic: React.FC<{
  tier: BatteryTier;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}> = ({ tier, size = 'md', animated = false }) => {
  const config = BATTERY_TIERS[tier];

  const dimensions = {
    sm: { width: 22, height: 32, nubW: 8, nubH: 3, pad: 2, gap: 1.5, barH: 6, radius: 4 },
    md: { width: 30, height: 46, nubW: 12, nubH: 4, pad: 3, gap: 2, barH: 9, radius: 6 },
    lg: { width: 44, height: 68, nubW: 18, nubH: 6, pad: 4, gap: 3, barH: 14, radius: 8 },
  }[size];

  const colorPalettes = {
    low: {
      nub: '#34d399',
      border: '#064e3b',
      innerBg: '#022c22',
      filledBar: 'bg-gradient-to-r from-emerald-400 to-green-300',
      glow: 'shadow-[0_0_8px_#10b981]',
    },
    medium: {
      nub: '#38bdf8',
      border: '#0c4a6e',
      innerBg: '#082f49',
      filledBar: 'bg-gradient-to-r from-sky-400 to-cyan-300',
      glow: 'shadow-[0_0_8px_#0284c7]',
    },
    high: {
      nub: '#c084fc',
      border: '#581c87',
      innerBg: '#3b0764',
      filledBar: 'bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-300',
      glow: 'shadow-[0_0_10px_#c084fc]',
    },
  }[tier];

  return (
    <div className="relative flex flex-col items-center select-none inline-flex">
      {/* Top Terminal Nub */}
      <div
        style={{
          width: dimensions.nubW,
          height: dimensions.nubH,
          backgroundColor: colorPalettes.nub,
        }}
        className="rounded-t-xs border-2 border-b-0 border-slate-900 shadow-xs"
      />

      {/* Main Vertical Capsule Body */}
      <div
        style={{
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: dimensions.radius,
          backgroundColor: colorPalettes.innerBg,
          padding: dimensions.pad,
        }}
        className={`relative border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex flex-col justify-end overflow-hidden ${
          animated ? colorPalettes.glow : ''
        }`}
      >
        {/* Subtle Glass Sheen */}
        <div className="absolute inset-y-0 left-0.5 w-1 bg-white/20 rounded-full pointer-events-none z-10" />

        {/* Energy Cell Bars (Bottom-up fill) */}
        <div
          style={{ gap: dimensions.gap }}
          className="w-full h-full flex flex-col justify-end z-0"
        >
          {Array.from({ length: config.totalBars }).map((_, idx) => {
            const barIndexFromBottom = config.totalBars - 1 - idx;
            const isFilled = barIndexFromBottom < config.bars;

            return (
              <div
                key={idx}
                style={{
                  height: dimensions.barH,
                  borderRadius: Math.max(2, dimensions.radius - 3),
                }}
                className={`w-full border border-slate-900/40 transition-all duration-300 ${
                  isFilled
                    ? `${colorPalettes.filledBar} ${animated ? 'animate-pulse' : ''} shadow-xs`
                    : 'bg-slate-800/60'
                }`}
              />
            );
          })}
        </div>

        {/* Center Spark/Bolt on High Tier */}
        {tier === 'high' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <Zap className="w-3 h-3 text-amber-300 fill-amber-300 drop-shadow-[0_0_4px_#f59e0b] animate-bounce" />
          </div>
        )}
      </div>
    </div>
  );
};

let particleIdCounter = 0;
const getUniquePetEntityId = (prefix = 'p') => `${prefix}_${Date.now()}_${++particleIdCounter}_${Math.random().toString(36).substring(2, 7)}`;

interface Particle {
  id: string;
  x: number;
  y: number;
  icon: 'gear' | 'heart' | 'star' | 'battery' | 'zzz' | 'deep';
  color: string;
}

interface FallingBattery {
  id: string;
  tier: BatteryTier;
  x: number;
  baseX: number;
  y: number;
  vy: number;
  targetY: number;
  age: number;
  rotation: number;
}

// Reward Battery Flying to Pouch on Task Completion
interface FlyingRewardBattery {
  id: string;
  tier: BatteryTier;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

const PET_WIDTH = 88;
const PET_HEIGHT = 96;

// Contextual English Dialogue Pool
const DIALOGUES = {
  balancing: [
    "Whoa! Almost lost my balance! Catch me! 💦",
    "Holy feathers! That's a steep drop! 😱",
    "Whoops, slippery ledge! Careful! 🌀",
    "Save me, I'm doing an accidental backflip! 💦",
  ],
  hungry: [
    "I'm starving! Feed me a battery, please! 🪫",
    "Energy critical... I'm going to turn into a fried egg...",
    "Low battery warning! My clock hands are trembling... 🥺",
    "Need a quick recharge to keep watching the time! 🔋",
  ],
  perched: [
    "You've got this! I'll keep track of the time. ⏰",
    "Look at you go! You definitely deserve a battery for this focus.",
    "Guarding your focus right here! No slacking allowed! 👀",
    "Stay in the zone! Every minute brings you closer to success! ✨",
  ],
  tickle: [
    "Hehe, that tickles! 😆",
    "Hey, back to work! Stop poking me! ✨",
    "Whoa, that was a whole dizzy spin! 💫",
    "You're the best companion ever! 💖",
  ],
  hover: [
    "Aww, head pats! Keep petting me! 🥰",
    "Nothing beats good company and warm vibes! 🌸",
    "Feeling loved and recharged! Thank you! 💖",
  ],
  catchMidAir: [
    "Chomp! Caught it right out of the air! 😋⚡",
    "Yum! That hit the spot, thank you! 🔋",
    "Full power restored, ready to fly with you! 🚀",
  ],
  idle: [
    "Time is gold, don't let it slip away! ⏳",
    "You're doing great today, keep it up! 🚀",
    "Need a quick breather? Remember to take a sip of water! 💧",
    "Tick-tock, tick-tock... Working alongside you!",
    "Every task completed is a victory! 💪",
  ],
  levelUp: [
    "Yay! Level Up! I feel so much stronger! ✨🚀",
    "Level Up! Full energy and ready to soar! 🌟⚡",
    "Awesome job! Thank you for growing with me! 💖🎉",
  ],
  slip: [
    "Whoa! Where did my perch go? 💦",
    "Whoops! Slipping! 💦",
    "Lost my footing! Flapping to safety! 💨",
  ],
};

interface PerchBounds {
  minX: number;
  maxX: number;
  targetY: number;
  width: number;
  label?: string;
}

export const WingedClockPet: React.FC = () => {
  // Dimensions
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  // Safe initial coordinates
  const initialX = Math.min(windowSize.width - 150, Math.max(60, windowSize.width * 0.78));
  const initialY = Math.min(windowSize.height - 180, Math.max(90, windowSize.height * 0.35));

  // Framer Motion Values for precise coordinates
  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);

  // Pet Profile States
  const [petName, setPetName] = useState<string>(() => {
    try {
      return localStorage.getItem('chrono_egg_name') || 'Chrono-Egg';
    } catch {
      return 'Chrono-Egg';
    }
  });

  const [adoptedTimestamp] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('chrono_egg_adopted_at');
      if (saved) return Number(saved);
      const now = Date.now();
      localStorage.setItem('chrono_egg_adopted_at', now.toString());
      return now;
    } catch {
      return Date.now();
    }
  });

  // Calculated Days Nursed
  const daysNursed = Math.max(1, Math.floor((Date.now() - adoptedTimestamp) / (1000 * 60 * 60 * 24)) + 1);

  // States
  const [hunger, setHunger] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('chrono_egg_hunger');
      return saved !== null ? Math.min(100, Math.max(0, Number(saved))) : 80;
    } catch {
      return 80;
    }
  });

  // 3-Tier Battery Inventory
  const [batteries, setBatteries] = useState<Record<BatteryTier, number>>(() => {
    try {
      const low = localStorage.getItem('chrono_egg_battery_low');
      const med = localStorage.getItem('chrono_egg_battery_med');
      const high = localStorage.getItem('chrono_egg_battery_high');
      const legacy = localStorage.getItem('winged_clock_batteries');
      const legacyCount = legacy !== null ? Number(legacy) : 2;

      return {
        low: low !== null ? Math.max(0, Number(low)) : 1,
        medium: med !== null ? Math.max(0, Number(med)) : Math.max(1, legacyCount),
        high: high !== null ? Math.max(0, Number(high)) : 1,
      };
    } catch {
      return { low: 1, medium: 2, high: 1 };
    }
  });

  const [xp, setXp] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('chrono_egg_xp');
      return saved !== null ? Number(saved) : 20;
    } catch {
      return 20;
    }
  });

  const [level, setLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('chrono_egg_level');
      return saved !== null ? Math.max(1, Number(saved)) : 1;
    } catch {
      return 1;
    }
  });

  // Petting XP Cooldown Tracker (5 minutes = 300,000 ms)
  const PET_XP_COOLDOWN_MS = 5 * 60 * 1000;
  const [lastRewardedPetTime, setLastRewardedPetTime] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('chrono_egg_last_pet_time');
      return saved !== null ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState<number>(0);

  // Dynamic next-level XP threshold based on current level
  const nextLevelXP = level * 100;
  const isPetXpReady = Date.now() - lastRewardedPetTime >= PET_XP_COOLDOWN_MS;

  // Interactive motion states
  const bodyImpactControls = useAnimation();
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false); // Double-click tickle
  const [spinCount, setSpinCount] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isFeeding, setIsFeeding] = useState(false);
  const [isPetting, setIsPetting] = useState(false);
  const [isPerched, setIsPerched] = useState(false);
  const [isStartled, setIsStartled] = useState(false);
  const [perchLabel, setPerchLabel] = useState<string | null>(null);
  const [perchBounds, setPerchBounds] = useState<PerchBounds | null>(null);
  const perchedNodeRef = useRef<HTMLElement | null>(null);
  const [isWalkingOnEdge, setIsWalkingOnEdge] = useState(false);
  const [isBalancing, setIsBalancing] = useState(false);
  const [balancingSide, setBalancingSide] = useState<'left' | 'right'>('right');
  const [facingRight, setFacingRight] = useState(true);
  const [isChasing, setIsChasing] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  // Dynamic Speech Bubble System
  const [speechText, setSpeechText] = useState<string | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modals & Trays
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [isPouchOpen, setIsPouchOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(petName);

  // Drag-to-chase custom cursor battery state
  const [draggingBatteryTier, setDraggingBatteryTier] = useState<BatteryTier | null>(null);
  const [batteryPos, setBatteryPos] = useState({ x: 0, y: 0 });

  // Gravity Dropped Falling Battery Entities
  const [fallingBatteries, setFallingBatteries] = useState<FallingBattery[]>([]);

  // Task Completion Flying Reward Entities (Physical Screen Coords -> Pouch)
  const [flyingRewards, setFlyingRewards] = useState<FlyingRewardBattery[]>([]);
  const [pouchBumping, setPouchBumping] = useState(false);

  // Total Battery Count for HUD Badge
  const totalBatteries = batteries.low + batteries.medium + batteries.high;

  // Conflict guards & references
  const isRecoveringRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isDroppingRef = useRef(false);
  const isChasingRef = useRef(false);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastDragTimeRef = useRef(0);
  const lastBalancedTimeRef = useRef(0);
  const balancingLockRef = useRef(false);
  const balancingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const balancingRecoveryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeAnimationRef = useRef<{ stopX?: () => void; stopY?: () => void }>({});
  const isInteractingRef = useRef(false);
  const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragCooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentCoordsRef = useRef({ x: initialX, y: initialY });
  const fallingBatteriesRef = useRef<FallingBattery[]>([]);
  fallingBatteriesRef.current = fallingBatteries;

  // Update coordinate refs continuously
  useEffect(() => {
    const unsubscribeX = x.on('change', (latest) => {
      currentCoordsRef.current.x = latest;
    });
    const unsubscribeY = y.on('change', (latest) => {
      currentCoordsRef.current.y = latest;
    });
    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [x, y]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Expression derivations
  const isHungry = hunger < 30;
  const mood = hunger >= 60 ? 'happy' : hunger >= 30 ? 'content' : 'hungry';

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem('chrono_egg_name', petName);
      localStorage.setItem('chrono_egg_hunger', hunger.toString());
      localStorage.setItem('chrono_egg_battery_low', batteries.low.toString());
      localStorage.setItem('chrono_egg_battery_med', batteries.medium.toString());
      localStorage.setItem('chrono_egg_battery_high', batteries.high.toString());
      localStorage.setItem('chrono_egg_xp', xp.toString());
      localStorage.setItem('chrono_egg_level', level.toString());
      localStorage.setItem('chrono_egg_last_pet_time', lastRewardedPetTime.toString());
    } catch {
      // Storage fallback
    }
  }, [petName, hunger, batteries, xp, level, lastRewardedPetTime]);

  // Petting XP Cooldown Countdown Timer
  useEffect(() => {
    const updateCooldown = () => {
      const elapsed = Date.now() - lastRewardedPetTime;
      const remainingMs = Math.max(0, PET_XP_COOLDOWN_MS - elapsed);
      setCooldownRemainingSec(Math.ceil(remainingMs / 1000));
    };

    updateCooldown();
    const timer = setInterval(updateCooldown, 1000);
    return () => clearInterval(timer);
  }, [lastRewardedPetTime, PET_XP_COOLDOWN_MS]);

  // Slow natural hunger decay (1% every 50s)
  useEffect(() => {
    const timer = setInterval(() => {
      setHunger((prev) => Math.max(0, prev - 1));
    }, 50000);
    return () => clearInterval(timer);
  }, []);

  // Trigger contextual speech bubble
  const triggerSpeech = useCallback((type: keyof typeof DIALOGUES | string) => {
    const list = (DIALOGUES as Record<string, string[]>)[type] || DIALOGUES.idle;
    const chosen = list[Math.floor(Math.random() * list.length)];
    setSpeechText(chosen);

    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => {
      setSpeechText(null);
    }, 4200);
  }, []);

  // Ambient dialogue cycle (every 22-35s)
  useEffect(() => {
    const ambientTimer = setInterval(() => {
      if (isDragging || isFeeding || isChasing || speechText) return;

      if (isHungry) {
        triggerSpeech('hungry');
      } else if (isPerched) {
        triggerSpeech('perched');
      } else {
        triggerSpeech('idle');
      }
    }, 24000);

    return () => clearInterval(ambientTimer);
  }, [isDragging, isFeeding, isChasing, speechText, isHungry, isPerched, triggerSpeech]);

  // Random blink cycle (only when not perched or feeding)
  useEffect(() => {
    if (isPerched || isFeeding) return;
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 220);
    }, 3200 + Math.random() * 2500);
    return () => clearInterval(blinkInterval);
  }, [isPerched, isFeeding]);

  // Idle Snooze / Zzz Spawner when perched
  useEffect(() => {
    if (!isPerched || isFeeding || isDragging || isChasing) return;
    const zzzInterval = setInterval(() => {
      const newZzz: Particle = {
        id: getUniquePetEntityId('zzz'),
        x: 8 + (Math.random() * 10 - 5),
        y: -18,
        icon: 'zzz',
        color: '#6366f1',
      };
      setParticles((prev) => [...prev.slice(-6), newZzz]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== newZzz.id));
      }, 2200);
    }, 2800);

    return () => clearInterval(zzzInterval);
  }, [isPerched, isFeeding, isDragging, isChasing]);

  // Hover Petting Heart Stream
  useEffect(() => {
    if (!isHovered || isDragging || isFeeding || isChasing) return;

    const hoverHeartInterval = setInterval(() => {
      const newHeart: Particle = {
        id: getUniquePetEntityId('heart'),
        x: (Math.random() - 0.5) * 35,
        y: -12 - Math.random() * 20,
        icon: 'heart',
        color: '#f43f5e',
      };
      setParticles((prev) => [...prev.slice(-8), newHeart]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== newHeart.id));
      }, 900);
    }, 550);

    return () => clearInterval(hoverHeartInterval);
  }, [isHovered, isDragging, isFeeding, isChasing]);

  const showNotification = (msg: string) => {
    setPopupMessage(msg);
    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    popupTimeoutRef.current = setTimeout(() => {
      setPopupMessage(null);
    }, 2800);
  };

  const triggerParticles = useCallback((type: 'gear' | 'heart' | 'star' | 'battery' | 'deep', customColor?: string) => {
    const newParticles: Particle[] = Array.from({ length: 6 }).map(() => ({
      id: getUniquePetEntityId(type),
      x: (Math.random() - 0.5) * 70,
      y: -15 - Math.random() * 40,
      icon: type,
      color: customColor || (type === 'heart' ? '#f43f5e' : type === 'gear' ? '#0284c7' : type === 'battery' ? '#10b981' : type === 'deep' ? '#9333ea' : '#eab308'),
    }));

    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
    }, 900);
  }, []);

  // Stop active flights safely
  const stopCurrentFlight = useCallback(() => {
    if (activeAnimationRef.current.stopX) {
      activeAnimationRef.current.stopX();
      activeAnimationRef.current.stopX = undefined;
    }
    if (activeAnimationRef.current.stopY) {
      activeAnimationRef.current.stopY();
      activeAnimationRef.current.stopY = undefined;
    }
    if (balancingTimerRef.current) {
      clearTimeout(balancingTimerRef.current);
      balancingTimerRef.current = null;
    }
    if (balancingRecoveryTimerRef.current) {
      clearTimeout(balancingRecoveryTimerRef.current);
      balancingRecoveryTimerRef.current = null;
    }
  }, []);

  // Smooth flight to target coordinate
  const flyTo = useCallback((targetX: number, targetY: number, onArrival?: () => void, customSpeed?: number) => {
    if (isDraggingRef.current && !isChasingRef.current) return;

    stopCurrentFlight();
    setIsBalancing(false);
    setIsWalkingOnEdge(false);
    balancingLockRef.current = false;
    bodyImpactControls.stop();
    bodyImpactControls.set({ rotate: 0 });

    const startX = currentCoordsRef.current.x;
    const startY = currentCoordsRef.current.y;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 6) {
      if (onArrival) onArrival();
      return;
    }

    setFacingRight(dx >= 0);
    setIsPerched(false);

    const speed = customSpeed || 200;
    const duration = Math.max(0.4, Math.min(3.8, distance / speed));

    const animX = animate(x, targetX, {
      duration,
      ease: isChasingRef.current ? 'easeOut' : [0.25, 0.1, 0.25, 1],
    });

    const animY = animate(y, targetY, {
      duration,
      ease: isChasingRef.current ? 'easeOut' : [0.25, 0.1, 0.25, 1],
      onComplete: () => {
        if (!isDraggingRef.current && onArrival) onArrival();
      },
    });

    activeAnimationRef.current = {
      stopX: animX.stop,
      stopY: animY.stop,
    };
  }, [stopCurrentFlight, x, y]);

  // Startled Recovery Sequence when perched DOM element unmounts or slips away
  const triggerStartledRecovery = useCallback(async () => {
    if (isRecoveringRef.current || isDraggingRef.current || isDroppingRef.current) return;
    isRecoveringRef.current = true;

    // Immediately clear perched node reference and state
    perchedNodeRef.current = null;
    setIsPerched(false);
    setPerchBounds(null);
    setIsBalancing(false);
    setIsWalkingOnEdge(false);
    setIsStartled(true);

    // Gracefully capture current MotionValues so it never snaps to NaN / 0,0
    try {
      const curX = x.get();
      const curY = y.get();
      if (typeof curX === 'number' && !isNaN(curX) && typeof curY === 'number' && !isNaN(curY)) {
        currentCoordsRef.current = { x: curX, y: curY };
      }
    } catch {
      // Safe fallback
    }

    // 1. Reaction (Startle): Exclamation chime & sweat particles & startled dialogue
    try {
      triggerParticles('heart', '#f43f5e');
      synth.playPetChime();
      triggerSpeech('slip');
    } catch {
      // Ignore audio/particle errors
    }

    // 2. Physics (Slip & Catch):
    try {
      // Stage 1: Drop the pet slightly as if it lost its footing
      await bodyImpactControls.start({
        y: 36,
        rotate: [0, -14, 12],
        scaleX: 0.92,
        scaleY: 1.14,
        transition: { duration: 0.16, ease: 'easeIn' },
      });

      // Stage 2: Flap wings frantically & catch in air
      await bodyImpactControls.start({
        y: -20,
        rotate: [12, -8, 4, 0],
        scaleX: 1.08,
        scaleY: 0.94,
        transition: { duration: 0.22, ease: 'easeInOut' },
      });

      // Stage 3: Recover and float back up to stable baseline
      await bodyImpactControls.start({
        y: 0,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        scale: 1,
        transition: { type: 'spring', stiffness: 280, damping: 18 },
      });
    } catch {
      // Ignore animation cancellation
    } finally {
      setIsStartled(false);
      isRecoveringRef.current = false;
      lastDragTimeRef.current = Date.now();
    }
  }, [bodyImpactControls, triggerParticles, triggerSpeech, x, y]);

  // 1. ELEMENT CONNECTION MONITOR (Detecting unmounted / orphaned perched elements)
  useEffect(() => {
    if (!isPerched) {
      perchedNodeRef.current = null;
      return;
    }

    const checkInterval = setInterval(() => {
      // If recovery is already handling the pet, immediately clear interval
      if (isRecoveringRef.current) {
        clearInterval(checkInterval);
        return;
      }

      const node = perchedNodeRef.current;
      // Strictly verify node existence and live DOM document connection
      if (!node || !node.isConnected) {
        clearInterval(checkInterval);
        triggerStartledRecovery();
        return;
      }

      try {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        if (
          rect.width === 0 ||
          rect.height === 0 ||
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          parseFloat(style.opacity || '1') < 0.1
        ) {
          clearInterval(checkInterval);
          triggerStartledRecovery();
          return;
        }
      } catch {
        // Any error reading unmounted node properties indicates detached/destroyed element
        clearInterval(checkInterval);
        triggerStartledRecovery();
        return;
      }
    }, 400);

    return () => clearInterval(checkInterval);
  }, [isPerched, triggerStartledRecovery]);

  // DOM AUTO-PERCHING & IDLE MOVEMENT
  useEffect(() => {
    const idleLoop = setInterval(() => {
      const timeSinceLastDrag = Date.now() - lastDragTimeRef.current;
      if (
        isRecoveringRef.current ||
        isDraggingRef.current ||
        isDragging ||
        isChasingRef.current ||
        isInteractingRef.current ||
        isFeeding ||
        isPetModalOpen ||
        isStartled ||
        fallingBatteries.length > 0 ||
        timeSinceLastDrag < 3500
      ) {
        return;
      }

      // Hard interrupt and auto-reset before new movement calculation
      setIsBalancing(false);
      setIsWalkingOnEdge(false);
      balancingLockRef.current = false;
      bodyImpactControls.stop();
      bodyImpactControls.set({ rotate: 0 });

      // 65% chance to land and perch on a DOM button/card ledge
      const shouldPerch = Math.random() < 0.65;

      if (shouldPerch) {
        const candidates = Array.from(
          document.querySelectorAll<HTMLElement>(
            '.perchable, button, [role="button"], .card, .task-card, .dashboard-card'
          )
        ).filter((el) => {
          if (
            el.closest('.chrono-hud') ||
            el.closest('.pet-modal') ||
            el.closest('.pointer-events-none') ||
            el.closest('.fixed')
          ) {
            return false;
          }
          const rect = el.getBoundingClientRect();
          if (rect.width < 40 || rect.height < 24) return false;
          if (
            rect.top < 40 ||
            rect.bottom > window.innerHeight - 60 ||
            rect.left < 10 ||
            rect.right > window.innerWidth - 10
          ) {
            return false;
          }
          const style = window.getComputedStyle(el);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            parseFloat(style.opacity || '1') < 0.2
          ) {
            return false;
          }
          return true;
        });

        if (candidates.length > 0) {
          const chosen = candidates[Math.floor(Math.random() * candidates.length)];
          const rect = chosen.getBoundingClientRect();

          const minX = Math.max(15, rect.left - 6);
          const maxX = Math.min(window.innerWidth - PET_WIDTH - 15, rect.right - PET_WIDTH + 6);
          const targetX = Math.max(
            minX,
            Math.min(maxX, rect.left + rect.width / 2 - PET_WIDTH / 2)
          );
          // Rest egg base directly atop the ledge
          const targetY = Math.max(15, rect.top - PET_HEIGHT + 16);

          flyTo(targetX, targetY, () => {
            perchedNodeRef.current = chosen;
            setIsPerched(true);
            setPerchBounds({
              minX,
              maxX,
              targetY,
              width: rect.width,
            });
          });
          return;
        }
      }

      // Free idle wander
      const randX = Math.floor(Math.random() * (window.innerWidth - 180)) + 40;
      const randY = Math.floor(Math.random() * (window.innerHeight - 220)) + 60;
      flyTo(randX, randY, () => {
        perchedNodeRef.current = null;
        setIsPerched(false);
        setPerchLabel(null);
        setPerchBounds(null);
        setIsBalancing(false);
        setIsWalkingOnEdge(false);
      });
    }, 12000 + Math.random() * 5000);

    return () => clearInterval(idleLoop);
  }, [flyTo, isDragging, isFeeding, isPetModalOpen, isStartled, fallingBatteries.length]);

  // 2. EDGE-WALKING & "ALMOST FALLING" BALANCING PHYSICS (Strict Bounds & Cooldown Lock)
  useEffect(() => {
    if (
      !isPerched ||
      !perchBounds ||
      isBalancing ||
      isDragging ||
      isFeeding ||
      isChasing ||
      isSpinning ||
      isPetModalOpen
    ) {
      return;
    }

    // Only walk along ledges that have enough breadth
    if (perchBounds.width < 70 || perchBounds.maxX <= perchBounds.minX + 24) return;

    const edgeWalkInterval = setInterval(() => {
      if (
        isRecoveringRef.current ||
        !isPerched ||
        !perchBounds ||
        isBalancing ||
        isStartled ||
        balancingLockRef.current ||
        isDraggingRef.current ||
        isChasingRef.current ||
        isInteractingRef.current ||
        isFeeding
      ) {
        return;
      }

      // Hard auto-reset before new movement calculation
      setIsBalancing(false);
      bodyImpactControls.set({ rotate: 0 });

      // 60% chance to pace along the ledge
      const shouldWalk = Math.random() < 0.65;
      if (!shouldWalk) return;

      const currentX = currentCoordsRef.current.x;
      const midX = (perchBounds.minX + perchBounds.maxX) / 2;
      const timeSinceLastBalance = Date.now() - lastBalancedTimeRef.current;
      const canTriggerBalance = timeSinceLastBalance > 3500 && !balancingLockRef.current;

      // Choose whether to explore toward the extreme edge or stay in a safe zone
      const targetSide: 'left' | 'right' = currentX < midX ? (Math.random() < 0.65 ? 'right' : 'left') : (Math.random() < 0.65 ? 'left' : 'right');
      
      let targetX: number;
      let willReachExactEdge = false;

      if (canTriggerBalance && Math.random() < 0.5) {
        // Walk all the way to the exact outer ledge boundary
        targetX = targetSide === 'right' ? perchBounds.maxX : perchBounds.minX;
        willReachExactEdge = true;
      } else {
        // Safe interior waddle (20% to 80% of ledge)
        const innerRatio = targetSide === 'right' ? 0.65 + Math.random() * 0.2 : 0.15 + Math.random() * 0.2;
        targetX = perchBounds.minX + (perchBounds.maxX - perchBounds.minX) * innerRatio;
      }

      const dx = targetX - currentX;
      setFacingRight(dx >= 0);
      setIsWalkingOnEdge(true);

      const dist = Math.abs(dx);
      const duration = Math.max(0.6, dist / 80); // cute little waddle steps

      const walkAnim = animate(x, targetX, {
        duration,
        ease: 'linear',
        onComplete: () => {
          setIsWalkingOnEdge(false);
          if (!isPerched || isDraggingRef.current || isRecoveringRef.current) {
            setIsBalancing(false);
            balancingLockRef.current = false;
            bodyImpactControls.set({ rotate: 0 });
            return;
          }

          // ONLY TRIGGER BALANCING IF REACHED THE EXACT BOUNDARY AND NOT ON COOLDOWN
          const atLeftEdge = Math.abs(targetX - perchBounds.minX) <= 2;
          const atRightEdge = Math.abs(targetX - perchBounds.maxX) <= 2;

          if (willReachExactEdge && (atLeftEdge || atRightEdge) && canTriggerBalance) {
            if (isDraggingRef.current || isRecoveringRef.current || isBalancing) return;

            balancingLockRef.current = true;
            lastBalancedTimeRef.current = Date.now();
            setIsBalancing(true);
            setBalancingSide(targetSide);
            triggerSpeech('balancing');
            synth.playTickleSound();
            showNotification(`Whoa! ${petName} almost slipped off the edge! 💦`);

            if (balancingTimerRef.current) clearTimeout(balancingTimerRef.current);
            // Panic flap for 1.2s, then recover smoothly
            balancingTimerRef.current = setTimeout(() => {
              if (!isPerched || isDraggingRef.current || isRecoveringRef.current) {
                setIsBalancing(false);
                balancingLockRef.current = false;
                bodyImpactControls.set({ rotate: 0 });
                return;
              }

              // Waddles safely back to middle area
              const safeX = perchBounds.minX + (perchBounds.maxX - perchBounds.minX) * (0.35 + Math.random() * 0.3);
              setFacingRight(targetSide === 'left');
              setIsWalkingOnEdge(true);

              const returnAnim = animate(x, safeX, {
                duration: 1.0,
                ease: 'easeOut',
                onComplete: () => {
                  setIsWalkingOnEdge(false);
                  if (!isDraggingRef.current && !isRecoveringRef.current) {
                    setIsBalancing(false);
                    bodyImpactControls.set({ rotate: 0 });
                  }
                  // Release lock after an additional recovery cooldown
                  if (balancingRecoveryTimerRef.current) clearTimeout(balancingRecoveryTimerRef.current);
                  balancingRecoveryTimerRef.current = setTimeout(() => {
                    balancingLockRef.current = false;
                  }, 1500);
                },
              });
              activeAnimationRef.current.stopX = returnAnim.stop;
            }, 1200);
          }
        },
      });

      activeAnimationRef.current.stopX = walkAnim.stop;
    }, 6000 + Math.random() * 3000);

    return () => {
      clearInterval(edgeWalkInterval);
      if (balancingTimerRef.current) {
        clearTimeout(balancingTimerRef.current);
        balancingTimerRef.current = null;
      }
      if (balancingRecoveryTimerRef.current) {
        clearTimeout(balancingRecoveryTimerRef.current);
        balancingRecoveryTimerRef.current = null;
      }
    };
  }, [isPerched, perchBounds, isBalancing, isDragging, isFeeding, isChasing, isSpinning, isPetModalOpen, triggerSpeech, x, petName, bodyImpactControls]);

  // Centralized Level-Up & XP Engine
  const gainXp = useCallback((amount: number, sourceName = 'Activity') => {
    setXp((prevXp) => {
      let currentXp = prevXp + amount;
      let currentLvl = level;
      let didLevelUp = false;

      // Loop in case large XP gains trigger multiple level-ups
      while (currentXp >= currentLvl * 100) {
        currentXp -= currentLvl * 100;
        currentLvl += 1;
        didLevelUp = true;
      }

      if (didLevelUp) {
        setLevel(currentLvl);
        // Reward 1 (Vitality): Instantly restore Chrono Energy / Hunger to 100%
        setHunger(100);

        // Reward 2 (Visuals): Major particle explosion (confetti / stars / hearts / deep cores)
        triggerParticles('star', '#fbbf24');
        triggerParticles('star', '#f59e0b');
        triggerParticles('heart', '#f43f5e');
        triggerParticles('deep', '#a855f7');
        triggerParticles('battery', '#10b981');
        synth.playLevelUpSound();

        // Reward 3 (Dialogue): Force special level-up dialogue
        triggerSpeech('levelUp');

        showNotification(`🎉 LEVEL UP! ${petName} is now LVL ${currentLvl}! Energy fully restored! ✨⚡`);
      }

      return currentXp;
    });
  }, [level, petName, triggerParticles, triggerSpeech]);

  // Petting interaction (Always triggers happy reaction; awards +5 XP with 5-min throttle)
  const triggerPetting = useCallback(() => {
    setIsPetting(true);
    isInteractingRef.current = true;
    synth.playPetChime();
    triggerParticles(mood === 'happy' ? 'heart' : 'star');

    const now = Date.now();
    const canGainXp = now - lastRewardedPetTime >= PET_XP_COOLDOWN_MS;

    if (canGainXp) {
      setLastRewardedPetTime(now);
      gainXp(5, 'Petting');
      showNotification(`Loved! +5 XP awarded to ${petName}! ❤️✨`);
    } else {
      // Still show heartwarming feedback without spamming XP
      triggerSpeech('hover');
    }

    setTimeout(() => {
      setIsPetting(false);
      isInteractingRef.current = false;
    }, 450);
  }, [mood, petName, lastRewardedPetTime, PET_XP_COOLDOWN_MS, gainXp, triggerParticles, triggerSpeech]);

  // 4. CLEAN GESTURE SEPARATION
  // Double-Click -> Triggers 360 Spin + Star Burst + Laughing Expression
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Cancel pending single-click modal opening!
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setIsPetModalOpen(false);

    setIsSpinning(true);
    setSpinCount((prev) => prev + 1);
    isInteractingRef.current = true;
    synth.playTickleSound();
    triggerParticles('star', '#fbbf24');
    triggerParticles('star', '#f59e0b');
    triggerParticles('heart', '#f43f5e');
    triggerSpeech('tickle');

    gainXp(10, 'Tickling');

    showNotification(`Tickled! ${petName} spun 360° happily! (+10 XP) ✨`);

    setTimeout(() => {
      setIsSpinning(false);
      isInteractingRef.current = false;
    }, 750);
  };

  // Single Click -> Opens Dedicated Pet Info Modal (Clean 220ms debounce so double-click doesn't spam modal)
  const handlePetClick = (e: React.MouseEvent) => {
    if (isDraggingRef.current || isDragging || isChasing) return;
    e.stopPropagation();

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      if (!isSpinning && !isDraggingRef.current) {
        triggerPetting();
        setIsPetModalOpen(true);
      }
    }, 220);
  };

  // Consume a specific tier Battery & Feed (with mid-air bonus support)
  const feedBattery = useCallback((tier: BatteryTier, isMidAirCatch = false) => {
    const config = BATTERY_TIERS[tier];
    const pitchMultiplier = tier === 'high' ? 1.3 : tier === 'medium' ? 1.05 : 0.9;

    setIsFeeding(true);
    isInteractingRef.current = true;
    synth.playChompSound(pitchMultiplier);
    triggerParticles(tier === 'high' ? 'deep' : tier === 'medium' ? 'gear' : 'battery', config.colorHex);

    if (isMidAirCatch) {
      triggerSpeech('catchMidAir');
    }

    setHunger((prev) => Math.min(100, prev + config.energyRestore));

    const bonusXP = isMidAirCatch ? 10 : 0;
    gainXp(config.xpGain + bonusXP, 'Feeding');

    showNotification(
      isMidAirCatch
        ? `Mid-Air Catch! +${config.energyRestore}% Energy & +${config.xpGain + bonusXP} XP! ⚡🏆`
        : `Chomp! +${config.energyRestore}% ${config.shortName}! (+${config.xpGain} XP) 🔋⚡`
    );

    setTimeout(() => {
      setIsFeeding(false);
      isInteractingRef.current = false;
    }, 1100);
  }, [gainXp, triggerParticles, triggerSpeech]);

  // 3. GRAVITY DROP & CHASE MECHANIC
  // Start dragging battery from food pouch
  const startDraggingBattery = (tier: BatteryTier, clientX: number, clientY: number) => {
    if (batteries[tier] <= 0) return;
    setDraggingBatteryTier(tier);
    setBatteryPos({ x: clientX, y: clientY });
    setIsChasing(true);
    isChasingRef.current = true;
    setIsPerched(false);
    stopCurrentFlight();
  };

  // Pointer move & release during battery drag
  useEffect(() => {
    if (!draggingBatteryTier) return;

    const handlePointerMove = (e: PointerEvent) => {
      setBatteryPos({ x: e.clientX, y: e.clientY });

      // The Chase: Chrono-Egg glides smoothly toward current mouse coordinates
      const targetPetX = Math.max(10, Math.min(window.innerWidth - PET_WIDTH - 10, e.clientX - PET_WIDTH / 2));
      const targetPetY = Math.max(10, Math.min(window.innerHeight - PET_HEIGHT - 10, e.clientY - PET_HEIGHT / 2));

      flyTo(targetPetX, targetPetY, undefined, 460);

      // Check distance for eager feeding mouth
      const petCenterX = currentCoordsRef.current.x + PET_WIDTH / 2;
      const petCenterY = currentCoordsRef.current.y + PET_HEIGHT / 2;
      const dist = Math.hypot(e.clientX - petCenterX, e.clientY - petCenterY);

      if (dist < 80) {
        setIsFeeding(true);
      } else {
        setIsFeeding(false);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const activeTier = draggingBatteryTier;
      setDraggingBatteryTier(null);
      setIsChasing(false);
      isChasingRef.current = false;

      const petCenterX = currentCoordsRef.current.x + PET_WIDTH / 2;
      const petCenterY = currentCoordsRef.current.y + PET_HEIGHT / 2;
      const dist = Math.hypot(e.clientX - petCenterX, e.clientY - petCenterY);

      if (dist < 75 && activeTier) {
        // Direct Chomp
        setBatteries((prev) => ({ ...prev, [activeTier]: Math.max(0, prev[activeTier] - 1) }));
        feedBattery(activeTier, false);
      } else if (activeTier) {
        // GRAVITY DROP: Battery floats downward gracefully, pet smoothly glides to intercept!
        setBatteries((prev) => ({ ...prev, [activeTier]: Math.max(0, prev[activeTier] - 1) }));

        const newFalling: FallingBattery = {
          id: getUniquePetEntityId('bat'),
          tier: activeTier,
          x: e.clientX,
          baseX: e.clientX,
          y: e.clientY,
          vy: 0.5,
          targetY: window.innerHeight - 75,
          age: 0,
          rotation: (Math.random() - 0.5) * 8,
        };

        setFallingBatteries((prev) => [...prev, newFalling]);
        setIsChasing(true);
        isChasingRef.current = true;
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingBatteryTier, flyTo, feedBattery]);

  // Physics animation loop for Falling Batteries & Smooth Mid-Air Pet Glide Interception
  useEffect(() => {
    if (fallingBatteries.length === 0) return;

    let animId: number;

    const updatePhysics = () => {
      setFallingBatteries((prev) => {
        if (prev.length === 0) return prev;

        const updated: FallingBattery[] = [];

        prev.forEach((bat) => {
          const age = bat.age + 1;
          // Very gentle atmospheric gravity drift (float descent over ~2.5-3.5 seconds)
          const nextVy = Math.min(3.2, bat.vy + 0.032);
          const nextY = bat.y + nextVy;
          // Gentle lateral sway as it floats downward
          const nextX = Math.max(25, Math.min(window.innerWidth - 25, bat.baseX + Math.sin(age * 0.04) * 14));
          const nextRot = Math.sin(age * 0.04) * 10;

          const petCenterX = currentCoordsRef.current.x + PET_WIDTH / 2;
          const petCenterY = currentCoordsRef.current.y + PET_HEIGHT / 2;
          const distToPet = Math.hypot(nextX - petCenterX, nextY - petCenterY);

          // Smooth Pet glide toward the falling battery coordinates
          const targetPetX = Math.max(10, Math.min(window.innerWidth - PET_WIDTH - 10, nextX - PET_WIDTH / 2));
          const targetPetY = Math.max(10, Math.min(window.innerHeight - PET_HEIGHT - 10, nextY - PET_HEIGHT / 2));
          flyTo(targetPetX, targetPetY, undefined, 420);

          // Mid-air catch collision (< 68px)
          if (distToPet < 68) {
            feedBattery(bat.tier, true);
            setIsChasing(false);
            isChasingRef.current = false;
            return;
          }

          // Floor reach: Scoop it up smoothly right before/as it reaches the floor
          if (nextY >= bat.targetY) {
            flyTo(targetPetX, targetPetY, () => {
              feedBattery(bat.tier, true);
              setIsChasing(false);
              isChasingRef.current = false;
            }, 450);
            return;
          }

          updated.push({
            ...bat,
            x: nextX,
            y: nextY,
            vy: nextVy,
            age,
            rotation: nextRot,
          });
        });

        return updated;
      });

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, [fallingBatteries.length, flyTo, feedBattery]);

  // Global Task Completion Listener to launch Flying Battery Reward directly to Pouch
  useEffect(() => {
    const handleTaskCompleted = (e: Event) => {
      const customEvent = e as CustomEvent<{
        energyLevel?: EnergyLevel | string;
        startX?: number;
        startY?: number;
      }>;
      const rawEnergy = (customEvent.detail?.energyLevel || 'Medium').toString().toLowerCase();

      let tier: BatteryTier = 'medium';
      if (rawEnergy.includes('high')) {
        tier = 'high';
      } else if (rawEnergy.includes('low')) {
        tier = 'low';
      }

      // Calculate Target Pouch Coordinates
      const pouchBtn = document.getElementById('food-pouch-button');
      const pouchRect = pouchBtn?.getBoundingClientRect();
      const targetX = pouchRect ? pouchRect.left + pouchRect.width / 2 : window.innerWidth - 48;
      const targetY = pouchRect ? pouchRect.top + pouchRect.height / 2 : window.innerHeight - 48;

      const startX = customEvent.detail?.startX ?? window.innerWidth / 2;
      const startY = customEvent.detail?.startY ?? window.innerHeight / 2;

      const rewardId = `reward_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      setFlyingRewards((prev) => [
        ...prev,
        {
          id: rewardId,
          tier,
          startX,
          startY,
          targetX,
          targetY,
        },
      ]);
    };

    window.addEventListener('task_completed', handleTaskCompleted);
    return () => window.removeEventListener('task_completed', handleTaskCompleted);
  }, []);

  const savePetName = () => {
    if (tempName.trim()) {
      setPetName(tempName.trim());
      setIsEditingName(false);
      synth.playPetChime();
      showNotification(`Renamed to "${tempName.trim()}"! ✨`);
    }
  };

  return (
    <>
      {/* 1. CHRONO-EGG PET COMPANION (Free Roaming / Perching / Sitting) */}
      <motion.div
        key="chrono-egg-pet"
        drag
        dragMomentum={false}
        dragElastic={0}
        onDragStart={() => {
          stopCurrentFlight();
          if (balancingTimerRef.current) {
            clearTimeout(balancingTimerRef.current);
            balancingTimerRef.current = null;
          }
          if (balancingRecoveryTimerRef.current) {
            clearTimeout(balancingRecoveryTimerRef.current);
            balancingRecoveryTimerRef.current = null;
          }
          if (dragCooldownTimerRef.current) {
            clearTimeout(dragCooldownTimerRef.current);
            dragCooldownTimerRef.current = null;
          }
          bodyImpactControls.stop();
          bodyImpactControls.set({ rotate: 0, scaleX: 1, scaleY: 1, y: 0 });
          isDraggingRef.current = true;
          setIsDragging(true);
          setIsBalancing(false);
          setIsWalkingOnEdge(false);
          setIsPerched(false);
          setPerchLabel(null);
          perchedNodeRef.current = null;
          balancingLockRef.current = false;
        }}
        onDragEnd={() => {
          // Immediately release drag state
          isDraggingRef.current = false;
          setIsDragging(false);
          synth.playPetChime();
          lastDragTimeRef.current = Date.now();

          const curX = x.get();
          const curY = y.get();

          // 2. Drag-to-Perch Snap: Check if dropped near a strictly visible button or card
          const candidates = Array.from(
            document.querySelectorAll<HTMLElement>(
              '.perchable, button, [role="button"], .card, .task-card, .dashboard-card'
            )
          ).filter((el) => {
            if (
              el.closest('.chrono-hud') ||
              el.closest('.pet-modal') ||
              el.closest('.pointer-events-none') ||
              el.closest('.fixed')
            ) {
              return false;
            }
            const rect = el.getBoundingClientRect();
            if (rect.width < 40 || rect.height < 24) return false;
            if (
              rect.top < 20 ||
              rect.bottom > window.innerHeight - 40 ||
              rect.left < 10 ||
              rect.right > window.innerWidth - 10
            ) {
              return false;
            }
            const style = window.getComputedStyle(el);
            if (
              style.display === 'none' ||
              style.visibility === 'hidden' ||
              parseFloat(style.opacity || '1') < 0.2
            ) {
              return false;
            }
            return true;
          });

          let snapped = false;
          for (const candidate of candidates) {
            const rect = candidate.getBoundingClientRect();
            const petCenterX = curX + PET_WIDTH / 2;
            const petBottomY = curY + PET_HEIGHT;

            // Dropped within snap boundary atop the element ledge
            if (
              petCenterX >= rect.left - 24 &&
              petCenterX <= rect.right + 24 &&
              petBottomY >= rect.top - 30 &&
              petBottomY <= rect.top + 45
            ) {
              const minX = Math.max(15, rect.left - 6);
              const maxX = Math.min(window.innerWidth - PET_WIDTH - 15, rect.right - PET_WIDTH + 6);
              const targetX = Math.max(minX, Math.min(maxX, curX));
              const targetY = Math.max(15, rect.top - PET_HEIGHT + 16);

              // Direct MotionValue set without re-render thrashing
              x.set(targetX);
              y.set(targetY);
              currentCoordsRef.current = { x: targetX, y: targetY };

              perchedNodeRef.current = candidate;
              setIsPerched(true);
              setPerchBounds({
                minX,
                maxX,
                targetY,
                width: rect.width,
              });
              snapped = true;
              break;
            }
          }

          if (!snapped) {
            const safeX = Math.max(10, Math.min(window.innerWidth - PET_WIDTH - 10, curX));
            const safeY = Math.max(10, Math.min(window.innerHeight - PET_HEIGHT - 10, curY));

            x.set(safeX);
            y.set(safeY);
            currentCoordsRef.current = { x: safeX, y: safeY };
            perchedNodeRef.current = null;
            setIsPerched(false);
            setPerchBounds(null);
          }

          // 1. Framer Motion useAnimation: Cartoony vertical bounce & squash-and-stretch sequence
          // Aggressively return to scale 1, rotate 0 baseline at the end!
          (async () => {
            try {
              // Stage 1: Impact (Squash on the ground)
              await bodyImpactControls.start({
                scaleX: 1.25,
                scaleY: 0.75,
                y: 4,
                rotate: 0,
                transition: { duration: 0.1, ease: 'easeOut' },
              });
              // Stage 2: Bounce Up (Stretch & Spring into the air)
              await bodyImpactControls.start({
                scaleX: 0.9,
                scaleY: 1.1,
                y: -22,
                rotate: 0,
                transition: { type: 'spring', stiffness: 320, damping: 14 },
              });
              // Stage 3: Settle & return cleanly to baseline
              await bodyImpactControls.start({
                scaleX: 1,
                scaleY: 1,
                scale: 1,
                y: 0,
                rotate: 0,
                transition: { type: 'spring', stiffness: 300, damping: 18 },
              });
            } finally {
              isDraggingRef.current = false;
              isDroppingRef.current = false;
            }
          })();

          if (dragCooldownTimerRef.current) clearTimeout(dragCooldownTimerRef.current);
          dragCooldownTimerRef.current = setTimeout(() => {
            isDraggingRef.current = false;
            isDroppingRef.current = false;
          }, 450);
        }}
        onMouseEnter={() => {
          setIsHovered(true);
          if (!isHungry && !isPerched && !isFeeding) {
            triggerSpeech('hover');
          }
        }}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={handleDoubleClick}
        onClick={handlePetClick}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          x,
          y,
          width: PET_WIDTH,
          height: PET_HEIGHT,
          opacity: 1,
          zIndex: 9999,
        }}
        className="select-none cursor-grab active:cursor-grabbing pointer-events-auto"
        title="Click to view stats, double-click to tickle & spin, hover to pet!"
      >
        {/* SIBLING 1: Particle Bursts & Floating Zzz / Hearts (Independent from flip) */}
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, scale: 0.6, x: 0, y: 0 }}
              animate={
                p.icon === 'zzz'
                  ? { opacity: [0, 1, 1, 0], scale: [0.6, 1, 1.15, 0.7], y: -44, x: p.x + 14 }
                  : p.icon === 'heart' && isHovered
                  ? { opacity: [0, 1, 0], scale: [0.7, 1.3, 1], y: -38, x: p.x }
                  : { opacity: 0, scale: 1.5, x: p.x, y: p.y }
              }
              transition={{ duration: p.icon === 'zzz' ? 2.1 : p.icon === 'heart' ? 0.9 : 0.75, ease: 'easeOut' }}
              className="absolute left-1/2 top-1/2"
            >
              {p.icon === 'zzz' ? (
                <div className="font-mono text-xs font-black text-indigo-500 select-none flex items-center drop-shadow-[1px_1px_0px_#ffffff]">
                  z<span className="text-[10px]">z</span><span className="text-[8px]">Z</span>
                </div>
              ) : p.icon === 'heart' ? (
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500 drop-shadow-[0_0_4px_#f43f5e]" />
              ) : p.icon === 'deep' ? (
                <Zap className="w-4 h-4 text-purple-500 fill-purple-500 drop-shadow-[0_0_6px_#9333ea]" />
              ) : p.icon === 'battery' ? (
                <BatteryCharging className="w-4 h-4 text-emerald-500 fill-emerald-500" />
              ) : p.icon === 'gear' ? (
                <Zap className="w-4 h-4 text-cyan-500 fill-cyan-500" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
              )}
            </motion.div>
          ))}
        </div>

        {/* SIBLING 2: SPEECH BUBBLE & REACTION DIALOGUES (ALWAYS UPRIGHT, NEVER MIRRORED, NO PERCH NAME) */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 pointer-events-none z-40 flex flex-col items-center select-none w-max max-w-[270px]">
          <AnimatePresence>
            {speechText ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="relative px-3.5 py-1.5 bg-white text-slate-900 border-2 border-slate-900 rounded-xl text-[11px] font-black shadow-[3px_3px_0px_#0f172a] text-center leading-tight max-w-[240px]"
              >
                <span>{speechText}</span>
                {/* Downward triangle pointer notch */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-b-2 border-r-2 border-slate-900 rotate-45" />
              </motion.div>
            ) : isBalancing || isStartled ? (
              <motion.div
                animate={{ scale: [1, 1.1, 1], y: [0, -2, 0] }}
                transition={{ duration: 0.3, repeat: Infinity }}
                className="relative px-2.5 py-0.5 bg-rose-500 text-white border-2 border-slate-900 rounded-md text-[10px] font-black shadow-[2px_2px_0px_#0f172a] whitespace-nowrap flex items-center gap-1"
              >
                <span>WHOA! 💦</span>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-rose-500 border-b-2 border-r-2 border-slate-900 rotate-45" />
              </motion.div>
            ) : isChasing || fallingBatteries.length > 0 ? (
              <div className="relative px-2 py-0.5 bg-emerald-400 text-slate-900 border-2 border-slate-900 rounded-md text-[10px] font-black shadow-[2px_2px_0px_#0f172a] whitespace-nowrap animate-bounce flex items-center gap-1">
                <span>CHOMP! ⚡</span>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 border-b-2 border-r-2 border-slate-900 rotate-45" />
              </div>
            ) : isHungry ? (
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="relative px-2 py-0.5 bg-rose-500 text-white border-2 border-slate-900 rounded-md text-[9px] font-black shadow-[2px_2px_0px_#0f172a] whitespace-nowrap flex items-center gap-1"
              >
                <span>low battery (T_T)</span>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-rose-500 border-b-2 border-r-2 border-slate-900 rotate-45" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* SIBLING 3: PET GRAPHIC CONTAINER (ONLY THIS CONTAINER HAS DIRECTIONAL FLIP & SPIN) */}
        <motion.div
          animate={{
            scaleX: facingRight ? 1 : -1,
            rotate: spinCount * 360,
          }}
          transition={{
            scaleX: { duration: 0.18, ease: 'easeOut' },
            rotate: { duration: 0.75, ease: 'easeInOut' },
          }}
          className="relative w-full h-full opacity-100 flex items-center justify-center origin-center"
        >
          {/* CUTE WINGS (Left & Right) with GENTLE ORGANIC FLAPPING & SQUASH/STRETCH RESPONSES */}
          {/* Left Wing */}
          <motion.div
            animate={
              isDragging
                ? { rotate: 45, scale: 0.92, x: 2 }
                : isStartled
                ? { rotate: [-42, 42, -42], scale: 1.15, x: 0 }
                : isBalancing
                ? { rotate: [-35, 30, -35], scale: 1.08, x: 0 }
                : isFeeding || isChasing || fallingBatteries.length > 0
                ? { rotate: [0, -22, 0], scale: 1, x: 0 }
                : isPerched
                ? { rotate: 18, scale: 0.88, x: 5 }
                : isHungry
                ? { rotate: [4, 12, 4], scale: 0.95, x: 0 }
                : isHovered
                ? { rotate: [0, -16, 0], scale: 1.02, x: 0 }
                : { rotate: [0, -14, 0], scale: 1, x: 0 }
            }
            transition={
              isDragging
                ? { duration: 0.2, ease: 'easeOut' }
                : isStartled
                ? { duration: 0.08, repeat: Infinity, ease: 'easeInOut' }
                : isBalancing
                ? { duration: 0.18, repeat: Infinity, ease: 'easeInOut' }
                : isPerched
                ? { type: 'spring', stiffness: 300, damping: 22 }
                : isFeeding || isChasing
                ? { duration: 0.28, repeat: Infinity, ease: 'easeInOut' }
                : {
                    duration: 0.7,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }
            }
            className="absolute -left-5 top-7 origin-right pointer-events-none z-0 opacity-100"
          >
            <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
              <path
                d="M24 10C18 3 7 1 2 7C-1 11 2 17 7 17C14 17 20 15 24 10Z"
                fill="#FEF08A"
                stroke="#0F172A"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path d="M16 8C12 5 6 4 3 8" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
              <path d="M19 12C15 10 9 10 6 13" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.div>

          {/* Right Wing */}
          <motion.div
            animate={
              isDragging
                ? { rotate: -45, scale: 0.92, x: -2 }
                : isStartled
                ? { rotate: [42, -42, 42], scale: 1.15, x: 0 }
                : isBalancing
                ? { rotate: [35, -30, 35], scale: 1.08, x: 0 }
                : isFeeding || isChasing || fallingBatteries.length > 0
                ? { rotate: [0, 22, 0], scale: 1, x: 0 }
                : isPerched
                ? { rotate: -18, scale: 0.88, x: -5 }
                : isHungry
                ? { rotate: [-4, -12, -4], scale: 0.95, x: 0 }
                : isHovered
                ? { rotate: [0, 16, 0], scale: 1.02, x: 0 }
                : { rotate: [0, 14, 0], scale: 1, x: 0 }
            }
            transition={
              isDragging
                ? { duration: 0.2, ease: 'easeOut' }
                : isStartled
                ? { duration: 0.08, repeat: Infinity, ease: 'easeInOut' }
                : isBalancing
                ? { duration: 0.18, repeat: Infinity, ease: 'easeInOut' }
                : isPerched
                ? { type: 'spring', stiffness: 300, damping: 22 }
                : isFeeding || isChasing
                ? { duration: 0.28, repeat: Infinity, ease: 'easeInOut' }
                : {
                    duration: 0.7,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }
            }
            className="absolute -right-5 top-7 origin-left pointer-events-none z-0 opacity-100"
          >
            <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
              <path
                d="M2 10C8 3 19 1 24 7C27 11 24 17 19 17C12 17 6 15 2 10Z"
                fill="#FEF08A"
                stroke="#0F172A"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path d="M10 8C14 5 20 4 23 8" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 12C11 10 17 10 20 13" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.div>

          {/* MAIN CHRONO-EGG BODY (Squash & Stretch Impact Bounce & Edge Balancing) */}
          <motion.div
            animate={bodyImpactControls}
            className="relative z-10 flex flex-col items-center"
          >
            <motion.div
              animate={
                isDragging
                  ? { scaleX: 0.9, scaleY: 1.15, y: 0, rotate: 0 }
                  : isBalancing
                  ? { rotate: balancingSide === 'right' ? [0, 24, 18, 28, 0] : [0, -24, -18, -28, 0], y: [0, -2, 0] }
                  : isWalkingOnEdge
                  ? { y: [0, -3, 0], rotate: facingRight ? [0, 3, 0] : [0, -3, 0] }
                  : isPetting
                  ? { scale: [1, 1.08, 1], y: -8 }
                  : isFeeding
                  ? { scale: [1, 1.08, 0.98, 1] }
                  : isPerched
                  ? { scaleX: 1.04, scaleY: 0.94, y: 2, rotate: 0 }
                  : isHovered
                  ? { scale: 1.04, y: -4, rotate: [-1.2, 1.2] }
                  : {
                      y: [0, -6],
                      scaleY: [0.97, 1.03],
                      scaleX: [1.03, 0.97],
                      rotate: [-1.5, 1.5],
                    }
              }
              transition={
                isDragging
                  ? { duration: 0.15, ease: 'easeOut' }
                  : isBalancing
                  ? { duration: 0.7, repeat: 1, ease: 'easeInOut' }
                  : isWalkingOnEdge
                  ? { duration: 0.35, repeat: Infinity, ease: 'easeInOut' }
                  : isPerched
                  ? { duration: 0.4 }
                  : isPetting || isFeeding
                  ? { duration: 0.3 }
                  : isHovered
                  ? { duration: 1.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }
                  : {
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: 'mirror',
                      ease: 'easeInOut',
                    }
              }
              className="flex flex-col items-center"
            >
              {/* BRASS WIND-UP KEY ON TOP */}
              <motion.div
                animate={{
                  rotate: isDragging || isChasing ? [0, 360] : isSpinning ? [0, 720] : isPetting ? [0, 180, 0] : [0, 15, -15, 0],
                }}
                transition={{
                  duration: isDragging || isChasing ? 1.2 : isSpinning ? 0.7 : 4,
                  repeat: isSpinning ? 1 : Infinity,
                  ease: 'easeInOut',
                }}
                className="flex flex-col items-center -mb-1.5 z-20 origin-bottom"
              >
                <div className="flex items-center gap-1">
                  <div className="w-3.5 h-3 bg-amber-400 border-2 border-slate-900 rounded-full shadow-[1px_1px_0px_#0f172a] flex items-center justify-center">
                    <div className="w-1 h-1 bg-slate-900 rounded-full" />
                  </div>
                </div>
                <div className="w-1.5 h-2 bg-amber-500 border-x-2 border-slate-900 -mt-0.5" />
              </motion.div>

              {/* Panic sweat drop when almost falling / balancing / startled */}
              {(isBalancing || isStartled) && (
                <motion.div
                  animate={{
                    y: [-2, -12, -4],
                    x: balancingSide === 'right' ? [0, 8, 12] : [0, -8, -12],
                    scale: [0.6, 1.3, 0.8],
                  }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute -top-3 z-30 pointer-events-none"
                  style={{ [balancingSide === 'right' ? 'right' : 'left']: -6 }}
                >
                  <span className="text-base leading-none select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">💦</span>
                </motion.div>
              )}

              {/* ORGANIC CHRONO-EGG SHELL with 4px border */}
              <div
                className={`relative w-[70px] h-[80px] rounded-[48%_48%_42%_42%_/_56%_56%_44%_44%] border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex flex-col items-center justify-center transition-colors duration-300 overflow-hidden ${
                  isHungry
                    ? 'bg-rose-200'
                    : level >= 5
                    ? 'bg-gradient-to-b from-amber-100 to-amber-200'
                    : 'bg-amber-100'
                }`}
              >
                {/* Egg Shell Shine Arc */}
                <div className="absolute top-2 left-2 w-3.5 h-5 rounded-full border-t-2 border-l-2 border-white/80 -rotate-30 pointer-events-none" />

                {/* Sweat bead when hungry */}
                {isHungry && (
                  <motion.div
                    animate={{ y: [0, 3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute top-3 right-2.5 w-1.5 h-2 bg-sky-400 rounded-full border border-slate-900"
                  />
                )}

                {/* EMBEDDED MECHANICAL CLOCK DIAL & FACIAL EXPRESSIONS */}
                <div className="relative w-12 h-12 rounded-full border-2 border-slate-900 bg-white/95 shadow-inner flex flex-col items-center justify-center">
                  {/* Clock Dial Numeral Markers */}
                  <div className="absolute top-0.5 w-0.5 h-1 bg-slate-900/60 rounded-xs" />
                  <div className="absolute bottom-0.5 w-0.5 h-1 bg-slate-900/60 rounded-xs" />
                  <div className="absolute left-0.5 w-1 h-0.5 bg-slate-900/60 rounded-xs" />
                  <div className="absolute right-0.5 w-1 h-0.5 bg-slate-900/60 rounded-xs" />

                  {/* ROTATING CLOCK HANDS (Subtle background layer) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: isPerched ? 48 : 8,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="w-4 h-0.5 bg-slate-900 origin-left rounded-full absolute left-1/2 top-1/2"
                    />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: isPerched ? 120 : 28,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="w-3 h-0.5 bg-slate-900 origin-left rounded-full absolute left-1/2 top-1/2"
                    />
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 border border-slate-900 z-10" />
                  </div>

                  {/* 1. DYNAMIC FACIAL EXPRESSIONS (Animated with Drag, Spin, Balancing, Hover & Petting) */}
                  <div className="relative z-10 flex flex-col items-center gap-0.5 w-full">
                    {/* Eyes Row */}
                    <div className="flex items-center justify-between w-8 px-0.5">
                      {/* LEFT EYE */}
                      <motion.div
                        key={
                          isDragging || isStartled
                            ? 'drag-l'
                            : isSpinning
                            ? 'spin-l'
                            : isBalancing
                            ? 'balance-l'
                            : isFeeding
                            ? 'feed-l'
                            : isPerched
                            ? 'perch-l'
                            : isHovered
                            ? 'hover-l'
                            : isHungry
                            ? 'hungry-l'
                            : 'happy-l'
                        }
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.15 }}
                      >
                        {isDragging || isStartled ? (
                          /* Shocked/Surprised wide open eye "O" */
                          <div className="w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
                          </div>
                        ) : isSpinning ? (
                          /* Joyful Laughing Star Eye ★ */
                          <span className="text-[12px] font-black text-amber-500 leading-none drop-shadow-[0_0_2px_#fbbf24]">★</span>
                        ) : isBalancing ? (
                          /* Shocked Wide Eye with dilated pupil (°□°) */
                          <div className="w-3 h-3 bg-white border border-slate-900 rounded-full flex items-center justify-center">
                            <div className="w-1 h-1 bg-slate-900 rounded-full animate-ping" />
                          </div>
                        ) : isFeeding || isChasing ? (
                          /* Chomp / Excited Star Eyes (>w<) */
                          <span className="text-[11px] font-black text-slate-900 leading-none">^</span>
                        ) : isPerched ? (
                          /* Sleeping Closed Curved Eye (◡) */
                          <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
                            <path d="M1 2.5C2.2 1 4.8 1 6 2.5" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        ) : isHovered ? (
                          /* Loving Heart Eyes (♥) on Hover */
                          <span className="text-[10px] font-black text-rose-600 leading-none">♥</span>
                        ) : isHungry ? (
                          /* Hungry / Sad Slanted Drooping Eye */
                          <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                            <path d="M1 1.5L5 4" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
                            <circle cx="2" cy="3.5" r="0.8" fill="#38BDF8" />
                          </svg>
                        ) : isBlinking ? (
                          <div className="w-2.5 h-0.5 bg-slate-900 rounded-full" />
                        ) : (
                          /* Happy Sparkling Eye (^‿^) */
                          <div className="w-2.5 h-3 bg-slate-900 rounded-full relative flex items-center justify-center">
                            <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 left-0.5" />
                          </div>
                        )}
                      </motion.div>

                      {/* Soft Rosy Blush (Expands on Hover) */}
                      <div className={`rounded-full transition-all duration-300 ${isHovered ? 'w-2 h-1 bg-rose-400' : 'w-1.5 h-0.5 bg-rose-300'}`} />

                      {/* RIGHT EYE */}
                      <motion.div
                        key={
                          isDragging || isStartled
                            ? 'drag-r'
                            : isSpinning
                            ? 'spin-r'
                            : isBalancing
                            ? 'balance-r'
                            : isFeeding
                            ? 'feed-r'
                            : isPerched
                            ? 'perch-r'
                            : isHovered
                            ? 'hover-r'
                            : isHungry
                            ? 'hungry-r'
                            : 'happy-r'
                        }
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.15 }}
                      >
                        {isDragging || isStartled ? (
                          /* Shocked/Surprised wide open eye "O" */
                          <div className="w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
                          </div>
                        ) : isSpinning ? (
                          /* Joyful Laughing Star Eye ★ */
                          <span className="text-[12px] font-black text-amber-500 leading-none drop-shadow-[0_0_2px_#fbbf24]">★</span>
                        ) : isBalancing ? (
                          /* Shocked Wide Eye with dilated pupil (°□°) */
                          <div className="w-3 h-3 bg-white border border-slate-900 rounded-full flex items-center justify-center">
                            <div className="w-1 h-1 bg-slate-900 rounded-full animate-ping" />
                          </div>
                        ) : isFeeding || isChasing ? (
                          /* Chomp / Excited Star Eyes (>w<) */
                          <span className="text-[11px] font-black text-slate-900 leading-none">^</span>
                        ) : isPerched ? (
                          /* Sleeping Closed Curved Eye (◡) */
                          <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
                            <path d="M1 2.5C2.2 1 4.8 1 6 2.5" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        ) : isHovered ? (
                          /* Loving Heart Eyes (♥) on Hover */
                          <span className="text-[10px] font-black text-rose-600 leading-none">♥</span>
                        ) : isHungry ? (
                          /* Hungry / Sad Slanted Drooping Eye */
                          <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                            <path d="M6 1.5L2 4" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
                            <circle cx="5" cy="3.5" r="0.8" fill="#38BDF8" />
                          </svg>
                        ) : isBlinking ? (
                          <div className="w-2.5 h-0.5 bg-slate-900 rounded-full" />
                        ) : (
                          /* Happy Sparkling Eye (^‿^) */
                          <div className="w-2.5 h-3 bg-slate-900 rounded-full relative flex items-center justify-center">
                            <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 right-0.5" />
                          </div>
                        )}
                      </motion.div>
                    </div>

                    {/* THE MOUTH: Animated Expressions (Chomp, Shocked "O", Sad Wave, Resting Smile, Sleep, Laugh) */}
                    <motion.div
                      key={
                        isDragging || isStartled
                          ? 'mouth-drag'
                          : isSpinning
                          ? 'mouth-spin'
                          : isBalancing
                          ? 'mouth-balance'
                          : isFeeding
                          ? 'mouth-feed'
                          : isPerched
                          ? 'mouth-perch'
                          : isHungry
                          ? 'mouth-hungry'
                          : 'mouth-happy'
                      }
                      animate={{
                        scaleY: isFeeding ? [1, 1.45, 1] : 1,
                        scaleX: isFeeding ? 1.2 : 1,
                      }}
                      transition={{ duration: isFeeding ? 0.2 : 0.3 }}
                      className="origin-top flex items-center justify-center mt-0.5"
                    >
                      {isDragging || isStartled ? (
                        /* Shocked Open "O" Mouth */
                        <div className="w-2.5 h-3 bg-rose-600 border border-slate-900 rounded-full" />
                      ) : isSpinning ? (
                        /* Joyful Laughing Open Smile (D) */
                        <div className="w-3.5 h-2.5 bg-rose-600 border border-slate-900 rounded-b-full overflow-hidden flex items-end justify-center">
                          <div className="w-2 h-1 bg-rose-400 rounded-t-full" />
                        </div>
                      ) : isBalancing ? (
                        /* Shocked Open "O" Mouth */
                        <div className="w-2.5 h-2.5 bg-rose-600 border border-slate-900 rounded-full" />
                      ) : isFeeding ? (
                        /* Wide-Open Chomp / Nom Mouth with tooth & tongue */
                        <div className="w-3.5 h-2 bg-rose-600 border border-slate-900 rounded-b-full relative overflow-hidden flex flex-col items-center justify-between">
                          <div className="w-2 h-0.5 bg-white rounded-b-xs" />
                          <div className="w-2 h-1 bg-rose-400 rounded-t-full" />
                        </div>
                      ) : isPerched ? (
                        /* Tiny Peaceful Sleeping Line (-) */
                        <div className="w-2 h-0.5 bg-slate-800 rounded-full" />
                      ) : isHungry ? (
                        /* Quivering Sad Wavy / Downward Mouth (~) */
                        <svg width="8" height="4" viewBox="0 0 8 4" fill="none">
                          <path
                            d="M1 3C2.5 1 5.5 1 7 3"
                            stroke="#0F172A"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        /* Happy Gentle Smile (^‿^) */
                        <svg width="8" height="4" viewBox="0 0 8 4" fill="none">
                          <path
                            d="M1 1C2.5 3 5.5 3 7 1"
                            stroke="#0F172A"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* DANGLING / SITTING / EDGE-BALANCING FEET */}
              <div className="flex justify-between w-6 -mt-1 px-0.5 z-0 pointer-events-none">
                <motion.div
                  animate={
                    isBalancing
                      ? (balancingSide === 'left' ? { rotate: [0, -32, -18], y: [0, 4, 2] } : { rotate: 0, y: 0 })
                      : isWalkingOnEdge
                      ? { y: [0, -3, 0], rotate: [-8, 8, -8] }
                      : isPerched
                      ? { rotate: -12, y: -1.5 }
                      : isFeeding || isDragging || isChasing
                      ? { y: [0, -2, 0] }
                      : { rotate: [-5, 5, -5] }
                  }
                  transition={{
                    duration: isBalancing ? 0.2 : isWalkingOnEdge ? 0.25 : isPerched ? 0.3 : 0.6,
                    repeat: isPerched && !isWalkingOnEdge && !isBalancing ? 0 : Infinity,
                    ease: 'easeInOut',
                  }}
                  className="w-2 h-2.5 bg-amber-400 border-2 border-slate-900 rounded-b-md shadow-[1px_1px_0px_#0f172a]"
                />
                <motion.div
                  animate={
                    isBalancing
                      ? (balancingSide === 'right' ? { rotate: [0, 32, 18], y: [0, 4, 2] } : { rotate: 0, y: 0 })
                      : isWalkingOnEdge
                      ? { y: [0, -3, 0], rotate: [8, -8, 8] }
                      : isPerched
                      ? { rotate: 12, y: -1.5 }
                      : isFeeding || isDragging || isChasing
                      ? { y: [0, -2, 0] }
                      : { rotate: [5, -5, 5] }
                  }
                  transition={{
                    duration: isBalancing ? 0.2 : isWalkingOnEdge ? 0.25 : isPerched ? 0.3 : 0.6,
                    repeat: isPerched && !isWalkingOnEdge && !isBalancing ? 0 : Infinity,
                    ease: 'easeInOut',
                  }}
                  className="w-2 h-2.5 bg-amber-400 border-2 border-slate-900 rounded-b-md shadow-[1px_1px_0px_#0f172a]"
                />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* 2. DRAGGED BATTERY GRAPHIC FOLLOWER (Smooth Vector Capsule Follower) */}
      {draggingBatteryTier && (
        <div
          style={{
            position: 'fixed',
            left: batteryPos.x,
            top: batteryPos.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
          className="z-50 flex items-center justify-center select-none"
        >
          {/* Glowing Aura */}
          <div
            className="absolute w-14 h-14 rounded-full blur-md opacity-80 animate-pulse pointer-events-none"
            style={{ backgroundColor: BATTERY_TIERS[draggingBatteryTier].colorHex }}
          />

          {/* Premium Capsule Battery Follower */}
          <BatteryGraphic tier={draggingBatteryTier} size="md" animated={true} />
        </div>
      )}

      {/* 3. GRAVITY FALLING BATTERY ENTITIES (Gentle Atmosphere Drift & Mid-Air Intercept) */}
      {fallingBatteries.map((bat) => (
        <div
          key={bat.id}
          style={{
            position: 'fixed',
            left: bat.x,
            top: bat.y,
            transform: `translate(-50%, -50%) rotate(${bat.rotation}deg)`,
            pointerEvents: 'none',
          }}
          className="z-50 flex items-center justify-center select-none"
        >
          {/* Gentle Floating Aura & Glow */}
          <div
            className="absolute w-14 h-14 rounded-full blur-md opacity-80 animate-pulse pointer-events-none"
            style={{ backgroundColor: BATTERY_TIERS[bat.tier].colorHex }}
          />
          <BatteryGraphic tier={bat.tier} size="md" animated={true} />
        </div>
      ))}

      {/* 4. ICON-BASED NEO-BRUTALIST BOTTOM HUD */}
      <div className="chrono-hud fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5 pointer-events-auto select-none font-sans">
        {/* Floating Notification Toast */}
        <AnimatePresence>
          {popupMessage && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.92 }}
              className="px-3 py-1.5 bg-slate-900 text-amber-300 border-2 border-amber-400 rounded-lg text-xs font-black tracking-wide shadow-[3px_3px_0px_#0f172a] whitespace-nowrap flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              <span>{popupMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. PURE INVENTORY POUCH (FOOD ONLY) */}
        <AnimatePresence>
          {isPouchOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white border-3 border-slate-900 shadow-[5px_5px_0px_#0f172a] rounded-2xl p-3.5 w-64 flex flex-col gap-2.5"
            >
              {/* Header: Pure Food Inventory */}
              <div className="flex items-center justify-between border-b-2 border-slate-900/10 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-400 border border-slate-900 flex items-center justify-center shadow-xs">
                    <Package className="w-3.5 h-3.5 text-slate-900" />
                  </div>
                  <span className="font-black text-xs text-slate-900 uppercase tracking-wide">Food Pouch</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPouchOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3 Battery Types List */}
              <div className="flex flex-col gap-2">
                {(['low', 'medium', 'high'] as BatteryTier[]).map((tier) => {
                  const cfg = BATTERY_TIERS[tier];
                  const count = batteries[tier];
                  const hasStock = count > 0;

                  return (
                    <div
                      key={tier}
                      onPointerDown={(e) => {
                        if (hasStock) {
                          startDraggingBattery(tier, e.clientX, e.clientY);
                        }
                      }}
                      onClick={() => {
                        if (hasStock && !draggingBatteryTier) {
                          setBatteries((prev) => ({ ...prev, [tier]: prev[tier] - 1 }));
                          feedBattery(tier, false);
                        }
                      }}
                      className={`p-2 rounded-xl border-2 border-slate-900 flex items-center justify-between transition-all select-none ${
                        hasStock
                          ? `${cfg.bgClass} cursor-grab active:cursor-grabbing shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5`
                          : 'bg-slate-50 opacity-40 cursor-not-allowed border-slate-300 text-slate-400'
                      }`}
                      title={`${cfg.label}: Drag onto screen or click to feed!`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Custom Battery Capsule Graphic */}
                        <BatteryGraphic tier={tier} size="sm" />
                        <div className="flex flex-col text-left">
                          <span className="text-[11px] font-black text-slate-900 leading-tight">
                            {cfg.shortName}
                          </span>
                          <span className="text-[9px] font-bold text-slate-600">
                            +{cfg.energyRestore}% Energy • +{cfg.xpGain} XP
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 border border-slate-900 rounded-md font-black text-xs shadow-xs ${cfg.badgeBg}`}>
                        x{count}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Action Prompt */}
              <div className="text-[9px] text-slate-500 text-center italic mt-0.5 border-t border-slate-900/10 pt-1.5">
                💡 Drag or drop battery on screen for {petName} to chase & catch!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HUD Quick Bar: Pure Icon Buttons */}
        <div className="flex items-center gap-2">
          {/* Pet Companion Icon Button -> Opens Pet Modal */}
          <button
            type="button"
            onClick={() => {
              triggerPetting();
              setIsPetModalOpen(true);
            }}
            className="w-10 h-10 rounded-xl bg-amber-400 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] flex items-center justify-center hover:bg-amber-300 transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer relative"
            title={`Pet ${petName} / View Status`}
          >
            {/* Cute Egg Icon */}
            <div className="relative w-5 h-6 rounded-[48%_48%_42%_42%_/_56%_56%_44%_44%] bg-white border border-slate-900 flex items-center justify-center">
              <Clock className="w-3 h-3 text-slate-900" />
            </div>
          </button>

          {/* Food Pouch Icon Button (With Badge & Bounce on Battery Arrive) */}
          <motion.button
            id="food-pouch-button"
            type="button"
            animate={pouchBumping ? { scale: [1, 1.28, 0.92, 1], rotate: [0, -8, 8, 0] } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.38, ease: 'easeOut' }}
            onClick={() => setIsPouchOpen((prev) => !prev)}
            className={`w-10 h-10 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] flex items-center justify-center transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer relative ${
              isPouchOpen ? 'bg-emerald-400 text-slate-900' : 'bg-white text-slate-900 hover:bg-slate-50'
            }`}
            title="Food Inventory Pouch"
          >
            <Package className="w-5 h-5 text-slate-900" />
            {/* Live Badge */}
            {totalBatteries > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 border border-slate-900 text-white font-black text-[9px] flex items-center justify-center shadow-xs">
                {totalBatteries}
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* 6. SEPARATED PET INFO MODAL (Rendered into document.body portal to prevent re-render cascade/flicker) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isPetModalOpen && (
              <div className="pet-modal fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 12 }}
                  transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                  className="bg-white border-3 border-slate-900 shadow-[6px_6px_0px_#0f172a] rounded-2xl w-full max-w-sm p-5 flex flex-col gap-4 relative pointer-events-auto"
                >
                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setIsPetModalOpen(false)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg border-2 border-slate-900 bg-slate-100 hover:bg-slate-200 text-slate-900 cursor-pointer shadow-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Header: Pet Avatar & Editable Name */}
                  <div className="flex items-center gap-3 border-b-2 border-slate-900/10 pb-3">
                    {/* Mini Animated Egg Avatar */}
                    <div className="w-14 h-16 rounded-[48%_48%_42%_42%_/_56%_56%_44%_44%] bg-amber-100 border-3 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center relative shrink-0">
                      <div className="w-8 h-8 rounded-full border border-slate-900 bg-white flex items-center justify-center">
                        <span className="text-xs font-black text-slate-900">^‿^</span>
                      </div>
                    </div>

                    {/* Name & Title */}
                    <div className="flex flex-col flex-1 min-w-0">
                      {isEditingName ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && savePetName()}
                            maxLength={18}
                            className="px-2 py-0.5 text-sm font-black border-2 border-slate-900 rounded-md focus:outline-hidden focus:ring-2 focus:ring-amber-400 w-full"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={savePetName}
                            className="p-1 bg-emerald-400 border border-slate-900 rounded-md text-slate-900 hover:bg-emerald-300 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-base text-slate-900 truncate">{petName}</h3>
                          <button
                            type="button"
                            onClick={() => {
                              setTempName(petName);
                              setIsEditingName(true);
                            }}
                            className="text-slate-400 hover:text-slate-900 p-0.5 cursor-pointer"
                            title="Rename Pet"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <span className="text-[11px] font-bold text-slate-500">Chrono-Egg Companion</span>
                    </div>
                  </div>

                  {/* Status Stats Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Level Card */}
                    <div className="p-3 bg-amber-50 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_#0f172a] flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-amber-900">Level</span>
                        <Award className="w-3.5 h-3.5 text-amber-700" />
                      </div>
                      <div className="text-lg font-black text-slate-900">LVL {level}</div>
                      {/* XP Bar */}
                      <div className="w-full h-1.5 bg-amber-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (xp / nextLevelXP) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-amber-800">
                        {xp}/{nextLevelXP} XP ({Math.floor((xp / nextLevelXP) * 100)}%)
                      </span>
                    </div>

                    {/* Days Nursed Card */}
                    <div className="p-3 bg-indigo-50 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_#0f172a] flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-indigo-900">Care Record</span>
                        <Calendar className="w-3.5 h-3.5 text-indigo-700" />
                      </div>
                      <div className="text-lg font-black text-slate-900">{daysNursed} {daysNursed === 1 ? 'Day' : 'Days'}</div>
                      <span className="text-[9px] font-bold text-indigo-800">Days Nursed & Active</span>
                    </div>
                  </div>

                  {/* Hunger / Energy Vitality Bar */}
                  <div className="p-3 bg-slate-50 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_#0f172a] flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-black text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> Vitality & Hunger
                      </span>
                      <span className={hunger > 60 ? 'text-emerald-700' : hunger >= 30 ? 'text-amber-700' : 'text-rose-600'}>
                        {hunger}% • {hunger > 60 ? 'Energized' : hunger >= 30 ? 'Content' : 'Hungry (T_T)'}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 border border-slate-900 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          hunger > 60 ? 'bg-emerald-400' : hunger >= 30 ? 'bg-amber-400' : 'bg-rose-500'
                        }`}
                        style={{ width: `${hunger}%` }}
                      />
                    </div>
                  </div>

                  {/* Modal Actions: Pet & Open Food Pouch */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={triggerPetting}
                      className={`flex-1 py-2 border-2 border-slate-900 rounded-xl font-black text-xs shadow-[2px_2px_0px_#0f172a] flex items-center justify-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-colors ${
                        isPetXpReady
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-900'
                          : 'bg-amber-100 hover:bg-amber-200 text-slate-800'
                      }`}
                      title={
                        isPetXpReady
                          ? `Pet ${petName} for +5 XP`
                          : `Petting cooldown active: ${Math.floor(cooldownRemainingSec / 60)}m ${cooldownRemainingSec % 60}s left until next XP reward`
                      }
                    >
                      <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                      {isPetXpReady ? (
                        <span>Pet {petName} (+5 XP)</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span>Pet {petName}</span>
                          <span className="text-[10px] font-bold text-slate-500 bg-black/5 px-1.5 py-0.5 rounded-md">
                            {Math.floor(cooldownRemainingSec / 60)}:{(cooldownRemainingSec % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPetModalOpen(false);
                        setIsPouchOpen(true);
                      }}
                      className="px-3 py-2 bg-white hover:bg-slate-50 border-2 border-slate-900 rounded-xl font-black text-xs text-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <Package className="w-3.5 h-3.5 text-slate-900" />
                      <span>Food ({totalBatteries})</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* 7. FLYING BATTERY REWARDS (Task Completion Physical -> Food Pouch) */}
      {typeof document !== 'undefined' &&
        flyingRewards.length > 0 &&
        createPortal(
          <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
            {flyingRewards.map((reward) => {
              const config = BATTERY_TIERS[reward.tier];
              return (
                <motion.div
                  key={reward.id}
                  initial={{
                    x: reward.startX - 18,
                    y: reward.startY - 18,
                    scale: 0.6,
                    opacity: 0,
                    rotate: 0,
                  }}
                  animate={{
                    x: [
                      reward.startX - 18,
                      reward.startX - 18,
                      reward.targetX - 18,
                    ],
                    y: [
                      reward.startY - 18,
                      reward.startY - 32,
                      reward.targetY - 18,
                    ],
                    scale: [0.6, 1.45, 0.85],
                    opacity: [0, 1, 1],
                    rotate: [0, -12, 360],
                  }}
                  transition={{
                    duration: 0.95,
                    times: [0, 0.32, 1],
                    ease: ['easeOut', 'easeInOut'],
                  }}
                  onAnimationComplete={() => {
                    // 1. Increment Battery Inventory
                    setBatteries((prev) => ({
                      ...prev,
                      [reward.tier]: prev[reward.tier] + 1,
                    }));

                    // 2. Trigger Pouch Bump Animation
                    setPouchBumping(true);
                    setTimeout(() => setPouchBumping(false), 380);

                    // 3. Audio & Particle Feedback
                    triggerParticles(reward.tier === 'high' ? 'deep' : 'battery', config.colorHex);
                    synth.playPetChime();
                    showNotification(`+1 ${config.shortName} safely added to Pouch! 🔋`);

                    // 4. Remove this entity
                    setFlyingRewards((prev) => prev.filter((r) => r.id !== reward.id));
                  }}
                  className="absolute pointer-events-none flex flex-col items-center"
                >
                  <div
                    className="w-9 h-9 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] flex items-center justify-center relative animate-pulse"
                    style={{ backgroundColor: config.colorHex }}
                  >
                    <BatteryCharging className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                    {/* Energy glow ring */}
                    <div
                      className="absolute -inset-1 rounded-xl opacity-60 blur-xs -z-10"
                      style={{ backgroundColor: config.colorHex }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-slate-900 bg-white border border-slate-900 px-1 rounded-md shadow-xs -mt-1">
                    +1
                  </span>
                </motion.div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};
