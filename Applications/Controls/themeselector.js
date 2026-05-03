
function ThemeSelector() {
  this.themeables = [];
}

ThemeSelector.prototype.register = function register(selector) {
  document.querySelector(selector).addEventListener("click", this.)
  this.themeables.push(selector);
};