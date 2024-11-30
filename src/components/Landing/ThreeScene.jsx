import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Box, OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei'

function AnimatedSphere() {
  const meshRef = useRef()
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    meshRef.current.position.y = Math.sin(time) * 0.5
    meshRef.current.rotation.y = time * 0.5
  })

  return (
    <Sphere args={[1, 100, 200]} scale={1.5}>
      <MeshDistortMaterial
        color="#50C878"
        attach="material"
        distort={0.3}
        speed={1.5}
        roughness={0}
      />
    </Sphere>
  )
}

function AnimatedBox() {
  const meshRef = useRef()
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    meshRef.current.rotation.x = time * 0.5
    meshRef.current.rotation.y = time * 0.3
  })

  return (
    <Box ref={meshRef} args={[1, 1, 1]} scale={0.7}>
      <meshStandardMaterial color="#50C878" />
    </Box>
  )
}

export default function ThreeScene() {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <AnimatedSphere />
      <AnimatedBox />
      <OrbitControls enableZoom={false} />
    </Canvas>
  )
}

