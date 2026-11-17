(function() {
	window.windowManager.registerExtension({
		id: "window-reaper",
		name: "Window Reaper",
		description: "Kills windows when they are closed.",
		enabled: true,
		onWindowClose: function(dialog) {
			if (dialog && dialog.killable) dialog.kill();
		}
	});
})();