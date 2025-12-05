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
let heroImg, enemyImg, laserImg, spaceImg, explosionImg; // explosionImg 추가
let canvas, ctx;
let gameObjects = [];
let hero;
let eventEmitter;

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
    this.cooldown = 0; // 메인 레이저 쿨다운

    // [조건 1] 보조 비행선 자동 발사 (1초마다)
    // 보조 비행선은 Hero 객체의 일부로 그려지므로, 여기서 타이머를 돌려 레이저만 생성합니다.
    this.sidekickInterval = setInterval(() => {
        // 왼쪽 보조 비행선 위치 (본체 기준: x - 60, y + 20)
        // 레이저 발사 위치는 비행선 중앙 쯤으로 보정
        const leftLaser = new Laser(this.x - 45, this.y + 20); 
        leftLaser.width = 5; // 보조 레이저는 조금 작게
        leftLaser.height = 15;
        
        // 오른쪽 보조 비행선 위치 (본체 기준: x + 90, y + 20)
        const rightLaser = new Laser(this.x + 105, this.y + 20);
        rightLaser.width = 5;
        rightLaser.height = 15;

        gameObjects.push(leftLaser, rightLaser);
    }, 1000); // 1000ms = 1초마다 발사
  }

  fire() {
    if (this.canFire()) {
      // 메인 레이저 생성
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

  draw(ctx) {
    // 1. 메인 우주선
    super.draw(ctx); 

    // 2. 보조 우주선 (왼쪽)
    ctx.drawImage(
      this.img,
      this.x - 60,        
      this.y + 20,        
      this.width * 0.6,   
      this.height * 0.6
    );

    // 3. 보조 우주선 (오른쪽)
    ctx.drawImage(
      this.img,
      this.x + 90,        
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
    
    // 적군 자동 이동 로직
    let id = setInterval(() => {
      if (this.y < canvas.height - this.height) {
        this.y += 5; // 아래로 이동
      } else {
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
      if (this.y > -50) { // 화면 위쪽 끝까지 이동
        this.y -= 15; // 위로 이동
      } else {
        this.dead = true; // 화면 밖으로 나가면 제거
        clearInterval(id);
      }
    }, 100);
  }
}

// [조건 2] 클래스: Explosion (폭발 효과)
class Explosion extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.img = explosionImg;
        this.width = 60; // 폭발 크기
        this.height = 60;
        this.type = "Explosion";
        
        // 0.2초 후에 사라지게 설정 (펑! 하고 사라짐)
        setTimeout(() => {
            this.dead = true;
        }, 200);
    }
}

// [10] 게임 객체 생성 함수들
function createHero() {
  hero = new Hero(canvas.width / 2 - 45, canvas.height - canvas.height / 4);
  hero.img = heroImg;
  gameObjects.push(hero);
}

// 피라미드 배치 (이전 요청 유지)
function createEnemies() {
  const ROWS = 5;       
  const GAP = 10;      
  const START_Y = 0;    

  for (let i = 0; i < ROWS; i++) {
    const countInRow = 5 - i; 
    const rowWidth = countInRow * 98 + (countInRow - 1) * GAP; 
    const startX = (canvas.width - rowWidth) / 2;

    for (let j = 0; j < countInRow; j++) {
      const x = startX + j * (98 + GAP);
      const y = START_Y + i * (50 + GAP); 
      
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
  eventEmitter = new EventEmitter(); 

  createEnemies();
  createHero();

  // 움직임 리스너
  eventEmitter.on(Messages.KEY_EVENT_UP, () => { hero.y -= 5; });
  eventEmitter.on(Messages.KEY_EVENT_DOWN, () => { hero.y += 5; });
  eventEmitter.on(Messages.KEY_EVENT_LEFT, () => { hero.x -= 5; });
  eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => { hero.x += 5; });

  // 발사 리스너
  eventEmitter.on(Messages.KEY_EVENT_SPACE, () => {
    if (hero.canFire()) {
      hero.fire();
    }
  });

  // [조건 2] 충돌 처리: 폭발 효과 추가
  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
    first.dead = true;   // 레이저 제거
    second.dead = true;  // 적군 제거
    
    // 폭발 객체 생성 (적군 위치에)
    const explosion = new Explosion(second.x, second.y);
    gameObjects.push(explosion);
  });
}

// [14] 메인 실행 (window.onload)
window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");

  // 이미지 로드
  heroImg = await loadTexture("assets/player.png");
  enemyImg = await loadTexture("assets/enemyShip.png");
  laserImg = await loadTexture("assets/laserRed.png");
  spaceImg = await loadTexture("assets/Background/starBackground.png");
  
  // [조건 2] 폭발 이미지 로드 (이 파일이 있어야 합니다!)
  explosionImg = await loadTexture("assets/explosion.png"); 

  initGame();

  const pattern = ctx.createPattern(spaceImg, 'repeat');

  // 게임 루프
  setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 배경 (별 패턴)
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGameObjects(ctx);
    updateGameObjects();
  }, 100); 

  // 키보드 입력
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