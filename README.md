# SR Protocol 2D Simulation 🚀

This project provides an interactive 2D visualization of the Selective Repeat (SR) protocol using Three.js. The simulation offers a comprehensive understanding of how the SR protocol works in computer networks, allowing users to observe and interact with packet transmission between sender and receiver nodes in real-time.

## 📖 What is Selective Repeat Protocol?

The Selective Repeat (SR) Protocol is a sliding window protocol used in computer networks for reliable data transmission. Here's how it works:

- **Multiple Packet Transmission**: Unlike simpler protocols, SR allows multiple packets to be in transit simultaneously
- **Individual Acknowledgments**: Each packet is acknowledged separately, allowing for selective retransmission
- **Sliding Window**: The protocol maintains a window of packets that can be sent without acknowledgment
- **Error Recovery**: Only lost or corrupted packets are retransmitted, improving efficiency
- **Out-of-Order Handling**: Can accept packets that arrive out of sequence, storing them in a buffer

## Softwares Required
-  **Opeating System:** Microsoft Windows
-  **Version Control system:** Git / Github

## Steps for installation 
-  Download Git form https://git-scm.com/downloads
-  Make a github Account at https://github.com/
-  Make folder on desktop with name "MY SR APP"
-  Login to your github account using standard git commands from Git Bash
-  Clone the Repositiory with the link "https://github.com/chansom63/SR_Protocol_CN_Project.git" to the folder.
-  Click on the index.html file to run it.
  
## Alternate .exe installation for windows
  download the file from the drive and unzip it, 
  run the application
  The drive link is "https://drive.google.com/file/d/1No7gPdijG-ImznvpMEtHQqPklRasqdqx/view?usp=sharing"

<br/>
  
```
Key Advantages:
+------------------------+
| 1. Higher Throughput   |
| 2. Better Bandwidth    |
|    Utilization        |
| 3. Efficient Error    |
|    Recovery          |
| 4. Reduced Network    |
|    Congestion        |
+------------------------+
```

## 📋 Features

- **2D Visualization**:

  - Interactive 2D representation of network nodes
  - Real-time packet movement visualization
  - Dynamic window size visualization
  - Visual feedback for acknowledgments and timeouts

- **Animated Packet Transmission**:

  - Smooth packet movement animations
  - Visual indicators for packet states (in-transit, acknowledged, lost)
  - Real-time window sliding animation
  - Packet retransmission visualization

- **Configurable Parameters**:

  - Window Size: Control the number of packets in transit (1-10)
  - Timeout Duration: Set retransmission timeout (100-5000ms)
  - Packet Loss Rate: Simulate network conditions (0-100%)
  - Number of Packets: Define total transmission size (1-20)

- **Real-time Status Updates**:

  - Current window position
  - Packet acknowledgment status
  - Transmission statistics
  - Network performance metrics

- **Interactive Controls**:
  - Orbit controls for 3D view manipulation
  - Play/pause simulation
  - Reset functionality
  - Parameter adjustment during simulation

### How it Works

1. **Initial State**

```
Sender: [P0][P1][P2][P3]  →  Network  →  Receiver: [P0][P1][P2][P3]
```

- Sender initializes with a window of packets
- Receiver prepares to accept packets in sequence

2. **During Transmission**

```
Sender: [P0][P1][P2][P3]  →  P0,P1,P2  →  Receiver: [P0][P1][P2][P3]
```

- Multiple packets can be in transit simultaneously
- Each packet is tracked individually
- Acknowledgments are sent for received packets

3. **After Acknowledgment**

```
Sender: [P4][P5][P6][P7]  →  P3,P4,P5  →  Receiver: [P4][P5][P6][P7]
```

- Window slides forward based on acknowledgments
- New packets enter the window
- Lost packets are selectively retransmitted

## 🛠️ Requirements

- **Browser Requirements**:

  - Modern web browser with WebGL support
  - JavaScript enabled
  - Minimum resolution: 1024x768

- **Network Requirements**:
  - Internet connection for Three.js libraries
  - Minimum bandwidth: 1 Mbps

## 🚀 Usage

1. **Launch the Simulation**:

   - Open `index.html` in a modern web browser
   - Wait for Three.js libraries to load

2. **Configure Parameters**:

   - Window Size: Adjust based on network conditions (1-10)
   - Timeout: Set based on network latency (100-5000ms)
   - Packet Loss Rate: Simulate network reliability (0-100%)
   - Number of Packets: Define simulation scope (1-20)

3. **Control the Simulation**:
   - Click "Start Simulation" to begin
   - Use mouse controls:
     - Left click + drag: Rotate view
     - Right click + drag: Pan view
     - Scroll: Zoom in/out
   - Pause/Resume as needed
   - Reset to start over

## 🔧 Implementation Details

The simulation is built using Three.js and implements the Selective Repeat protocol with the following technical features:

- **Sliding Window Mechanism**:

  - Dynamic window size adjustment
  - Individual packet tracking
  - Window boundary management

- **Acknowledgment System**:

  - Individual packet acknowledgments
  - Cumulative acknowledgment support
  - Timeout-based retransmission

- **Error Handling**:

  - Selective retransmission of lost packets
  - Duplicate packet detection
  - Out-of-order packet handling

- **Visual Components**:
  - 3D node representation
  - Animated packet movement
  - Status indicators and metrics

## 📊 Performance Metrics

```
+------------------+
|  Window Size     |
|  Timeout         |
|  Packet Loss     |
|  Throughput      |
+------------------+
```

The simulation provides real-time metrics including:

- Current window utilization
- Packet transmission rate
- Acknowledgment latency
- Overall throughput
- Error rates and retransmissions

Collaborators:

- Surya
- Sumit
- Somesh
- Pranta
- Akhil
