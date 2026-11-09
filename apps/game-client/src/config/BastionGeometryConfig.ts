/**
 * BASTION GEOMETRY CONFIGURATION — SINGLE SOURCE OF TRUTH (SSOT)
 * 
 * Toàn bộ hệ tọa độ pixel cho bản đồ chiến trường Bastion (1080x1920)
 * Được đo đạc và căn chỉnh trực tiếp từ ảnh Master: bastion_master_environment.png
 */

export interface LaneAxis {
  readonly id: number;
  readonly name: 'ALPHA' | 'BRAVO' | 'CHARLIE';
  readonly centerX: number;
  readonly xMin: number;
  readonly xMax: number;
}

export interface TurretEmplacement {
  readonly laneId: number;
  readonly x: number;
  readonly y: number;
  readonly platformSize: number;
}

export interface WallSegmentConfig {
  readonly id: 'LEFT' | 'RIGHT';
  readonly centerX: number;
  readonly centerY: number;
  readonly width: number;
  readonly height: number;
  readonly collisionY: number;
}

export interface BlastGateConfig {
  readonly centerX: number;
  readonly centerY: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly doorWidth: number;
  readonly doorHeight: number;
  readonly doorLeftClosedX: number;
  readonly doorLeftOpenX: number;
  readonly doorRightClosedX: number;
  readonly doorRightOpenX: number;
  readonly doorsY: number;
  readonly portalXMin: number;
  readonly portalXMax: number;
  readonly corridorXMin: number;
  readonly corridorXMax: number;
  readonly collisionY: number;
}

export interface SoldierPosition {
  readonly laneId: number;
  readonly x: number;
  readonly y: number;
}

export interface BastionGeometry {
  readonly canvas: {
    readonly width: number;
    readonly height: number;
    readonly mobileWidth: number;
    readonly mobileHeight: number;
    readonly scaleRatio: number;
  };
  readonly lanes: readonly LaneAxis[];
  readonly collisionLineY: number;
  readonly turrets: readonly TurretEmplacement[];
  readonly walls: readonly WallSegmentConfig[];
  readonly blastGate: BlastGateConfig;
  readonly soldiers: readonly SoldierPosition[];
  readonly courtyard: {
    readonly yMin: number;
    readonly yMax: number;
  };
  readonly commandBunker: {
    readonly xMin: number;
    readonly xMax: number;
    readonly yMin: number;
    readonly yMax: number;
  };
}

export const BASTION_GEOMETRY: BastionGeometry = {
  canvas: {
    width: 1080,
    height: 1920,
    mobileWidth: 360,
    mobileHeight: 640,
    scaleRatio: 3.0,
  },
  lanes: [
    { id: 0, name: 'ALPHA', centerX: 280, xMin: 30, xMax: 410 },
    { id: 1, name: 'BRAVO', centerX: 540, xMin: 410, xMax: 670 },
    { id: 2, name: 'CHARLIE', centerX: 800, xMin: 670, xMax: 1050 },
  ],
  collisionLineY: 840,
  turrets: [
    { laneId: 0, x: 280, y: 580, platformSize: 130 },
    { laneId: 1, x: 540, y: 580, platformSize: 130 },
    { laneId: 2, x: 800, y: 580, platformSize: 130 },
  ],
  walls: [
    { id: 'LEFT', centerX: 240, centerY: 900, width: 420, height: 130, collisionY: 840 },
    { id: 'RIGHT', centerX: 840, centerY: 900, width: 420, height: 130, collisionY: 840 },
  ],
  blastGate: {
    centerX: 540,
    centerY: 900,
    frameWidth: 300,
    frameHeight: 160,
    doorWidth: 115,
    doorHeight: 120,
    doorLeftClosedX: 483,
    doorLeftOpenX: 430,
    doorRightClosedX: 597,
    doorRightOpenX: 650,
    doorsY: 908,
    portalXMin: 458,
    portalXMax: 622,
    corridorXMin: 390,
    corridorXMax: 690,
    collisionY: 840,
  },
  soldiers: [
    { laneId: 0, x: 280, y: 1030 },
    { laneId: 1, x: 540, y: 1050 },
    { laneId: 2, x: 800, y: 1030 },
  ],
  courtyard: {
    yMin: 1090,
    yMax: 1590,
  },
  commandBunker: {
    xMin: 360,
    xMax: 720,
    yMin: 1640,
    yMax: 1780,
  },
} as const;
