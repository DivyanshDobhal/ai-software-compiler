import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, OrbitControls, Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const nodes = [
  { id: "web", label: "INTERFACE", position: [-2.15, 1.25, 0], color: "#73a9ff", size: 0.19 },
  { id: "api", label: "API LAYER", position: [0, 1.55, -0.2], color: "#9b8bff", size: 0.21 },
  { id: "ai", label: "AI AGENTS", position: [2.15, 1.05, -0.1], color: "#61d4e8", size: 0.19 },
  { id: "auth", label: "AUTH", position: [-2, -0.75, 0.2], color: "#9b8bff", size: 0.17 },
  { id: "core", label: "COMPILER", position: [0, 0, 0.5], color: "#c8b8ff", size: 0.33 },
  { id: "data", label: "DATABASE", position: [2, -0.85, 0], color: "#6ae2c4", size: 0.2 },
  { id: "runtime", label: "RUNTIME", position: [0, -1.8, -0.25], color: "#73a9ff", size: 0.18 }
];

const links = [
  [0, 1], [1, 2], [0, 3], [0, 4], [1, 4], [2, 4], [2, 5], [3, 4], [3, 6], [4, 5], [4, 6], [5, 6]
];

function ArchitectureGraph({ reducedMotion, lowPower }) {
  const group = useRef();
  const core = useRef();
  const elapsed = useRef(0);
  const pointer = useRef(new THREE.Vector2());
  const particles = useMemo(() => links.map((_, index) => ({
    edge: index,
    offset: index / links.length,
    speed: 0.12 + (index % 4) * 0.018
  })), []);
  const particleRefs = useRef([]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    elapsed.current += delta;
    if (group.current) {
      group.current.rotation.y += ((pointer.current.x * 0.1) - group.current.rotation.y) * Math.min(delta * 1.6, 1);
      group.current.rotation.x += ((-pointer.current.y * 0.055) - group.current.rotation.x) * Math.min(delta * 1.6, 1);
    }
    if (core.current) {
      const pulse = 1 + Math.sin(elapsed.current * 1.25) * 0.035;
      core.current.scale.setScalar(pulse);
    }
    particles.forEach((particle, index) => {
      const mesh = particleRefs.current[index];
      if (!mesh) return;
      const [from, to] = links[particle.edge];
      const progress = (elapsed.current * particle.speed + particle.offset) % 1;
      mesh.position.lerpVectors(new THREE.Vector3(...nodes[from].position), new THREE.Vector3(...nodes[to].position), progress);
    });
  });

  const onPointerMove = (event) => {
    pointer.current.set(event.pointer.x, event.pointer.y);
  };

  return (
    <group ref={group} onPointerMove={onPointerMove}>
      <Float speed={reducedMotion ? 0 : 1} rotationIntensity={reducedMotion ? 0 : 0.06} floatIntensity={reducedMotion ? 0 : 0.12}>
        {links.map(([from, to], index) => (
          <Line
            key={`link-${index}`}
            points={[nodes[from].position, nodes[to].position]}
            color={index % 3 === 0 ? "#9b8bff" : "#5d91e8"}
            transparent
            opacity={0.27}
            lineWidth={0.8}
          />
        ))}
        {nodes.map((node) => (
          <group key={node.id} position={node.position}>
            <mesh ref={node.id === "core" ? core : undefined}>
              <icosahedronGeometry args={[node.size, node.id === "core" ? 2 : 1]} />
              <meshStandardMaterial
                color={node.color}
                emissive={node.color}
                emissiveIntensity={node.id === "core" ? 1.5 : 0.55}
                roughness={0.28}
                metalness={0.24}
                transparent
                opacity={node.id === "core" ? 0.94 : 0.82}
              />
            </mesh>
            <mesh scale={1.45}>
              <sphereGeometry args={[node.size, 16, 16]} />
              <meshBasicMaterial color={node.color} transparent opacity={0.08} />
            </mesh>
          </group>
        ))}
        {(lowPower ? particles.slice(0, 4) : particles).map((particle, index) => (
          <mesh key={`particle-${particle.edge}`} ref={(element) => { particleRefs.current[index] = element; }}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color={particle.edge % 2 ? "#77dff0" : "#b9a6ff"} />
          </mesh>
        ))}
        <mesh rotation={[-Math.PI / 2.3, 0, 0]} position={[0, 0, -1.1]}>
          <torusGeometry args={[2.6, 0.008, 6, 100]} />
          <meshBasicMaterial color="#7585de" transparent opacity={0.28} />
        </mesh>
      </Float>
      {!lowPower && <Sparkles count={28} scale={[5.6, 4.4, 2.4]} size={1.35} speed={reducedMotion ? 0 : 0.12} opacity={0.35} color="#aebaff" />}
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 0, 2.4]} intensity={2.4} color="#828bff" distance={8} />
      <pointLight position={[-3, 2, -1]} intensity={1.2} color="#4d9dff" distance={7} />
      <pointLight position={[3, -1.5, 1]} intensity={1} color="#49dfcf" distance={6} />
    </group>
  );
}

function useSceneSettings() {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    const onVisibilityChange = () => setVisible(document.visibilityState === "visible");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motionQuery.matches);
    onVisibilityChange();
    updateMotion();
    document.addEventListener("visibilitychange", onVisibilityChange);
    motionQuery.addEventListener?.("change", updateMotion);
    setLowPower(window.matchMedia("(max-width: 700px)").matches || (navigator.hardwareConcurrency || 8) <= 4);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionQuery.removeEventListener?.("change", updateMotion);
    };
  }, []);

  return { visible, reducedMotion, lowPower };
}

export default function ArchitectureScene() {
  const { visible, reducedMotion, lowPower } = useSceneSettings();
  const pixelRatio = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, lowPower ? 1 : 1.5);

  return (
    <Canvas
      dpr={pixelRatio}
      frameloop={visible && !reducedMotion ? "always" : "demand"}
      camera={{ position: [0, 0, 7.8], fov: 42 }}
      gl={{ antialias: !lowPower, alpha: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => { gl.setClearColor("#000000", 0); }}
      aria-label="Interactive diagram of software layers and compiler connections"
    >
      <ArchitectureGraph reducedMotion={reducedMotion} lowPower={lowPower} />
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={!reducedMotion} autoRotate={!reducedMotion && visible} autoRotateSpeed={0.18} />
    </Canvas>
  );
}
