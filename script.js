class ARQVisualization {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set base dimensions
        this.width = 800;
        this.baseHeight = 700;  // Reduced from 800 to 600
        
        // Constants for visualization
        this.pillarWidth = 100;
        this.packetWidth = 60;
        this.packetHeight = 30;
        this.packetSpacing = 10;
        this.animationSpeed = 3;
        
        // Calculate dynamic pillar height based on number of packets
        this.pillarHeight = this.baseHeight - 100; // Reduced margin from 150 to 100
        
        // Sender and receiver positions - adjusted for new canvas size
        this.senderX = 200;  // Moved closer to left edge
        this.receiverX = this.width - 200;  // Moved closer to right edge
        this.baseY = (this.baseHeight - this.pillarHeight) / 2;
        
        // Animation state
        this.packets = [];
        this.acks = [];
        this.windowPosition = 0;
        this.isAnimating = false;
        this.lostPacketCrosses = []; // Store positions of lost packet crosses
        this.lostAckCrosses = []; // Store positions of lost ACK crosses
        this.fadingAcks = []; // Store ACKs that are fading
        
        // ARQ state
        this.windowSize = 5;
        this.totalPackets = 10;
        this.timeout = 3000;
        this.lostPackets = [];
        this.lostAcks = [];
        
        this.base = 0;
        this.nextSeqNum = 0;
        this.completedPackets = 0;
        
        // Track packets that need timeout
        this.packetTimers = {};
        
        // Add property for blank packets
        this.blankPackets = [];
        
        // Add property to track waiting for specific ACKs
        this.waitingForAcks = [];
        
        // Add property to track the last ACK
        this.lastAck = null;
        
        // Add property to track the last ACK color
        this.lastAckColor = '#00ff00'; // Default green
        
        // Add property to track all ACKs that need to be received
        this.requiredAcks = [];
        
        // Add property to track acknowledgments received
        this.receivedAcks = new Set();
        
        // Add property to track if last ACK has been received
        this.lastAckReceived = false;
        
        // Add property to track the last ACK in the window
        this.lastAckInWindow = null;
        
        // Add property to track timeout progress for each packet
        this.packetTimeouts = {}; // Map of packet sequence number to timeout info
        this.timeoutRingRadius = 15; // Smaller radius for the timeout ring
        this.timeoutRingThickness = 4; // Thinner ring
        this.timeoutDuration = 3000; // Default 3 seconds, will be updated from user input
        
        // Add property to track if animation is paused
        this.isPaused = false;
        
        // Add property for received packet effects
        this.receivedPacketEffects = [];
        
        // Add 3D effect properties
        this.packetDepth = 20; // Depth for 3D effect
        this.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.highlightColor = 'rgba(255, 255, 255, 0.3)';
        
        // Add transition properties
        this.transitionDuration = 500; // ms for smooth transitions
        this.windowTransitionSpeed = 0.05; // Reduced for smoother sliding
        this.targetWindowPosition = 20;
        this.windowSlideInProgress = false;
        this.windowSlideStartTime = 0;
        
        // Add animation properties
        this.packetScale = 1;
        this.packetRotation = 0;
        this.ackScale = 1;
        this.ackRotation = 0;
        
        // Add properties for trailing paths
        this.packetTrails = []; // Array to store packet trails
        this.ackTrails = []; // Array to store ACK trails
        this.trailLength = 40;
        this.trailThickness = 1.5;
        this.trailOpacity = 0.4;
        this.packetTrailColor = 'rgba(255, 255, 255, ' + this.trailOpacity + ')';
        this.ackTrailColor = 'rgba(0, 255, 0, ' + this.trailOpacity + ')';
        this.lostTrailColor = 'rgba(255, 0, 0, ' + this.trailOpacity + ')';
        
        // Add buffer state tracking
        this.bufferPackets = new Map(); // Track packets in buffer with their fade state
        this.bufferFadeDuration = 5000; // Increased to 5 seconds
        this.bufferFadeStartTime = null;
        this.bufferPosition = 0; // Track buffer position
        this.bufferTargetPosition = 0; // Target position for smooth movement
        this.bufferMoveSpeed = 0.1; // Slower movement speed
        this.bufferPacketSpacing = 5; // Spacing between packets in buffer
        this.bufferAnimationSpeed = 0.1; // Speed for packet movement in buffer
        this.retransmittedPackets = new Set(); // Track retransmitted packets
        this.bufferGaps = new Map(); // Track gaps for lost packets
        
        // Add message fade properties
        this.messageFadeStartTime = null;
    }
    
    initialize() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw pillars
        this.drawPillars();
        
        // Initialize packets
        this.initializePackets();
        
        // Set initial window position to align with first packet
        this.windowPosition = 20; // Initial offset from top of pillar
        
        // Update blank packets
        this.updateBlankPackets();
        
        // Start animation loop
        this.animate();
    }
    
    drawPillars() {
        // Draw sender pillar
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(this.senderX - this.pillarWidth/2, this.baseY, 
                         this.pillarWidth, this.pillarHeight);
        
        // Draw receiver pillar
        this.ctx.fillRect(this.receiverX - this.pillarWidth/2, this.baseY, 
                         this.pillarWidth, this.pillarHeight);
        
        // Draw labels
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Sender', this.senderX, this.baseY - 20);
        this.ctx.fillText('Receiver', this.receiverX, this.baseY - 20);
    }
    
    drawTimeoutRing(seqNum, progress) {
        // Save the current context state
        this.ctx.save();
        
        // Get the packet position
        const packet = this.packets[seqNum];
        if (!packet) {
            this.ctx.restore();
            return;
        }
        
        // Set up the ring properties - position it to the left of the sender pole
        const centerX = this.senderX - this.pillarWidth/2 - this.timeoutRingRadius - 10; // Added 10px gap
        const centerY = packet.y + this.packetHeight/2;
        const radius = this.timeoutRingRadius;
        const thickness = this.timeoutRingThickness;
        
        // Draw "waiting" and "for timeout" text to the left of the ring
        this.ctx.fillStyle = '#FFD700'; // Gold color
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Waiting...', centerX - radius - 10, centerY - 8);
        this.ctx.fillText('to retransmit', centerX - radius - 10, centerY + 8);
        
        // Calculate the progress angle (0 to 2π)
        const progressAngle = progress * Math.PI * 2;
        
        // Draw the background ring (grey)
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = thickness;
        this.ctx.stroke();
        
        // Draw the progress ring (red)
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + progressAngle);
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = thickness;
        this.ctx.stroke();
        
        // Restore the context state
        this.ctx.restore();
    }
    
    initializePackets() {
        this.packets = [];
        
        // Calculate total height needed for all packets
        const totalHeight = this.totalPackets * (this.packetHeight + this.packetSpacing) - this.packetSpacing;
        
        // Calculate starting Y position to center packets vertically
        const startY = this.baseY + (this.pillarHeight - totalHeight) / 2;
        
        for (let i = 0; i < this.totalPackets; i++) {
            this.packets.push({
                seqNum: i,
                x: this.senderX,
                y: startY + i * (this.packetHeight + this.packetSpacing),
                status: 'waiting',
                color: '#FFFFFF'
            });
        }
        
        // Initialize required ACKs
        this.requiredAcks = Array.from({length: this.totalPackets}, (_, i) => i);
        
        // Set initial window position to align with first packet
        this.windowPosition = startY;
    }
    
    drawWindow() {
        // Calculate window height based on number of packets it should contain
        const windowHeight = (this.windowSize * (this.packetHeight + this.packetSpacing)) - this.packetSpacing;
        
        // Save the current context state
        this.ctx.save();
        
        // Set composite operation to draw window on top
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Add gradient effect to window
        const gradient = this.ctx.createLinearGradient(
            this.senderX - this.pillarWidth/2,
            this.windowPosition,
            this.senderX - this.pillarWidth/2,
            this.windowPosition + windowHeight
        );
        gradient.addColorStop(0, 'rgba(255, 255, 0, 0.2)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0.2)');
        
        // Draw window background
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            this.senderX - this.pillarWidth/2,
            this.windowPosition,
            this.pillarWidth,
            windowHeight
        );
        
        // Draw window border
        this.ctx.strokeStyle = 'yellow';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            this.senderX - this.pillarWidth/2,
            this.windowPosition,
            this.pillarWidth,
            windowHeight
        );
        
        // Add glow effect when sliding
        if (this.windowSlideInProgress) {
            this.ctx.shadowColor = 'yellow';
            this.ctx.shadowBlur = 10;
            this.ctx.strokeRect(
                this.senderX - this.pillarWidth/2,
                this.windowPosition,
                this.pillarWidth,
                windowHeight
            );
            this.ctx.shadowBlur = 0;
        }
        
        // Restore the context state
        this.ctx.restore();
    }
    
    drawLostPacketCross(x, y) {
        const crossSize = 20;
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 3;
        
        // Draw X
        this.ctx.beginPath();
        this.ctx.moveTo(x - crossSize/2, y - crossSize/2);
        this.ctx.lineTo(x + crossSize/2, y + crossSize/2);
        this.ctx.moveTo(x + crossSize/2, y - crossSize/2);
        this.ctx.lineTo(x - crossSize/2, y + crossSize/2);
        this.ctx.stroke();
    }
    
    drawPackets() {
        // Draw blank packets first
        this.blankPackets.forEach(packet => {
            // Ensure packet stays within pillar bounds
            const x = Math.min(Math.max(this.senderX - this.packetWidth/2, this.senderX - this.pillarWidth/2), 
                             this.senderX + this.pillarWidth/2 - this.packetWidth);
            this.drawPacketWith3D(
                x,
                packet.y,
                '#888888',
                `${packet.seqNum}`,
                true
            );
        });
        
        // Draw regular packets
        this.packets.forEach(packet => {
            if (packet.status === 'waiting') {
                // Ensure packet stays within pillar bounds
                const x = Math.min(Math.max(this.senderX - this.packetWidth/2, this.senderX - this.pillarWidth/2), 
                                 this.senderX + this.pillarWidth/2 - this.packetWidth);
                this.drawPacketWith3D(
                    x,
                    packet.y,
                    '#FFFFFF',
                    `F${packet.seqNum}`,
                    false
                );
            } else if (packet.status === 'inTransit') {
                // Ensure packet stays within pillar bounds
                const x = Math.min(Math.max(packet.x - this.packetWidth/2, this.senderX - this.pillarWidth/2), 
                                 this.receiverX + this.pillarWidth/2 - this.packetWidth);
                this.drawPacketWith3D(
                    x,
                    packet.y,
                    '#FFFFFF',
                    `F${packet.seqNum}`,
                    false
                );
            } else if (packet.status === 'lost') {
                // Draw lost packet in transparent red at the loss position
                const lossX = (this.senderX + this.receiverX) / 2;
                this.ctx.globalAlpha = 0.4;
                this.drawPacketWith3D(
                    lossX - this.packetWidth/2,
                    packet.y,
                    'rgba(255, 0, 0, 0.4)',
                    `F${packet.seqNum}`,
                    false
                );
                this.ctx.globalAlpha = 1.0;
            } else if (packet.status === 'received' || packet.status === 'acked') {
                // Draw received packet on receiver pillar
                const x = Math.min(Math.max(this.receiverX - this.packetWidth/2, this.receiverX - this.pillarWidth/2), 
                                 this.receiverX + this.pillarWidth/2 - this.packetWidth);
                
                this.drawPacketWith3D(
                    x,
                    packet.y,
                    '#4CAF50', // Green color for received packets
                    `F${packet.seqNum}`,
                    false
                );
                
                // Also keep the packet visible on sender pillar if it's acknowledged
                if (packet.status === 'acked') {
                    const senderX = Math.min(Math.max(this.senderX - this.packetWidth/2, this.senderX - this.pillarWidth/2), 
                                          this.senderX + this.pillarWidth/2 - this.packetWidth);
                    this.drawPacketWith3D(
                        senderX,
                        packet.y,
                        '#4CAF50', // Green color for acknowledged packets
                        `f${packet.seqNum}`,
                        false
                    );
                }
            }
        });
        
        // Draw lost packet crosses and effects
        this.lostPacketCrosses.forEach(cross => {
            this.drawLostPacketCross(cross.x, cross.y);
            
            // Draw the lost packet in red at the cross position
            const packet = this.packets[cross.seqNum];
            if (packet && packet.status === 'lost') {
                this.ctx.globalAlpha = 0.4;
                this.drawPacketWith3D(
                    cross.x - this.packetWidth/2,
                    cross.y - this.packetHeight/2,
                    'rgba(255, 0, 0, 0.4)',
                    `F${cross.seqNum}`,
                    false
                );
                this.ctx.globalAlpha = 1.0;
            }
        });
    }
    
    drawLostAckCross(x, y) {
        const crossSize = 20;
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 3;
        
        // Draw X
        this.ctx.beginPath();
        this.ctx.moveTo(x - crossSize/2, y - crossSize/2);
        this.ctx.lineTo(x + crossSize/2, y + crossSize/2);
        this.ctx.moveTo(x + crossSize/2, y - crossSize/2);
        this.ctx.lineTo(x - crossSize/2, y + crossSize/2);
        this.ctx.stroke();
    }
    
    drawAcks() {
        // Draw regular ACKs
        this.acks.forEach(ack => {
            // Ensure ACK stays within pillar bounds
            const x = Math.min(Math.max(ack.x - this.packetWidth/2, this.senderX - this.pillarWidth/2), 
                             this.receiverX + this.pillarWidth/2 - this.packetWidth);
            this.drawAckWith3D(
                x,
                ack.y,
                ack.color,
                `Ack ${ack.seqNum}`
            );
        });
        
        // Draw lost ACKs
        this.lostAckCrosses.forEach(cross => {
            this.drawAckWith3D(
                cross.x - this.packetWidth/2,
                cross.y - this.packetHeight/2,
                'rgba(255, 0, 0, 0.4)',
                `Ack ${cross.seqNum}`
            );
            this.drawLostAckCross(cross.x, cross.y);
        });
        
        // Draw ACKs that have reached the sender on the sender pillar
        this.packets.forEach(packet => {
            if (packet.status === 'acked') {
                const x = Math.min(Math.max(this.senderX - this.packetWidth/2, this.senderX - this.pillarWidth/2), 
                                 this.senderX + this.pillarWidth/2 - this.packetWidth);
                this.drawAckWith3D(
                    x,
                    packet.y,
                    '#4CAF50', // Green color for received ACKs
                    `Ack ${packet.seqNum}`
                );
            }
        });
    }
    
    updatePackets() {
        // Skip updates if paused
        if (this.isPaused) return;
        
        // Update timeout progress for each packet
        Object.keys(this.packetTimeouts).forEach(seqNum => {
            const timeout = this.packetTimeouts[seqNum];
            const elapsed = Date.now() - timeout.startTime;
            timeout.progress = Math.min(1, elapsed / timeout.duration);
            
            // If timeout is complete, remove it and retransmit the packet
            if (timeout.progress >= 1) {
                const packet = this.packets[parseInt(seqNum)];
                if (packet) {
                    // Reset packet state for retransmission
                    packet.status = 'waiting';
                    packet.x = this.senderX;
                    
                    // Force retransmission of this packet
                    this.nextSeqNum = Math.min(this.nextSeqNum, parseInt(seqNum));
                    
                    // Remove from lost packets list so it won't be lost again
                    this.lostPackets = this.lostPackets.filter(p => p !== parseInt(seqNum));
                    
                    // Clear any existing timeouts
                    delete this.packetTimeouts[seqNum];
                    
                    // Remove the cross and faded packet/ACK immediately
                    this.lostPacketCrosses = this.lostPacketCrosses.filter(cross => cross.seqNum !== parseInt(seqNum));
                    this.lostAckCrosses = this.lostAckCrosses.filter(cross => cross.seqNum !== parseInt(seqNum));
                    
                    // Start retransmission immediately
                    packet.status = 'inTransit';
                    
                    // Start new timer for retransmitted packet
                    if (this.lostPackets.includes(packet.seqNum) || this.lostAcks.includes(packet.seqNum)) {
                        this.packetTimeouts[packet.seqNum] = {
                            startTime: Date.now(),
                            duration: this.timeoutDuration,
                            progress: 0
                        };
                    }
                }
            }
        });
        
        // Update window position based on acknowledged packets
        let newBase = this.base;
        while (newBase < this.totalPackets && 
               this.packets[newBase] && 
               this.packets[newBase].status === 'acked') {
            newBase++;
        }
        
        // If base has changed, update window position
        if (newBase !== this.base) {
            this.base = newBase;
            // Calculate new window position based on the first unacknowledged packet
            const firstUnackedPacket = this.packets[this.base];
            if (firstUnackedPacket) {
                this.windowPosition = firstUnackedPacket.y;
            }
        }
        
        this.packets.forEach(packet => {
            if (packet.status === 'inTransit') {
                // Check if packet should be lost before moving it
                if (this.lostPackets.includes(packet.seqNum) && 
                    packet.x >= (this.senderX + this.receiverX) / 2) {
                    // Only add cross if it doesn't already exist
                    if (!this.lostPacketCrosses.some(cross => cross.seqNum === packet.seqNum)) {
                        // Add cross at loss position
                        this.lostPacketCrosses.push({
                            x: packet.x,
                            y: packet.y + this.packetHeight/2,
                            seqNum: packet.seqNum,
                            timestamp: Date.now()
                        });
                        
                        // Remove packet from transit and stop it completely
                        packet.status = 'lost';
                        packet.x = (this.senderX + this.receiverX) / 2; // Fix position at loss point
                        
                        // Add gap for this lost packet
                        this.bufferGaps.set(packet.seqNum, {
                            y: packet.y,
                            height: this.packetHeight + this.bufferPacketSpacing
                        });
                    }
                } else {
                    // Move packet towards receiver - use animationSpeed from slider
                    if (packet.x < this.receiverX) {
                        packet.x += this.animationSpeed;
                    } else if (!this.lostPackets.includes(packet.seqNum)) {
                        // Packet reached receiver
                        packet.status = 'received';
                        
                        // Add visual effect for received packet
                        this.addReceivedPacketEffect(packet);
                        
                        // If this was a lost packet that's now received, add it to buffer immediately
                        if (this.lostPackets.includes(packet.seqNum) || packet.seqNum === this.totalPackets - 1) {
                            // Check if there was a gap for this packet
                            const gap = this.bufferGaps.get(packet.seqNum);
                            if (gap || packet.seqNum === this.totalPackets - 1) {
                                this.bufferPackets.set(packet.seqNum, {
                                    ...packet,
                                    fadeProgress: 1,
                                    originalY: gap ? gap.y : packet.y,
                                    targetY: gap ? gap.y : packet.y,
                                    currentY: gap ? gap.y : packet.y,
                                    isRetransmitted: this.retransmittedPackets.has(packet.seqNum)
                                });
                                // Remove the gap since it's now filled
                                this.bufferGaps.delete(packet.seqNum);
                            }
                        }
                        
                        // Check if an ACK for this packet already exists
                        const existingAck = this.acks.find(ack => ack.seqNum === packet.seqNum);
                        if (!existingAck) {
                            // Create ACK with a small delay
                            setTimeout(() => {
                                const ack = {
                                    seqNum: packet.seqNum,
                                    x: this.receiverX,
                                    y: packet.y,
                                    status: 'inTransit',
                                    color: '#00ff00'  // Keep ACKs green
                                };
                                
                                this.acks.push(ack);
                                
                                // Check if ACK should be lost
                                if (this.lostAcks.includes(packet.seqNum)) {
                                    // Add cross at loss position when ACK reaches middle
                                    const lossX = (this.senderX + this.receiverX) / 2;
                                    
                                    // Only add cross and red ACK when the green ACK reaches the middle
                                    const checkPosition = setInterval(() => {
                                        if (ack.x <= lossX) {
                                            clearInterval(checkPosition);
                                            
                                            // Only add cross if it doesn't already exist
                                            if (!this.lostAckCrosses.some(cross => cross.seqNum === packet.seqNum)) {
                                                // Add cross and red ACK at loss position
                                                this.lostAckCrosses.push({
                                                    x: lossX,
                                                    y: packet.y + this.packetHeight/2,
                                                    seqNum: packet.seqNum,
                                                    timestamp: Date.now()
                                                });
                                                
                                                // Remove the green ACK
                                                this.acks = this.acks.filter(a => a !== ack);
                                            }
                                        }
                                    }, 50);
                                }
                            }, 200);
                        }
                    }
                }
            }
        });
        
        // Update ACKs
        for (let i = this.acks.length - 1; i >= 0; i--) {
            const ack = this.acks[i];
            if (ack.status === 'inTransit') {
                // Move ACK towards sender - use animationSpeed from slider
                if (ack.x > this.senderX) {
                    ack.x -= this.animationSpeed;
                    
                    // Check if ACK should be lost
                    if (this.lostAcks.includes(ack.seqNum) && 
                        ack.x <= (this.senderX + this.receiverX) / 2) {
                        // Add cross at loss position
                        this.lostAckCrosses.push({
                            x: ack.x,
                            y: ack.y + this.packetHeight/2,
                            seqNum: ack.seqNum,
                            timestamp: Date.now()
                        });
                        
                        // Remove from lost ACKs list so it won't be lost again
                        this.lostAcks = this.lostAcks.filter(a => a !== ack.seqNum);
                        
                        // Remove the ACK from the list
                        this.acks.splice(i, 1);
                    }
                } else {
                    // ACK reached sender
                    if (!this.lostAcks.includes(ack.seqNum)) {
                        this.completedPackets++;
                        
                        // Mark the packet as acknowledged
                        const packet = this.packets[ack.seqNum];
                        if (packet) {
                            packet.status = 'acked';
                            packet.color = '#4CAF50'; // Set packet color to green when acknowledged
                            
                            // Clear any timeout for this packet
                            if (this.packetTimers[ack.seqNum]) {
                                clearTimeout(this.packetTimers[ack.seqNum]);
                                delete this.packetTimers[ack.seqNum];
                            }
                            
                            // Clear any timeout for this packet
                            if (this.packetTimeouts[ack.seqNum]) {
                                delete this.packetTimeouts[ack.seqNum];
                            }
                        }
                        
                        // Add to received ACKs set
                        this.receivedAcks.add(ack.seqNum);
                        
                        // Update the last ACK
                        this.lastAck = ack.seqNum;
                        this.lastAckReceived = true;
                        this.lastAckColor = '#4CAF50';
                        
                        // Check if all packets are acknowledged
                        if (this.receivedAcks.size === this.totalPackets) {
                            // Mark all remaining packets as acknowledged
                            this.packets.forEach(packet => {
                                if (packet.status !== 'acked') {
                                    packet.status = 'acked';
                                    packet.color = '#4CAF50';
                                }
                            });
                            
                            // Move window below all packets immediately
                            this.windowPosition = this.baseY + 20 + this.totalPackets * (this.packetHeight + this.packetSpacing);
                            
                            // Clear blank packets
                            this.blankPackets = [];
                            
                            // Remove all remaining ACKs
                            this.acks = [];
                            
                            // Display popup message
                            this.showLastAckReceivedPopup();
                            
                            // Stop animation
                            this.isAnimating = false;
                            
                            // Force an immediate redraw with proper layering
                            this.ctx.clearRect(0, 0, this.width, this.height);
                            this.drawPillars();
                            this.drawPackets();
                            this.drawAcks();
                            this.drawWindow();
                        }
                        
                        // Modify the window sliding logic
                        if (ack.seqNum === this.base) {
                            // Find the new base (lowest unacknowledged packet)
                            let newBase = this.base;
                            while (newBase < this.totalPackets && 
                                   this.packets[newBase] && 
                                   this.packets[newBase].status === 'acked') {
                                newBase++;
                            }
                            
                            // Update the window position
                            const advancedBy = newBase - this.base;
                            if (advancedBy > 0) {
                                // Calculate new target position based on packet positions
                                const targetY = this.packets[newBase].y;
                                this.targetWindowPosition = targetY;
                                this.windowSlideInProgress = true;
                                this.windowSlideStartTime = Date.now();
                                this.base = newBase;
                                
                                // Send any unsent packets in the new window
                                this.sendUnsentPacketsInWindow();
                                
                                // Update blank packets
                                this.updateBlankPackets();
                            }
                        }
                        
                        // Remove this ACK from the required ACKs list
                        this.requiredAcks = this.requiredAcks.filter(seqNum => seqNum !== ack.seqNum);
                        
                        // Remove the ACK immediately
                        this.acks.splice(i, 1);
                    }
                }
            }
        }
        
        // Update buffer state
        if (this.lostPackets.length === 0 && this.bufferPackets.size > 0) {
            // Start fade out if not already started
            if (this.bufferFadeStartTime === null) {
                this.bufferFadeStartTime = Date.now();
            }
            
            // Calculate fade progress
            const elapsed = Date.now() - this.bufferFadeStartTime;
            const progress = Math.min(1, elapsed / this.bufferFadeDuration);
            
            // Update fade state for all buffer packets
            for (const [seqNum, packet] of this.bufferPackets) {
                packet.fadeProgress = 1 - progress;
            }
            
            // Clear buffer if fade is complete
            if (progress >= 1) {
                this.bufferPackets.clear();
                this.bufferFadeStartTime = null;
                this.retransmittedPackets.clear();
                this.bufferGaps.clear();
            }
        } else if (this.lostPackets.length > 0 || this.retransmittedPackets.size > 0) {
            // Reset fade state when new lost packets appear or when there are retransmitted packets
            this.bufferFadeStartTime = null;
            
            // Update buffer gaps
            this.bufferGaps.clear();
            const windowStart = this.base;
            const windowEnd = Math.min(this.base + this.windowSize, this.totalPackets);
            
            // Mark gaps for lost packets
            for (let i = windowStart; i < windowEnd; i++) {
                const packet = this.packets[i];
                if (packet && packet.status === 'lost') {
                    this.bufferGaps.set(i, {
                        y: packet.y,
                        height: this.packetHeight + this.bufferPacketSpacing
                    });
                }
            }
            
            // Add received packets to buffer in their current order
            for (let i = windowStart; i < windowEnd; i++) {
                const packet = this.packets[i];
                if (packet && (packet.status === 'received' || this.retransmittedPackets.has(packet.seqNum))) {
                    // Always update the packet in buffer if it's received or retransmitted
                    this.bufferPackets.set(packet.seqNum, {
                        ...packet,
                        fadeProgress: 1,
                        originalY: packet.y,
                        targetY: packet.y,
                        currentY: packet.y,
                        isRetransmitted: this.retransmittedPackets.has(packet.seqNum)
                    });
                }
            }
            
            // Also check for any retransmitted packets outside the current window
            for (const seqNum of this.retransmittedPackets) {
                const packet = this.packets[seqNum];
                if (packet && !this.bufferPackets.has(seqNum)) {
                    this.bufferPackets.set(seqNum, {
                        ...packet,
                        fadeProgress: 1,
                        originalY: packet.y,
                        targetY: packet.y,
                        currentY: packet.y,
                        isRetransmitted: true
                    });
                }
            }
            
            // Check for any received packets that should be in the buffer
            for (let i = 0; i < this.totalPackets; i++) {
                const packet = this.packets[i];
                if (packet && packet.status === 'received' && !this.bufferPackets.has(i)) {
                    this.bufferPackets.set(i, {
                        ...packet,
                        fadeProgress: 1,
                        originalY: packet.y,
                        targetY: packet.y,
                        currentY: packet.y,
                        isRetransmitted: this.retransmittedPackets.has(i)
                    });
                }
            }
            
            // Special handling for the last packet when it's received after being lost
            const lastPacket = this.packets[this.totalPackets - 1];
            if (lastPacket && lastPacket.status === 'received') {
                // Always add the last packet to buffer if it's received, regardless of whether it was lost
                this.bufferPackets.set(lastPacket.seqNum, {
                    ...lastPacket,
                    fadeProgress: 1,
                    originalY: lastPacket.y,
                    targetY: lastPacket.y,
                    currentY: lastPacket.y,
                    isRetransmitted: this.retransmittedPackets.has(lastPacket.seqNum)
                });
            }
            
            // Update buffer target position
            if (this.bufferPackets.size > 0) {
                const firstPacket = Array.from(this.bufferPackets.values())[0];
                this.bufferTargetPosition = firstPacket.originalY;
            }
        }
        
        // Smooth buffer movement
        if (Math.abs(this.bufferPosition - this.bufferTargetPosition) > 0.1) {
            this.bufferPosition += (this.bufferTargetPosition - this.bufferPosition) * this.bufferMoveSpeed;
        }
    }
    
    // Modify sendUnsentPacketsInWindow method to start timers only when packets are sent
    sendUnsentPacketsInWindow() {
        // Send any unsent packets in the current window
        for (let i = this.base; i < this.base + this.windowSize && i < this.totalPackets; i++) {
            const packet = this.packets[i];
            if (packet.status === 'waiting') {
                // Add a delay based on sequence number to maintain proper spacing
                const delay = (i - this.base) * 200; // 200ms delay between each packet
                setTimeout(() => {
                    packet.status = 'inTransit';
                    // Start timer when packet is sent if either:
                    // 1. The packet itself will be lost
                    // 2. The ACK for this packet will be lost
                    if (this.lostPackets.includes(packet.seqNum) || this.lostAcks.includes(packet.seqNum)) {
                        this.packetTimeouts[packet.seqNum] = {
                            startTime: Date.now(),
                            duration: this.timeoutDuration,
                            progress: 0
                        };
                    }
                }, delay);
            }
        }
    }
    
    // New method to update blank packets
    updateBlankPackets() {
        // Clear existing blank packets
        this.blankPackets = [];
        
        // Check if window contains only the last few packets
        const windowEnd = Math.min(this.base + this.windowSize, this.totalPackets);
        const windowStart = this.base;
        
        // Calculate how many packets are in the window
        const packetsInWindow = windowEnd - windowStart;
        
        // If window is not full and contains only the last few packets
        if (packetsInWindow < this.windowSize && windowStart >= this.totalPackets - 5) {
            // Calculate how many blank packets we need
            const numBlankPackets = this.windowSize - packetsInWindow;
            
            // Create blank packets
            for (let i = 0; i < numBlankPackets; i++) {
                // Calculate position for blank packet
                const blankSeqNum = windowStart - numBlankPackets + i;
                const y = this.baseY + (this.pillarHeight - (this.totalPackets * (this.packetHeight + this.packetSpacing))) / 2 + 
                          blankSeqNum * (this.packetHeight + this.packetSpacing);
                
                // Add blank packet
                this.blankPackets.push({
                    seqNum: blankSeqNum,
                    y: y
                });
            }
        }
    }
    
    animate() {
        if (!this.isAnimating) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Update window position if sliding is in progress
        if (this.windowSlideInProgress) {
            const elapsed = Date.now() - this.windowSlideStartTime;
            const progress = Math.min(1, elapsed / this.transitionDuration);
            
            // Use easing function for smooth animation
            const easedProgress = this.easeInOutCubic(progress);
            
            // Update window position
            this.windowPosition = this.windowPosition + 
                (this.targetWindowPosition - this.windowPosition) * easedProgress;
            
            // End sliding when target is reached
            if (progress >= 1) {
                this.windowSlideInProgress = false;
                this.windowPosition = this.targetWindowPosition;
            }
        }
        
        // Draw all elements in correct order
        this.drawPillars();
        this.drawWindow();
        this.drawPackets();
        this.drawAcks();
        this.drawBufferLayer();
        this.updateTrails();
        this.drawTrails();
        
        // Update received packet effects with time-based animation
        if (this.receivedPacketEffects) {
            this.receivedPacketEffects.forEach(effect => {
                const elapsed = Date.now() - effect.startTime;
                const progress = Math.min(1, elapsed / 1000);
                
                // Smooth radius increase
                effect.radius = progress * effect.maxRadius;
                
                // Smooth alpha decrease
                effect.alpha = 1 - progress;
                
                // Draw effect
                this.ctx.save();
                this.ctx.globalAlpha = effect.alpha;
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y + this.packetHeight/2, effect.radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = effect.color;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                this.ctx.restore();
            });
        }
        
        // Draw timeout rings
        Object.entries(this.packetTimeouts).forEach(([seqNum, timeout]) => {
            this.drawTimeoutRing(parseInt(seqNum), timeout.progress);
        });
        
        // Update state
        this.updatePackets();
        
        // Check if simulation is complete
        if (this.completedPackets === this.totalPackets) {
            this.targetWindowPosition = this.baseY + 20 + this.totalPackets * (this.packetHeight + this.packetSpacing);
            if (Math.abs(this.windowPosition - this.targetWindowPosition) < 0.1) {
                this.isAnimating = false;
                return;
            }
        }
        
        // Continue animation
        requestAnimationFrame(() => this.animate());
    }
    
    // Modify start method to recalculate pillar height
    start() {
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.isPaused = false;
            
            // Calculate required height based on number of packets
            const totalHeight = this.totalPackets * (this.packetHeight + this.packetSpacing) - this.packetSpacing;
            const requiredHeight = totalHeight + 100; // Reduced padding from 200 to 100
            
            // Set canvas height based on number of packets
            if (this.totalPackets > 10) {
                this.height = Math.max(this.baseHeight, requiredHeight);
            } else {
                this.height = this.baseHeight;
            }
            
            // Update canvas dimensions
            this.canvas.height = this.height;
            
            // Recalculate pillar height
            this.pillarHeight = Math.min(this.height - 100, totalHeight + 40); // Reduced padding from 60 to 40
            
            // Update baseY to center the pillar
            this.baseY = (this.height - this.pillarHeight) / 2;
            
            // Initialize packets
            this.initializePackets();
            
            // Send initial packets in the window
            this.sendUnsentPacketsInWindow();
            
            // Start animation loop
            this.animate();
        }
    }
    
    pause() {
        this.isPaused = true;
    }
    
    resume() {
        this.isPaused = false;
    }
    
    reset() {
        this.packets = [];
        this.acks = [];
        this.windowPosition = 20; // Reset to initial position
        this.base = 0;
        this.nextSeqNum = 0;
        this.completedPackets = 0;
        this.lostPacketCrosses = [];
        this.lostAckCrosses = [];
        this.fadingAcks = [];
        this.blankPackets = []; // Reset blank packets
        this.waitingForAcks = []; // Reset waiting for ACKs
        this.lastAck = null; // Reset last ACK
        this.lastAckColor = '#00ff00'; // Reset last ACK color
        this.lastAckReceived = false;
        this.lastAckInWindow = null;
        this.requiredAcks = []; // Reset required ACKs
        this.receivedAcks = new Set(); // Reset received ACKs
        
        // Clear all timers
        Object.values(this.packetTimers).forEach(timer => clearTimeout(timer));
        this.packetTimers = {};
        
        this.initializePackets();
        this.packetTimeouts = {};
        
        // Reset animation state
        this.isAnimating = false;
        this.isPaused = false;
        
        // Clear buffer state
        this.bufferPackets.clear();
        this.bufferFadeStartTime = null;
        this.bufferPosition = 0;
        this.bufferTargetPosition = 0;
        this.retransmittedPackets.clear();
        this.bufferGaps.clear();
        
        // Clear canvas and redraw
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawPillars();
        this.drawWindow();
        this.drawPackets();
        this.drawAcks();
        this.drawBufferLayer(); // Add buffer layer drawing
        
        // Clear received packet effects
        this.receivedPacketEffects = [];
        
        // Reset window sliding state
        this.windowSlideInProgress = false;
        this.windowSlideStartTime = 0;
        this.targetWindowPosition = 20;
        
        // Clear trails
        this.packetTrails = [];
        this.ackTrails = [];
        
        // Reset canvas height to base height
        this.height = this.baseHeight;
        this.canvas.height = this.height;
    }
    
    // Add method to show popup message
    showLastAckReceivedPopup() {
        // Create popup element
        const popup = document.createElement('div');
        popup.style.position = 'fixed'; // Changed from 'absolute' to 'fixed'
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'; // Darker background
        popup.style.color = 'white';
        popup.style.padding = '30px'; // Increased padding
        popup.style.borderRadius = '15px';
        popup.style.fontSize = '32px'; // Larger font
        popup.style.fontWeight = 'bold';
        popup.style.zIndex = '9999'; // Higher z-index
        popup.style.textAlign = 'center';
        popup.style.boxShadow = '0 0 30px rgba(0, 0, 0, 0.7)';
        popup.style.animation = 'fadeInOut 3s forwards';
        popup.style.minWidth = '300px'; // Minimum width
        popup.style.border = '3px solid #4CAF50'; // Green border
        
        // Add message
        popup.textContent = 'Successful!';
        
        // Add to document
        document.body.appendChild(popup);
        
        // Remove after animation completes
        setTimeout(() => {
            document.body.removeChild(popup);
        }, 3000);
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                30% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                70% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add new method for received packet effect
    addReceivedPacketEffect(packet) {
        const effect = {
            x: packet.x,
            y: packet.y,
            radius: 0,
            maxRadius: 20, // Reduced from 30
            alpha: 1,
            color: '#4CAF50',
            startTime: Date.now()
        };
        
        if (!this.receivedPacketEffects) {
            this.receivedPacketEffects = [];
        }
        this.receivedPacketEffects.push(effect);
        
        setTimeout(() => {
            this.receivedPacketEffects = this.receivedPacketEffects.filter(e => e !== effect);
        }, 1000);
    }
    
    // Add new method for 3D packet drawing
    drawPacketWith3D(x, y, color, text, isBlank) {
        // Save context
        this.ctx.save();
        
        // Enhanced shadow with gradient
        const shadowGradient = this.ctx.createLinearGradient(x, y, x + this.packetWidth, y + this.packetHeight);
        shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        this.ctx.fillStyle = shadowGradient;
        this.ctx.fillRect(
            x + 4,
            y + 4,
            this.packetWidth,
            this.packetHeight
        );
        
        // Draw main packet with gradient
        const packetGradient = this.ctx.createLinearGradient(x, y, x, y + this.packetHeight);
        packetGradient.addColorStop(0, color === '#888888' ? '#888888' : '#FFFFFF');
        packetGradient.addColorStop(1, color === '#888888' ? '#666666' : '#F0F0F0');
        this.ctx.fillStyle = packetGradient;
        this.ctx.fillRect(x, y, this.packetWidth, this.packetHeight);
        
        // Draw border
        this.ctx.strokeStyle = color === '#888888' ? '#666666' : '#CCCCCC';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, this.packetWidth, this.packetHeight);
        
        // Enhanced highlight with gradient
        const highlightGradient = this.ctx.createLinearGradient(x, y, x + this.packetWidth, y);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        this.ctx.fillStyle = highlightGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + this.packetWidth, y);
        this.ctx.lineTo(x + this.packetWidth - 4, y + 4);
        this.ctx.lineTo(x + 4, y + 4);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw text with enhanced styling
        this.ctx.fillStyle = isBlank ? 'white' : 'black';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Add text shadow for better readability
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 2;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        
        this.ctx.fillText(
            text,
            x + this.packetWidth/2,
            y + this.packetHeight/2
        );
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Restore context
        this.ctx.restore();
    }
    
    // Add new method for 3D ACK drawing
    drawAckWith3D(x, y, color, text) {
        // Save context
        this.ctx.save();
        
        // Enhanced shadow with gradient
        const shadowGradient = this.ctx.createLinearGradient(x, y, x + this.packetWidth, y + this.packetHeight);
        shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        this.ctx.fillStyle = shadowGradient;
        this.ctx.fillRect(
            x + 4,
            y + 4,
            this.packetWidth,
            this.packetHeight
        );
        
        // Draw main ACK with gradient
        const ackGradient = this.ctx.createLinearGradient(x, y, x, y + this.packetHeight);
        ackGradient.addColorStop(0, color);
        ackGradient.addColorStop(1, this.darkenColor(color, 20));
        this.ctx.fillStyle = ackGradient;
        this.ctx.fillRect(x, y, this.packetWidth, this.packetHeight);
        
        // Draw border
        this.ctx.strokeStyle = this.darkenColor(color, 30);
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, this.packetWidth, this.packetHeight);
        
        // Enhanced highlight with gradient
        const highlightGradient = this.ctx.createLinearGradient(x, y, x + this.packetWidth, y);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        this.ctx.fillStyle = highlightGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + this.packetWidth, y);
        this.ctx.lineTo(x + this.packetWidth - 4, y + 4);
        this.ctx.lineTo(x + 4, y + 4);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw text with enhanced styling
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Add text shadow for better readability
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 2;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        
        this.ctx.fillText(
            text,
            x + this.packetWidth/2,
            y + this.packetHeight/2
        );
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Restore context
        this.ctx.restore();
    }

    // Helper method to darken a color
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        ).toString(16).slice(1);
    }
    
    // Add easing function for smooth animation
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // Modify drawTrails method for consistent opacity
    drawTrails() {
        // Draw packet trails
        this.packetTrails.forEach(trail => {
            if (trail.points.length > 1) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = trail.isLost ? this.lostTrailColor : this.packetTrailColor;
                this.ctx.lineWidth = this.trailThickness;
                
                // Start from sender pole center
                this.ctx.moveTo(this.senderX, trail.points[0].y + this.packetHeight/2);
                
                // Draw all points in one continuous path
                for (let i = 0; i < trail.points.length; i++) {
                    this.ctx.lineTo(trail.points[i].x, trail.points[i].y + this.packetHeight/2);
                }
                
                this.ctx.stroke();
            }
        });
        
        // Draw ACK trails
        this.ackTrails.forEach(trail => {
            if (trail.points.length > 1) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = trail.isLost ? this.lostTrailColor : this.ackTrailColor;
                this.ctx.lineWidth = this.trailThickness;
                
                // Start from receiver pole center
                this.ctx.moveTo(this.receiverX, trail.points[0].y + this.packetHeight/2);
                
                // Draw all points in one continuous path
                for (let i = 0; i < trail.points.length; i++) {
                    this.ctx.lineTo(trail.points[i].x, trail.points[i].y + this.packetHeight/2);
                }
                
                this.ctx.stroke();
            }
        });
    }

    // Modify updateTrails method to ensure proper trail points
    updateTrails() {
        // Update packet trails
        this.packets.forEach(packet => {
            if (packet.status === 'inTransit' || packet.status === 'lost') {
                let trail = this.packetTrails.find(t => t.seqNum === packet.seqNum);
                if (!trail) {
                    trail = {
                        seqNum: packet.seqNum,
                        points: [],
                        isLost: false
                    };
                    this.packetTrails.push(trail);
                }
                
                trail.isLost = packet.status === 'lost';
                
                // Add new point at the beginning of the array
                trail.points.unshift({
                    x: packet.x,
                    y: packet.y
                });
                
                // Keep only the most recent trailLength points
                if (trail.points.length > this.trailLength) {
                    trail.points.pop();
                }
            }
        });
        
        // Update ACK trails
        this.acks.forEach(ack => {
            let trail = this.ackTrails.find(t => t.seqNum === ack.seqNum);
            if (!trail) {
                trail = {
                    seqNum: ack.seqNum,
                    points: [],
                    isLost: false
                };
                this.ackTrails.push(trail);
            }
            
            // Add new point at the beginning of the array
            trail.points.unshift({
                x: ack.x,
                y: ack.y
            });
            
            // Keep only the most recent trailLength points
            if (trail.points.length > this.trailLength) {
                trail.points.pop();
            }
        });
        
        // Update lost status for ACK trails
        this.lostAckCrosses.forEach(cross => {
            const trail = this.ackTrails.find(t => t.seqNum === cross.seqNum);
            if (trail) {
                trail.isLost = true;
            }
        });
        
        // Remove trails for completed packets and ACKs
        this.packetTrails = this.packetTrails.filter(trail => 
            this.packets[trail.seqNum]?.status === 'inTransit' || 
            this.packets[trail.seqNum]?.status === 'lost'
        );
        this.ackTrails = this.ackTrails.filter(trail => 
            this.acks.some(ack => ack.seqNum === trail.seqNum) ||
            this.lostAckCrosses.some(cross => cross.seqNum === trail.seqNum)
        );
    }

    drawBufferLayer() {
        // Save the current context state
        this.ctx.save();
        
        if (this.bufferPackets.size > 0 || this.bufferGaps.size > 0) {
            // Calculate buffer layer dimensions based on window
            const windowStart = this.base;
            const windowEnd = Math.min(this.base + this.windowSize, this.totalPackets);
            const firstPacket = this.packets[windowStart];
            const lastPacket = this.packets[windowEnd - 1];
            const bufferWidth = 80; // Width to fit packets
            
            if (firstPacket && lastPacket) {
                // Calculate center position from right of receiver pillar
                const bufferX = this.receiverX + this.pillarWidth/2 + (this.width - (this.receiverX + this.pillarWidth/2))/2 - bufferWidth/2;
                
                // Calculate vertical center position
                const bufferHeight = lastPacket.y - firstPacket.y + this.packetHeight + this.bufferPacketSpacing;
                const verticalCenter = (this.height - bufferHeight) / 2;
                
                // Draw the golden buffer layer
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'; // Golden color with transparency
                this.ctx.fillRect(
                    bufferX, // Use calculated center position
                    verticalCenter, // Use vertical center position
                    bufferWidth,
                    bufferHeight
                );
                
                // Add a subtle glow effect
                this.ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
                this.ctx.shadowBlur = 5;
                this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(
                    bufferX, // Use calculated center position
                    verticalCenter, // Use vertical center position
                    bufferWidth,
                    bufferHeight
                );
                this.ctx.shadowBlur = 0;
                
                // Draw gaps for lost packets
                for (const [seqNum, gap] of this.bufferGaps) {
                    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; // Red color for gaps
                    this.ctx.fillRect(
                        bufferX, // Use calculated center position
                        verticalCenter + (gap.y - firstPacket.y),
                        bufferWidth,
                        gap.height
                    );
                }
                
                // Draw packets in buffer with fade effect
                for (const [seqNum, packet] of this.bufferPackets) {
                    // Calculate position for packet copy in buffer
                    const packetX = bufferX + 10; // 10px padding from buffer edge
                    
                    // Draw packet copy with fade effect
                    this.ctx.globalAlpha = 0.6 * packet.fadeProgress;
                    this.drawPacketWith3D(
                        packetX,
                        verticalCenter + (packet.originalY - firstPacket.y),
                        packet.isRetransmitted ? '#FF9800' : '#4CAF50', // Orange for retransmitted, green for normal
                        `F${packet.seqNum}${packet.isRetransmitted ? 'r' : ''}`, // Add 'r' suffix for retransmitted
                        false
                    );
                    this.ctx.globalAlpha = 1.0;
                }
                
                // Add "BUFFER" label
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(
                    'BUFFER',
                    bufferX + bufferWidth/2,
                    verticalCenter - 15
                );

                // Add "Sending to upper layer" message vertically to the right of buffer
                // Show when packets are received by the receiver
                const hasReceivedPackets = this.packets.some(packet => packet.status === 'received');
                if (hasReceivedPackets) {
                    // Initialize fade start time if not set
                    if (!this.messageFadeStartTime) {
                        this.messageFadeStartTime = Date.now();
                    }
                    
                    // Calculate fade progress (2s total cycle: 1s fade in, 1s fade out)
                    const elapsed = Date.now() - this.messageFadeStartTime;
                    const cycleDuration = 2000; // 2 seconds total cycle
                    const cycleProgress = (elapsed % cycleDuration) / cycleDuration;
                    
                    // Calculate opacity: fade in for first half, fade out for second half
                    let opacity;
                    if (cycleProgress < 0.5) {
                        // Fade in during first second
                        opacity = cycleProgress * 2;
                    } else {
                        // Fade out during second second
                        opacity = 1 - ((cycleProgress - 0.5) * 2);
                    }
                    
                    this.ctx.save();
                    this.ctx.fillStyle = `rgba(255, 215, 0, ${0.8 * opacity})`; // Golden color with dynamic opacity
                    this.ctx.font = 'bold 16px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    
                    // Position the text vertically
                    const textX = bufferX + bufferWidth + 20;
                    const textY = verticalCenter + bufferHeight/2 + 6;
                    
                    // Rotate the context 90 degrees
                    
                    this.ctx.translate(textX, textY);
                    this.ctx.rotate(-Math.PI / 2);

                    // Draw the text
                    if (this.bufferPackets.size > 0 && firstPacket.status === 'received') {
                        this.ctx.fillText('Sending to Network Layer', 0, 0);
                    }
                    
                    this.ctx.restore();
                }
            }
        }
        
        // Restore the context state
        this.ctx.restore();
    }

    // Modify the method to handle retransmitted packets
    handleRetransmittedPacket(seqNum) {
        this.retransmittedPackets.add(seqNum);
        const packet = this.packets[seqNum];
        if (packet) {
            // Update or add packet to buffer
            this.bufferPackets.set(seqNum, {
                ...packet,
                fadeProgress: 1,
                originalY: packet.y,
                targetY: packet.y,
                currentY: packet.y,
                isRetransmitted: true
            });
            
            // Force an immediate update of the buffer
            this.updatePackets();
        }
    }
}

// Initialize visualization
let visualization;
window.onload = () => {
    const canvas = document.getElementById('simulationCanvas');
    visualization = new ARQVisualization(canvas);
    visualization.initialize();
};

function startSimulation() {
    // Get values from inputs
    visualization.windowSize = parseInt(document.getElementById('windowSize').value);
    visualization.totalPackets = parseInt(document.getElementById('totalPackets').value);
    visualization.timeout = parseInt(document.getElementById('timeout').value);
    visualization.timeoutDuration = visualization.timeout; // Use the user-entered timeout duration
    
    // Parse lost packets and ACKs
    visualization.lostPackets = document.getElementById('lostPackets').value
        .split(',')
        .map(x => parseInt(x.trim()))
        .filter(x => !isNaN(x));
    
    // Add the last packet (f9) as a default lost packet when total packets is 10
    visualization.lostPackets.push(visualization.totalPackets);
    
    visualization.lostAcks = document.getElementById('lostAcks').value
        .split(',')
        .map(x => parseInt(x.trim()))
        .filter(x => !isNaN(x));
    
    visualization.reset();
    visualization.start();
}

function pauseSimulation() {
    visualization.pause();
}

function resumeSimulation() {
    visualization.resume();
}

function resetSimulation() {
    visualization.reset();
    visualization.initialize();
} 