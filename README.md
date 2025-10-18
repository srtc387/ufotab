# UFO Flap

An exciting 3D UFO flying game built with React, Three.js, and TypeScript. Navigate your UFO through procedurally generated pipe obstacles in a star-filled universe!

![UFO Flap Game](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## 🎮 Game Features

- **3D Environment**: Immersive 3D gameplay powered by Three.js and React Three Fiber
- **Two Game Modes**: 
  - Single Player Mode: Classic gameplay against procedurally generated pipes
  - Challenge Mode: Two-player competitive gameplay
- **Dynamic Difficulty**: Progressive levels with increasing challenge
- **Immersive Audio**: Spatial sound effects and background music
- **Device Orientation Support**: Tilt controls for mobile devices
- **Particle Effects**: Beautiful visual effects for enhanced gameplay
- **Local Storage**: Save and resume your game progress

## 🚀 Tech Stack

- **Frontend Framework**: React 19 with React DOM
- **3D Rendering**: Three.js integrated via @react-three/fiber (R3F) and @react-three/drei
- **Build Tool**: Vite 6 with vite-plugin-react
- **Language**: TypeScript 5.8
- **Styling**: Tailwind CSS

## ▶️ Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```bash
   cd ufo-flap
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and visit `http://localhost:5173` to play the game!

## 🎯 How to Play

- **Controls**: Press Spacebar, Up Arrow, or tap/click to make your UFO flap and fly upward
- **Objective**: Navigate through the pipes without colliding
- **Scoring**: Earn points for each pipe you successfully pass
- **Lives**: You start with 6 lives; lose one each time you collide with a pipe

## 🏗️ Project Structure

```
.
├── components/          # React components including 3D scene elements
├── hooks/               # Custom React hooks for device orientation and sounds
├── public/              # Static assets
├── App.tsx             # Main application component
├── index.tsx           # Entry point
├── levelConfig.ts      # Game level configurations
├── types.ts            # TypeScript type definitions
└── vite.config.ts      # Vite configuration
```

## 📦 Available Scripts

- `npm run dev` - Starts the development server
- `npm run build` - Builds the project for production
- `npm run preview` - Previews the production build locally

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.