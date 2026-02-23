# FRC Shooter Simulator

An interactive physics-based shooter simulator for FRC robots, built with Next.js and TypeScript.

## Features

- **Interactive Canvas**: Drag the robot and target to adjust positions
- **Real-time Physics**: Accurate trajectory calculation based on aerodynamics (drag, Magnus effect)
- **Auto-optimization**: Automatically finds optimal shooter velocity and angle for any distance
- **Manual Control**: Fine-tune shooter parameters manually
- **Visual Feedback**: Real-time trajectory visualization with impact angle and max height display

## Physics Model

The simulator implements a sophisticated physics model from `ref.py` including:

- Ball mass: 0.215 kg
- Air resistance (Reynolds number-based drag coefficient)
- Magnus effect from dual-flywheel spin
- Gravity and projectile motion
- RK4 numerical integration for accuracy

### Constants
- Target height: 1.34m
- Shooter height: 0.55m
- Minimum impact angle: 40°
- Ball radius: 0.075m

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use

1. **Drag the red robot** horizontally to change position and set velocity (based on drag speed)
2. **Drag the blue target** to adjust shooting distance
3. **Toggle auto-optimize** to automatically find the best shooter settings
4. **Manual mode**: Use sliders to adjust shooter velocity (6-19 m/s) and launch angle (30-89°)
5. **Monitor stats**: Distance, velocities, max height, and impact angle displayed in real-time

## Project Structure

```
shooter-simulator/
├── app/
│   ├── page.tsx          # Main page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   └── ShooterSimulator.tsx  # Main simulator component
└── lib/
    └── physics.ts        # Physics simulation engine
```

## Technology Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **HTML Canvas** - Graphics rendering
