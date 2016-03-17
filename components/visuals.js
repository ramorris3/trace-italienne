var Slices = function(game) {	
	// init 100 slice sprites
	this.slices = game.add.group();
	this.animationKeys = ['slice1', 'slice2']; // for slice() later
	for (var i = 0; i < 100; i++)
	{
		var slice = new Phaser.Sprite(game, 0, 0, 'slices');
		slice.animations.add('slice1', [0,1,2,3,4,5,6,7,8,9,10,11,12]);
		slice.animations.add('slice2', [13,14,15,16,17,18,19,20,21,22,23,24,25]);
		slice.anchor.setTo(0.5,0.5);
		slice.kill();
		this.slices.add(slice);
	}
}

Slices.prototype = Object.create(Object);
Slices.prototype.constructor = Slices;

Slices.prototype.slice = function(self) {
	// get a slice sprite, and choose a random slice animation to play
	var slice = this.slices.getFirstDead();
	var animKey = this.animationKeys[Math.floor(Math.random() * 2)];

	// revive and play animation (will die when animation ends)
	slice.reset(self.x + 10, self.y);
	slice.revive();
	slice.play(animKey, 40, false, true);

	// slice moves with enemy/character
	slice.follow = self;

	// fade as animation plays
	slice.update = function() {
		this.alpha -= .05;
		this.x = this.follow.x + 10;
		this.y = this.follow.y;
	};
};