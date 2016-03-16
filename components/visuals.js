var Slices = function(game) {	
	// init 100 slice sprites
	this.slices = game.add.group();
	this.animationKeys = ['slice1', 'slice2', 'slice3']; // for slice() later
	for (var i = 0; i < 100; i++)
	{
		var slice = new Phaser.Sprite(game, 0, 0, 'slices');
		slice.animations.add('slice1', [0,1,2,3,4,5,6,7,8], 30, false);
		slice.animations.add('slice2', [9,10,11,12,13,14,15], 30, false);
		slice.animations.add('slice3', [16,17,18,19,20,21,22,23], 30, false);
		slice.kill();
		this.slices.add(slice);
	}
}

Slices.prototype = Object.create(Object);
Slices.prototype.constructor = Slices;

Slices.prototype.slice = function(x, y) {
	// get a slice sprite, and choose a random slice animation to play
	var slice = this.slices.getFirstDead();
	var animKey = this.animationKeys[Math.floor(Math.random() * 3) - 1];
	console.log(animKey);

	// revive and play animation (will die when enimation ends)
	slice.reset(x, y);
	slice.revive();
	slice.killOnComplete = true;
	slice.play(animKey);

	// fade as animation plays
	slice.update = function() {
		this.alpha -= .02;

	};
};