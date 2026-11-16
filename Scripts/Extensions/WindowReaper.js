(function() {
	window.windowManager.registerExtension({
		id: "window-reaper",
		name: "Window Reaper",
		description: "Kills windows when they are closed.",
		enabled: false,
		onWindowClose: function(dialog) {
			if (dialog && !dialog._killing) dialog.kill();
		}
	});
})();