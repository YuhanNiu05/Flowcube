import { useState, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Stars, PerspectiveCamera, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { getAllUsers, hasTodayActivity, getUserItemUnlocks, getCurrentUser, getUserStats, initializeUserStats } from "../lib/supabase";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Hexagon } from "lucide-react";

interface UserPlanet {
  userId: string;
  user_email: string;
  grassCount: number;
  treeCount: number;
  elfCount: number;
  hasActivityToday: boolean;
  recentItems: Array<{
    item_type: 'grass' | 'tree' | 'elf';
    unlocked_at: string;
  }>;
  position: [number, number, number];
}

function UserPlanet({ planet, onClick }: { planet: UserPlanet; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const orbitGroupRef = useRef<THREE.Group>(null);
  
  // Calculate planet color based on items
  const planetColor = useMemo(() => {
    const total = planet.grassCount + planet.treeCount + planet.elfCount;
    if (total === 0) return new THREE.Color("#666666");
    
    const grassRatio = planet.grassCount / total;
    const treeRatio = planet.treeCount / total;
    const elfRatio = planet.elfCount / total;
    
    const color = new THREE.Color();
    color.setHSL(
      0.4 + grassRatio * 0.3 + treeRatio * 0.1 + elfRatio * 0.4,
      0.6 + elfRatio * 0.3,
      0.4 + grassRatio * 0.2
    );
    
    return color;
  }, [planet.grassCount, planet.treeCount, planet.elfCount]);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (meshRef.current) {
      // Slow rotation
      meshRef.current.rotation.y += 0.001;
    }
    
    if (glowRef.current && planet.hasActivityToday) {
      // Breathing glow effect for active users
      const pulse = (Math.sin(t * 2) + 1) / 2;
      (glowRef.current.material as THREE.MeshStandardMaterial).opacity = 0.15 + pulse * 0.15;
      const s = 1.3 + pulse * 0.03;
      glowRef.current.scale.set(s, s, s);
    }
    
    if (orbitGroupRef.current) {
      // Rotate orbit system
      orbitGroupRef.current.rotation.y += 0.002;
      orbitGroupRef.current.rotation.z = Math.sin(t * 0.1) * 0.1;
    }
  });
  
  // Create orbiting items (3 most recent)
  const orbitingItems = useMemo(() => {
    const items = planet.recentItems.slice(0, 3);
    return items.map((item, index) => {
      const angle = (index / 3) * Math.PI * 2;
      const radius = 2.5;
      const yOffset = (index - 1) * 0.5;
      
      return {
        type: item.item_type,
        angle,
        radius,
        yOffset,
      };
    });
  }, [planet.recentItems]);
  
  return (
    <group position={planet.position}>
      {/* Clickable area */}
      <mesh onClick={onClick}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial 
          color="#ffffff"
          transparent
          opacity={0}
        />
      </mesh>
      
      {/* Planet */}
      <mesh ref={meshRef} rotation={[0.4, 0, 0]}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial 
          color={planetColor}
          flatShading
          roughness={0.6}
          metalness={0.2}
          emissive={planetColor}
          emissiveIntensity={planet.hasActivityToday ? 0.2 : 0.05}
        />
      </mesh>
      
      {/* Glow for active users */}
      {planet.hasActivityToday && (
        <mesh ref={glowRef}>
          <icosahedronGeometry args={[1.32, 3]} />
          <meshStandardMaterial 
            color="#FFD700"
            transparent
            opacity={0.15}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
      
      {/* Orbiting items */}
      <group ref={orbitGroupRef}>
        {orbitingItems.map((item, index) => (
          <OrbitingItem 
            key={index}
            type={item.type}
            angle={item.angle}
            radius={item.radius}
            yOffset={item.yOffset}
          />
        ))}
      </group>
    </group>
  );
}

function OrbitingItem({ type, angle, radius, yOffset }: { type: string; angle: number; radius: number; yOffset: number }) {
  const meshRef = useRef<THREE.Group>(null);
  
  // Different colors for different item types
  const itemColor = useMemo(() => {
    switch (type) {
      case 'grass':
        return '#4ade80'; // Green
      case 'tree':
        return '#60a5fa'; // Blue
      case 'elf':
        return '#c084fc'; // Purple
      default:
        return '#ffffff';
    }
  }, [type]);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Self rotation
      meshRef.current.rotation.y += 0.02;
    }
  });
  
  return (
    <group
      ref={meshRef}
      position={[
        Math.cos(angle) * radius,
        yOffset,
        Math.sin(angle) * radius
      ]}
    >
      {/* Colored sphere - different color for each item type */}
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color={itemColor}
          transparent
          opacity={0.6}
          metalness={0.5}
          roughness={0.2}
          emissive={itemColor}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.65, 16, 16]} />
        <meshStandardMaterial
          color={itemColor}
          transparent
          opacity={0.15}
          emissive={itemColor}
          emissiveIntensity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function Universe({ planets, onPlanetClick }: { planets: UserPlanet[]; onPlanetClick: (planet: UserPlanet) => void }) {
  const controlsRef = useRef<any>();
  
  useFrame((state) => {
    // Slow automatic rotation of the entire universe
    if (controlsRef.current) {
      const t = state.clock.elapsedTime * 0.05;
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.5;
    }
  });
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 60]} fov={60} />
      <OrbitControls 
        ref={controlsRef}
        enableZoom={true}
        enablePan={true}
        minDistance={20}
        maxDistance={200}
        autoRotate
        autoRotateSpeed={0.5}
      />
      
      {/* Background Stars */}
      <Stars 
        radius={200} 
        depth={100} 
        count={10000} 
        factor={10} 
        saturation={0} 
        fade 
        speed={0.5}
      />
      
      {/* Sparkles */}
      <Sparkles
        count={500}
        scale={120}
        size={4}
        speed={0.4}
        opacity={0.5}
        color="#ffffff"
      />
      
      {/* All user planets */}
      {planets.map((planet) => (
        <UserPlanet 
          key={planet.userId} 
          planet={planet} 
          onClick={() => onPlanetClick(planet)}
        />
      ))}
      
      {/* Ambient light */}
      <ambientLight intensity={0.5} />
      
      {/* Point lights for depth */}
      <pointLight position={[100, 100, 100]} intensity={1} />
      <pointLight position={[-100, -100, -100]} intensity={0.5} />
    </>
  );
}

export default function CosmicUniverse() {
  const navigate = useNavigate();
  const [planets, setPlanets] = useState<UserPlanet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState<UserPlanet | null>(null);
  const [currentUserPlanet, setCurrentUserPlanet] = useState<UserPlanet | null>(null);
  
  useEffect(() => {
    const loadPlanets = async () => {
      console.log('Loading universe...');
      
      // Get current user first
      const currentUser = await getCurrentUser();
      let myPlanet: UserPlanet | null = null;
      
      if (currentUser) {
        // Load my stats
        const myStats = await getUserStats(currentUser.id);
        if (myStats) {
          const recentUnlocks = await getUserItemUnlocks(currentUser.id, 3);
          const hasActivity = await hasTodayActivity(currentUser.id);
          
          myPlanet = {
            userId: currentUser.id,
            email: `Me (User_${currentUser.id.slice(0, 8)})`,
            grassCount: myStats.grass_count || 0,
            treeCount: myStats.tree_count || 0,
            elfCount: myStats.elf_count || 0,
            hasActivityToday: hasActivity,
            recentItems: recentUnlocks.map((u: any) => ({
              item_type: u.item_type,
              unlocked_at: u.unlocked_at,
            })),
            position: [0, 0, 0] as [number, number, number], // Center of universe
          };
        }
      }
      
      // Get all other users
      const allUsers = await getAllUsers(100);
      console.log('Loaded users:', allUsers.length);
      console.log('All users data:', allUsers);
      console.log('Current user ID:', currentUser?.id);
      
      // Initialize stats for users without stats (to ensure they appear in the universe)
      // This is a temporary fix - in production, stats should be created on user signup
      if (currentUser) {
        await initializeUserStats(currentUser.id);
      }
      
      // Process other users into planets (exclude current user)
      const otherPlanets: UserPlanet[] = await Promise.all(
        allUsers
          .filter((user: any) => {
            const isCurrentUser = user.user_id === currentUser?.id;
            console.log(`User ${user.user_id}: is current user = ${isCurrentUser}`);
            return !isCurrentUser; // Exclude current user
          })
          .map(async (user: any) => {
            const userId = user.user_id;
            const hasActivity = await hasTodayActivity(userId);
            const recentUnlocks = await getUserItemUnlocks(userId, 3);
            
            console.log(`User ${userId} recent unlocks:`, recentUnlocks);
            
            // Generate random position in a sphere (avoid center)
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 25 + Math.random() * 35; // Between 25 and 60 units from center
            
            return {
              userId,
              email: user.user_email || `User_${userId.slice(0, 8)}`,
              grassCount: user.grass_count || 0,
              treeCount: user.tree_count || 0,
              elfCount: user.elf_count || 0,
              hasActivityToday: hasActivity,
              recentItems: recentUnlocks.map((u: any) => ({
                item_type: u.item_type,
                unlocked_at: u.unlocked_at,
              })),
              position: [
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
              ] as [number, number, number],
            };
          })
      );
      
      console.log('Other planets count:', otherPlanets.length);
      console.log('Other planets:', otherPlanets);
      
      // Set my planet and other planets
      if (myPlanet) {
        setCurrentUserPlanet(myPlanet);
        // Combine my planet with others
        setPlanets([myPlanet, ...otherPlanets]);
        console.log('Total planets (with mine):', 1 + otherPlanets.length);
      } else {
        setPlanets(otherPlanets);
        console.log('Total planets (no mine):', otherPlanets.length);
      }
      
      console.log('Displaying planets:', otherPlanets.length + (myPlanet ? 1 : 0));
      setLoading(false);
    };
    
    loadPlanets();
  }, []);
  
  const handlePlanetClick = (planet: UserPlanet) => {
    console.log('Clicked planet:', planet);
    setSelectedPlanet(planet);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading the universe...</div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Top Header Navigation - Same as Focus page */}
      <header className="fixed top-0 left-0 w-full h-[60px] px-10 flex justify-between items-center elegant-glass z-50">
        <div className="flex items-center gap-3 font-bold text-lg tracking-tight">
          <button 
            onClick={() => navigate("/")}
            className="hover:text-accent-blue transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent-blue rounded flex items-center justify-center">
               <Hexagon className="w-4 h-4 text-white" />
            </div>
            <span className="text-white tracking-widest text-sm font-black">FLOWCUBE</span>
          </div>
        </div>
        <div className="text-text-secondary text-sm">
          Cosmic Galaxy · Explore other users' planets
        </div>
      </header>
      
      {/* 3D Canvas */}
      <Canvas className="w-full h-full">
        <Universe planets={planets} onPlanetClick={handlePlanetClick} />
      </Canvas>
      
      {/* Planet Info Modal */}
      {selectedPlanet && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-6 left-6 right-6 md:right-auto md:w-96 pointer-events-auto"
        >
          <div className="glass p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {selectedPlanet.email.split('@')[0]}
              </h3>
              <button
                onClick={() => setSelectedPlanet(null)}
                className="text-text-secondary hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">Grass</span>
                <span className="text-white font-bold">{selectedPlanet.grassCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">Trees</span>
                <span className="text-white font-bold">{selectedPlanet.treeCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">Sprites</span>
                <span className="text-white font-bold">{selectedPlanet.elfCount}</span>
              </div>
            </div>
            
            {selectedPlanet.hasActivityToday && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-3 border border-yellow-500/30">
                <div className="text-yellow-400 text-sm font-bold">✨ Active Today</div>
                <div className="text-yellow-300/70 text-xs mt-1">
                  Focus session recorded today
                </div>
              </div>
            )}
            
            {!selectedPlanet.hasActivityToday && (
              <div className="text-text-secondary text-sm text-center py-2">
                No focus records today yet
              </div>
            )}
            
            {/* Recent items */}
            {selectedPlanet.recentItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-text-secondary text-xs mb-2">Recently unlocked</div>
                <div className="flex gap-2">
                  {selectedPlanet.recentItems.map((item, index) => (
                    <div
                      key={index}
                      className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl"
                      title={item.item_type}
                    >
                      {item.item_type === 'grass' ? '🌱' : item.item_type === 'tree' ? '🌳' : '✨'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
