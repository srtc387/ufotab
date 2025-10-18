import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Data format: [x, y, z, apparent_magnitude, color_index]
type StarData = [number, number, number, number, number];

// A simplified function to map a B-V color index to an RGB color.
// This is a rough approximation for visualization.
function bvToRgb(bv: number): THREE.Color {
    if (bv < -0.4) bv = -0.4;
    if (bv > 2.0) bv = 2.0;

    let r, g, b;

    if (bv >= -0.40 && bv < 0.00) {
        const t = (bv + 0.40) / (0.00 - (-0.40));
        r = 0.61 + (0.91 - 0.61) * t;
        g = 0.70 + (0.91 - 0.70) * t;
        b = 0.98 + (1.00 - 0.98) * t;
    } else if (bv >= 0.00 && bv < 0.40) {
        const t = (bv - 0.00) / (0.40 - 0.00);
        r = 0.91 + (1.00 - 0.91) * t;
        g = 0.91 + (1.00 - 0.91) * t;
        b = 1.00 + (0.83 - 1.00) * t;
    } else if (bv >= 0.40 && bv < 1.60) {
        const t = (bv - 0.40) / (1.60 - 0.40);
        r = 1.00 + (1.00 - 1.00) * t;
        g = 1.00 + (0.78 - 1.00) * t;
        b = 0.83 + (0.47 - 0.83) * t;
    } else { // bv >= 1.60
        const t = (bv - 1.60) / (2.00 - 1.60);
        r = 1.00 + (1.00 - 1.00) * t;
        g = 0.78 + (0.68 - 0.78) * t;
        b = 0.47 + (0.45 - 0.47) * t;
    }

    return new THREE.Color(r, g, b);
}

const RealStars: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null!);
  const [starData, setStarData] = useState<StarData[] | null>(null);

  useEffect(() => {
    fetch('./star-data.json')
      .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: StarData[]) => setStarData(data))
      .catch(err => console.error("Failed to load or parse star data:", err));
  }, []);

  const geometry = useMemo(() => {
    if (!starData) return null;

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array((starData.length -1) * 3);
    const colors = new Float32Array((starData.length-1) * 3);
    const sizes = new Float32Array(starData.length-1);

    const radius = 1000; // Project stars onto a sphere of this radius

    starData.forEach((star, i) => {
      // Skip the first star, which is the Sun at [0,0,0]
      if (i === 0) return;
      
      const index = i - 1;

      // Project the star's real 3D position onto a sphere
      const positionVector = new THREE.Vector3(star[0], star[1], star[2]);
      if (positionVector.lengthSq() === 0) { // Handle potential origin stars
        positionVector.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      }
      positionVector.normalize().multiplyScalar(radius);

      positions[index * 3] = positionVector.x;
      positions[index * 3 + 1] = positionVector.y;
      positions[index * 3 + 2] = positionVector.z;

      // Color from B-V index
      const color = bvToRgb(star[4]);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;

      // Recalibrated size from apparent magnitude
      const mag = star[3];
      sizes[index] = Math.max(0.5, (7 - mag) * 0.5);
    });

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return geo;
  }, [starData]);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.005;
    }
  });

  if (!geometry) {
    return null; // Don't render anything until data is loaded and processed
  }

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        fog={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        vertexShader={`
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            // Recalibrated perspective scaling factor
            gl_PointSize = size * (2000.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          void main() {
            float r = dot(gl_PointCoord - 0.5, gl_PointCoord - 0.5);
            if (r > 0.25) {
                discard;
            }
            gl_FragColor = vec4(vColor, 1.0 - smoothstep(0.0, 0.25, r));
          }
        `}
      />
    </points>
  );
};

export default RealStars;
