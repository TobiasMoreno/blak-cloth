import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface LockerRoom {
  /** Velo oscuro que se interpone entre el perchero y la remera elegida. */
  dim: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /** Soportes del riel: viajan con el perchero para que se lea el desplazamiento. */
  supports: THREE.Group;
}

/**
 * Vestuario de BLAK: pared de lockers, franja bordó, banco y un riel cromado.
 * El riel corre a lo largo de x a la altura railY, con su eje en z = 0.
 */
export function buildLockerRoom(
  scene: THREE.Scene,
  railY: number,
  dimZ: number,
  mobile: boolean,
): LockerRoom {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#181414', roughness: 0.95 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 14), wallMaterial);
  wall.position.set(0, 1.5, -1.65);
  wall.receiveShadow = true;
  scene.add(wall);

  const lockerDark = new THREE.MeshStandardMaterial({ color: '#211b1b', roughness: 0.7, metalness: 0.25 });
  const lockerLight = new THREE.MeshStandardMaterial({ color: '#1a1616', roughness: 0.7, metalness: 0.25 });
  const slitMaterial = new THREE.MeshStandardMaterial({ color: '#0a0808', roughness: 1 });
  const handleMaterial = new THREE.MeshStandardMaterial({ color: '#8f8a83', roughness: 0.3, metalness: 1 });
  // Cada tipo de pieza se une en una sola malla: 4 draw calls en vez de ~170.
  const parts: Record<'dark' | 'light' | 'slit' | 'handle', THREE.BufferGeometry[]> = {
    dark: [],
    light: [],
    slit: [],
    handle: [],
  };
  for (let index = -14; index <= 14; index += 1) {
    const x = index * 1.12;
    parts[index % 2 === 0 ? 'dark' : 'light'].push(
      new THREE.BoxGeometry(1.08, 3.1, 0.18).translate(x, 0.75, -1.52),
    );
    for (let slit = 0; slit < 4; slit += 1) {
      parts.slit.push(new THREE.BoxGeometry(0.5, 0.025, 0.02).translate(x, 2 - slit * 0.07, -1.42));
    }
    parts.handle.push(new THREE.BoxGeometry(0.035, 0.16, 0.04).translate(x + 0.4, 0.55, -1.41));
  }
  const materials = { dark: lockerDark, light: lockerLight, slit: slitMaterial, handle: handleMaterial };
  for (const key of Object.keys(parts) as (keyof typeof parts)[]) {
    const merged = mergeGeometries(parts[key]);
    parts[key].forEach((geometry) => geometry.dispose());
    const mesh = new THREE.Mesh(merged, materials[key]);
    mesh.receiveShadow = key === 'dark' || key === 'light';
    scene.add(mesh);
  }

  const band = new THREE.Mesh(
    new THREE.BoxGeometry(60, 0.55, 0.3),
    new THREE.MeshStandardMaterial({ color: '#66121d', roughness: 0.8 }),
  );
  band.position.set(0, -0.97, -1.45);
  band.receiveShadow = true;
  scene.add(band);

  // El banco queda contra la pared y por debajo del bajo de las remeras.
  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(60, 0.12, 0.42),
    new THREE.MeshStandardMaterial({ color: '#4b1019', roughness: 0.6 }),
  );
  bench.position.set(0, -0.9, -1.0);
  bench.castShadow = true;
  bench.receiveShadow = true;
  scene.add(bench);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 14),
    new THREE.MeshStandardMaterial({ color: '#0d0b0a', roughness: 0.45, metalness: 0.15 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -1.25, 3);
  floor.receiveShadow = true;
  scene.add(floor);

  const chrome = new THREE.MeshStandardMaterial({ color: '#d9d5cf', roughness: 0.18, metalness: 1 });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 60, 16), chrome);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, railY, 0);
  rail.castShadow = true;
  scene.add(rail);

  const supports = new THREE.Group();
  const rodGeometry = new THREE.CylinderGeometry(0.009, 0.009, 3, 10);
  for (let x = -22; x <= 22; x += 2.4) {
    const rod = new THREE.Mesh(rodGeometry, chrome);
    rod.position.set(x, railY + 1.5, 0);
    supports.add(rod);
  }
  scene.add(supports);

  scene.add(new THREE.HemisphereLight('#f6eee4', '#1a080b', 0.35));

  const key = new THREE.DirectionalLight('#fff1e2', 3.1);
  key.position.set(2.8, 4.6, 3.4);
  key.target.position.set(0, 0.3, 0);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(mobile ? 1024 : 2048);
  const shadowCamera = key.shadow.camera;
  shadowCamera.left = -5;
  shadowCamera.right = 5;
  shadowCamera.top = 3;
  shadowCamera.bottom = -3;
  shadowCamera.near = 1;
  shadowCamera.far = 14;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.012;
  key.shadow.radius = 4;
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight('#b9c8ff', 0.45);
  fill.position.set(-3.5, 2, 3);
  scene.add(fill);

  const warm = new THREE.PointLight('#ffb070', 2.2, 5, 1.6);
  warm.position.set(0, railY + 1, 0.6);
  scene.add(warm);

  const brand = new THREE.PointLight('#d9182b', 9, 7, 2);
  brand.position.set(3.5, -0.8, 1.8);
  scene.add(brand);

  const dim = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 20),
    new THREE.MeshBasicMaterial({ color: '#060404', transparent: true, opacity: 0, depthWrite: false }),
  );
  dim.position.set(0, 1, dimZ);
  dim.visible = false;
  scene.add(dim);

  return { dim, supports };
}
