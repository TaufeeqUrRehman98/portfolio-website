/**
 * Three.js Hero Scene — Cybersecurity Particle Network
 * Floating nodes with connecting lines forming a dynamic network graph
 */

(function () {
  'use strict';

  let scene, camera, renderer, particles, lines, animFrame;
  let mouseX = 0, mouseY = 0;
  const PARTICLE_COUNT = 120;
  const CONNECTION_DISTANCE = 150;

  function init() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.z = 400;

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    createParticles();
    createShield();
    addEventListeners();
    animate();
  }

  function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = [];
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const color1 = new THREE.Color(0x00ff88); // neon green
    const color2 = new THREE.Color(0x00ccff); // cyan
    const color3 = new THREE.Color(0xff6600); // orange accent

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 800;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 600;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 300;

      velocities.push({
        x: (Math.random() - 0.5) * 0.4,
        y: (Math.random() - 0.5) * 0.4,
        z: (Math.random() - 0.5) * 0.2
      });

      const t = Math.random();
      let c;
      if (t < 0.6) c = color1;
      else if (t < 0.9) c = color2;
      else c = color3;

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    particles = new THREE.Points(geometry, material);
    particles.userData.velocities = velocities;
    scene.add(particles);

    // Lines (connection network)
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    const lineMaterial = new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.15,
        vertexColors: false,
      })
    );
    lines = lineMaterial;
    scene.add(lines);
  }

  function createShield() {
    // Central hexagonal shield wireframe
    const shieldGroup = new THREE.Group();

    // Outer hex ring
    const hexGeo = new THREE.CylinderGeometry(60, 60, 5, 6, 1, true);
    const hexMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.12,
      wireframe: true,
    });
    const hexMesh = new THREE.Mesh(hexGeo, hexMat);
    hexMesh.rotation.x = Math.PI / 2;
    shieldGroup.add(hexMesh);

    // Inner ring
    const innerGeo = new THREE.TorusGeometry(38, 1.5, 8, 6);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x00ccff,
      transparent: true,
      opacity: 0.3,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    shieldGroup.add(innerMesh);

    // Pulsing core sphere
    const coreGeo = new THREE.SphereGeometry(15, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    shieldGroup.add(coreMesh);

    shieldGroup.position.set(0, 0, -50);
    scene.add(shieldGroup);

    // Store for animation
    scene.userData.shield = shieldGroup;
    scene.userData.core = coreMesh;
  }

  function updateConnections() {
    const positions = particles.geometry.attributes.position.array;
    const linePositions = lines.geometry.attributes.position.array;
    let lineIndex = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < CONNECTION_DISTANCE) {
          linePositions[lineIndex++] = positions[i * 3];
          linePositions[lineIndex++] = positions[i * 3 + 1];
          linePositions[lineIndex++] = positions[i * 3 + 2];
          linePositions[lineIndex++] = positions[j * 3];
          linePositions[lineIndex++] = positions[j * 3 + 1];
          linePositions[lineIndex++] = positions[j * 3 + 2];
        }
      }
    }

    lines.geometry.setDrawRange(0, lineIndex / 3);
    lines.geometry.attributes.position.needsUpdate = true;
  }

  function animate() {
    animFrame = requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    // Move particles
    const positions = particles.geometry.attributes.position.array;
    const velocities = particles.userData.velocities;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] += velocities[i].x;
      positions[i * 3 + 1] += velocities[i].y;
      positions[i * 3 + 2] += velocities[i].z;

      // Bounce off bounds
      if (Math.abs(positions[i * 3]) > 400) velocities[i].x *= -1;
      if (Math.abs(positions[i * 3 + 1]) > 300) velocities[i].y *= -1;
      if (Math.abs(positions[i * 3 + 2]) > 150) velocities[i].z *= -1;
    }

    particles.geometry.attributes.position.needsUpdate = true;
    updateConnections();

    // Mouse parallax
    if (camera) {
      camera.position.x += (mouseX * 30 - camera.position.x) * 0.02;
      camera.position.y += (-mouseY * 20 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);
    }

    // Shield rotation
    if (scene.userData.shield) {
      scene.userData.shield.rotation.z = time * 0.3;
      scene.userData.shield.rotation.y = time * 0.15;
    }

    // Core pulse
    if (scene.userData.core) {
      const pulse = 1 + 0.2 * Math.sin(time * 2);
      scene.userData.core.scale.setScalar(pulse);
    }

    renderer.render(scene, camera);
  }

  function onResize() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || !renderer || !camera) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function onMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }

  function addEventListeners() {
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
  }

  // Update colors based on theme
  window.updateThreeTheme = function (isDark) {
    if (!particles) return;
    const mat = particles.material;
    mat.opacity = isDark ? 0.85 : 0.65;
    if (lines) {
      lines.material.color.setHex(isDark ? 0x00ff88 : 0x007744);
      lines.material.opacity = isDark ? 0.15 : 0.1;
    }
  };

  // Wait for THREE to be available
  function waitForThree() {
    if (typeof THREE !== 'undefined') {
      init();
    } else {
      setTimeout(waitForThree, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForThree);
  } else {
    waitForThree();
  }
})();
