var Charger = function(game, x, y, target) {
    Phaser.Sprite.call(this, game, x, y, 'charger');

    this.animations.add('charge', [0,1,2,3], 10, true);
    this.animations.add('stunned', [4,5], 10, true);
    this.smoothed = false;

    // Set the pivot point for this sprite to the center
    this.anchor.setTo(0.5, 0.5);

    //set up damage logic
    this.invincible = false;
    this.flashTimer = 20;
    this.health = 4;

    // Enable physics on this object
    this.game.physics.enable(this, Phaser.Physics.ARCADE);

    // Define constants that affect motion
    this.MAX_SPEED = 100; // pixels/second
    this.MIN_DISTANCE = 4; // pixels

    // Target
    this.target = target;

    // State
    this.currentstate = this.enemyWanderState;
    this.noticeTarget = 500;

};

// Chargers are a type of Phaser.Sprite
Charger.prototype = Object.create(Phaser.Sprite.prototype);
Charger.prototype.constructor = Charger;

Charger.prototype.update = function() {
    //Check if offscreen and destroy
    if (this.x < -this.width){
        this.destroy();
        return;
    }
    this.currentstate();
    // flash if invincible (after a hit)
    this.flash(this);
};

Charger.prototype.enemyWanderState = function() {
    // play animation
    this.animations.play('charge');
    // Standard movement
    this.body.velocity.setTo(-100, 0);
    if (this.getDistToPlayer() < this.noticeTarget && this.x > this.target.x) {
        this.currentstate = this.enemyChargeState;
    }
};

Charger.prototype.enemyChargeState = function() {
    // play animation
    this.animations.play('charge');
    // Move
    this.body.velocity.setTo(-200, 0);

    // stop charging if past player
    if (this.getDistToPlayer() > this.noticeTarget || this.x < this.target.x) {
        this.currentState = this.enemyWanderState;
    }

    // Later, I think i'd like to do more of a special move where
    // the charger stomps the ground for a second, and then charges
    // straight towards the player and then has a cooldown where he
    // maybe walks slow for a second.  So it gives the player a 
    // minute to avoid the charge, and then hit them during the 
    // cooldown.  We could increase the health of the charger
    // so that it's more about timing, hit them during the cool-
    // down, you know?
};

Charger.prototype.enemyStunnedState = function() {
    this.animations.play('stunned');
};

Charger.prototype.takeDamage = alexTown.takeDamage;

Charger.prototype.stun = function() {
    this.currentstate = enemyStunnedState;
};

Charger.prototype.unStun = function() {
    this.currentstate = enemyWanderState;
};

Charger.prototype.flash = alexTown.flash;

Charger.prototype.getDistToPlayer = function() {
    return this.game.math.distance(this.x, this.y, this.target.x, this.target.y);
};