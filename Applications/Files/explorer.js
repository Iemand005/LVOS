
LVMessenger.get("os", function(os) {
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
	var updateCount = function () {
		if (!count) return;
		var total = view.querySelectorAll(".file-item").length;
		count.textContent = total + (total === 1 ? " file" : " files");
	};
	updateCount();
	view.addEventListener("drop", function () { setTimeout(updateCount, 0); });
});
