//cooldown in seconds
spells = {
  bullet: {
    cooldown: 2.5,
    isProjectile: true,
    onCast: function(data) {
      projectiles.push({
        id: totalProjectiles,
        team: players[data.id].team,
        type: 'bullet',
        owner: data.id,
        x: players[data.id].x,
        y: players[data.id].y,
        width: 8,
        height: 8,
        radius: 4,
        xTo: data.x,
        yTo: data.y,
        timeAlive: 0,
        maxTime: 1.4 * SETTINGS.TICK, //3 seconds
        isDead: false,
        isJustCreated: true,
        speed: 12,
        damage: 25,
        doesDamage: true,
        angle: getAngleFromPoints(players[data.id].x, players[data.id].y, data.x, data.y)
      });
      totalProjectiles++; //MUST INCREMENT THIS SHIT
    }
  },
  freeze: {
    cooldown: 3,
    onCast: function(data) {
      projectiles.push({
        id: totalProjectiles,
        team: players[data.id].team,
        type: 'freeze',
        owner: data.id,
        x: players[data.id].x,
        y: players[data.id].y,
        width: 16,
        height: 16,
        radius: 8,
        tint: 0x0000ff,
        xTo: data.x,
        yTo: data.y,
        timeAlive: 0,
        maxTime: 2 * SETTINGS.TICK, //3 seconds
        isDead: false,
        isJustCreated: true,
        speed: 9,
        damage: 10,
        doesDamage: true,
        angle: getAngleFromPoints(players[data.id].x, players[data.id].y, data.x, data.y),

        //special
        onHit: spells["freeze"].onHit,
        frozenDuration: 2 *  SETTINGS.TICK //2 seconds
      });
      totalProjectiles++; //MUST INCREMENT THIS SHIT
    },
    onHit: function(other){
      other.isFrozen = true;
      other.speed = 0;
      other.frozenDuration = this.frozenDuration;
    }
  },
  flash: {
    cooldown: 7.5,
    onCast: function(data) {
      //flash spell
      angle = getAngleFromPoints(players[data.id].x, players[data.id].y, data.x, data.y);
       //move an arbitrary 200 units in target angle if the given position is farther than data.x and data.y otherwise move to that point
      if(getDistanceFromPoints(players[data.id].x, players[data.id].y, data.x, data.y) > 200) {
        change = getPositionChange(angle, 200);
        players[data.id].x += change.x;
        players[data.id].y += change.y;

      } else {
        players[data.id].x = data.x;
        players[data.id].y = data.y;
      }

      //stop player from moving afterwards
      //players[data.id].xMoveTo = players[data.id].x;
      //players[data.id].yMoveTo = players[data.id].y;
    }
  },
  rocket: {
    cooldown: 6,
    onCast: function(data) {
      projectiles.push({
        id: totalProjectiles,
        team: players[data.id].team,
        type: 'ultimate',
        owner: data.id,
        x: players[data.id].x,
        y: players[data.id].y,
        width: 64,
        height: 64,
        radius: 32,
        tint: 0xff0000,
        xTo: data.x,
        yTo: data.y,
        timeAlive: 0,
        maxTime: 2 * SETTINGS.TICK, //3 seconds
        isDead: false,
        isJustCreated: true,
        speed: 18,
        damage: 30,
        doesDamage: true,
        angle: getAngleFromPoints(players[data.id].x, players[data.id].y, data.x, data.y),
      });
      totalProjectiles++; //MUST INCREMENT THIS SHIT
    }
  },
  shotgun: {
    cooldown: 5,
    onCast: function(data) {
      var angle = getAngleFromPoints(players[data.id].x, players[data.id].y, data.x, data.y) - Math.radians(36/2); //spray will be 36 (4 degres between 9 bullets)

      //create 9 bullets
      for(var i=0; i <= 8; i++) {
        projectiles.push({
          id: totalProjectiles,
          team: players[data.id].team,
          type: 'shotgun',
          owner: data.id,
          x: players[data.id].x,
          y: players[data.id].y,
          width: 8,
          height: 8,
          radius: 4,
          xTo: data.x,
          yTo: data.y,
          timeAlive: 0,
          maxTime: 0.15 * SETTINGS.TICK, //3 seconds
          isDead: false,
          isJustCreated: true,
          speed: 25,
          damage: 8,
          doesDamage: true,
          angle: angle + Math.radians(4)*i
        });
        totalProjectiles++; //MUST INCREMENT THIS SHIT
      }

    }
  },
  speedBoost: {
    cooldown: 8,
    duration: 2.5, //seconds
    onCast: function(data) {
      //speedBoost spell
      players[data.id].speed *= 2;

      //set speed to normal after
      setTimeout(function () {
        players[data.id].speed = players[data.id].originalSpeed;
      }, spells.speedBoost.duration * 1000);

    },
  },
  spitRoast: {
    cooldown: 4,
    duration: 1, //seconds
    onCast: function(data) {
      var projectileID = totalProjectiles;

      projectiles.push({
        id: totalProjectiles,
        team: players[data.id].team,
        type: 'spitRoast',
        owner: data.id,
        x: players[data.id].x,
        y: players[data.id].y,
        width: 48,
        height: 48,
        radius: 24,
        tint: 0x00ff00,
        xTo: data.x,
        yTo: data.y,
        timeAlive: 0,
        maxTime: 3 * SETTINGS.TICK, //3 seconds
        isDead: false,
        isJustCreated: true,
        speed: 13,
        damage: 10,
        doesDamage: true,
        angle: getAngleFromPoints(players[data.id].x, players[data.id].y, data.x, data.y),
        stage: 1,
        update: spells["spitRoast"].update
      });
      totalProjectiles++; //MUST INCREMENT THIS SHIT

      //set speed to normal after
      setTimeout(function () {
          var projectile = projectiles.find(function(x) {
            return x.id == projectileID;
          });

          //if our projectile still exists
          if(projectile != undefined){
            projectile.angle = getAngleFromPoints(projectile.x, projectile.y, players[projectile.owner].x, players[projectile.owner].y );
            projectile.damage = 75;

            projectile.stage = 2;
          }

      }, spells.spitRoast.duration * 1000);

    },
    update: function() {
      //if is in stage 2
      if(this.stage == 2) {
        //set angle to be pointing to owner
        this.angle = getAngleFromPoints(this.x, this.y, players[this.owner].x, players[this.owner].y );

        //if projectile is close the the caster, delete it
        if(getDistanceFromPoints(this.x, this.y, players[this.owner].x, players[this.owner].y ) < this.speed ) {
          this.isDead = true;
        }
      }
    }
  },
  forcefieldBullet: {
    cooldown: 6,
    onCast: function(data) {
    var angle = getAngleFromPoints(players[data.id].x, players[data.id].y, data.x, data.y) - Math.radians(20); //spray will be 36 (4 degres between 9 bullets)

    for(var i=0; i < 3; i++) {
      projectiles.push({
        id: totalProjectiles,
        team: players[data.id].team,
        type: 'forcefieldBullet',
        owner: data.id,
        x: players[data.id].x,
        y: players[data.id].y,
        width: 24,
        height: 24,
        radius: 12,
        xTo: data.x,
        yTo: data.y,
        timeAlive: 0,
        maxTime: 0.7 * SETTINGS.TICK, //3 seconds
        isDead: false,
        isJustCreated: true,
        speed: 5,
        damage: 0,
        doesDamage: false,
        angle: angle + Math.radians(20)*i ,
        update: spells["forcefieldBullet"].update
      });
      totalProjectiles++; //MUST INCREMENT THIS SHIT
    }

    },
    update: function() {
      var self = this;
      Object.keys(projectiles).forEach(function(id) {
        //if the bullets are touching and its not touching other forcefield bulets
        if( self.id != projectiles[id].id && self.type != projectiles[id].type ) {
          if( getDistanceFromPoints(projectiles[id].x, projectiles[id].y, self.x, self.y) <= (self.radius + projectiles[id].radius) ) {
            console.log("IS TOUCHING");
            projectiles[id].isDead = true;
          }
        }
      });
    }
  },
  growBall: {
    cooldown: 6,
    onCast: function(data) {

      projectiles.push({
        id: totalProjectiles,
        team: players[data.id].team,
        type: 'growBall',
        owner: data.id,
        x: players[data.id].x,
        y: players[data.id].y,
        width: 48,
        height: 48,
        radius: 24,
        tint: 0x800080,
        xTo: data.x,
        yTo: data.y,
        timeAlive: 0,
        maxTime: 2 * SETTINGS.TICK, //2 second
        isDead: false,
        isJustCreated: true,
        speed: 0,
        damage: 15,
        doesDamage: true,
        damageIncreasePerSecond: 25/SETTINGS.TICK,
        radiusIncreasePerSecond: 8/SETTINGS.TICK,
        angle: getAngleFromPoints(players[data.id].x, players[data.id].y, data.x, data.y),
        update: spells["growBall"].update,
        onDestroy: spells["growBall"].onDestroy,

        //Special
        damageReduction: 0.5
      });
      totalProjectiles++; //MUST INCREMENT THIS SHIT

    },
    update: function() {

      //set owner's damageReduction
      players[this.owner].damageReduction = this.damageReduction;

      //follow owner
      this.x = players[this.owner].x;
      this.y = players[this.owner].y;

      //increase damage and radius
      this.damage += this.damageIncreasePerSecond;
      this.radius += this.radiusIncreasePerSecond;
    },
    onDestroy: function() {
      players[this.owner].damageReduction = 0;
    }
  },
  forcefield: {
    cooldown: 6,
    onCast: function(data) {

      projectiles.push({
        id: totalProjectiles,
        team: players[data.id].team,
        type: 'forcefield',
        owner: data.id,
        x: players[data.id].x,
        y: players[data.id].y,
        width: 64,
        height: 64,
        radius: 32,
        xTo: data.x,
        yTo: data.y,
        timeAlive: 0,
        maxTime: 0.35 * SETTINGS.TICK, //3 seconds
        isDead: false,
        isJustCreated: true,
        speed: 0,
        damage: 0,
        doesDamage: false,
        angle: 0,
        update: spells["forcefield"].update
      });
      totalProjectiles++; //MUST INCREMENT THIS SHIT

    },
    update: function() {
      var self = this;
      Object.keys(projectiles).forEach(function(id) {
        //if the bullets are touching and its not touching other forcefield bulets
        if( self.id != projectiles[id].id && self.type != projectiles[id].type ) {
          if( getDistanceFromPoints(projectiles[id].x, projectiles[id].y, self.x, self.y) <= (self.radius + projectiles[id].radius) ) {
            projectiles[id].isDead = true;
            console.log("yo is really dead");
          }
        }
      });

      //follow owner
      this.x = players[this.owner].x;
      this.y = players[this.owner].y;
    }
  },
  vampireBullet: {
    cooldown: 6,
    onCast: function(data) {
      projectiles.push({
        id: totalProjectiles,
        team: players[data.id].team,
        type: 'freeze',
        owner: data.id,
        x: players[data.id].x,
        y: players[data.id].y,
        width: 16,
        height: 16,
        radius: 8,
        tint: 0x0000ff,
        xTo: data.x,
        yTo: data.y,
        timeAlive: 0,
        maxTime: 2 * SETTINGS.TICK, //3 seconds
        isDead: false,
        isJustCreated: true,
        speed: 9,
        damage: 10,
        doesDamage: true,
        angle: getAngleFromPoints(players[data.id].x, players[data.id].y, data.x, data.y),

        //special
        onHit: spells["freeze"].onHit,
        frozenDuration: 2 *  SETTINGS.TICK //2 seconds
      });
      totalProjectiles++; //MUST INCREMENT THIS SHIT
    },
    onHit: function(other){
      other.isFrozen = true;
      other.speed = 0;
      other.frozenDuration = this.frozenDuration;
    }
  },
}

function getAngleFromPoints(cx, cy, ex, ey) {
  var dy = ey - cy;
  var dx = ex - cx;
  var theta = Math.atan2(dy, dx);
  return theta; //in radians
}

function getPositionChange(angle, speed) {
  //angle must be in radians
  var x, y;

  y = speed*Math.sin(angle);
  x = speed*Math.cos(angle);

  return { x: x, y: y };
}

function getDistanceFromPoints(x1, y1, x2, y2) {
  return Math.sqrt( Math.pow((x1-x2), 2) + Math.pow((y1-y2), 2) );
}

// Converts from degrees to radians.
Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};

// Converts from radians to degrees.
Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
};

module.exports = spells;
