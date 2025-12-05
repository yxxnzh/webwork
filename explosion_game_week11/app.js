const Messages = {
  KEY_EVENT_UP: "KEY_EVENT_UP",
  KEY_EVENT_DOWN: "KEY_EVENT_DOWN",
  KEY_EVENT_LEFT: "KEY_EVENT_LEFT",
  KEY_EVENT_RIGHT: "KEY_EVENT_RIGHT",
  KEY_EVENT_SPACE: "KEY_EVENT_SPACE",
  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",
};

let heroImg, enemyImg, laserImg, spaceImg, explosionImg;
let canvas, ctx;
let gameObjects = [];
let hero;
let eventEmitter;

function loadTexture(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = path;
    img.onload = () => resolve(img);
  });
}

function intersectRect(r1, r2) {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

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

class Hero extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 99;
    this.height = 75;
    this.type = 'Hero';
    this.cooldown = 0;
    this.sidekickInterval = setInterval(() => {
        const leftLaser = new Laser(this.x - 45, this.y + 20); 
        leftLaser.width = 5;
        leftLaser.height = 15;
        const rightLaser = new Laser(this.x + 105, this.y + 20);
        rightLaser.width = 5;
        rightLaser.height = 15;

        gameObjects.push(leftLaser, rightLaser);
    }, 1000);
  }

  fire() {
    if (this.canFire()) {
      gameObjects.push(new Laser(this.x + 45, this.y - 10));
      this.cooldown = 500;
      
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
    super.draw(ctx); 
    ctx.drawImage(
      this.img,
      this.x - 60,        
      this.y + 20,        
      this.width * 0.6,   
      this.height * 0.6
    );
    ctx.drawImage(
      this.img,
      this.x + 90,        
      this.y + 20,
      this.width * 0.6,
      this.height * 0.6
    );
  }
}

class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.type = "Enemy";
    let id = setInterval(() => {
      if (this.y < canvas.height - this.height) {
        this.y += 5;
      } else {
        clearInterval(id);
      }
    }, 300);
  }
}

class Laser extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 9;
    this.height = 33;
    this.type = 'Laser';
    this.img = laserImg;
    
    let id = setInterval(() => {
      if (this.y > -50) {
        this.y -= 15;
      } else {
        this.dead = true;
        clearInterval(id);
      }
    }, 100);
  }
}

class Explosion extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.img = explosionImg;
        this.width = 60;
        this.height = 60;
        this.type = "Explosion";
        setTimeout(() => {
            this.dead = true;
        }, 200);
    }
}

function createHero() {
  hero = new Hero(canvas.width / 2 - 45, canvas.height - canvas.height / 4);
  hero.img = heroImg;
  gameObjects.push(hero);
}

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

  gameObjects = gameObjects.filter(go => !go.dead);
}

function drawGameObjects(ctx) {
  gameObjects.forEach(go => go.draw(ctx));
}

function initGame() {
  gameObjects = [];
  eventEmitter = new EventEmitter(); 

  createEnemies();
  createHero();
  eventEmitter.on(Messages.KEY_EVENT_UP, () => { hero.y -= 5; });
  eventEmitter.on(Messages.KEY_EVENT_DOWN, () => { hero.y += 5; });
  eventEmitter.on(Messages.KEY_EVENT_LEFT, () => { hero.x -= 5; });
  eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => { hero.x += 5; });
  eventEmitter.on(Messages.KEY_EVENT_SPACE, () => {
    if (hero.canFire()) {
      hero.fire();
    }
  });
  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
    first.dead = true;
    second.dead = true;
    const explosion = new Explosion(second.x, second.y);
    gameObjects.push(explosion);
  });
}

window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");
  heroImg = await loadTexture("assets/player.png");
  enemyImg = await loadTexture("assets/enemyShip.png");
  laserImg = await loadTexture("assets/laserRed.png");
  spaceImg = await loadTexture("assets/Background/starBackground.png");
  
  explosionImg = await loadTexture("assets/explosion.png"); 
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