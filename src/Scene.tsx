import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TextureLoader } from 'three';

type GridProps = {
    textures: THREE.Texture[];
    scale?: number;
};


function Grid({ textures, scale = 1 }: GridProps) {
    console.log('rerendering')
    const { camera, size, gl } = useThree();
    const groupRef = useRef<THREE.Group>(null);

    const CELL_W = 3.7;  // itemWidth + gap
    const CELL_H = 3.7;
    const DRAG_SENSITIVITY = 50.0; // raise to move faster per pixel drag

    // Render enough cells to cover viewport plus buffer; increase if needed
    const GRID_COLS = 28;
    const GRID_ROWS = 28;

    // Track dragging + smooth offset
    const isDragging = useRef(false);
    const lastMouse = useRef(new THREE.Vector2());
    const targetOffset = useRef(new THREE.Vector2()); // fractional offset (wrapped)
    const currentOffset = useRef(new THREE.Vector2()); // fractional offset (wrapped)
    const tileShift = useRef({ x: 0, y: 0 }); // integer tile offsets for stable texture assignment
    const velocity = useRef(new THREE.Vector2()); // velocity for momentum
    const lastDragTime = useRef(Date.now());

    // Converts screen px delta → world delta at Z=0
    const screenDeltaToWorld = (dx: number, dy: number) => {
        const v1 = new THREE.Vector3(0, 0, 0);
        const v2 = new THREE.Vector3(dx / size.width * 2, -dy / size.height * 2, 0);

        v1.unproject(camera);
        v2.unproject(camera);
        return v2.sub(v1);
    };

    useEffect(() => {
        const el = gl.domElement;

        const onPointerDown = (e: PointerEvent) => {
            isDragging.current = true;
            lastMouse.current.set(e.clientX, e.clientY);
            el.setPointerCapture?.(e.pointerId);
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!isDragging.current) return;

            const dx = e.clientX - lastMouse.current.x;
            const dy = e.clientY - lastMouse.current.y;

            const delta = screenDeltaToWorld(dx, dy).multiplyScalar(DRAG_SENSITIVITY);

            targetOffset.current.x += delta.x;
            targetOffset.current.y += delta.y;
            
            // Calculate velocity for momentum
            const now = Date.now();
            const dt = (now - lastDragTime.current) / 1000; // in seconds
            if (dt > 0) {
                velocity.current.set(delta.x / dt, delta.y / dt);
            }
            lastDragTime.current = now;

            lastMouse.current.set(e.clientX, e.clientY);
        };

        const onPointerUp = () => {
            isDragging.current = false;
        };

        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointerleave', onPointerUp);

        return () => {
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('pointerleave', onPointerUp);
        };
    }, [gl]);

    // WRAP THE GRID (infinite scroll) while keeping tile identity stable
    useFrame((state, delta) => {
        const g = groupRef.current;
        if (!g) return;

        // Apply uniform scale to the entire grid
        g.scale.set(scale, scale, 1);
        
        // Apply momentum when not dragging
        if (!isDragging.current) {
            const friction = 0.92; // 0.95 = less friction, slides longer; 0.85 = more friction, stops faster
            velocity.current.multiplyScalar(friction);
            
            // Apply velocity to target offset
            targetOffset.current.x += velocity.current.x * delta;
            targetOffset.current.y += velocity.current.y * delta;
            
            // Stop if velocity is very small
            if (velocity.current.length() < 0.01) {
                velocity.current.set(0, 0);
            }
        }

        // Smoothly interpolate toward the target offset
        currentOffset.current.lerp(targetOffset.current, 0.2);

        let shifted = false;

        // Wrap offsets while tracking how many whole tiles we crossed
        while (currentOffset.current.x > CELL_W) {
            currentOffset.current.x -= CELL_W;
            targetOffset.current.x -= CELL_W;
            tileShift.current.x -= 1;
            shifted = true;
        }
        while (currentOffset.current.x < -CELL_W) {
            currentOffset.current.x += CELL_W;
            targetOffset.current.x += CELL_W;
            tileShift.current.x += 1;
            shifted = true;
        }
        while (currentOffset.current.y > CELL_H) {
            currentOffset.current.y -= CELL_H;
            targetOffset.current.y -= CELL_H;
            tileShift.current.y -= 1;
            shifted = true;
        }
        while (currentOffset.current.y < -CELL_H) {
            currentOffset.current.y += CELL_H;
            targetOffset.current.y += CELL_H;
            tileShift.current.y += 1;
            shifted = true;
        }

        // Apply the wrapped offset to the group (tiles stay at base positions)
        g.position.set(currentOffset.current.x, currentOffset.current.y, 0);

        // Only retarget textures for tiles that correspond to new world indices
        if (shifted && textures.length) {
            const children = g.children;
            for (const obj of children) {
                const mesh = (obj as THREE.Mesh).isMesh ? (obj as THREE.Mesh) : (obj.children.find(c => (c as THREE.Mesh).isMesh) as THREE.Mesh | undefined);
                if (!mesh) continue;

                const { baseCol, baseRow } = mesh.userData;
                if (baseCol === undefined || baseRow === undefined) continue;

                const worldCol = baseCol + tileShift.current.x;
                const worldRow = baseRow + tileShift.current.y;
                const hash = Math.abs(Math.imul(worldCol, 73856093) ^ Math.imul(worldRow, 19349663));
                const tex = textures[hash % textures.length];

                const mat = mesh.material as THREE.MeshBasicMaterial;
                if (mat.map !== tex) {
                    mat.map = tex;
                    mat.needsUpdate = true;

                    // Update geometry to match new texture's aspect ratio
                    if (tex && tex.image) {
                        const imgAspect = tex.image.width / tex.image.height;
                        const maxSize = 3;

                        let planeWidth = 3;
                        let planeHeight = 3;

                        if (imgAspect > 1) {
                            planeWidth = maxSize;
                            planeHeight = maxSize / imgAspect;
                        } else {
                            planeHeight = maxSize;
                            planeWidth = maxSize * imgAspect;
                        }

                        mesh.geometry.dispose();
                        mesh.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
                    }

                
                }
            }
        }
    });

    return (
        <group ref={groupRef}>
            {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, i) => {
                const col = i % GRID_COLS;
                const row = Math.floor(i / GRID_COLS);

                // Center the grid around (0,0)
                const centeredCol = col - GRID_COLS / 2;
                const centeredRow = row - GRID_ROWS / 2;
                const x = centeredCol * CELL_W;
                const y = centeredRow * CELL_H;

                // Initial texture assignment; subsequent updates happen imperatively when tileShift changes
                let tex: THREE.Texture | null = null;
                let planeWidth = 3;
                let planeHeight = 3;

                if (textures.length) {
                    const hash = Math.abs(Math.imul(centeredCol, 73856093) ^ Math.imul(centeredRow, 19349663));
                    tex = textures[hash % textures.length];

                    // Calculate plane dimensions to maintain aspect ratio
                    if (tex && tex.image) {
                        const imgAspect = tex.image.width / tex.image.height;
                        const maxSize = 3; // Maximum dimension

                        if (imgAspect > 1) {
                            // Wider image
                            planeWidth = maxSize;
                            planeHeight = maxSize / imgAspect;
                        } else {
                            // Taller image
                            planeHeight = maxSize;
                            planeWidth = maxSize * imgAspect;
                        }
                    }
                }

                return (
                    <mesh
                        key={i}
                        position={[x, y, 0]}
                        userData={{ baseCol: centeredCol, baseRow: centeredRow }}
                    >
                        <planeGeometry args={[planeWidth, planeHeight]} />
                        <meshBasicMaterial
                            map={tex}
                            toneMapped={false}
                        />                    </mesh>


                );
            })}
        </group>
    );
}

interface SceneProps {
    media: {
        url: string;
        type: 'image' | 'video';
    }[];
}

export default function Scene({ media }: SceneProps) {
    const PLACEHOLDER_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgkKIhxkAAAAASUVORK5CYII=';

    const imageUrls = useMemo(
        () => media
            .filter(m => m.type === 'image' && Boolean(m.url))
            .map(m => m.url),
        [media]
    );

    // Ensure useLoader always gets at least one valid URL to avoid "Could not load : undefined"
    const textures = useLoader(TextureLoader, imageUrls.length ? imageUrls : [PLACEHOLDER_DATA_URL]);
    const validTextures = (textures as THREE.Texture[]).filter(Boolean);

    // Ensure textures display with correct colors
    validTextures.forEach((tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
    });


    return (
        <div className="fixed top-0 left-0 w-screen h-screen z-[9999] cursor-grab">
            <Canvas
                camera={{ position: [0, 0, 5], fov: 75 }}
                gl={{
                    outputColorSpace: THREE.SRGBColorSpace,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.2,
                }}            >
                {/* <ambientLight intensity={1.0} /> */}
                {/* <directionalLight position={[5, 5, 5]} intensity={1.0} /> */}
                <Grid textures={validTextures} scale={1} />
            </Canvas>
        </div>
    );
}