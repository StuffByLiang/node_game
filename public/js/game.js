//set cookies if not set yet
if(Cookies.get('q') == undefined) {
  Cookies.set('team', "blue");
  Cookies.set('q', "bullet");
  Cookies.set('w', "freeze");
  Cookies.set('e', "flash");
  Cookies.set('r', "rocket");
}

var SETTINGS = {
  TICK: 60,
  GAME: {
    WIDTH: 2400,
    HEIGHT: 1440
  }
}

var config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: $(window).width(),
  height: $(window).height() - $('#cooldowns').outerHeight(),
  backgroundColor: '#808080',
  physics: {
    default: 'arcade',
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

// //on resize
// $(window).resize(function() {
//   game.resize($(window).width(), $(window).height() - $('#cooldowns').outerHeight());
// });

var game, username;

//start game if username cookie is already set
if(Cookies.get('username') !== undefined) {
  username = Cookies.get('username');
  startGame();
}

//detect enter press when inputting username
$('#usernameInput').keypress(function (e) {
  if (e.which == 13) {
    //if not empty
    if($('#usernameInput').val() != ""){
      username = $('#usernameInput').val();
      Cookies.set('username', username);
      startGame();
    }
    return false;
  }
});

function startGame() {
  $('.login').fadeOut();
  game = new Phaser.Game(config);
}

function preload() {
  this.load.image('player', 'assets/player.png');
  this.load.image('projectile', 'assets/projectile.png');
  this.load.image('grass', 'assets/grass.jpg');
}

var socket, gameObject;

function create() {
  var self = this;
  gameObject = this;

  this.projectiles = this.physics.add.group();
  this.otherPlayers = this.physics.add.group();
  this.playerMisc = this.physics.add.group(); //healthbars, names

  this.physics.world.setBounds(0, 0, 1200*2, 720*2);
  this.cameras.main.setBounds(0, 0, 1200*2, 720*2);

  this.background = this.add.tileSprite(0, 0, SETTINGS.GAME.WIDTH, SETTINGS.GAME.HEIGHT, "grass").setOrigin(0, 0); //set background

  //minimap
  this.minimap = this.cameras.add(0, 0, SETTINGS.GAME.WIDTH/9, SETTINGS.GAME.HEIGHT/9).setOrigin(0).setZoom(1/9).setName('mini').ignore(this.background).ignore( this.projectiles ).ignore( this.playerMisc );


  socket = io();

  socket.emit('userData', {username: username,
                           team: Cookies.get('team'),
                           q: Cookies.get('q'),
                           w: Cookies.get('w'),
                           e: Cookies.get('e'),
                           r: Cookies.get('r') });

  //this is recieved when the client is first connected to the server.
  socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });

  //add a new player object when a player has joined
  socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });

  socket.on('disconnect', function (playerId) {
    //destroy the player object that has disconnected
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.healthBar.destroy();
        otherPlayer.nameText.destroy();
        otherPlayer.destroy();
      }
    });
  });

  socket.on('updatePlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      //if SELF update self otherwise update another player
      if (players[id].playerId === socket.id) {
        self.player.setRotation(players[id].rotation);
        self.player.setPosition(players[id].x, players[id].y);
        self.player.setDepth(3);

        //update name
        self.player.nameText.setPosition(players[id].x, players[id].y - 48).setText(players[id].username + " " + players[id].kills + "/" + players[id].deaths);

        //update health
        self.player.health = players[id].health;
        self.player.healthBar.setPosition(players[id].x, players[id].y - 32);
        self.player.healthBar.setSize(64 * (self.player.health/self.player.maxHealth) , 12);

        //canera follow player
        self.cameras.main.startFollow(self.player, true);

        //update cooldowns
        players[id].q.cooldownRemaining > SETTINGS.TICK ? $('#q').html("Q: " + Math.ceil(players[id].q.cooldownRemaining/SETTINGS.TICK).toFixed(1) ) : $('#q').html("Q: " + (players[id].q.cooldownRemaining/SETTINGS.TICK).toFixed(1) )
        players[id].w.cooldownRemaining > SETTINGS.TICK ? $('#w').html("W: " + Math.ceil(players[id].w.cooldownRemaining/SETTINGS.TICK).toFixed(1) ) : $('#w').html("W: " + (players[id].w.cooldownRemaining/SETTINGS.TICK).toFixed(1) )
        players[id].e.cooldownRemaining > SETTINGS.TICK ? $('#e').html("E: " + Math.ceil(players[id].e.cooldownRemaining/SETTINGS.TICK).toFixed(1) ) : $('#e').html("E: " + (players[id].e.cooldownRemaining/SETTINGS.TICK).toFixed(1) )
        players[id].r.cooldownRemaining > SETTINGS.TICK ? $('#r').html("R: " + Math.ceil(players[id].r.cooldownRemaining/SETTINGS.TICK).toFixed(1) ) : $('#r').html("R: " + (players[id].r.cooldownRemaining/SETTINGS.TICK).toFixed(1) )

      } else {

        //check against every other player
        for( otherPlayer of self.otherPlayers.getChildren() ) {
          if (players[id].playerId === otherPlayer.playerId) {
            otherPlayer.setRotation(players[id].rotation);
            otherPlayer.setPosition(players[id].x, players[id].y);

            //update name
            otherPlayer.nameText.setPosition(players[id].x, players[id].y - 48).setText(players[id].username + " " + players[id].kills + "/" + players[id].deaths);

            //update health
            otherPlayer.health = players[id].health;
            otherPlayer.healthBar.setPosition(players[id].x, players[id].y - 32);
            otherPlayer.healthBar.setSize(64 * (otherPlayer.health/otherPlayer.maxHealth) , 12);
            break;
          }
        }

      }
    });
  });

  socket.on('updateProjectiles', function (projectileData) {
    Object.keys(projectileData).forEach(function (id) {
      //if its just created, create an object in the game canvas. else update the projectile.
      if(projectileData[id].isJustCreated) {
        addProjectile(self, projectileData[id]);

        //somehow they fucking die so i have to add this (delete it if they die)
        if(projectileData[id].isDead) {
          index = Object.keys( self.projectiles.getChildren() ).find(x => self.projectiles.getChildren()[x].id == projectileData[id].id);
          self.projectiles.getChildren()[index].destroy();
        }
      } else {
        //check against every projectile if they have died
        for( projectile of self.projectiles.getChildren() ) {
          if (projectile.id === projectileData[id].id) {
            //if isDead, destroy Object
            if(projectileData[id].isDead) {
              projectile.destroy();
            } else {
              //not dead
              projectile.setPosition(projectileData[id].x, projectileData[id].y);
            }

            //check if radius is different, and if it is, change the radius,
            if(projectile.radius != projectileData[id].radius) {
              projectile.setDisplaySize(projectileData[id].radius*2, projectileData[id].radius*2); //change radius of the projectile in game
            }
            break;
          }
        }
      }

    });
  });
}

//detect right click/movement
$('body').on('contextmenu', 'canvas', function(e){
  mouse = getMousePosition();

  //console.log(x, y);
  socket.emit('playerMove', { x: mouse.x, y: mouse.y } );

  return false;
});

$( "body" ).keypress(function(e) {
  //letter q
  if(e.which == 81 || e.which == 113) {
    mouse = getMousePosition();

    //console.log("q pressed", x, y);
    socket.emit("castSpell", { id: socket.id, x: mouse.x, y: mouse.y, key: 'q' } );
  }

  //letter w
  if(e.which == 87 || e.which == 119) {
    mouse = getMousePosition();

    //console.log("q pressed", x, y);
    socket.emit("castSpell", { id: socket.id, x: mouse.x, y: mouse.y, key: 'w' } );
  }

  //letter e
  if(e.which == 69 || e.which == 101) {
    mouse = getMousePosition();

    //console.log("q pressed", x, y);
    socket.emit("castSpell", { id: socket.id, x: mouse.x, y: mouse.y, key: 'e' } );
  }

  //letter r ULTIMATE FUCKING BULLET
  if(e.which == 82 || e.which == 114) {
    mouse = getMousePosition();

    //console.log("q pressed", x, y);
    socket.emit("castSpell", { id: socket.id, x: mouse.x, y: mouse.y, key: 'r' } );
  }

  //letter s FOR STOP
  if(e.which == 83 || e.which == 115) {
    var x = gameObject.player.x,
        y = gameObject.player.y;
    //console.log("q pressed", x, y);
    socket.emit('playerMove', { x: x, y: y } );
  }

});

function update() {}

function addPlayer(self, playerInfo) {
  self.player = self.add.image(playerInfo.x, playerInfo.y, 'player').setOrigin(0.5, 0.5).setDisplaySize(48, 48);

  switch(Cookies.get("team")) {
    case "blue":
      self.player.setTint(0x0000ff);
      break;
    case "red":
      self.player.setTint(0xff0000);
      break
    case "orange":
      self.player.setTint(0xffa500);
      break;
    case "yellow":
      self.player.setTint(0xffff00);
      break;
    case "green":
      self.player.setTint(0x00ff00);
      break;
    case "purple":
      self.player.setTint(0x800080);
  }

  //copy playerInfo data to self.player
  for( i in playerInfo ) {
    self.player[i] = playerInfo[i];
  }

  self.player.healthBar = self.add.rectangle(playerInfo.x, playerInfo.y - 32, 64 * (self.player.health/self.player.maxHealth), 12, 0x00ff00, 0.9).setOrigin(0.5, 0.5).setDepth(3);
  self.player.nameText = self.add.text(playerInfo.x, playerInfo.y - 48, username, {
    align: 'center',
    fontFamily: 'sans-serif',
    color: "#ffffff",
    fontSize: '18px'
  }).setOrigin(0.5, 0.5).setDepth(3);

  self.playerMisc.add(self.player.nameText).add(self.player.healthBar);
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'player').setOrigin(0.5, 0.5).setDisplaySize(48, 48).setDepth(2);

  switch(playerInfo.team) {
    case "blue":
      self.player.setTint(0x0000ff);
      break;
    case "red":
      self.player.setTint(0xff0000);
      break;
    case "orange":
      self.player.setTint(0xffa500);
      break;
    case "yellow":
      self.player.setTint(0xffff00);
      break;
    case "green":
      self.player.setTint(0x00ff00);
      break;
    case "purple":
      self.player.setTint(0x800080);
  }

  otherPlayer.playerId = playerInfo.playerId;
  otherPlayer.health = playerInfo.health;
  otherPlayer.maxHealth = playerInfo.maxHealth;

  otherPlayer.healthBar = self.add.rectangle(playerInfo.x, playerInfo.y - 32, 64 * (otherPlayer.health/otherPlayer.maxHealth), 12, 0x00ff00, 0.9).setOrigin(0.5, 0.5).setDepth(2);

  otherPlayer.nameText = self.add.text(playerInfo.x, playerInfo.y - 48, playerInfo.username, {
    align: 'center',
    fontFamily: 'sans-serif',
    color: "#ffffff",
    fontSize: '18px'
  }).setOrigin(0.5, 0.5).setDepth(2);

  self.playerMisc.add(otherPlayer.nameText).add(otherPlayer.healthBar);

  self.otherPlayers.add(otherPlayer);

}

function addProjectile(self, projectileInfo) {
  const projectile = self.add.sprite(projectileInfo.x, projectileInfo.y, 'projectile').setOrigin(0.5, 0.5).setDepth(1);

  projectile.setDisplaySize(projectileInfo.radius*2, projectileInfo.radius*2);

  if(projectileInfo.tint !== undefined) {
    projectile.setTint( projectileInfo.tint );
  }

  //get all properties of the projectile and put into projectiles
  for( i in projectileInfo ) {
    projectile[i] = projectileInfo[i];
  }

  self.projectiles.add(projectile);
}

function getMousePosition() {
  var x = game.input.mousePointer.x, //x relative to camera
      y = game.input.mousePointer.y,
      mouse = gameObject.cameras.main.getWorldPoint(x, y) //y relative to camera

  //console.log(x, y, gameObject.cameras.main._scrollX, gameObject.cameras.main._scrollY, mouse);

  //fix a bug with phaser camera near bounds
  if(mouse.x <= x) mouse.x = x;
  if(mouse.y <= y) mouse.y = y;
  if(gameObject.cameras.main._scrollX > SETTINGS.GAME.WIDTH - gameObject.cameras.main.width) mouse.x = x + SETTINGS.GAME.WIDTH - gameObject.cameras.main.width;
  if(gameObject.cameras.main._scrollY > SETTINGS.GAME.HEIGHT - gameObject.cameras.main.height) mouse.y = y + SETTINGS.GAME.HEIGHT - gameObject.cameras.main.height;

  //console.log(x, y, gameObject.cameras.main._scrollX, gameObject.cameras.main._scrollY, mouse);

  return mouse
}
