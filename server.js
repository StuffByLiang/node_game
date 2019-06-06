var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var router = express.Router();
var port = process.env.PORT || 3000;

var spells = require('./js/spells.js');

console.log(spells);

global.SETTINGS = {
  TICK: 60,
  HEALTH_REGEN: 1/60, //1 every second
  GAME: {
    WIDTH: 2400,
    HEIGHT: 1440
  }
}

/*
  GLOBAL VARS
*/
global.players = {},
global.projectiles = [],
global.totalProjectiles = 0;

app.use(express.static('public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

server.listen(port, function () {
  console.log(`Listening on ${server.address().port}`);

  io.on('connection', function (socket) {

    console.log('a user connected');

    socket.on('disconnect', function () {
      console.log('user disconnected');
      // remove this player from our players object
      delete players[socket.id];
      // emit a message to all players to remove this player
      io.emit('disconnect', socket.id);
    });

    //client sends userData when they join the game
    socket.on('userData', function (data) {

      //set only if player hasnt been set before (to prevent cheating/hacking)
      if(players[socket.id] == undefined) {

        // create a new player and add it to our players object
        players[socket.id] = {
          username: "",
          team: "blue",

          health: 100,
          maxHealth: 100,

          width: 48,
          height: 48,
          radius: 24,

          rotation: 0,
          x: Math.floor(Math.random() * SETTINGS.GAME.WIDTH),
          y: Math.floor(Math.random() * SETTINGS.GAME.HEIGHT),
          playerId: socket.id,
          speed: 2,
          originalSpeed: 2,
          isMoving: false,

          //spells
          q: {
            type: '',
            cooldown: 0,
            cooldownRemaining: 0,
          },
          w: {
            type: '',
            cooldown: 0,
            cooldownRemaining: 0,
          },
          e: {
            type: '',
            cooldown: 0,
            cooldownRemaining: 0,
          },
          r: {
            type: '',
            cooldown: 0,
            cooldownRemaining: 0,
          },

          xMoveTo: this.x,
          yMoveTo: this.y,
          //team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'

          //special
          isFrozen: false,
          frozenDuration: 0,
          damageReduction: 0,

          kills: 0,
          deaths: 0


        };

        players[socket.id].username = data.username;

        //set spell type
        players[socket.id].q.type = data.q;
        players[socket.id].w.type = data.w;
        players[socket.id].e.type = data.e;
        players[socket.id].r.type = data.r;

        //set Team
        players[socket.id].team = data.team;

        //set cooldown
        players[socket.id].q.cooldown = spells[data.q].cooldown;
        players[socket.id].w.cooldown = spells[data.w].cooldown;
        players[socket.id].e.cooldown = spells[data.e].cooldown;
        players[socket.id].r.cooldown = spells[data.r].cooldown;

        // send the players object to the new player
        socket.emit('currentPlayers', players);
        // update all other players of the new player
        socket.broadcast.emit('newPlayer', players[socket.id]);

      }

    });

    socket.on('playerMove', function (data) {

      players[socket.id].isMoving = true;

      //update xMoveTo and yMoveTo of players
      players[socket.id].xMoveTo = data.x;
      players[socket.id].yMoveTo = data.y;

    });

    socket.on('castSpell', function (data) {
      data.id = socket.id;

      if(data.key == 'q' || data.key == 'w' || data.key == 'e' || data.key == 'r') {
        if(players[socket.id][data.key].cooldownRemaining <= 0) {

          //run the function associated with the q spell
          spells[players[socket.id][data.key].type].onCast(data);

          //set cooldown
          players[socket.id][data.key].cooldownRemaining = players[socket.id][data.key].cooldown * SETTINGS.TICK;
        }
      }

    });


  });
});

//UPDATE THE FUCKING GAME
function updateGame() {
  //run for each player
  Object.keys(players).forEach(function(id) {
    var x = players[id].x,
        y = players[id].y,
        xMoveTo = players[id].xMoveTo,
        yMoveTo = players[id].yMoveTo,
        speed = players[id].speed,
        angle = getAngleFromPoints(x, y, xMoveTo, yMoveTo);

    //update x and y if xMoveTo and yMoveTo differ from its x and y values AND if he actually wants to move
    if( Math.abs(xMoveTo - x) > speed && players[id].isMoving) {
      var change = getPositionChange(angle, speed);

      players[id].x += change.x;
      players[id].y += change.y;

      players[id].rotation = angle;
    } else {
      //the player has reached his destination!
      players[id].isMoving = false;
    }

    //regen health
    if(players[id].health < players[id].maxHealth) {
      players[id].health += SETTINGS.HEALTH_REGEN;
    }

    //return player in Bounds if out of Bounds
    if( isOutOfBounds(players[id].x, players[id].y) ) {
      returnObjectInBounds(id, players[id].x, players[id].y);
    }

  });

  //update all projectiles
  Object.keys(projectiles).forEach(function(id) {
    var x = projectiles[id].x,
        y = projectiles[id].y,
        xTo = projectiles[id].xTo,
        yTo = projectiles[id].yTo,
        speed = projectiles[id].speed,
        angle = projectiles[id].angle;

    //check if the projectile has an update function, then run that function if true.
    if('update' in projectiles[id]) {
      projectiles[id].update();
    }

    change = getPositionChange(angle, speed);
    projectiles[id].x += change.x;
    projectiles[id].y += change.y;

    if(projectiles[id].timeAlive >= projectiles[id].maxTime ) {
      projectiles[id].isDead = true;
      //check if the projectile has a death function, then run that function if true.
      if('onDestroy' in projectiles[id]) {
        projectiles[id].onDestroy();
      }
    }

    if(projectiles[id].timeAlive >= 1) {
      projectiles[id].isJustCreated = false;
    }

    projectiles[id].timeAlive += 1;

  });

  //check collisions for each projectile and player
  Object.keys(projectiles).forEach(function(id) {
    Object.keys(players).forEach(function(id2) {
      var x1 = projectiles[id].x,
          y1 = projectiles[id].y,
          x2 = players[id2].x,
          y2 = players[id2].y,
          radius1 = projectiles[id].radius,
          radius2 = players[id2].radius;

      //IF THE TWO CIRCLES ARE TOUCHING (but is not the owner) AND if the bullet does damage to others AND if not dead AND if the team is not the same team
      if(getDistanceFromPoints(x1, y1, x2, y2) <= (radius1 + radius2) &&
      projectiles[id].owner != players[id2].playerId &&
      projectiles[id].doesDamage &&
      !projectiles[id].isDead &&
      projectiles[id].team != players[id2].team) {
        players[id2].health -= (projectiles[id].damage - projectiles[id].damage * players[id2].damageReduction ); //subtract damage from health, and include damage reduction as well

        //apply onhit affects
        if('onHit' in projectiles[id]) {
          projectiles[id].onHit( players[id2] );
        }

        //check if player died
        if(players[id2].health <= 0) {
          players[id2].health = players[id2].maxHealth;
          players[id2].x = Math.floor(Math.random() * SETTINGS.GAME.WIDTH);
          players[id2].y = Math.floor(Math.random() * SETTINGS.GAME.HEIGHT);
          players[id2].xMoveTo = players[id2].x;
          players[id2].yMoveTo = players[id2].y;

          players[id2].deaths += 1;

          players[ projectiles[id].owner ].kills += 1;

        }

        //check if the projectile has a death function, then run that function if true.
        if('onDestroy' in projectiles[id]) {
          projectiles[id].onDestroy();
        }

        projectiles[id].isDead = true;
      }

    });
  });

  //then send all data to EVERYBODY
  io.emit("updatePlayers", players);
  io.emit("updateProjectiles", projectiles);

  //delete projectiles that are dead
  projectiles = projectiles.filter(function( obj ) {
    return obj.isDead == false;
  });

  //increment variables such as cooldown and frozenDuration
  Object.keys(players).forEach(function(id) {

    //if dude is frozen, subtract one from forzen duration. then free him if frozen duration = 0
    if(players[id].isFrozen) {
      players[id].frozenDuration--;

      if(players[id].frozenDuration <= 0) {
        players[id].isFrozen = false;
        players[id].speed = players[id].originalSpeed;
      }
    }

    //cooldowns
    if(players[id].q.cooldownRemaining > 0 ) {
      players[id].q.cooldownRemaining--;
    }
    if(players[id].w.cooldownRemaining > 0 ) {
      players[id].w.cooldownRemaining--;
    }
    if(players[id].e.cooldownRemaining > 0 ) {
      players[id].e.cooldownRemaining--;
    }
    if(players[id].r.cooldownRemaining > 0 ) {
      players[id].r.cooldownRemaining--;
    }
  });

}
setInterval(updateGame, 1000/SETTINGS.TICK); //runs the function (tick) times per second

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

function isOutOfBounds(x, y) {
  //return if given position is not in game room
  return ( x < 0 || y < 0 || x > SETTINGS.GAME.WIDTH || y > SETTINGS.GAME.HEIGHT ) ? true : false;
}

//get position if a position is out of bounds
function returnObjectInBounds(playerId, x, y) {
  var xResultant = x, yResultant = y;

  if( x < 0 ) xResultant = 0;
  if( y < 0 ) yResultant = 0;
  if( x > SETTINGS.GAME.WIDTH ) xResultant = SETTINGS.GAME.WIDTH;
  if( y > SETTINGS.GAME.HEIGHT ) yResultant = SETTINGS.GAME.HEIGHT;

  players[playerId].x = xResultant;
  players[playerId].y = yResultant;
}
