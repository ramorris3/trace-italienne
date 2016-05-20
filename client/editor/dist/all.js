var app = angular.module('EditorApp', ['ui.router'])

// ui-router configuration
.config(function($stateProvider, $urlRouterProvider) {

  $urlRouterProvider.otherwise('/level');

  $stateProvider
    .state('level', {
      url: '/level',
      templateUrl: 'components/level-editor/levels.html',
      controller: 'LevelController'
    })
    .state('enemy', {
      url: '/enemy',
      templateUrl: 'components/enemy-editor/enemies.html',
      controller: 'EnemyController'
    });
})

/* 
  File reader for image processing.
  Code credit: http://odetocode.com/blogs/scott/archive/2013/07/03/building-a-filereader-service-for-angularjs-the-service.aspx
*/
.factory('FileReader', [
  '$q', '$log',
  function($q, $log) {

    var onLoad = function(reader, deferred, scope) {
      return function() {
        scope.$apply(function() {
          deferred.resolve(reader.result);
        });
      };
    };

    var onError = function(reader, deferred, scope) {
      return function() {
        scope.$apply(function() {
          deferred.reject(reader.result);
        });
      };
    };

    var onProgress = function(reader, scope) {
      return function(event) {
        scope.$broadcast('fileProgress',
          {
            total: event.total,
            loaded: event.loaded
          });
      };
    };

    var getReader = function(deferred, scope) {
      var reader = new FileReader();
      reader.onload = onLoad(reader, deferred, scope);
      reader.onerror = onError(reader, deferred, scope);
      reader.onprogress = onProgress(reader, scope);
      return reader;
    };

    var readAsDataUrl = function(file, scope) {
      var deferred = $q.defer();

      var reader = getReader(deferred, scope);
      reader.readAsDataURL(file);

      return deferred.promise;
    };

    return {
      readAsDataUrl: readAsDataUrl
    };
  }
]);

app.service('MessageService',
  function() {

    var colors = {
      RED: '#E50000',
      GREEN: '#198C19'
    };

    var flashMessage = {
      visible: false,
      message: '',
      color: colors.GREEN
    };

    this.setFlashMessage = function(message, isBad) {
      flashMessage.message = message;
      flashMessage.color = isBad ? colors.RED : colors.GREEN;
      flashMessage.visible = true; // whenever flashmessage is updated, show it
    };

    this.getFlashMessage = function() {
      return flashMessage;
    };

    this.hideFlashMessage = function() {
      flashMessage.visible = false;
    };
  });
// This service handles all "save" requests to the API
app.service('SaveService', [
  '$http', 'MessageService',
  function($http, MessageService) {

    this.saveLevel = function(filename, level, data) {
      // request to server to save the level data
      $http.post('api/save/stage', { 'filename': filename, 'level': level, 'data': data })
        .success(function(data) {
          MessageService.setFlashMessage(data.message, false);
        })
        .error(function(data) {
          MessageService.setFlashMessage(data.message, true);
        });
    };

    this.saveEnemy = function(enemyData, callback) {
      // save the image...
      $http.post('api/save/img', enemyData)
        .success(function(data) {
          MessageService.setFlashMessage(data.message, false);
          callback(data);
        })
        .error(function(data) {
          MessageService.setFlashMessage(data.message, true);
        });
    };

  }
]);
app.controller('EnemyController',
  ['$http', '$scope', 'FileReader', 'SaveService', 
  function($http, $scope, FileReader, SaveService) {

    //////////////////
    // INITIAL VARS //
    //////////////////

    $scope.enemyData = {
      imgSrc: null
    };


    ////////////////////////////
    // EDITOR DEF AND METHODS //
    ////////////////////////////

    var editor = new Phaser.Game(1000, 500, Phaser.CANVAS, 'enemy-frame', {preload: preload, create: create, update: update});

    function preload() {
      editor.load.image('floor', 'assets/editor_floor.png');

      if ($scope.enemyData.imgSrc) {
        editor.load.image('enemy', $scope.enemyData.imgSrc);
        $scope.enemyData.preloaded = true;
      }
    }

    /////////////////
    // EDITOR VARS //
    /////////////////

    var enemy;

    function create() {
      // lay tiles
      editor.add.tileSprite(0, 0, editor.width, editor.height, 'floor');

      // init enemy if one has been uploaded
      if ($scope.enemyData.preloaded) {
        enemy = editor.add.sprite(editor.world.centerX, editor.world.centerY, 'enemy');
        enemy.xSpeed = 3;
        enemy.ySpeed = 3;
      }
    }

    function update() {
      if (enemy) {
        // move enemy
        enemy.x += enemy.xSpeed;
        enemy.y += enemy.ySpeed;

        // keep enemy inside editor
        if (enemy.x < 0) {
          enemy.xSpeed *= -1;
          enemy.x = 0;
        } else if (enemy.x > editor.width - enemy.width) {
          enemy.xSpeed *= -1;
          enemy.x = editor.width - enemy.width;
        }

        if (enemy.y < 0) {
          enemy.ySpeed *= -1;
          enemy.y = 0;
        } else if (enemy.y > editor.height - enemy.height) {
          enemy.ySpeed *= -1;
          enemy.y = editor.height - enemy.height;
        }
      }
    }


    //////////////////
    // VIEW METHODS //
    //////////////////

    // loads a preview of the sprite file before saving
    $scope.getFile = function() {
      $scope.progress = 0;
      FileReader.readAsDataUrl($scope.file, $scope)
        .then(function(result) {
          $scope.previewSrc = $scope.enemyData.img = result;
        });
    };

    // saves the enemy
    $scope.saveEnemy = function() {
      // send enemyobject to EnemyService to save
      console.log($scope.enemyData.img);
      SaveService.saveEnemy($scope.enemyData, function(data) {
        $scope.enemyData.imgSrc = data.src;
        $scope.src = data.src;
        reloadEditorState();
      });
    };

    // cancels the save
    $scope.cancelSave = function() {
      var really = confirm('Are you sure you want to cancel?  Settings will revert to their default state.');
      if (really) {
        resetToDefault();
      }
    };


    //////////////////////////
    // OTHER HELPER METHODS //
    //////////////////////////

    function reloadEditorState() {
      $scope.enemyData.preloaded = false;
      enemy = null;
      editor.state.start(editor.state.current);
    }

    function resetToDefault() {
      $scope.enemyData = {
        preloaded: false
      };
      reloadEditorState();
    }

  }
])

/* 
  Directive for file uploads
  Credit: http://plnkr.co/edit/y5n16v?p=preview
*/
.directive('ngFileSelect', function() {
  return {
    link: function($scope, el) {
      el.bind('change', function(e){
        $scope.file = (e.srcElement || e.target).files[0];
        $scope.getFile();
      });
    }
  };
});

app.controller('MessageController', [
  '$scope', 'MessageService', 
  function($scope, MessageService){
    $scope.getFlashMessage = MessageService.getFlashMessage;
    $scope.hideFlashMessage = MessageService.hideFlashMessage;
  }
]);

app.directive('tiMessage', function() {
  return {
    restrict: 'E', 
    templateUrl: 'components/flash-message/message.html',
    controller: 'MessageController'
  };
});
app.controller('LevelController', 
  ['$http', '$scope', 'SaveService',
  function($http, $scope, SaveService) {

    //////////////////
    // INITIAL VARS //
    //////////////////

    var self = this;

    $scope.enemies = [
      {
        name: 'Chomper',
        description: 'Can\'t deal damage, but they slow on contact.'
      },
      {
        name: 'Charger',
        description: 'Temperamental enemies who will charge when in range.'
      },
      {
        name: 'Rook',
        description: 'Sharpshooters who deal damage from a distance.'
      }
    ];

    $scope.currentEnemy = $scope.enemies[0];


    //////////////////////////////
    // EDITOR DEF AND FUNCTIONS //
    //////////////////////////////

    var editor = new Phaser.Game(1000, 500, Phaser.CANVAS, 'level-frame', {preload: preload, create: create, update: update}); 

    function preload() {
      // background
      editor.load.image('floor', 'assets/editor_floor.png');

      // GUI elements
      editor.load.image('highlight', 'assets/highlight.png');
      editor.load.image('cursor', 'assets/cursor.png');
      editor.load.image('stageRight', 'assets/stage_right.png');
      editor.load.image('stageLeft', 'assets/stage_left.png');
      editor.load.bitmapFont('carrier_command', 'assets/carrier_command.png', 'assets/carrier_command.xml');

      // enemies
      editor.load.spritesheet('chomper', 'assets/chomper_2.png', 24, 36);
    }

    // editor vars
    var highlight;
    var cursor;
    var stageRight;
    var stageLeft;
    self.grid = [];
    var tileSize = 50;
    var prevMouseDown = false;
    var filename;
    var level;
    var viewFrame = 0;
    var maxFrames = 20;
    var frameText;

    function create() {
      // init world
      editor.world.setBounds(0, 0, editor.width * maxFrames, editor.height);
      editor.add.tileSprite(0, 0, editor.width * maxFrames, editor.height, 'floor');

      // init grid
      for (i = 0; i < editor.width * maxFrames; i += tileSize) {
        var list = [];
        for (j = 0; j < editor.height; j += tileSize) {
          list.push('0');
        }
        self.grid.push(list);
      }

      // init GUI elements
      highlight = editor.add.sprite(0, 0, 'highlight');
      stageLeft = editor.add.sprite(8, editor.world.centerY - 16, 'stageLeft');
      stageRight = editor.add.sprite(editor.width - 40, editor.world.centerY - 16, 'stageRight');
      cursor = editor.add.sprite(editor.world.centerX, editor.world.centerY, 'cursor');
      stageLeft.fixedToCamera = true;
      stageRight.fixedToCamera = true;
      cursor.fixedToCamera = true;

      editor.physics.enable(cursor, Phaser.Physics.ARCADE);
      editor.physics.enable(stageRight, Phaser.Physics.ARCADE);
      editor.physics.enable(stageLeft, Phaser.Physics.ARCADE);

      // init HUD text
      frameText = editor.add.bitmapText(10, 10, 'carrier_command', 'FRAME: ' + viewFrame + '/' + maxFrames, 20);
      frameText.fixedToCamera = true;

    }

    function update() {

      // update the camera position
      if (editor.camera.x < viewFrame * editor.width) {
        editor.camera.x += 20;
      } else if (editor.camera.x > viewFrame * editor.width) {
        editor.camera.x -= 20;
      }

      // update mouse cursor position
      cursor.cameraOffset.x = editor.input.mousePointer.x;
      cursor.cameraOffset.y = editor.input.mousePointer.y;

      // update gridLocation and visibility of grid highlight
      updateHighlight();

      // update the GUI sprites and functionality based on hover
      // default
      cursor.clickAction = function() {
        placeCreature();
      };

      // if done scrolling, show highlight again
      if (!highlight.alive && editor.camera.x == viewFrame * editor.width) {
        highlight.revive();
      }

      // hovering over right-arrow
      editor.physics.arcade.overlap(cursor, stageRight, function() {
        highlight.kill(); // hide highlight
        cursor.clickAction = function() {
          scrollRight();
        };
      });

      // hovering over left-arrow
      editor.physics.arcade.overlap(cursor, stageLeft, function() {
        highlight.kill(); // hide highlight
        cursor.clickAction = function() {
          scrollLeft();
        };
      });

      // check if the player released the mouse click button
      if (editor.input.activePointer.isDown) {
        prevMouseDown = true;
      }
      else if (prevMouseDown) { // mouse was down but is not anymore
        prevMouseDown = false;
        cursor.clickAction();
      }

    }

    ///////////////////////////
    // EDITOR HELPER METHODS //
    ///////////////////////////

    function getGridLocation(cartX, cartY) {
      return {
        x: Math.floor(cartX / tileSize),
        y: Math.floor(cartY / tileSize)
      };
    }

    // moves the highlight to the gridlocation where mouse is
    function updateHighlight() {
      hGridLoc = getGridLocation(highlight.x, highlight.y);
      cGridLoc = getGridLocation(cursor.x, cursor.y);
      if (hGridLoc.x != cGridLoc.x || hGridLoc.y != cGridLoc.y) {
        highlight.x = cGridLoc.x * tileSize;
        highlight.y = cGridLoc.y * tileSize;
      }

      // keep highlight in view
      if (highlight.x < editor.camera.x) {
        highlight.x = editor.camera.x;
      } else if (highlight.x > editor.camera.x + editor.camera.width - tileSize) {
        highlight.x = editor.camera.x + editor.camera.width - tileSize;
      }
      if (highlight.y < 0) { // camera only moves horizontally
        highlight.y = 0;
      } else if (highlight.y > editor.height - tileSize) {
        highlight.y = editor.height - tileSize;
      }
    }

    // places a creature at the current highlight gridloc
    function placeCreature() {
      if (!highlight.alive) return;
      gridLoc = getGridLocation(highlight.x, highlight.y);
      if (self.grid[gridLoc.x][gridLoc.y] === '0') {
        // place chomper on grid model
        self.grid[gridLoc.x][gridLoc.y] = 'Z';

        // place chomper on GUI at center of highlight
        var creature = editor.add.sprite(gridLoc.x * tileSize, gridLoc.y * tileSize, 'chomper');
        // center chomper
        creature.x = (gridLoc.x * tileSize) + (highlight.width / 2) - (creature.width / 2);
        creature.y = (gridLoc.y * tileSize) + (highlight.height / 2) - (creature.height / 2);
        // play chomper animation
        creature.animations.add('chomp', [0,1,2,3,4,5], 10, true);
        creature.animations.play('chomp');
      }
    }

    function scrollRight() {
      viewFrame++;
      if (viewFrame > maxFrames) {
        viewFrame = maxFrames;
      }
      frameText.text = 'FRAME: ' + viewFrame + '/' + maxFrames;
    }
    function scrollLeft() {
      viewFrame--;
      if (viewFrame < 0) {
        viewFrame = 0;
      }
      frameText.text = 'FRAME: ' + viewFrame + '/' + maxFrames;
    }


    //////////////////
    // VIEW METHODS //
    //////////////////

    // saves the grid to a .json file
    $scope.saveLevel = function() {
      // get filename and level number
      if (!filename) {
        filename = prompt('What do you want to name the file? (Exclude file extension.)');

        // don't save if no filename given
        if (!filename) {
          alert('File was not saved.');
          return;
        }

        filename = filename.replace(/\W/g, '');
        if (filename === '') {
          alert('You must include at least one alphanumeric character in the filename.  File was not saved.');
          return;
        }

        filename += '.json';
        level = prompt('What level will this be (int)?');
        // don't save if level is invalid
        if (isNaN(level) || level === null) {
          alert('Must enter integer for level number.  File not saved.');
          return;
        }
      }

      // save the level
      SaveService.saveLevel(filename, level, self.grid);
    };

    $scope.cancelSave = function() {
      var really = confirm('Are you sure you want to cancel?  The level will reset to a default empty level.');
      if (really) {

      }
    };

    //////////////////////////
    // OTHER HELPER METHODS //
    //////////////////////////

    function initGrid() {
      for (i = 0; i < editor.width * maxFrames; i += tileSize) {
        var list = [];
        for (j = 0; j < editor.height; j += tileSize) {
          list.push('0');
        }
        self.grid.push(list);
      }
    }

    function reloadEditorState() {
      editor.state.start(editor.state.current);
    }

    function resetLevel() {
      initGrid();
      reloadEditorState();
    }

  }
]);