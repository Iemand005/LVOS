(function() {
	function setTracking(dialog, enabled) {
		dialog.velocityTracking = !!enabled;
		if (!enabled) {
			dialog.velocityX = 0;
			dialog.velocityY = 0;
			dialog.skew = 0;
			if (typeof dialog.setScaleY === "function") dialog.setScaleY(1);
		}
	}

	window.windowManager.registerExtension({
		id: "jelly",
		name: "Jelly",
		description: "Makes your windows move around sloshy!",
		enabled: false,
		onEnable: function() {
			window.windowManager.forEachWindow(function(dialog) { setTracking(dialog, true); });
		},
		onDisable: function() {
			window.windowManager.forEachWindow(function(dialog) { setTracking(dialog, false); });
		},
		onWindowLaunch: function(dialog) {
			setTracking(dialog, true);
		},
		onWindowMove: function(dialog) {
			if (!dialog.velocityTracking) return;
			dialog.skew = -dialog.velocityX / 3;
			if (typeof dialog.setScaleY === "function") dialog.setScaleY(1 - dialog.velocityY / 100);
		}
	});
})();