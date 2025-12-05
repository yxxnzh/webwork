// [1] 메시지 프로토콜 정의
const Messages = {
  KEY_EVENT_UP: "KEY_EVENT_UP",
  KEY_EVENT_DOWN: "KEY_EVENT_DOWN",
  KEY_EVENT_LEFT: "KEY_EVENT_LEFT",
  KEY_EVENT_RIGHT: "KEY_EVENT_RIGHT",
  KEY_EVENT_SPACE: "KEY_EVENT_SPACE",
  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",
};

// [2] 이미지 및 전역 변수
let heroImg, enemyImg, laserImg, spaceImg;
let canvas, ctx;
let gameObjects = [];
let hero;
let eventEmitter; // 초기화는 initGame 또는 window.onload에서

// [3] 유틸리티: 텍스처 로딩
function loadTexture(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = path;
    img.onload = () => resolve(img);
  });
}

// [4] 유틸리티: 충돌 감지 (사각형)
function intersectRect(r1, r2) {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

// [5] 클래스: EventEmitter (Pub-Sub 패턴)
class EventEmitter {
  constructor() {
    this.listeners = {};
  }
  on(message, listener) {
    if (!this.listeners[message]) {
      this.listeners[message] = [];
    }
    this.listeners[message].push(listener);
  }
  emit(message, payload = null) {
    if (this.listeners[message]) {
      this.listeners[message].forEach((l) => l(message, payload));
    }
  }
}

// [6] 클래스: GameObject (기본 객체)
class GameObject {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dead = false;
    this.type = "";
    this.width = 0;
    this.height = 0;
    this.img = undefined;
  }

  draw(ctx) {
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }

  rectFromGameObject() {
    return {
      top: this.y,
      left: this.x,
      bottom: this.y + this.height,
      right: this.x + this.width,
    };
  }
}

// [7] 클래스: Hero (플레이어)
class Hero extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 99;
    this.height = 75;
    this.type = 'Hero';
    this.cooldown = 0; // 레이저 쿨다운
  }

  fire() {
    if (this.canFire()) {
      // 레이저 생성 및 등록
      gameObjects.push(new Laser(this.x + 45, this.y - 10));
      this.cooldown = 500; // 0.5초 쿨다운
      
      let id = setInterval(() => {
        if (this.cooldown > 0) {
          this.cooldown -= 100;
        } else {
          clearInterval(id);
        }
      }, 100);
    }
  }

  canFire() {
    return this.cooldown === 0;
  }

  // ★ 커스텀 조건 반영: 보조 우주선 함께 그리기 ★
  draw(ctx) {
    // 1. 메인 우주선
    super.draw(ctx); 

    // 2. 보조 우주선 (왼쪽)
    ctx.drawImage(
      this.img,
      this.x - 60,        // 본체보다 왼쪽
      this.y + 20,        // 약간 아래
      this.width * 0.6,   // 크기 60%
      this.height * 0.6
    );

    // 3. 보조 우주선 (오른쪽)
    ctx.drawImage(
      this.img,
      this.x + 90,        // 본체보다 오른쪽
      this.y + 20,
      this.width * 0.6,
      this.height * 0.6
    );
  }
}

// [8] 클래스: Enemy (적군)
class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.type = "Enemy";
    
    // 적군 자동 이동 로직 (Slide 15)
    let id = setInterval(() => {
      if (this.y < canvas.height - this.height) {
        this.y += 5; // 아래로 이동
      } else {
        console.log('Stopped at', this.y);
        clearInterval(id);
      }
    }, 300);
  }
}

// [9] 클래스: Laser (총알)
class Laser extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 9;
    this.height = 33;
    this.type = 'Laser';
    this.img = laserImg;
    
    let id = setInterval(() => {
      if (this.y > 0) {
        this.y -= 15; // 위로 이동
      } else {
        this.dead = true; // 화면 밖으로 나가면 제거
        clearInterval(id);
      }
    }, 100);
  }
}

// [10] 게임 객체 생성 함수들
function createHero() {
  hero = new Hero(canvas.width / 2 - 45, canvas.height - canvas.height / 4);
  hero.img = heroImg;
  gameObjects.push(hero);
}

// ★ 커스텀 조건 반영: 피라미드 배치 ★
function createEnemies() {
  const ROWS = 5;       
  const GAP = 10;      
  const START_Y = 0;    

  for (let i = 0; i < ROWS; i++) {
    const countInRow = 5 - i; // 5 -> 4 -> 3 -> 2 -> 1
    const rowWidth = countInRow * 98 + (countInRow - 1) * GAP; // enemy width 98
    const startX = (canvas.width - rowWidth) / 2;

    for (let j = 0; j < countInRow; j++) {
      const x = startX + j * (98 + GAP);
      const y = START_Y + i * (50 + GAP); // enemy height 50
      
      const enemy = new Enemy(x, y);
      enemy.img = enemyImg;
      gameObjects.push(enemy);
    }
  }
}

// [11] 게임 상태 업데이트 (충돌 감지 및 객체 정리)
function updateGameObjects() {
  const enemies = gameObjects.filter(go => go.type === 'Enemy');
  const lasers = gameObjects.filter(go => go.type === 'Laser');

  lasers.forEach(l => {
    enemies.forEach(m => {
      if (intersectRect(l.rectFromGameObject(), m.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, {
          first: l,
          second: m
        });
      }
    });
  });

  // dead 상태인 객체 제거
  gameObjects = gameObjects.filter(go => !go.dead);
}

// [12] 그리기 함수
function drawGameObjects(ctx) {
  gameObjects.forEach(go => go.draw(ctx));
}

// [13] 게임 초기화 및 이벤트 바인딩
function initGame() {
  gameObjects = [];
  eventEmitter = new EventEmitter(); // Event Emitter 생성

  createEnemies();
  createHero();

  // 이벤트 리스너 등록: 움직임
  eventEmitter.on(Messages.KEY_EVENT_UP, () => { hero.y -= 5; });
  eventEmitter.on(Messages.KEY_EVENT_DOWN, () => { hero.y += 5; });
  eventEmitter.on(Messages.KEY_EVENT_LEFT, () => { hero.x -= 5; });
  eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => { hero.x += 5; });

  // 이벤트 리스너 등록: 발사
  eventEmitter.on(Messages.KEY_EVENT_SPACE, () => {
    if (hero.canFire()) {
      hero.fire();
    }
  });

  // 이벤트 리스너 등록: 충돌 처리
  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
    first.dead = true;   // 레이저 제거
    second.dead = true;  // 적군 제거
  });
}

// [14] 메인 실행 (window.onload)
window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");

  // 1. 리소스 로드 (배경 이미지 경로 주의: assets/Background/starBackground.png)
  heroImg = await loadTexture("assets/player.png");
  enemyImg = await loadTexture("assets/enemyShip.png");
  laserImg = await loadTexture("assets/laserRed.png");
  spaceImg = await loadTexture("assets/Background/starBackground.png");

  initGame();
  const pattern = ctx.createPattern(spaceImg, 'repeat');
  setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGameObjects(ctx);
    updateGameObjects();
  }, 100); 
  window.addEventListener("keydown", (e) => {
    const keyCodes = [32, 37, 38, 39, 40];
    if (keyCodes.includes(e.keyCode)) {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (evt) => {
    if (evt.key === "ArrowUp") {
      eventEmitter.emit(Messages.KEY_EVENT_UP);
    } else if (evt.key === "ArrowDown") {
      eventEmitter.emit(Messages.KEY_EVENT_DOWN);
    } else if (evt.key === "ArrowLeft") {
      eventEmitter.emit(Messages.KEY_EVENT_LEFT);
    } else if (evt.key === "ArrowRight") {
      eventEmitter.emit(Messages.KEY_EVENT_RIGHT);
    } else if (evt.keyCode === 32) {
      eventEmitter.emit(Messages.KEY_EVENT_SPACE);
    }
  });
};