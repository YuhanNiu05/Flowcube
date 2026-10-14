import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, OrbitControls, Stars, PerspectiveCamera, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function Cloud({ position, speed, size }: { position: [number, number, number]; speed: number; size: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.position.x += Math.sin(state.clock.elapsedTime * speed) * 0.005;
      mesh.current.position.y += Math.cos(state.clock.elapsedTime * speed) * 0.005;
    }
  });

  return (
    <mesh position={position} ref={mesh}>
      <icosahedronGeometry args={[size, 1]} />
      <meshStandardMaterial color="#888" flatShading transparent opacity={0.6} />
    </mesh>
  );
}

function LowPolyPlant({ position, scale = 1, type = "grass" }: { position: [number, number, number]; scale?: number; type?: string }) {
  if (type === "grass" || type === "sprout" || type === "flower" || type === "cactus" || type === "pine" || type === "flower_pink" || type === "flower_yellow") {
    // Variety logic based on type
    let plantColor = "#4ade80";
    let emissiveColor = "#4ade80";
    
    if (type === "flower") { plantColor = "#f87171"; emissiveColor = "#f87171"; }
    if (type === "flower_pink") { plantColor = "#f472b6"; emissiveColor = "#f472b6"; }
    if (type === "flower_yellow") { plantColor = "#facc15"; emissiveColor = "#facc15"; }
    if (type === "cactus") { plantColor = "#166534"; emissiveColor = "#15803d"; }
    if (type === "pine") { plantColor = "#064e3b"; emissiveColor = "#065f46"; }

    return (
      <group position={position} scale={scale}>
        {type === "pine" ? (
          <group position={[0, 0.1, 0]}>
            <mesh position={[0, 0, 0]}>
              <coneGeometry args={[0.15, 0.3, 8]} />
              <meshStandardMaterial color={plantColor} flatShading />
            </mesh>
            <mesh position={[0, 0.15, 0]}>
              <coneGeometry args={[0.1, 0.25, 8]} />
              <meshStandardMaterial color={plantColor} flatShading />
            </mesh>
            <mesh position={[0, -0.15, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.1, 8]} />
              <meshStandardMaterial color="#3e2723" />
            </mesh>
          </group>
        ) : type === "cactus" ? (
          <group>
             <mesh position={[0, 0.1, 0]}>
               <capsuleGeometry args={[0.05, 0.15, 4, 8]} />
               <meshStandardMaterial color={plantColor} flatShading />
             </mesh>
             <mesh position={[0.08, 0.15, 0]} rotation={[0, 0, -1]}>
               <capsuleGeometry args={[0.03, 0.06, 4, 8]} />
               <meshStandardMaterial color={plantColor} flatShading />
             </mesh>
          </group>
        ) : (
          <group>
            {/* Stem */}
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.2, 8]} />
              <meshStandardMaterial color={plantColor} flatShading emissive={emissiveColor} emissiveIntensity={0.2} />
            </mesh>
            
            {/* Left Leaf/Petal */}
            <mesh position={[-0.04, 0.14, 0]} rotation={[0, 0, 0.8]} scale={[1, 0.3, 1.8] as any}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial 
                color={plantColor} 
                flatShading 
                emissive={emissiveColor} 
                emissiveIntensity={0.3} 
              />
            </mesh>
            
            {/* Right Leaf/Petal */}
            <mesh position={[0.04, 0.14, 0]} rotation={[0, 0, -0.8]} scale={[1, 0.3, 1.8] as any}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial 
                color={plantColor} 
                flatShading 
                emissive={emissiveColor} 
                emissiveIntensity={0.3} 
              />
            </mesh>

            {(type.includes("flower")) && (
               <mesh position={[0, 0.2, 0]}>
                 <sphereGeometry args={[0.03, 8, 8]} />
                 <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
               </mesh>
            )}
          </group>
        )}
      </group>
    );
  }

  if (type === "water") {
    return (
      <group position={position} scale={scale}>
        <mesh>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.8} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.1, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.1, 0.2, 16]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.8} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    );
  }

  if (type === "sun") {
    return (
      <group position={position} scale={scale}>
        {/* Core */}
        <mesh>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2} />
        </mesh>
        {/* Rays */}
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
            <coneGeometry args={[0.04, 0.25, 8]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} />
          </mesh>
        ))}
        <Sparkles count={15} scale={0.6} size={1} speed={1} color="#fbbf24" opacity={0.8} />
      </group>
    );
  }
  
  if (type === "sprite") {
    return (
      <group position={position} scale={scale}>
        <mesh>
          <octahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={2} flatShading />
        </mesh>
      </group>
    );
  }
  
  return null;
}

function PlantBubble({ type, progress }: { type: string; progress: number }) {
  const meshRef = useRef<THREE.Group>(null);
  const initialPos = useMemo(() => [
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 5
  ], []);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.elapsedTime;
      // Floating movement
      meshRef.current.position.y += Math.sin(t * 0.5) * (0.002 + progress * 0.001);
      meshRef.current.position.x += Math.cos(t * 0.3) * (0.001 + progress * 0.0005);
      // Rotation
      meshRef.current.rotation.y += 0.01 + progress * 0.01;
    }
  });

  return (
    <group ref={meshRef} position={initialPos as any}>
      {/* White Semi-transparent Bubble */}
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.2} 
          metalness={0.2} 
          roughness={0.0}
          envMapIntensity={2}
        />
      </mesh>
      {/* Element Inside with glow */}
      <LowPolyPlant position={[0, -0.1, 0]} type={type} scale={1.8} />
    </group>
  );
}

function DesertPlanet({ progress, mode }: { progress: number; mode: string }) {
  const planetRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  // Transition colors based on progress (0 to 1)
  const baseBlue = "#3b82f6"; // Brighter blue
  const baseGreen = "#22c55e"; 
  const lushGreen = "#4ade80"; 
  const healingBlue = "#60a5fa";
  
  const startColor = mode === "sports" ? baseGreen : baseBlue;
  const targetColor = mode === "sports" ? lushGreen : healingBlue;
  
  const currentColor = useMemo(() => {
    const color = new THREE.Color(startColor).lerp(new THREE.Color(targetColor), progress);
    return color;
  }, [progress, startColor, targetColor]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (planetRef.current) {
      // Axial tilt and slow rotation
      planetRef.current.rotation.y += 0.003 + progress * 0.002;
    }
    if (glowRef.current) {
      // Breathing effect: oscillate opacity and scale slightly
      const pulse = (Math.sin(t * (1.5 + progress)) + 1) / 2; // Speed up with progress
      (glowRef.current.material as THREE.MeshStandardMaterial).opacity = 0.15 + progress * 0.1 + pulse * (0.15 + progress * 0.1);
      const s = 1.05 + pulse * (0.02 + progress * 0.03);
      glowRef.current.scale.set(s, s, s);
      
      // Flash effect if progress is high
      if (progress > 0.8 && Math.sin(t * 10) > 0.9) {
          (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 2;
      } else {
          (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
      }
    }
  });

  return (
    <group>
      {/* Outer Atmosphere Glow */}
      <mesh ref={glowRef}>
        <icosahedronGeometry args={[1.22, 3]} />
        <meshStandardMaterial 
          color={mode === "sports" ? "#4ade80" : "#60a5fa"} 
          transparent 
          opacity={0.15}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          emissive={mode === "sports" ? "#4ade80" : "#60a5fa"}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Planet Mesh */}
      <mesh ref={planetRef} rotation={[0.4, 0, 0]}>
        <icosahedronGeometry args={[1.2, 2]} />
        <meshStandardMaterial 
          color={currentColor} 
          flatShading 
          roughness={0.4}
          metalness={0.3}
          emissive={currentColor}
          emissiveIntensity={0.1 + progress * 0.2} // Gets brighter with progress
        />
      </mesh>
      
      {/* Healing Rings */}
      <group rotation={[0.4, 0, 0.2]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.4, 0.005, 16, 100]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.2 + progress * 0.2} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0.5, 0]}>
          <torusGeometry args={[2.6, 0.003, 16, 100]} />
          <meshBasicMaterial color="#4deaff" transparent opacity={0.1 + progress * 0.2} />
        </mesh>
      </group>

      {/* Floating Asset Bubbles */}
      {progress > 0.05 && (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
          <PlantBubble type={Math.random() > 0.5 ? "grass" : "cactus"} progress={progress} />
        </Float>
      )}
      
      {progress > 0.2 && (
        <Float speed={1.5} rotationIntensity={1} floatIntensity={1.5}>
          <group position={[-3, 2, -1]}>
             <PlantBubble type="water" progress={progress} />
          </group>
        </Float>
      )}

      {progress > 0.4 && (
        <Float speed={3} rotationIntensity={2} floatIntensity={2}>
           <group position={[2, -2, 1]}>
              <PlantBubble type={Math.random() > 0.5 ? "flower" : "flower_pink"} progress={progress} />
           </group>
        </Float>
      )}

      {progress > 0.6 && (
        <Float speed={2.5} rotationIntensity={1.5} floatIntensity={1.8}>
           <group position={[-2, -3, -2]}>
              <PlantBubble type="sun" progress={progress} />
           </group>
        </Float>
      )}

      {progress > 0.8 && (
        <Float speed={2} rotationIntensity={1} floatIntensity={1}>
           <group position={[3, 1, -3]}>
              <PlantBubble type="pine" progress={progress} />
           </group>
        </Float>
      )}
    </group>
  );
}

function OrbitalMeteor({ radius, speed, rotation, color }: { radius: number; speed: number; rotation: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Group>(null);
  const orbitRef = useRef<THREE.Group>(null);
  const [active, setActive] = useState(false);
  const startTime = useRef(0);
  const duration = 2.5; // Seconds to complete one visible dash

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    // Periodically activate the meteor
    // Each meteor has its own unique "random" interval based on its speed/radius
    const interval = 10 + Math.abs(radius * 2);
    const cycle = t % interval;
    
    if (cycle < duration && !active) {
      setActive(true);
      startTime.current = t;
    } else if (cycle >= duration && active) {
      setActive(false);
    }

    if (meshRef.current) {
      if (active) {
        const progress = (t - startTime.current) / duration;
        // Move along circle in local space
        const angle = progress * Math.PI * 0.8; // Move through an arc of 144 degrees
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        meshRef.current.position.set(x, y, 0);
        meshRef.current.visible = true;
        
        // Trail logic: multiple small spheres trailing behind
        if (trailRef.current) {
          trailRef.current.children.forEach((child, i) => {
            const trailTime = progress - (i * 0.02);
            if (trailTime > 0) {
              const trailAngle = trailTime * Math.PI * 0.8;
              child.position.set(Math.cos(trailAngle) * radius, Math.sin(trailAngle) * radius, 0);
              child.visible = true;
              (child as THREE.Mesh).scale.setScalar(1 - i / 10);
            } else {
              child.visible = false;
            }
          });
        }
      } else {
        meshRef.current.visible = false;
        if (trailRef.current) trailRef.current.children.forEach(c => c.visible = false);
      }
    }
  });

  return (
    <group rotation={rotation}>
      {/* Orbit Path (Static) */}
      <mesh ref={orbitRef} rotation={[0, 0, 0]}>
        <ringGeometry args={[radius - 0.005, radius + 0.005, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.05} />
      </mesh>

      <mesh ref={meshRef} visible={false}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={color} />
        <pointLight color={color} intensity={1} distance={3} />
      </mesh>

      <group ref={trailRef}>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={i} visible={false}>
            <sphereGeometry args={[0.03, 4, 4]} />
            <meshBasicMaterial color={color} transparent opacity={0.6 - i * 0.05} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function MeteorShower() {
  const orbits = useMemo(() => [
    { radius: 2.8, speed: 0.5, rotation: [0.5, 0.4, 0.2] as [number, number, number], color: "#4deaff" },
    { radius: 3.2, speed: 0.7, rotation: [2.1, 0.8, 1.2] as [number, number, number], color: "#4ade80" },
    { radius: 3.8, speed: 0.4, rotation: [-1.2, 0.5, 0.5] as [number, number, number], color: "#60a5fa" },
    { radius: 2.5, speed: 0.9, rotation: [0.8, -1.2, 0.3] as [number, number, number], color: "#f472b6" },
    { radius: 4.2, speed: 0.3, rotation: [0.2, 2.5, -0.8] as [number, number, number], color: "#fbbf24" },
  ], []);

  return (
    <group>
      {orbits.map((orbit, i) => (
        <OrbitalMeteor key={i} {...orbit} />
      ))}
    </group>
  );
}

export default function PlanetCanvas({ focusSeconds, status, mode = "learning" }: { focusSeconds: number; status: "idle" | "focusing"; mode?: string }) {
  // Calculate progress based on time (0 to 10 minutes = 600s)
  const progress = Math.min(focusSeconds / 600, 1);
  const isRainy = progress < 0.1;

  return (
    <div className="w-full h-full">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 1, 7]} fov={45} />
        
        <color attach="background" args={isRainy ? ["#0c0d18"] : ["#080911"]} />
        
        <fog attach="fog" args={["#080911", 5, 15]} />
        
        <ambientLight intensity={isRainy ? 0.3 : 0.8} />
        <pointLight position={[10, 10, 10]} intensity={isRainy ? 0.8 : 2} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4B7BFF" />
        <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={2} color="#4ade80" />
        
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        <Sparkles 
          count={50} 
          scale={6} 
          size={2} 
          speed={0.4} 
          opacity={0.5} 
          color="#4deaff" 
        />
        
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
          <DesertPlanet progress={progress} mode={mode} />
        </Float>

        {status === "focusing" && <MeteorShower />}
        
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}
