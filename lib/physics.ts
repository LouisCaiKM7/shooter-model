// Physics constants from ref.py
const kMass = 0.215;
const kGravity = 9.8;
const kRhoAir = 1.21;
const kMuAir = 1.81e-5;
const kRadius = 0.075;
const kArea = Math.PI * kRadius * kRadius;

const FLYWHEEL_DIAMETER1_INCH = 4.0;
const FLYWHEEL_DIAMETER2_INCH = 2.0;
const FLYWHEEL_RADIUS1_M = (FLYWHEEL_DIAMETER1_INCH * 0.0254) / 2.0;
const FLYWHEEL_RADIUS2_M = (FLYWHEEL_DIAMETER2_INCH * 0.0254) / 2.0;

export const TARGET_HEIGHT = 1.34;
export const SHOOTER_HEIGHT = 0.55;
const MIN_IMPACT_ANGLE_DEG = 40.0;
const DT = 0.005;

function calculateCd(v: number): number {
  if (v < 1e-6) return 0.46;
  const diameter = 2 * kRadius;
  const re = (kRhoAir * v * diameter) / kMuAir;
  if (re < 2e5) {
    const cd = (24.0 / re) * (1.0 + 0.15 * Math.pow(re, 0.687));
    return Math.max(cd, 0.35);
  } else {
    return 0.35;
  }
}

function calculateCl(v: number, omega: number): number {
  const v_safe = Math.max(v, 1e-6);
  const spin_ratio = (omega * kRadius) / v_safe;
  return Math.min(0.4 * spin_ratio, 0.6);
}

type State = [number, number, number, number]; // [x, z, vx, vz]

function derivs(state: State, omega: number): State {
  const [, , vx, vz] = state;
  const v = Math.hypot(vx, vz);

  if (v < 1e-3) return [0, 0, 0, 0];

  const cd = calculateCd(v);
  const cl = calculateCl(v, omega);

  const factor_drag = (0.5 * kRhoAir * cd * kArea) / kMass;
  const factor_magnus = (0.5 * kRhoAir * kArea * cl * kRadius) / kMass;

  const ax_drag = -factor_drag * v * vx;
  const az_drag = -factor_drag * v * vz;

  const ax_magnus = -factor_magnus * v * vz;
  const az_magnus = factor_magnus * v * vx;

  const ax = ax_drag + ax_magnus;
  const az = -kGravity + az_drag + az_magnus;

  return [vx, vz, ax, az];
}

function rk4Step(state: State, omega: number, dt: number): State {
  const k1 = derivs(state, omega);
  const k2 = derivs(
    [
      state[0] + 0.5 * dt * k1[0],
      state[1] + 0.5 * dt * k1[1],
      state[2] + 0.5 * dt * k1[2],
      state[3] + 0.5 * dt * k1[3],
    ],
    omega
  );
  const k3 = derivs(
    [
      state[0] + 0.5 * dt * k2[0],
      state[1] + 0.5 * dt * k2[1],
      state[2] + 0.5 * dt * k2[2],
      state[3] + 0.5 * dt * k2[3],
    ],
    omega
  );
  const k4 = derivs(
    [
      state[0] + dt * k3[0],
      state[1] + dt * k3[1],
      state[2] + dt * k3[2],
      state[3] + dt * k3[3],
    ],
    omega
  );

  return [
    state[0] + (dt / 6.0) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    state[1] + (dt / 6.0) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    state[2] + (dt / 6.0) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
    state[3] + (dt / 6.0) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]),
  ];
}

export interface TrajectoryPoint {
  x: number;
  z: number;
  t: number;
}

export interface SimulationResult {
  trajectory: TrajectoryPoint[];
  error: number;
  impactAngle: number;
  maxHeight: number;
  valid: boolean;
}

export function simulateTrajectory(
  vShooter: number,
  thetaDeg: number,
  robotVel: number,
  shooterHeight: number = SHOOTER_HEIGHT
): SimulationResult {
  const thetaRad = (thetaDeg * Math.PI) / 180;
  const isBackward = thetaDeg < 0;

  const avgFlywheelRadius = (FLYWHEEL_RADIUS1_M + FLYWHEEL_RADIUS2_M) / 2;
  const avgFlywheelSpeed = vShooter;
  const flywheelOmega = avgFlywheelSpeed / avgFlywheelRadius;

  const vFlywheel1 = flywheelOmega * FLYWHEEL_RADIUS1_M;
  const vFlywheel2 = flywheelOmega * FLYWHEEL_RADIUS2_M;

  const surfaceVelDiff = vFlywheel1 - vFlywheel2;
  const SPIN_TRANSFER_EFFICIENCY = 0.8;
  const omega = (surfaceVelDiff / kRadius) * SPIN_TRANSFER_EFFICIENCY;

  const vx0Ground = vShooter * Math.cos(thetaRad) + robotVel;
  const vz0Ground = vShooter * Math.sin(thetaRad);

  let state: State = [0, shooterHeight, vx0Ground, vz0Ground];
  let t = 0;
  let maxHeight = shooterHeight;

  const trajectory: TrajectoryPoint[] = [{ x: 0, z: shooterHeight, t: 0 }];

  for (let i = 0; i < 5000; i++) {
    state = rk4Step(state, omega, DT);
    t += DT;

    if (state[1] > maxHeight) {
      maxHeight = state[1];
    }

    trajectory.push({ x: state[0], z: state[1], t });

    if (state[1] < 0) {
      break;
    }
  }

  const impactAngle = Math.atan2(-state[3], state[2]) * (180 / Math.PI);

  return {
    trajectory,
    error: 0,
    impactAngle,
    maxHeight,
    valid: trajectory.length > 1,
  };
}

interface ModelPoint {
  distance: number;
  robot_vel: number;
  final_vel: number;
  final_angle: number;
  flight_time: number;
}

interface ShotModel {
  exitSpeedMps: number;
  launchAngleDeg: number;
  flightTimeSec: number;
}

let modelTable: Map<number, Map<number, ShotModel>> | null = null;

export async function loadModelTable(): Promise<void> {
  try {
    console.log('Loading model table from /ref.json...');
    const response = await fetch('/ref.json');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log('Parsing JSON data...');
    const points: ModelPoint[] = await response.json();
    console.log(`Loaded ${points.length} model points`);
    
    console.log('Building lookup table...');
    modelTable = buildTable(points);
    console.log('Model table ready!');
  } catch (error) {
    console.error('Failed to load model table:', error);
    throw error;
  }
}

function buildTable(points: ModelPoint[]): Map<number, Map<number, ShotModel>> {
  const table = new Map<number, Map<number, ShotModel>>();
  
  for (const p of points) {
    if (!table.has(p.distance)) {
      table.set(p.distance, new Map());
    }
    table.get(p.distance)!.set(p.robot_vel, {
      exitSpeedMps: p.final_vel,
      launchAngleDeg: p.final_angle,
      flightTimeSec: p.flight_time
    });
  }
  
  return table;
}

function interpolateVelocityPlane(
  plane: Map<number, ShotModel>,
  velocityParallel: number
): ShotModel {
  if (plane.size === 0) {
    return { exitSpeedMps: 0, launchAngleDeg: 0, flightTimeSec: 0 };
  }

  const velocities = Array.from(plane.keys()).sort((a, b) => a - b);
  
  let v0Key = velocities[0];
  let v1Key = velocities[velocities.length - 1];
  
  for (let i = 0; i < velocities.length - 1; i++) {
    if (velocities[i] <= velocityParallel && velocities[i + 1] >= velocityParallel) {
      v0Key = velocities[i];
      v1Key = velocities[i + 1];
      break;
    }
  }
  
  if (velocityParallel <= velocities[0]) {
    v0Key = v1Key = velocities[0];
  } else if (velocityParallel >= velocities[velocities.length - 1]) {
    v0Key = v1Key = velocities[velocities.length - 1];
  }

  const v0 = plane.get(v0Key)!;
  const v1 = plane.get(v1Key)!;

  if (v0Key === v1Key) {
    return v0;
  }

  const t = (velocityParallel - v0Key) / (v1Key - v0Key);
  return interpolateModel(v0, v1, t);
}

function interpolateModel(a: ShotModel, b: ShotModel, t: number): ShotModel {
  return {
    exitSpeedMps: a.exitSpeedMps + (b.exitSpeedMps - a.exitSpeedMps) * t,
    launchAngleDeg: a.launchAngleDeg + (b.launchAngleDeg - a.launchAngleDeg) * t,
    flightTimeSec: a.flightTimeSec + (b.flightTimeSec - a.flightTimeSec) * t
  };
}

export function lookupModel(distanceMeters: number, velocityParallel: number): ShotModel {
  if (!modelTable || modelTable.size === 0) {
    return { exitSpeedMps: 12, launchAngleDeg: 45, flightTimeSec: 1.0 };
  }

  const absDistance = Math.abs(distanceMeters);
  const distances = Array.from(modelTable.keys()).sort((a, b) => a - b);
  
  let d0 = distances[0];
  let d1 = distances[distances.length - 1];
  
  for (let i = 0; i < distances.length - 1; i++) {
    if (distances[i] <= absDistance && distances[i + 1] >= absDistance) {
      d0 = distances[i];
      d1 = distances[i + 1];
      break;
    }
  }
  
  if (absDistance <= distances[0]) {
    d0 = d1 = distances[0];
  } else if (absDistance >= distances[distances.length - 1]) {
    d0 = d1 = distances[distances.length - 1];
  }

  const m0 = interpolateVelocityPlane(modelTable.get(d0)!, velocityParallel);
  
  if (d0 === d1) {
    return m0;
  }
  
  const m1 = interpolateVelocityPlane(modelTable.get(d1)!, velocityParallel);
  const t = (absDistance - d0) / (d1 - d0);
  
  return interpolateModel(m0, m1, t);
}

export function findOptimalShot(
  distance: number,
  robotVel: number
): { vShooter: number; thetaDeg: number } | null {
  const model = lookupModel(distance, robotVel);
  
  if (model.exitSpeedMps === 0) {
    return null;
  }

  const isNegative = distance < 0;
  const angle = isNegative ? 180 - model.launchAngleDeg : model.launchAngleDeg;

  return { 
    vShooter: model.exitSpeedMps, 
    thetaDeg: angle
  };
}
