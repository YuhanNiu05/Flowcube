import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Gift, Sparkles, Trophy, Lock, Music } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getCurrentUser, getEcosystemItems, unlockItem, getUserItemUnlocks, getUserStats, unlockMusicDisc } from "../lib/supabase";
import Matter from "matter-js";

// Item types configuration with larger sizes
const ITEM_TYPES = {
  grass: { 
    icon: "🌱", 
    name: "Grass Seed", 
    rarity: "Common", 
    color: "#4ade80", 
    baseColor: "#22c55e",
    size: 120, // Increased from 80
    weight: 1 
  },
  tree: { 
    icon: "🌳", 
    name: "Luminous Tree Seed", 
    rarity: "Rare", 
    color: "#60a5fa", 
    baseColor: "#3b82f6",
    size: 140, // Increased from 90
    weight: 1.5 
  },
  elf: { 
    icon: "✨", 
    name: "Forest Sprite", 
    rarity: "Legendary", 
    color: "#c084fc", 
    baseColor: "#a855f7",
    size: 130, // Increased from 85
    weight: 0.8 
  },
};

interface PhysicsItem {
  id: string;
  type: 'grass' | 'tree' | 'elf';
  body: Matter.Body;
  element: HTMLDivElement | null;
}

export default function GalaxyReconstruction() {
  const navigate = useNavigate();
  const [streak, setStreak] = useState(() => {
    return parseInt(localStorage.getItem("focus_streak") || "0");
  });
  const [showBlindBox, setShowBlindBox] = useState(false);
  const [items, setItems] = useState({ grass: 0, tree: 0, elf: 0 });
  const [loading, setLoading] = useState(true);
  const [unlockedItem, setUnlockedItem] = useState({ icon: '', name: '', rarity: '', color: '' });
  const [showUnlockedConfirm, setShowUnlockedConfirm] = useState(false);
  const [itemUnlocks, setItemUnlocks] = useState<Array<{item_type: string, quantity: number, unlocked_at: string}>>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [blindBoxChances, setBlindBoxChances] = useState(0);
  const [unlockedMusicDisc, setUnlockedMusicDisc] = useState<{type: string, name: string, color: string} | null>(null);
  
  // Physics engine refs
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const physicsItemsRef = useRef<PhysicsItem[]>([]);
  const boundariesRef = useRef<Matter.Body[]>([]);
  const itemsLoadedRef = useRef(false);
  const recreatingRef = useRef(false); // Prevent duplicate recreation

  // Load ecosystem items from database
  useEffect(() => {
    let isMounted = true;
    
    const loadItems = async () => {
      // Prevent duplicate loading
      if (itemsLoadedRef.current || !isMounted) return;
      
      console.log('Load items effect called');
      
      const user = await getCurrentUser();
      if (user && isMounted) {
        // Load from user_stats table (cumulative counts)
        const ecosystemItems = await getEcosystemItems(user.id);
        setItems(ecosystemItems);
        
        // Load total sessions from user_stats
        const userStats = await getUserStats(user.id);
        if (userStats) {
          const sessions = userStats.total_sessions || 0;
          setTotalSessions(sessions);
          // Calculate blind box chances: every 3 sessions = 1 chance
          setBlindBoxChances(Math.floor(sessions / 3));
        }
        
        console.log('Loaded from user_stats:', ecosystemItems);
        console.log('Total sessions:', totalSessions);
        console.log('Blind box chances:', blindBoxChances);
        
        // Convert user_stats to flat array for recreation
        const itemsToRecreate: Array<{item_type: string, quantity: number}> = [];
        
        if (ecosystemItems.grass > 0) {
          itemsToRecreate.push({ item_type: 'grass', quantity: ecosystemItems.grass });
        }
        if (ecosystemItems.tree > 0) {
          itemsToRecreate.push({ item_type: 'tree', quantity: ecosystemItems.tree });
        }
        if (ecosystemItems.elf > 0) {
          itemsToRecreate.push({ item_type: 'elf', quantity: ecosystemItems.elf });
        }
        
        console.log('Items to recreate from user_stats:', itemsToRecreate);
        
        // Mark as loaded and recreate items
        itemsLoadedRef.current = true;
        
        // Wait for physics engine to initialize
        setTimeout(() => {
          if (isMounted && engineRef.current && itemsToRecreate.length > 0) {
            recreateAllItems(itemsToRecreate);
          }
        }, 1500);
      }
      if (isMounted) {
        setLoading(false);
      }
    };
    
    loadItems();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Initialize physics engine
  useEffect(() => {
    if (!sceneRef.current) return;

    console.log('Initializing physics engine...');

    // Create engine with optimized settings
    const engine = Matter.Engine.create();
    engine.gravity.y = 1.2; // Slightly stronger gravity for better feel
    engineRef.current = engine;

    // Create renderer with performance optimizations
    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: sceneRef.current.clientWidth,
        height: sceneRef.current.clientHeight,
        wireframes: false,
        background: 'transparent',
        pixelRatio: Math.min(window.devicePixelRatio, 2), // Limit pixel ratio for performance
        showAngleIndicator: false,
        showCollisions: false,
        showVelocity: false,
      },
    });
    renderRef.current = render;

    // Create boundaries with better physics properties
    const width = sceneRef.current.clientWidth;
    const height = sceneRef.current.clientHeight;
    const wallThickness = 60;
    
    const boundaries = [
      // Bottom
      Matter.Bodies.rectangle(width / 2, height + wallThickness / 2 - 10, width, wallThickness, {
        isStatic: true,
        render: { fillStyle: 'transparent' },
        friction: 0.5,
        restitution: 0.3,
      }),
      // Left
      Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, {
        isStatic: true,
        render: { fillStyle: 'transparent' },
        friction: 0.5,
      }),
      // Right
      Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, {
        isStatic: true,
        render: { fillStyle: 'transparent' },
        friction: 0.5,
      }),
    ];
    
    boundariesRef.current = boundaries;
    Matter.Composite.add(engine.world, boundaries);

    // Create runner with optimized delta
    const runner = Matter.Runner.create({
      delta: 1000 / 60, // Fixed 60 FPS
      isFixed: true,
    });
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    console.log('Physics engine initialized');

    // Custom rendering for items with caching
    const itemCache = new Map();
    
    Matter.Events.on(render, 'afterRender', () => {
      const context = render.context;
      physicsItemsRef.current.forEach(item => {
        const { body, type } = item;
        const config = ITEM_TYPES[type];
        const pos = body.position;
        const angle = body.angle;
        const radius = config.size / 2;
        
        // Use cached canvas if available and not sleeping
        const cacheKey = `${type}-${radius}`;
        
        context.save();
        context.translate(pos.x, pos.y);
        context.rotate(angle);
        
        // Optimize rendering: only draw if visible
        if (pos.y < -radius * 2 || pos.y > height + radius * 2 || 
            pos.x < -radius * 2 || pos.x > width + radius * 2) {
          context.restore();
          return;
        }
        
        // Draw gradient sphere (transparent outside to solid inside)
        const gradient = context.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
        gradient.addColorStop(0, config.color + '40'); // 25% opacity at center
        gradient.addColorStop(0.5, config.color + '80'); // 50% opacity at middle
        gradient.addColorStop(0.8, config.color + 'C0'); // 75% opacity
        gradient.addColorStop(1, config.color + 'FF'); // 100% opacity at edge
        
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();
        
        // Draw inner glow
        const innerGlow = context.createRadialGradient(0, 0, 0, 0, 0, radius * 0.6);
        innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        innerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.fillStyle = innerGlow;
        context.beginPath();
        context.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
        context.fill();
        
        // Draw icon in the center
        context.font = `${radius * 0.7}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = 'white';
        context.shadowColor = 'rgba(0, 0, 0, 0.5)';
        context.shadowBlur = 4;
        context.fillText(config.icon, 0, radius * 0.1);
        
        context.restore();
      });
    });

    // Handle resize
    const handleResize = () => {
      if (!sceneRef.current || !render.canvas) return;
      const width = sceneRef.current.clientWidth;
      const height = sceneRef.current.clientHeight;
      
      render.canvas.width = width;
      render.canvas.height = height;
      
      // Update boundaries
      Matter.Composite.remove(engine.world, boundariesRef.current);
      
      const newBoundaries = [
        Matter.Bodies.rectangle(width / 2, height + wallThickness / 2 - 10, width, wallThickness, {
          isStatic: true,
          render: { fillStyle: 'transparent' },
        }),
        Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, {
          isStatic: true,
          render: { fillStyle: 'transparent' },
        }),
        Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, {
          isStatic: true,
          render: { fillStyle: 'transparent' },
        }),
      ];
      
      boundariesRef.current = newBoundaries;
      Matter.Composite.add(engine.world, newBoundaries);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      console.log('Cleaning up physics engine...');
      window.removeEventListener('resize', handleResize);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      
      if (render.canvas) {
        render.canvas.remove();
      }
      
      renderRef.current = null;
      runnerRef.current = null;
      engineRef.current = null;
      physicsItemsRef.current = [];
    };
  }, []);

  // Add item to physics world
  const addPhysicsItem = (type: 'grass' | 'tree' | 'elf', delay = 0) => {
    if (!engineRef.current || !sceneRef.current) {
      console.error('Cannot add item: engine or scene not ready');
      return;
    }

    const config = ITEM_TYPES[type];
    const width = sceneRef.current.clientWidth;
    
    // Create circular body with optimized physics
    const body = Matter.Bodies.circle(
      width / 2 + (Math.random() - 0.5) * 80, // Reduced spread
      -150 - delay * 30, // Stagger the drop
      config.size / 2,
      {
        restitution: 0.4, // Less bouncy
        friction: 0.3,
        frictionAir: 0.02, // Air resistance for smoother motion
        density: 0.002 * config.weight, // Slightly denser for better stability
        render: {
          fillStyle: config.baseColor,
        },
        collisionFilter: {
          category: 0x0001,
          mask: 0xFFFFFFFF,
        },
      }
    );

    Matter.Composite.add(engineRef.current.world, body);

    physicsItemsRef.current.push({
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      body,
      element: null,
    });
  };

  // Recreate all items from database
  const recreateAllItems = (items: Array<{item_type: string, quantity: number}>) => {
    // Prevent duplicate execution
    if (recreatingRef.current) {
      console.log('Already recreating items, skipping...');
      return;
    }
    
    console.log('=== Starting item recreation ===');
    console.log('Items to recreate:', items);
    
    // Set flag to prevent duplicate calls
    recreatingRef.current = true;
    
    // Clear existing items first
    physicsItemsRef.current.forEach(item => {
      Matter.Composite.remove(engineRef.current!.world, item.body);
    });
    physicsItemsRef.current = [];

    // Flatten all items into a single array
    const allItems: Array<{type: 'grass' | 'tree' | 'elf', delay: number}> = [];
    let globalDelay = 0;
    
    items.forEach((item) => {
      const type = item.item_type as 'grass' | 'tree' | 'elf';
      const quantity = item.quantity;
      
      for (let i = 0; i < quantity; i++) {
        allItems.push({ type, delay: globalDelay });
        globalDelay++;
      }
    });
    
    console.log('Total items to recreate:', allItems.length);

    // Add each item with staggered delay - optimized for performance
    console.log('Starting to schedule item drops...');
    
    // Add items in batches to prevent performance issues
    const batchSize = 3; // Add 3 items at a time
    const batchDelay = 200; // 200ms between batches
    
    for (let i = 0; i < allItems.length; i += batchSize) {
      const batch = allItems.slice(i, i + batchSize);
      setTimeout(() => {
        batch.forEach(({ type }) => {
          if (engineRef.current) {
            addPhysicsItem(type, 0);
          }
        });
      }, (i / batchSize) * batchDelay);
    }
    
    // Reset flag after all items are added
    setTimeout(() => {
      recreatingRef.current = false;
      console.log('=== Item recreation complete ===');
      console.log('Final physics items count:', physicsItemsRef.current.length);
    }, allItems.length * 100 + 1000);
  };

  const handleUnlockBlindBox = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    // First, unlock ecosystem item (main reward)
    const random = Math.random();
    let itemType: 'grass' | 'tree' | 'elf' = 'grass';
    
    if (random < 0.6) {
      itemType = 'grass';
    } else if (random < 0.9) {
      itemType = 'tree';
    } else {
      itemType = 'elf';
    }

    const config = ITEM_TYPES[itemType];

    const result = await unlockItem(user.id, itemType, 1);
    
    if (result.success) {
      setItems(prev => ({
        ...prev,
        [itemType]: prev[itemType] + 1
      }));
      
      // Decrease blind box chances
      setBlindBoxChances(prev => prev - 1);
      
      localStorage.setItem("focus_streak", "0");
      setStreak(0);
      setShowBlindBox(false);
      
      setUnlockedItem({ 
        icon: config.icon, 
        name: config.name, 
        rarity: config.rarity, 
        color: config.color 
      });
      setShowUnlockedConfirm(true);
      
      // 50% chance to get a music disc as bonus
      const isMusicDisc = Math.random() < 0.5;
      
      if (isMusicDisc) {
        // Unlock music disc (no rarity system)
        const discName = 'Music Disc';
        const discColor = '#a855f7'; // Purple

        console.log('Attempting to unlock music disc for user:', user.id);
        const discResult = await unlockMusicDisc(user.id, 'common', discName, discColor);
        
        if (!discResult.success) {
          console.error('Failed to unlock music disc:', discResult.error);
        } else {
          console.log('Successfully unlocked music disc:', discResult.data);
        }
        
        // Show music disc notification after item notification
        setTimeout(() => {
          setUnlockedMusicDisc({ type: 'common', name: discName, color: discColor });
          setShowUnlockedConfirm(true);
        }, 1000);
      }
    } else {
      console.error('Failed to unlock item:', result.error);
      alert('Unlock failed. Please try again.');
    }
  };

  const stats = [
    { label: "Grass", count: items.grass, icon: "🌱", color: "#4ade80", baseColor: "#22c55e" },
    { label: "Trees", count: items.tree, icon: "🌳", color: "#60a5fa", baseColor: "#3b82f6" },
    { label: "Sprites", count: items.elf, icon: "✨", color: "#c084fc", baseColor: "#a855f7" },
  ];

  return (
    <div className="relative min-h-screen bg-bg-deep flex flex-col font-sans overflow-hidden">
      {/* Background Stars */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 3 + 's',
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Background Atmosphere */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px]" />
      </div>

      <header className="z-10 px-10 py-6 flex items-center justify-between gap-4">
        <button 
          onClick={() => navigate("/")}
          className="elegant-glass p-3 rounded-2xl hover:text-accent-blue transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Galaxy Reconstruction</h1>
          <p className="text-text-secondary text-xs uppercase tracking-widest opacity-60 font-mono">Galaxy Reconstruction</p>
        </div>
        <div className="w-12" />
      </header>

      <main className="z-10 flex-1 flex gap-6 px-6 pb-6">
        {/* Physics Canvas - Center */}
        <div className="flex-1 elegant-glass rounded-[3rem] relative overflow-hidden" ref={sceneRef}>
          {/* Items will be rendered here by Matter.js */}
          <div className="absolute top-6 left-6 z-10">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-accent-blue" />
              Collected Items
            </h2>
            <p className="text-text-secondary text-xs mt-1">
              Total: {items.grass + items.tree + items.elf}
            </p>
          </div>
        </div>

        {/* Stats & Blind Box - Right Column */}
        <div className="w-80 flex flex-col gap-4">
          {/* Stats Card */}
          <div className="elegant-glass rounded-[2rem] p-6">
            <h3 className="text-lg font-bold mb-4 text-white">Item Stats</h3>
            <div className="space-y-3">
              {stats.map(stat => (
                <div key={stat.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl relative overflow-hidden"
                      style={{ 
                        background: `radial-gradient(circle at 30% 30%, ${stat.color}40, ${stat.baseColor})`,
                        boxShadow: `0 0 20px ${stat.color}40`
                      }}
                    >
                      {stat.icon}
                    </div>
                    <span className="text-white text-sm">{stat.label}</span>
                  </div>
                  <span className="text-white font-bold">{stat.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Streak Card */}
          <div className="elegant-glass rounded-[2rem] p-6 flex flex-col items-center text-center">
            <div className="bg-accent-blue/10 p-4 rounded-2xl mb-4">
              <Trophy className="w-8 h-8 text-accent-blue" />
            </div>
            <h3 className="text-lg font-bold mb-2">Focus Performance</h3>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                    totalSessions % 3 >= i 
                      ? "bg-accent-green border-accent-green text-black font-bold" 
                      : "bg-white/5 border-white/10 text-white/20"
                  }`}
                >
                  {i}
                </div>
              ))}
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              <span className="text-white font-bold">{3 - (totalSessions % 3)}</span> more focus sessions to go
            </p>
          </div>

          {/* Blind Box Button */}
          <motion.button
            whileHover={blindBoxChances > 0 ? { scale: 1.02 } : {}}
            whileTap={blindBoxChances > 0 ? { scale: 0.98 } : {}}
            disabled={blindBoxChances <= 0}
            onClick={() => setShowBlindBox(true)}
            className={`flex-1 p-6 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all overflow-hidden relative group
              ${blindBoxChances > 0 
                ? "border-accent-blue bg-accent-blue/5 cursor-pointer" 
                : "border-white/10 cursor-not-allowed opacity-50"
              }
            `}
          >
            <div className="relative">
              <Gift className={`w-10 h-10 transition-transform ${
                blindBoxChances > 0 ? "text-accent-blue group-hover:rotate-12" : "text-white/20"
              }`} />
              {blindBoxChances <= 0 && <Lock className="absolute -top-1 -right-1 w-4 h-4 text-white/40" />}
            </div>
            <div className="text-center">
              <div className="text-sm font-bold uppercase tracking-[0.2em]">Galaxy Mystery Box</div>
              <div className="text-[10px] text-text-secondary mt-1 tracking-tight">Galaxy Reward</div>
            </div>

            {blindBoxChances > 0 && (
              <div className="absolute top-0 right-0 w-12 h-12 bg-accent-blue/10 rounded-bl-full flex items-center justify-center">
                <span className="text-accent-blue font-bold">{blindBoxChances}</span>
              </div>
            )}
          </motion.button>
        </div>
      </main>

      {/* Blind Box Reveal Modal */}
      <AnimatePresence>
        {showBlindBox && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="elegant-glass p-12 rounded-[4rem] max-w-sm w-full text-center relative"
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-accent-blue rounded-3xl rotate-12 flex items-center justify-center shadow-2xl">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-black mb-4 text-white mt-8 tracking-tighter">Ready to open the Galaxy Mystery Box</h2>
              <p className="text-text-secondary text-sm mb-8">You will receive a random galaxy item</p>
              
              <div className="bg-white/5 rounded-3xl p-8 mb-8 border border-white/5">
                <Gift className="w-16 h-16 text-accent-blue mx-auto mb-4" />
                <div className="text-xs font-mono text-accent-blue uppercase tracking-widest">Galaxy Mystery Box</div>
              </div>

              <button 
                onClick={handleUnlockBlindBox}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:scale-[1.02] transition-all"
              >
                Open the Box
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Unlocked Confirmation Modal */}
      <AnimatePresence>
        {showUnlockedConfirm && unlockedMusicDisc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="elegant-glass p-12 rounded-[4rem] max-w-sm w-full text-center relative"
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-3xl rotate-12 flex items-center justify-center shadow-2xl"
                   style={{ 
                     background: `radial-gradient(circle at 30% 30%, ${unlockedMusicDisc.color}40, ${unlockedMusicDisc.color})`,
                     boxShadow: `0 0 30px ${unlockedMusicDisc.color}60`
                   }}
              >
                <Music className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-black mb-4 text-white mt-8 tracking-tighter">🎵 Bonus Reward!</h2>
              <p className="text-text-secondary text-sm mb-8">You received a music disc</p>
              
              <div className="bg-white/5 rounded-3xl p-8 mb-6 border border-white/5">
                <div 
                  className="w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center relative overflow-hidden"
                  style={{ 
                    background: `radial-gradient(circle at 30% 30%, ${unlockedMusicDisc.color}40, ${unlockedMusicDisc.color})`,
                    boxShadow: `0 0 40px ${unlockedMusicDisc.color}60`
                  }}
                >
                  <div className="w-12 h-12 bg-black/20 rounded-full" />
                  <Music className="w-16 h-16 text-white/80" />
                </div>
                <div className={`text-lg font-bold uppercase tracking-widest mb-2`} style={{ color: unlockedMusicDisc.color }}>
                  {unlockedMusicDisc.name}
                </div>
              </div>

              <button 
                onClick={() => {
                  // TODO: Save to database and navigate to music library
                  setShowUnlockedConfirm(false);
                  setUnlockedMusicDisc(null);
                  navigate("/music-library");
                }}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:scale-[1.02] transition-all"
              >
                View Disc
              </button>
            </motion.div>
          </motion.div>
        )}

        {showUnlockedConfirm && !unlockedMusicDisc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="elegant-glass p-12 rounded-[4rem] max-w-sm w-full text-center relative"
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-br from-accent-blue to-accent-purple rounded-3xl rotate-12 flex items-center justify-center shadow-2xl">
                <span className="text-5xl">{unlockedItem.icon}</span>
              </div>
              <h2 className="text-3xl font-black mb-4 text-white mt-8 tracking-tighter">Unlocked!</h2>
              <p className="text-text-secondary text-sm mb-8">You received a new galaxy item</p>
              
              <div className="bg-white/5 rounded-3xl p-8 mb-6 border border-white/5">
                <div className={`text-7xl mb-4`}>{unlockedItem.icon}</div>
                <div className={`text-sm font-bold uppercase tracking-widest mb-2`} style={{ color: unlockedItem.color }}>
                  {unlockedItem.name}
                </div>
                <div className="text-xs text-text-secondary">
                  Rarity: <span className="font-bold" style={{ color: unlockedItem.color }}>{unlockedItem.rarity}</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  // Add only the newly unlocked item to physics world
                  const type = unlockedItem.icon === '🌱' ? 'grass' : unlockedItem.icon === '🌳' ? 'tree' : 'elf';
                  addPhysicsItem(type);
                  setShowUnlockedConfirm(false);
                }}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:scale-[1.02] transition-all"
              >
                Add to Galaxy
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
