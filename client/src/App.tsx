import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { OrbitControls, Stats } from "@react-three/drei";
import TerrainViewer from "./components/TerrainViewer";
import TerrainControls from "./components/TerrainControls";
import { useGame } from "./lib/stores/useGame";
import * as THREE from "three";

// Main App component for 3D Terrain Visualization
function App() {
  const { phase } = useGame();

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* UI Controls Overlay */}
      <TerrainControls />
      
      {/* 3D Canvas */}
      <Canvas
        camera={{
          position: [50, 30, 50],
          fov: 45,
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance"
        }}
        onCreated={({ gl }) => {
          // Set clear color to gray
          gl.setClearColor(new THREE.Color(0x808080), 1.0);
        }}
      >
        {/* Lighting Setup */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[100, 100, 50]} 
          intensity={1}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={200}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        
        {/* Hemisphere light for more natural lighting */}
        <hemisphereLight 
          args={[0x808080, 0x444444, 0.6]}
        />

        {/* Camera Controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          minDistance={10}
          maxDistance={200}
        />

        {/* Terrain Component */}
        <Suspense fallback={null}>
          <TerrainViewer />
        </Suspense>

        {/* Performance Stats (development) */}
        {process.env.NODE_ENV === 'development' && <Stats />}
      </Canvas>
    </div>
  );
}

export default App;
