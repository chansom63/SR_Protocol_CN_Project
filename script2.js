// Handle acknowledgment
function handleAcknowledgment(seqNum) {
    currentWindow = currentWindow.filter(p => p !== seqNum);
    if (currentWindow.length < windowSize && nextSeqNum < numPackets) {
        sendPacket(nextSeqNum++);
    }
}

// Send a new packet
function sendPacket(seqNum) {
    const packet = createPacket(seqNum);
    // Position packet at its starting position
    packet.position.set(-8, packet.userData.startY, 0);
    packet.userData.moving = true;
    packet.userData.progress = 0;
    packet.material.transparent = true;
    packet.material.opacity = 1;
    scene.add(packet);
    packets.push(packet);
    currentWindow.push(seqNum);
}

// Start simulation
function startSimulation() {
    if (simulationRunning) return;

    // Get parameters
    windowSize = parseInt(document.getElementById('windowSize').value);
    timeout = parseInt(document.getElementById('timeout').value);
    packetLossRate = parseInt(document.getElementById('packetLoss').value);
    numPackets = parseInt(document.getElementById('numPackets').value);
    animationSpeed = parseInt(document.getElementById('animationSpeed').value);

    // Reset state
    packets.forEach(packet => {
        scene.remove(packet);
        scene.remove(packet.userData.line);
        scene.remove(packet.userData.frameLabel);
    });
    packets = [];
    currentWindow = [];
    baseSeqNum = 0;
    nextSeqNum = 0;

    // Clear all previous status messages
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = '';
    document.querySelector('.status-list').innerHTML = '';
    document.getElementById('senderLabels').innerHTML = '';
    document.getElementById('receiverLabels').innerHTML = '';

    // Add simulation started message first
    updateStatus('Simulation started', true);

    // Recreate nodes with new height
    scene.remove(senderNode);
    scene.remove(receiverNode);
    createNodes();

    // Start sending packets
    simulationRunning = true;
    while (currentWindow.length < windowSize && nextSeqNum < numPackets) {
        sendPacket(nextSeqNum++);
    }
}

// Reset simulation
function resetSimulation() {
    simulationRunning = false;
    simulationPaused = false;

    // Remove all packets and their associated elements
    packets.forEach(packet => {
        scene.remove(packet);
        scene.remove(packet.userData.line);
        scene.remove(packet.userData.frameLabel);
        if (packet.userData.statusLabel) {
            scene.remove(packet.userData.statusLabel);
        }
    });
    packets = [];
    currentWindow = [];
    baseSeqNum = 0;
    nextSeqNum = 0;

    // Clear all status messages
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = '';
    document.querySelector('.status-list').innerHTML = '';
    document.getElementById('senderLabels').innerHTML = '';
    document.getElementById('receiverLabels').innerHTML = '';

    // Remove existing nodes and recreate them
    scene.remove(senderNode);
    scene.remove(receiverNode);
    createNodes();

    const pauseButton = document.getElementById('pauseSimulation');
    pauseButton.textContent = 'Pause';
    pauseButton.classList.remove('paused');

    updateStatus('Simulation reset');
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (simulationRunning) {
        animatePackets();
    }
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

// Event listeners
document.getElementById('startSimulation').addEventListener('click', startSimulation);
document.getElementById('resetSimulation').addEventListener('click', resetSimulation);
document.getElementById('pauseSimulation').addEventListener('click', togglePause);
document.getElementById('animationSpeed').addEventListener('input', (e) => {
    animationSpeed = parseInt(e.target.value);
});

// Initialize the scene
init();

function togglePause() {
    simulationPaused = !simulationPaused;
    const pauseButton = document.getElementById('pauseSimulation');
    pauseButton.textContent = simulationPaused ? 'Resume' : 'Pause';
    pauseButton.classList.toggle('paused');
} 