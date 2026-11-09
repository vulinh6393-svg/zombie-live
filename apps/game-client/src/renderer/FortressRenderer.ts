import Phaser from 'phaser';
import { BASTION_GEOMETRY } from '../config/BastionGeometryConfig.js';
import { BastionCollisionSystem, GateCollisionState } from '../systems/BastionCollisionSystem.js';
import { GAME_FONTS } from '../config/FontConfig.js';

export interface FortressConfig {
  baseHp: number;
  maxBaseHp: number;
}

/**
 * BASTION MASTER ARCHITECTURE & DEFENSE RENDERER
 * 
 * Tích hợp toàn diện tổ hợp công trình phòng thủ Bastion bán hiện thực chuẩn SSOT:
 * - Nền sạch clean_plate bóc tách toàn diện không dính cổng baked.
 * - Khung vòm cổng thép cơ giới bastion_gate_frame rỗng thông đạo alpha=0.
 * - Hai cánh cửa trượt động bastion_door_left và bastion_door_right trượt mở độc lập.
 * - Hai đoạn tường bê tông cốt thép bastion_wall rộng 420px tại SSOT y=900.
 * - 3 bệ pháo lục giác bastion_turret_pad tại SSOT y=580.
 * - Decal sát thương tường wall_damage_overlay kích hoạt động theo lượng máu Base HP.
 * - Khu hậu cần chỉ huy phía sau: Command Bunker (y=1710) và Logistics Depots (y=1720).
 * - Tích hợp hệ thống va chạm động thời gian thực BastionCollisionSystem.
 */
export class FortressRenderer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private collisionSystem: BastionCollisionSystem;

  // Architecture Sprites
  private wallLeft!: Phaser.GameObjects.Image;
  private wallRight!: Phaser.GameObjects.Image;
  private gateFrame!: Phaser.GameObjects.Image;
  private gateDoorLeft!: Phaser.GameObjects.Image;
  private gateDoorRight!: Phaser.GameObjects.Image;
  private wallDamageOverlay!: Phaser.GameObjects.Image;
  private ledLight!: Phaser.GameObjects.Arc;
  private turretPlatforms: Phaser.GameObjects.Image[] = [];
  private commandCenter!: Phaser.GameObjects.Image;
  private ammoDepots: Phaser.GameObjects.Image[] = [];
  private hqText!: Phaser.GameObjects.Text;
  private collisionBoundaryOverlay?: Phaser.GameObjects.Graphics;

  private currentHp: number = 10000;
  private maxHp: number = 10000;
  private gateState: GateCollisionState = 'CLOSED';

  constructor(
    scene: Phaser.Scene,
    initialGateStateOrVariant: GateCollisionState | 'highway' | 'bastion' = 'CLOSED'
  ) {
    this.scene = scene;
    this.collisionSystem = new BastionCollisionSystem();
    if (
      initialGateStateOrVariant === 'OPEN' ||
      initialGateStateOrVariant === 'CLOSED' ||
      initialGateStateOrVariant === 'OPENING' ||
      initialGateStateOrVariant === 'CLOSING'
    ) {
      this.gateState = initialGateStateOrVariant;
    } else {
      this.gateState = 'CLOSED';
    }
    this.collisionSystem.setGateState(this.gateState);

    // Depth 6 to 13: Above ground bed (depth 1-5), below characters (depth 14-25)
    this.container = scene.add.container(0, 0).setDepth(6);

    this.buildBastionFromSprites();
  }

  /**
   * Chuyển đổi layout variant (hỗ trợ backward compatibility)
   */
  public setLayoutVariant(_variant: 'highway' | 'bastion'): void {
    // Bastion architecture là Single Source of Truth duy nhất của toàn bộ hệ thống
  }

  public getCollisionSystem(): BastionCollisionSystem {
    return this.collisionSystem;
  }

  public getGateState(): GateCollisionState {
    return this.gateState;
  }

  public buildBastionFromSprites(): void {
    this.container.removeAll(true);
    this.turretPlatforms = [];
    this.ammoDepots = [];

    const geom = BASTION_GEOMETRY;

    // 1. REAR STAGING YARD LOGISTICS & COMMAND BUNKER (y: 1640 - 1780)
    // Command Bunker (Depth 8)
    const bunkerY = (geom.commandBunker.yMin + geom.commandBunker.yMax) / 2; // 1710
    this.commandCenter = this.scene.add.image(geom.canvas.width / 2, bunkerY, 'fortress_command_center')
      .setOrigin(0.5)
      .setDepth(8);
    this.container.add(this.commandCenter);

    this.hqText = this.scene.add.text(geom.canvas.width / 2, bunkerY + 45, 'SỞ CHỈ HUY QUÂN SỰ TỐI CAO', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#00f5d4',
    }).setOrigin(0.5).setDepth(9);
    this.container.add(this.hqText);

    // Logistics Munitions Depots (Left & Right)
    const ammoL = this.scene.add.image(220, 1720, 'fortress_ammo_storage').setOrigin(0.5).setDepth(8);
    const ammoR = this.scene.add.image(860, 1720, 'fortress_ammo_storage').setOrigin(0.5).setDepth(8);
    this.ammoDepots.push(ammoL, ammoR);
    this.container.add([ammoL, ammoR]);

    // 2. SLIDING BLAST GATE DOORS (Depth 6 - Slide behind the outer frame)
    const bgConfig = geom.blastGate;
    const initialLeftX = this.gateState === 'OPEN' ? bgConfig.doorLeftOpenX : bgConfig.doorLeftClosedX;
    const initialRightX = this.gateState === 'OPEN' ? bgConfig.doorRightOpenX : bgConfig.doorRightClosedX;

    this.gateDoorLeft = this.scene.add.image(initialLeftX, bgConfig.doorsY, 'bastion_door_left')
      .setOrigin(0.5)
      .setDepth(6);
    this.gateDoorRight = this.scene.add.image(initialRightX, bgConfig.doorsY, 'bastion_door_right')
      .setOrigin(0.5)
      .setDepth(6);
    this.container.add([this.gateDoorLeft, this.gateDoorRight]);

    // 3. HEAVY ARMORED HOLLOW GATE FRAME (Depth 7 - Archway over the doors)
    this.gateFrame = this.scene.add.image(bgConfig.centerX, bgConfig.centerY, 'bastion_gate_frame')
      .setOrigin(0.5)
      .setDepth(7);
    this.container.add(this.gateFrame);

    // Archway LED Indicator (Depth 8)
    const ledColor = this.gateState === 'OPEN' ? 0x10b981 : 0xef4444;
    this.ledLight = this.scene.add.circle(bgConfig.centerX, bgConfig.centerY - 68, 7, ledColor)
      .setDepth(8);
    this.container.add(this.ledLight);

    // 4. MODULAR DEFENSE WALL RAMARTS (Depth 7)
    const leftWallCfg = geom.walls[0];
    const rightWallCfg = geom.walls[1];
    this.wallLeft = this.scene.add.image(leftWallCfg.centerX, leftWallCfg.centerY, 'bastion_wall')
      .setOrigin(0.5)
      .setDepth(7);
    this.wallRight = this.scene.add.image(rightWallCfg.centerX, rightWallCfg.centerY, 'bastion_wall')
      .setOrigin(0.5)
      .setDepth(7);
    this.container.add([this.wallLeft, this.wallRight]);

    // Wall Damage Overlay (Depth 8, starts hidden)
    this.wallDamageOverlay = this.scene.add.image(leftWallCfg.centerX, leftWallCfg.centerY, 'wall_damage_overlay')
      .setOrigin(0.5)
      .setDepth(8)
      .setAlpha(0);
    this.container.add(this.wallDamageOverlay);

    // 5. 3 HEXAGONAL CONCRETE TURRET PADS (Depth 8 at SSOT y=580)
    for (const t of geom.turrets) {
      const pad = this.scene.add.image(t.x, t.y, 'bastion_turret_pad')
        .setOrigin(0.5)
        .setDepth(8);
      this.turretPlatforms.push(pad);
      this.container.add(pad);
    }

    // 6. COLLISION BOUNDARY LINE (y=840)
    this.drawCollisionBoundaryOverlay();
  }

  private drawCollisionBoundaryOverlay(): void {
    if (this.collisionBoundaryOverlay) {
      this.collisionBoundaryOverlay.destroy();
    }
    this.collisionBoundaryOverlay = this.scene.add.graphics().setDepth(5);
    this.collisionBoundaryOverlay.lineStyle(2, 0xef4444, 0.7);
    this.collisionBoundaryOverlay.strokeRect(30, BASTION_GEOMETRY.collisionLineY - 2, 1020, 4);
    this.container.add(this.collisionBoundaryOverlay);
  }

  /**
   * Mở cổng thép cơ giới: 2 cánh trượt ra hai bên với chuyển động mượt mà
   */
  public openGate(duration: number = 1000): void {
    if (this.gateState === 'OPEN') return;
    this.gateState = 'OPENING';
    this.collisionSystem.setGateState('OPENING');
    this.ledLight.setFillStyle(0xf59e0b); // Orange indicator during movement

    const bg = BASTION_GEOMETRY.blastGate;

    this.scene.tweens.add({
      targets: this.gateDoorLeft,
      x: bg.doorLeftOpenX, // 430
      duration,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.collisionSystem.updateGateDoors(this.gateDoorLeft.x, this.gateDoorRight.x);
      },
      onComplete: () => {
        this.gateState = 'OPEN';
        this.collisionSystem.setGateState('OPEN');
        this.ledLight.setFillStyle(0x10b981); // Green indicator when fully open
      }
    });

    this.scene.tweens.add({
      targets: this.gateDoorRight,
      x: bg.doorRightOpenX, // 650
      duration,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.collisionSystem.updateGateDoors(this.gateDoorLeft.x, this.gateDoorRight.x);
      }
    });
  }

  /**
   * Đóng cổng thép cơ giới: 2 cánh trượt vào giữa và khóa chốt
   */
  public closeGate(duration: number = 1000): void {
    if (this.gateState === 'CLOSED') return;
    this.gateState = 'CLOSING';
    this.collisionSystem.setGateState('CLOSING');
    this.ledLight.setFillStyle(0xf59e0b); // Orange indicator during movement

    const bg = BASTION_GEOMETRY.blastGate;

    this.scene.tweens.add({
      targets: this.gateDoorLeft,
      x: bg.doorLeftClosedX, // 483
      duration,
      ease: 'Cubic.easeIn',
      onUpdate: () => {
        this.collisionSystem.updateGateDoors(this.gateDoorLeft.x, this.gateDoorRight.x);
      },
      onComplete: () => {
        this.gateState = 'CLOSED';
        this.collisionSystem.setGateState('CLOSED');
        this.ledLight.setFillStyle(0xef4444); // Red indicator when locked shut
      }
    });

    this.scene.tweens.add({
      targets: this.gateDoorRight,
      x: bg.doorRightClosedX, // 597
      duration,
      ease: 'Cubic.easeIn',
      onUpdate: () => {
        this.collisionSystem.updateGateDoors(this.gateDoorLeft.x, this.gateDoorRight.x);
      }
    });
  }

  /**
   * Cập nhật máu căn cứ và hiển thị decal nứt vỡ tương ứng
   */
  public updateHp(hp: number, maxHp: number = 10000): void {
    this.currentHp = hp;
    this.maxHp = maxHp;
    const hpRatio = Math.max(0, hp / maxHp);

    if (hpRatio < 0.6) {
      const damageAlpha = Phaser.Math.Clamp((0.6 - hpRatio) / 0.6, 0, 1);
      this.wallDamageOverlay.setAlpha(damageAlpha);
      this.collisionSystem.setWallState('LEFT', hpRatio < 0.2 ? 'BREACHED' : 'DAMAGED', Math.round(hpRatio * 1000));
    } else {
      this.wallDamageOverlay.setAlpha(0);
      this.collisionSystem.setWallState('LEFT', 'INTACT', 1000);
    }
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
