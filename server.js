///////////////////
// SERVER CONFIG //
///////////////////

var express = require('express');
var path = require('path');
var app = express();
var bodyParser = require('body-parser');
var fs = require('fs'); // for writing to files

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/editor', express.static('client/editor'));
app.use('/', express.static('client/game'));

///////////////////
// API ENDPOINTS //
///////////////////

var router = express.Router(); 

/* function for testing API */
router.get('/test', function(req, res) {
  res.send('<p>Hooray!  API is working!</p>\
    <style>body, html {padding: 20px;text-align: center; font-family: sans-serif; font-weight: 300; font-size: 48px;}</style>');
});

/* POST a level.json file to the "stages" folder */
router.post('/save/stage', function(req, res) {
  var newLevel = req.body;

  // get the filepath
  var filepath = 'models/stages.json';
  console.log('reading stages from ' + filepath + '...');

  // get existing levels data
  fs.readFile(filepath, function(err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send({message: 'There was a problem reading the existing stages data.'});
    }
    console.log('\nLevel data retrieved.  Adding new level...\n');
    var allLevels = JSON.parse(data);
    if (typeof allLevels !== 'object') {
      console.log('\nERROR: \'allLevels\' is not valid JSON.\n');
      return res.status(500).send({message: 'Existing level data is corrupt.  Level not saved.'});
    }
    allLevels[newLevel.number] = newLevel;
    // write new model to file
    fs.writeFile(filepath, JSON.stringify(allLevels, null, 2), function(err) {
      if (err) {
        console.log(err);
        res.status(500).send({message: 'Something went wrong while trying to save the level.  Level not saved.'});
      }
      console.log('\nLevel was saved successfully!\n');
      return res.status(200).send({message: '"Level ' + newLevel.number + ': ' + newLevel.title + '" was saved successfully.', allLevelData: allLevels});
    });
  });
});

/* GET all levels from the "models/stages.json" file */
router.get('/stages', function(req, res) {
  // get the filepath
  var filepath = 'models/stages.json';
  console.log('reading stages from ' + filepath + '...');

  // get existing levels data
  fs.readFile(filepath, function(err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send({message: 'There was a problem reading the existing stages data.'});
    }
    console.log('\nLevel data retrieved.  Adding new level...\n');
    var allLevels = JSON.parse(data);
    if (typeof allLevels !== 'object') {
      console.log('\nERROR: \'allLevels\' is not valid JSON.\n');
      return res.status(500).send({message: 'Existing level data is corrupt.  Level not saved.'});
    }
    return res.status(200).send({message: 'Got all levels.', allLevelData: allLevels});
  });
})

/* POST an image to the local server directory "uploads" */
router.post('/save/img', function(req, res) {

  // get base64 encoded image data
  var imgBuffer = decodeBase64Image(req.body.img);
  console.log(imgBuffer);

  // get filepath
  var key = req.body.name;
  var filename = key + '.png';
  var filepath = path.join(__dirname,'uploads/',filename);
  console.log('Writing image to ' + filepath + '...')

  // write to file
  fs.writeFile(filepath, imgBuffer.data, function(err) {
      if(err) {
        console.log(err);
        res.status(500).send({message: 'There was a problem saving the image file.'});
      }
      console.log('\nImage was successfully saved!\n');
      var apiSrc = '../api/uploads/' + filename;
      res.status(200).send({
        message: 'Your asset\'s image was successfully saved to the server!',
        src: apiSrc,
        key: key
      });
    });
});

/* GET an image from "uploads" */
router.get('/uploads/:filename', function(req, res) {

  //get filepath
  filepath = path.join(__dirname,'uploads/',req.params.filename);

  // read file
  console.log('Reading from file ' + filepath + '...');
  fs.readFile(filepath, 'base64',
    function(err, data) {
      if (err) {
        console.log(err);
        res.status(500).send({message: 'Oops!  Looks like there was a problem loading the image from the server.'});
      }

      // make a base64 buffer and write to res
      console.log('\nSuccess! Writing to HTTP response.\n');
      var img = new Buffer(data, 'base64');

      res.writeHead(200, {
       'Content-Type': 'image/png',
       'Content-Length': img.length
      });
      res.end(img);
    });
});

/* GET all asset objects from 'assets.json' file */
router.get('/assets', function(req,res) {

  // get filepath
  filepath = path.join(__dirname,'models/assets.json');

  // read file
  console.log('\nReading asset data from file ' + filepath + '...\n');
  fs.readFile(filepath,
    function(err, data) {
      if (err) {
        console.log(err);
        return res.status(500).send({message: 'There was a problem loading the existing asset data.'});
      }

      console.log('\nGot asset data.  Writing response...\n');
      // get subsection of assets, if requested
      var allAssets = JSON.parse(data);
      if (typeof allAssets !== 'object') {
        console.log('\nERROR: \'assets\' is not valid JSON.\n');
        return res.status(500).send({message: 'Existing asset data is corrupt.  Could not get assets.'});
      }

      return res.status(200).send({message: 'Successfully got asset data.', allAssetData: allAssets});
    });

});

/* POST an asset reference to 'assets.json' file */
router.post('/save/asset', function(req,res) {
  // get new asset data
  var newAsset = req.body;

  // get filepath
  filepath = path.join(__dirname, 'models/assets.json');

  // read file
  console.log('\nReading asset data from file ' + filepath + '...\n');
  fs.readFile(filepath,
    function(err, data) {
      if (err) {
        console.log(err);
        return res.status(500).send({message: 'There was a problem loading existing asset data.'});
      }

      // write the new asset to the file
      console.log('\nGot asset data.  Writing new asset ref...\n');
      var assets = JSON.parse(data);
      if (typeof assets !== 'object') {
        console.log('\nERROR: \'assets\' is not valid JSON.\n');
        return res.status(500).send({message: 'Existing asset data is corrupt.  Asset not saved.'});
      }
      if (!assets[newAsset.type]) {
        assets[newAsset.type] = {};
      }
      assets[newAsset.type][newAsset.name] = newAsset;
      console.log(assets);

      console.log('\nNew asset added.  Writing to file ' + filepath + '...\n');
      fs.writeFile(filepath, JSON.stringify(assets, null, 2), function(err) {
        if (err) {
          console.log(err);
          return res.status(500).send({message: 'There was a problem writing your asset to the file.'});
        }

        console.log('\nAsset data successfully written to ' + filepath + '!\n');
        return res.status(200).send({message: '"' + newAsset.name + '" was successfully saved to the database!', allAssetData: assets});
      });

    });

});

/* GET all players from the 'players.json' file */
router.get('/players', function(req, res) {
  var filepath = path.join(__dirname, 'models/players.json');
  console.log('\nRetrieving players from ' + filepath + '...\n');

  fs.readFile(filepath, function(err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send({message: 'There was a problem retrieving exising player data.'});
    }

    console.log('\nGot player data!  Writing response...\n');
    res.status(200).send({message: 'Successfully got players.', allPlayerData: JSON.parse(data)});
  })
});

/* POST weapon to the 'weapons.json' file */
router.post('/save/weapons', function(req, res) {
  // get weapon data
  var newWeapon = req.body;
  console.log('\nSAVING WEAPON:\n');
  console.log(newWeapon);

  // get filepath
  var filepath = path.join(__dirname,'models/weapons.json');
  console.log('\nReading weapon data from ' + filepath + '...\n');

  // get existing enemyData
  fs.readFile(filepath, function(err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send({message: 'There was a problem retrieving existing weapons data.'});
    }

    // add enemy to existing enemy data
    console.log('\nGot weapons data from ' + filepath + '...\n');
    var weapons = JSON.parse(data);
    if (typeof weapons !== 'object') {
      console.log('\nERROR: \'weapons\' is not a JSON object.\n');
      return res.status(500).send({message: 'Existing weapons data is corrupt.  Weapon not saved.'});
    }

    // insert the weapon into the heirarchy
    try {
      var classGroup =  weapons[newWeapon.class] || {};
      console.log('class:');
      console.log(classGroup);
      var levelGroup = classGroup[newWeapon.level] || {};
      console.log('level:');
      console.log(levelGroup);
      var rareGroup = levelGroup[newWeapon.rarity] || {};
      console.log('rarity:');
      console.log(rareGroup);

      rareGroup[newWeapon.name] = newWeapon;
      levelGroup[newWeapon.rarity] = rareGroup;
      classGroup[newWeapon.level] = levelGroup;
      weapons[newWeapon.class] = classGroup;

      console.log('weaponsData');
      console.log(weapons);


      //weapons[newWeapon.class][newWeapon.level][newWeapon.rarity] = newWeapon;
      //console.log(weapons);
    } catch(err) {
      console.log(err);
      return res.status(500).send({message: 'There was a problem adding your weapon to existing weapons data.'});
    }

    // write enemy data to file
    console.log('\nNew weapon added.  Writing to file ' + filepath + '...\n');
    fs.writeFile(filepath, JSON.stringify(weapons, null, 2), function(err) {
      if (err) {
        console.log(err);
        return res.status(500).send({message: 'There was a problem writing your weapon to the file.'});
      }

      console.log('\nWeapon data successfully written to ' + filepath + '!\n');
      return res.status(200).send({message: '"'+ newWeapon.name + '" was successfully saved to the database!', allWeaponData: weapons});
    });
  });
});

/* GET all weapons from the 'weapons.json' file */
router.get('/weapons', function(req, res) {
  var filepath = path.join(__dirname, 'models/weapons.json');
  console.log('\nRetrieving weapons from ' + filepath + '...\n');

  fs.readFile(filepath, function(err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send({message: 'There was a problem retrieving existing weapons data.'});
    }

    console.log('\nGot weapons data!  Writing response...\n');
    res.status(200).send({message: 'Successfully got weapons.', allWeaponData: JSON.parse(data)});
  });
});

/* GET all enemies from the 'enemies.json' file */
router.get('/enemies', function(req, res) {
  var filepath = path.join(__dirname,'models/enemies.json');
  console.log('\nRetrieving enemies from ' + filepath + '...\n');

  fs.readFile(filepath, function(err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send({message: 'There was a problem retrieving existing enemy data.'});
    }

    console.log('\nGot enemy data!  Writing response...\n');
    res.status(200).send({message: 'Successfully got enemies.', allEnemyData: JSON.parse(data)});
  });
});

/* POST an enemy to the local server file 'enemies' */
router.post('/save/enemies', function(req, res) {
  // get enemy data
  var newEnemy = req.body;
  console.log('\nSAVING ENEMY:\n');
  console.log(newEnemy);

  // get filepath
  var filepath = path.join(__dirname,'models/enemies.json');
  console.log('\nReading enemy data from ' + filepath + '...\n');

  // get existing enemyData
  fs.readFile(filepath, function(err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send({message: 'There was a problem retrieving existing enemy data.'});
    }

    // add enemy to existing enemy data
    console.log('\nGot enemy data from ' + filepath + '...\n');
    var enemies = JSON.parse(data);
    if (typeof enemies !== 'object') {
      console.log('\nERROR: \'Enemies\' is not a JSON object.\n');
      return res.status(500).send({message: 'Existing enemy data is corrupt.  Enemy not saved.'});
    }
    enemies[newEnemy.name] = newEnemy;
    console.log(enemies);

    // write enemy data to file
    console.log('\nNew enemy added.  Writing to file ' + filepath + '...\n');
    fs.writeFile(filepath, JSON.stringify(enemies, null, 2), function(err) {
      if (err) {
        console.log(err);
        return res.status(500).send({message: 'There was a problem writing your enemy to the file.'});
      }

      console.log('\nEnemy data successfully written to ' + filepath + '!\n');
      return res.status(200).send({message: '"'+ newEnemy.name + '" was successfully saved to the database!', allEnemyData: enemies});
    });
  });
});

app.use('/api', router);


//////////////////////
// HELPER FUNCTIONS //
//////////////////////

function guid() {
  var S4 = function() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  };
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

function decodeBase64Image(dataString) {
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
    response = {};

  if (matches.length !== 3) {
    return new Error('Invalid input string');
  }

  response.type = matches[1];
  response.data = new Buffer(matches[2], 'base64');

  return response;
}

////////////////
// RUN SERVER //
////////////////

var port = process.env.PORT || 2000;

app.listen(port, function() {
  console.log('app listening on port ' + port + '...');
});
