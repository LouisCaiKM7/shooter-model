'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { simulateTrajectory, findOptimalShot, loadModelTable, TARGET_HEIGHT, SHOOTER_HEIGHT } from '@/lib/physics';

const SCALE = 80;
const CANVAS_HEIGHT = 600;
const CANVAS_WIDTH = 1200;
const GROUND_Y = CANVAS_HEIGHT - 50;

export default function ShooterSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [robotX, setRobotX] = useState(100);
  const [targetX, setTargetX] = useState(600);
  const [isDraggingRobot, setIsDraggingRobot] = useState(false);
  const [isDraggingTarget, setIsDraggingTarget] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const robotVelocity = 0;
  const [shooterVelocity, setShooterVelocity] = useState(12);
  const [shooterAngle, setShooterAngle] = useState(45);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadModelTable()
      .then(() => {
        setModelLoaded(true);
        console.log('Model loaded successfully');
      })
      .catch((error) => {
        setLoadError(error.message);
        console.error('Model loading failed:', error);
      });
  }, []);

  const worldToCanvas = useCallback((x: number, z: number) => {
    return {
      x: robotX + x * SCALE,
      y: GROUND_Y - z * SCALE,
    };
  }, [robotX]);

  const canvasToWorld = useCallback((canvasX: number) => {
    return (canvasX - robotX) / SCALE;
  }, [robotX]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    const distance = canvasToWorld(targetX);

    const result = simulateTrajectory(shooterVelocity, shooterAngle, robotVelocity, SHOOTER_HEIGHT);

    if (result.valid && result.trajectory.length > 1) {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      const firstPoint = worldToCanvas(result.trajectory[0].x, result.trajectory[0].z);
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < result.trajectory.length; i++) {
        const point = worldToCanvas(result.trajectory[i].x, result.trajectory[i].z);
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();

      for (let i = 0; i < result.trajectory.length; i += 10) {
        const point = worldToCanvas(result.trajectory[i].x, result.trajectory[i].z);
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(robotX - 20, GROUND_Y - 40, 40, 40);
    
    const shooterPos = worldToCanvas(0, SHOOTER_HEIGHT);
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.arc(shooterPos.x, shooterPos.y, 8, 0, Math.PI * 2);
    ctx.fill();

    const angleRad = (shooterAngle * Math.PI) / 180;
    const barrelLength = 30;
    ctx.strokeStyle = '#ffd93d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(shooterPos.x, shooterPos.y);
    ctx.lineTo(
      shooterPos.x + Math.cos(angleRad) * barrelLength,
      shooterPos.y - Math.sin(angleRad) * barrelLength
    );
    ctx.stroke();

    const targetWorldPos = worldToCanvas(distance, TARGET_HEIGHT);
    ctx.fillStyle = '#6bcbff';
    ctx.beginPath();
    ctx.arc(targetWorldPos.x, targetWorldPos.y, 15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#6bcbff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(targetWorldPos.x, targetWorldPos.y - 15);
    ctx.lineTo(targetWorldPos.x, targetWorldPos.y + 15);
    ctx.moveTo(targetWorldPos.x - 15, targetWorldPos.y);
    ctx.lineTo(targetWorldPos.x + 15, targetWorldPos.y);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.fillText(`Distance: ${distance.toFixed(2)}m`, 10, 20);
    ctx.fillText(`Robot Vel: ${robotVelocity.toFixed(2)}m/s`, 10, 40);
    ctx.fillText(`Shooter Vel: ${shooterVelocity.toFixed(2)}m/s`, 10, 60);
    ctx.fillText(`Angle: ${shooterAngle.toFixed(1)}°`, 10, 80);
    
    if (result.valid) {
      ctx.fillText(`Max Height: ${result.maxHeight.toFixed(2)}m`, 10, 100);
      ctx.fillText(`Impact Angle: ${result.impactAngle.toFixed(1)}°`, 10, 120);
    }
    
    if (!modelLoaded) {
      ctx.fillStyle = '#ffd93d';
      ctx.font = '16px monospace';
      ctx.fillText('Loading model data...', 10, 140);
    }
  }, [robotX, targetX, robotVelocity, shooterVelocity, shooterAngle, modelLoaded, worldToCanvas, canvasToWorld]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    if (modelLoaded) {
      const distance = canvasToWorld(targetX);
      const optimal = findOptimalShot(distance, robotVelocity);
      if (optimal) {
        setShooterVelocity(optimal.vShooter);
        setShooterAngle(optimal.thetaDeg);
      }
    }
  }, [targetX, modelLoaded, canvasToWorld]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (Math.abs(mouseX - robotX) < 30 && Math.abs(mouseY - (GROUND_Y - 20)) < 30) {
      setIsDraggingRobot(true);
      setDragStartX(mouseX);
      setDragStartTime(Date.now());
    } else {
      const distance = canvasToWorld(mouseX);
      const targetWorldPos = worldToCanvas(distance, TARGET_HEIGHT);
      if (Math.abs(mouseX - targetWorldPos.x) < 20 && Math.abs(mouseY - targetWorldPos.y) < 20) {
        setIsDraggingTarget(true);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    if (isDraggingRobot) {
      const newX = Math.max(50, Math.min(CANVAS_WIDTH - 50, mouseX));
      setRobotX(newX);
    } else if (isDraggingTarget) {
      setTargetX(Math.max(100, Math.min(CANVAS_WIDTH - 50, mouseX)));
    }
  };

  const handleMouseUp = () => {
    setIsDraggingRobot(false);
    setIsDraggingTarget(false);
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold text-white mb-4">FRC Shooter Simulator</h1>
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-6">
            <p className="text-xl text-red-300 mb-2">Failed to load model data</p>
            <p className="text-sm text-gray-300 mb-4">{loadError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!modelLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">FRC Shooter Simulator</h1>
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500"></div>
            <p className="text-xl text-gray-300">Loading model data...</p>
            <p className="text-sm text-gray-500">Loading 503KB physics model table</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">FRC Shooter Simulator</h1>
        <p className="text-gray-400">Drag the robot or target to adjust shooting distance</p>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-gray-700 rounded-lg cursor-move shadow-2xl"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-white mb-2 font-semibold">
              Shooter Velocity: {shooterVelocity.toFixed(1)} m/s
            </label>
            <div className="text-gray-400 text-sm">Auto-optimized from model table</div>
          </div>

          <div>
            <label className="block text-white mb-2 font-semibold">
              Launch Angle: {shooterAngle.toFixed(1)}°
            </label>
            <div className="text-gray-400 text-sm">Auto-optimized from model table</div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-900 rounded-lg">
          <h3 className="text-white font-bold mb-2">Instructions:</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• <strong>Drag the red robot</strong> horizontally to change position</li>
            <li>• <strong>Drag the blue target</strong> to change shooting distance</li>
            <li>• <strong>Shooter parameters</strong> are automatically optimized using pre-computed model table (ref.json)</li>
            <li>• <strong>Interpolation:</strong> Bilinear interpolation across distance and robot velocity (fixed at 0 m/s)</li>
            <li>• <strong>Model status:</strong> {modelLoaded ? '✓ Loaded' : '⏳ Loading...'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
