import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '../lib/stores/useGame';
import { generateTerrainFromHeightmap } from '../utils/terrainGenerator';

interface TerrainViewerProps {}

const TerrainViewer: React.FC<TerrainViewerProps> = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { phase } = useGame();
  
  // Load available textures
  const grassTexture = useTexture('/textures/grass.png');
  const sandTexture = useTexture('/textures/sand.jpg');
  
  // Configure texture tiling
  useMemo(() => {
    [grassTexture, sandTexture].forEach(texture => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(8, 8);
    });
  }, [grassTexture, sandTexture]);

  // Generate terrain geometry and materials
  const { geometry, wireframeMaterial, solidMaterial } = useMemo(() => {
    console.log('Generating terrain geometry...');
    
    // Create a default terrain if no heightmap is loaded
    const width = 256;
    const height = 256;
    const geometry = new THREE.BufferGeometry();
    
    // Generate vertices for horizontal terrain (XZ plane with Y as height)
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const terrainSize = 100;
    const stepSize = terrainSize / (width - 1);
    
    // Generate vertices in horizontal plane
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const worldX = (x - width / 2) * stepSize;
        const worldZ = (z - height / 2) * stepSize;
        
        // Simple sine wave pattern for default terrain
        const heightValue = Math.sin(worldX * 0.05) * Math.cos(worldZ * 0.05) * 8;
        
        vertices.push(worldX, heightValue + 5, worldZ);
        uvs.push(x / (width - 1), z / (height - 1));
      }
    }
    
    // Generate indices for triangles
    for (let z = 0; z < height - 1; z++) {
      for (let x = 0; x < width - 1; x++) {
        const topLeft = z * width + x;
        const topRight = z * width + x + 1;
        const bottomLeft = (z + 1) * width + x;
        const bottomRight = (z + 1) * width + x + 1;
        
        // First triangle
        indices.push(topLeft, bottomLeft, topRight);
        // Second triangle  
        indices.push(topRight, bottomLeft, bottomRight);
      }
    }
    
    // Set geometry attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    // Create materials
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      side: THREE.DoubleSide
    });
    
    const solidMaterial = new THREE.MeshLambertMaterial({
      map: grassTexture,
      side: THREE.DoubleSide,
      vertexColors: false
    });
    
    console.log(`Generated terrain: ${width}x${height} vertices`);
    
    return { geometry, wireframeMaterial, solidMaterial };
  }, [grassTexture]);

  // Handle terrain updates when new heightmap is processed
  useEffect(() => {
    const handleHeightmapUpdate = (event: CustomEvent) => {
      if (meshRef.current && event.detail.geometry) {
        console.log('Updating terrain with new heightmap data');
        meshRef.current.geometry.dispose();
        meshRef.current.geometry = event.detail.geometry;
        
        // Update material if colors are provided
        if (event.detail.colors && meshRef.current.material instanceof THREE.MeshLambertMaterial) {
          const material = meshRef.current.material as THREE.MeshLambertMaterial;
          material.vertexColors = true;
          material.needsUpdate = true;
        }
      }
    };

    window.addEventListener('heightmapProcessed', handleHeightmapUpdate as EventListener);
    return () => {
      window.removeEventListener('heightmapProcessed', handleHeightmapUpdate as EventListener);
    };
  }, []);

  // Handle wireframe toggle
  useEffect(() => {
    const handleWireframeToggle = (event: CustomEvent) => {
      if (meshRef.current) {
        meshRef.current.material = event.detail.wireframe ? wireframeMaterial : solidMaterial;
      }
    };

    window.addEventListener('wireframeToggle', handleWireframeToggle as EventListener);
    return () => {
      window.removeEventListener('wireframeToggle', handleWireframeToggle as EventListener);
    };
  }, [wireframeMaterial, solidMaterial]);

  // Handle default terrain regeneration
  useEffect(() => {
    const handleDefaultTerrain = () => {
      if (meshRef.current) {
        console.log('Regenerating default terrain');
        // Force recreation of default terrain
        meshRef.current.geometry.dispose();
        meshRef.current.geometry = geometry;
      }
    };

    window.addEventListener('generateDefaultTerrain', handleDefaultTerrain);
    return () => {
      window.removeEventListener('generateDefaultTerrain', handleDefaultTerrain);
    };
  }, [geometry]);

  // Remove rotation animation

  return (
    <group>
      {/* Main terrain mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={solidMaterial}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      />
      
      {/* Ground plane for reference */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -10, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshLambertMaterial color={0x404040} />
      </mesh>
      
      {/* Reference grid with higher density */}
      <gridHelper 
        args={[100, 50, 0x444444, 0x444444]} 
        position={[0, -9.9, 0]} 
      />
    </group>
  );
};

export default TerrainViewer;
