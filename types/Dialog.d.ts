interface Dialog {
  resize(width: number, height: number): void;
}

declare var Dialog: {
    prototype: Dialog;
    new (): Dialog;
};