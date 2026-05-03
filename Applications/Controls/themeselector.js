
function ThemeSelector() {
  this.themes = {};
  this.themeables = [];
}

/**
 * @param {HTMLElement} element 
 */
ThemeSelector.prototype.register = function register(element) {
  this.themeables.push(element);
};