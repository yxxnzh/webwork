const Messages = {
  KEY_EVENT_UP: "KEY_EVENT_UP",
  KEY_EVENT_DOWN: "KEY_EVENT_DOWN",
  KEY_EVENT_LEFT: "KEY_EVENT_LEFT",
  KEY_EVENT_RIGHT: "KEY_EVENT_RIGHT",
  KEY_EVENT_SPACE: "KEY_EVENT_SPACE",
  KEY_EVENT_ENTER: "KEY_EVENT_ENTER",
  KEY_EVENT_METEOR: "KEY_EVENT_METEOR", 
  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",
  COLLISION_HERO_SHIELD: "COLLISION_HERO_SHIELD", 
  COLLISION_METEOR_ENEMY: "COLLISION_METEOR_ENEMY", 
  GAME_END_LOSS: "GAME_END_LOSS",
  GAME_END_WIN: "GAME_END_WIN",
};
let heroImg, enemyImg, laserImg, explosionImg, lifeImg; 
let canvas, ctx;
let gameObjects = [];
let hero;
let eventEmitter;
let gameLoopId;
let stage = 1; 
let isStageChanging = false;
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
  constructor() { this.listeners = {}; }
  on(message, listener) {
    if (!this.listeners[message]) this.listeners[message] = [];
    this.listeners[message].push(listener);
  }
  emit(message, payload = null) {
    if (this.listeners[message]) this.listeners[message].forEach((l) => l(message, payload));
  }
  clear() { this.listeners = {}; }
}

class GameObject {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.dead = false; this.type = "";
    this.width = 0; this.height = 0;
    this.img = undefined;
  }
  draw(ctx) { ctx.drawImage(this.img, this.x, this.y, this.width, this.height); }
  rectFromGameObject() {
    return { top: this.y, left: this.x, bottom: this.y + this.height, right: this.x + this.width };
  }
}

class Hero extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 99; this.height = 75;
    this.type = 'Hero';
    this.cooldown = 0;
    this.life = 3;   
    this.points = 0; 
    
    this.shield = false;
    this.meteorCooldown = 0;
    this.sidekickInterval = setInterval(() => {
        if (this.dead) return;
        const leftLaser = new Laser(this.x - 45, this.y + 20); 
        leftLaser.width = 5; leftLaser.height = 15;
        const rightLaser = new Laser(this.x + 105, this.y + 20);
        rightLaser.width = 5; rightLaser.height = 15;
        gameObjects.push(leftLaser, rightLaser);
    }, 1000);
  }

  fire() {
    if (this.canFire()) {
      gameObjects.push(new Laser(this.x + 45, this.y - 10));
      this.cooldown = 500;
      let id = setInterval(() => {
        if (this.cooldown > 0) this.cooldown -= 100;
        else clearInterval(id);
      }, 100);
    }
  }

  fireMeteor() {
      if (this.meteorCooldown <= 0) {
          for(let i=0; i<5; i++) {
              const mx = (Math.random() * canvas.width) - 50;
              gameObjects.push(new Meteor(mx, -200 - (i*100))); 
          }
          this.meteorCooldown = 10000; 
          let mid = setInterval(() => {
              if (this.meteorCooldown > 0) this.meteorCooldown -= 100;
              else clearInterval(mid);
          }, 100);
      }
  }

  canFire() { return this.cooldown === 0; }

  decrementLife() {
    if (this.shield) {
        this.shield = false;
        return;
    }
    this.life--;
    if (this.life === 0) this.dead = true;
  }

  incrementPoints() { this.points += 100; }

  draw(ctx) {
    super.draw(ctx);
    if (!this.dead) {
        ctx.drawImage(this.img, this.x - 60, this.y + 20, this.width * 0.6, this.height * 0.6);
        ctx.drawImage(this.img, this.x + 90, this.y + 20, this.width * 0.6, this.height * 0.6);
        
        if (this.shield) {
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 60, 0, 2 * Math.PI);
            ctx.strokeStyle = "cyan";
            ctx.lineWidth = 5;
            ctx.stroke();
        }
    }
  }
}
class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 98; this.height = 50;
    this.type = "Enemy";
    const speedFactor = 1 + (stage * 0.3); 
    this.vx = (Math.random() * 2.4 - 1.2) * speedFactor; 
    this.vy = (Math.random() * 1.0 + 0.5) * speedFactor;

    let id = setInterval(() => {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x <= 0 || this.x >= canvas.width - this.width) {
          this.vx = -this.vx; 
      }

      if (this.y > canvas.height) {
          this.y = -this.height; 
          this.x = Math.random() * (canvas.width - this.width); 
      }

      if (this.dead) clearInterval(id);
    }, 40);
  }
}
class Laser extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 9; this.height = 33;
    this.type = 'Laser';
    this.img = laserImg;
    let id = setInterval(() => {
      if (this.y > -50) this.y -= 15;
      else { this.dead = true; clearInterval(id); }
    }, 100);
  }
}
class ShieldItem extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.width = 40; this.height = 40;
        this.type = "ShieldItem";
        this.img = null; 
        let id = setInterval(() => {
            if (this.y < canvas.height) this.y += 5;
            else { this.dead = true; clearInterval(id); }
        }, 100);
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x + 20, this.y + 20, 15, 0, 2 * Math.PI);
        ctx.fillStyle = "blue";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.fillText("S", this.x + 13, this.y + 27);
    }
}
class Meteor extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.width = 100; this.height = 200;
        this.type = "Meteor";
        this.img = laserImg; 
        let id = setInterval(() => {
            if (this.y < canvas.height) this.y += 30;
            else { this.dead = true; clearInterval(id); }
        }, 50);
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = "orange";
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = "yellow";
        ctx.fillRect(this.x + 20, this.y, this.width - 40, this.height);
        ctx.restore();
    }
}

class Explosion extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.img = explosionImg;
        this.width = 60; this.height = 60;
        this.type = "Explosion";
        setTimeout(() => { this.dead = true; }, 200);
    }
}

function createHero() {
  hero = new Hero(canvas.width / 2 - 45, canvas.height - canvas.height / 4);
  hero.img = heroImg;
  gameObjects.push(hero);
}

function createEnemies() {
  const ENEMY_COUNT = 20; 
  gameObjects = gameObjects.filter(go => go.type !== "Enemy");
  
  for (let i = 0; i < ENEMY_COUNT; i++) {
    const x = Math.random() * (canvas.width - 98);
    const y = Math.random() * (canvas.height / 3);
    const enemy = new Enemy(x, y);
    enemy.img = enemyImg;
    gameObjects.push(enemy);
  }
}

function updateGameObjects() {
  const enemies = gameObjects.filter(go => go.type === 'Enemy');
  const lasers = gameObjects.filter(go => go.type === 'Laser');
  const shieldItems = gameObjects.filter(go => go.type === 'ShieldItem');
  const meteors = gameObjects.filter(go => go.type === 'Meteor');

  lasers.forEach(l => {
    enemies.forEach(m => {
      if (intersectRect(l.rectFromGameObject(), m.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, { first: l, second: m });
      }
    });
  });

  enemies.forEach(enemy => {
    if (intersectRect(hero.rectFromGameObject(), enemy.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy });
    }
  });

  shieldItems.forEach(item => {
      if (intersectRect(hero.rectFromGameObject(), item.rectFromGameObject())) {
          eventEmitter.emit(Messages.COLLISION_HERO_SHIELD, { item });
      }
  });

  meteors.forEach(meteor => {
      enemies.forEach(enemy => {
          if (intersectRect(meteor.rectFromGameObject(), enemy.rectFromGameObject())) {
              eventEmitter.emit(Messages.COLLISION_METEOR_ENEMY, { meteor, enemy });
          }
      });
  });

  gameObjects = gameObjects.filter(go => !go.dead);
}

function drawGameObjects(ctx) {
  gameObjects.forEach(go => go.draw(ctx));
}

function drawLife() {
    const START_POS = canvas.width - 180;
    for(let i=0; i < hero.life; i++ ) {
        ctx.drawImage(lifeImg, START_POS + (45 * (i+1)), canvas.height - 37);
    }
}

function drawPoints() {
    ctx.font = "30px Arial"; ctx.fillStyle = "red"; ctx.textAlign = "left";
    ctx.fillText("Points: "+ hero.points, 10, canvas.height-20);
    
    ctx.font = "bold 24px Arial"; ctx.fillStyle = "white"; ctx.textAlign = "center";
    ctx.fillText("STAGE " + stage + " / 3", canvas.width/2, 30);

    if (isStageChanging) {
        ctx.font = "bold 50px Arial";
        ctx.fillStyle = "yellow";
        ctx.fillText("STAGE CLEARED!", canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = "30px Arial";
        ctx.fillText("Next Stage Starting...", canvas.width / 2, canvas.height / 2 + 20);
    }

    ctx.textAlign = "left";
    if (hero.meteorCooldown > 0) {
        ctx.fillStyle = "gray";
        ctx.font = "20px Arial";
        ctx.fillText("Meteor CD: " + (hero.meteorCooldown/1000).toFixed(1) + "s", 10, canvas.height - 50);
    } else {
        ctx.fillStyle = "orange";
        ctx.font = "20px Arial";
        ctx.fillText("Meteor Ready! [B]", 10, canvas.height - 50);
    }
}

function displayMessage (message, color = "red") {
    ctx.font = "30px Arial"; ctx.fillStyle = color; ctx.textAlign = "center";
    ctx.fillText (message, canvas.width / 2, canvas.height / 2);
}
function isHeroDead() { return hero.life <= 0; }
function isEnemiesDead() { return gameObjects.filter(go => go.type === "Enemy" && !go.dead).length === 0; }
function checkStageClear() {
    if (isStageChanging || !isEnemiesDead()) return;

    if (stage < 3) {
        isStageChanging = true; 

        setTimeout(() => {
            stage++;
            createEnemies();
            isStageChanging = false; 
        }, 2000);
    } else {
        eventEmitter.emit(Messages.GAME_END_WIN);
    }
}

function initGame() {
  gameObjects = [];
  eventEmitter = new EventEmitter(); 
  stage = 1; 
  isStageChanging = false; 

  createEnemies();
  createHero();

  eventEmitter.on(Messages.KEY_EVENT_UP, () => { hero.y -= 5; });
  eventEmitter.on(Messages.KEY_EVENT_DOWN, () => { hero.y += 5; });
  eventEmitter.on(Messages.KEY_EVENT_LEFT, () => { hero.x -= 5; });
  eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => { hero.x += 5; });
  eventEmitter.on(Messages.KEY_EVENT_SPACE, () => { if (hero.canFire()) hero.fire(); });
  eventEmitter.on(Messages.KEY_EVENT_METEOR, () => {
      hero.fireMeteor();
  });
  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
    first.dead = true; second.dead = true;
    hero.incrementPoints();
    gameObjects.push(new Explosion(second.x, second.y));
    checkStageClear(); 
  });
  eventEmitter.on(Messages.COLLISION_METEOR_ENEMY, (_, { enemy }) => {
      if (!enemy.dead) { 
          enemy.dead = true;
          hero.incrementPoints();
          gameObjects.push(new Explosion(enemy.x, enemy.y));
          checkStageClear();
      }
  });
  eventEmitter.on(Messages.COLLISION_HERO_SHIELD, (_, { item }) => {
      item.dead = true;
      hero.shield = true;
  });
  eventEmitter.on(Messages.COLLISION_ENEMY_HERO, (_, { enemy }) => {
      enemy.dead = true;
      hero.decrementLife();
      gameObjects.push(new Explosion(hero.x, hero.y));
      if (isHeroDead()) { eventEmitter.emit(Messages.GAME_END_LOSS); return; }
      checkStageClear(); 
  });
  eventEmitter.on(Messages.GAME_END_WIN, () => { endGame(true); });
  eventEmitter.on(Messages.GAME_END_LOSS, () => { endGame(false); });
  eventEmitter.on(Messages.KEY_EVENT_ENTER, () => { resetGame(); });
}

function endGame (win) {
    clearInterval (gameLoopId);
    setTimeout(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (win) displayMessage("FINAL VICTORY!!! Press [Enter] to Restart", "green");
        else displayMessage("GAME OVER... Press [Enter] to Try Again");
    }, 200)
}
function resetGame() {
    if (gameLoopId) {
        clearInterval(gameLoopId); 
        eventEmitter.clear(); 
        if(hero && hero.sidekickInterval) clearInterval(hero.sidekickInterval);
        initGame(); 
        startGameLoop();
    }
}
function startGameLoop() {
    gameLoopId = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (Math.random() < 0.005) {
            const rx = Math.random() * (canvas.width - 50);
            gameObjects.push(new ShieldItem(rx, -50));
        }
        drawPoints();
        drawLife();
        updateGameObjects();
        drawGameObjects(ctx);
    }, 100);
}

window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");
  heroImg = await loadTexture("assets/player.png");
  enemyImg = await loadTexture("assets/enemyShip.png");
  laserImg = await loadTexture("assets/laserRed.png");
  explosionImg = await loadTexture("assets/explosion.png");
  lifeImg = await loadTexture("assets/life.png"); 

  initGame();
  startGameLoop();

  window.addEventListener("keydown", (e) => {
    if ([32, 37, 38, 39, 40].includes(e.keyCode)) e.preventDefault();
  });
  window.addEventListener("keyup", (evt) => {
    if (evt.key === "ArrowUp") eventEmitter.emit(Messages.KEY_EVENT_UP);
    else if (evt.key === "ArrowDown") eventEmitter.emit(Messages.KEY_EVENT_DOWN);
    else if (evt.key === "ArrowLeft") eventEmitter.emit(Messages.KEY_EVENT_LEFT);
    else if (evt.key === "ArrowRight") eventEmitter.emit(Messages.KEY_EVENT_RIGHT);
    else if (evt.keyCode === 32) eventEmitter.emit(Messages.KEY_EVENT_SPACE);
    else if (evt.key === "Enter") eventEmitter.emit(Messages.KEY_EVENT_ENTER);
    else if (evt.key === "b" || evt.key === "B") eventEmitter.emit(Messages.KEY_EVENT_METEOR); 
  });
};