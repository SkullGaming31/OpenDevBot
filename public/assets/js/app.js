// Initialize the Twitch player
// eslint-disable-next-line no-undef
var player = new Twitch.Player('twitch-player', {
	channel: 'twitchpresents',
	width: 640,
	height: 360,
	autoplay: false
});

// Play the video when the player is ready
// eslint-disable-next-line no-undef
player.addEventListener(Twitch.Player.READY, function () {
	player.play();
});