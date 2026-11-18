
Loader.onVulpOS(function(os) {
	var view = document.getElementById("file-view");
	if (!view) return;

	var files = [
		{ name: "Konk", icon: "../../Assets/icon-192.png" },
		{ name: "Kink", icon: "../../Assets/icon-192.png" },
		{ name: "Kenk", icon: "../../Assets/icon-192.png" },
		{ name: "Kank", icon: "../../Assets/icon-192.png" }
	];

	os.to(view).addFileView(files);

	var count = document.getElementById("file-count");
	if (count) count.textContent = files.length + (files.length === 1 ? " file" : " files");
});
