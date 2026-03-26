interface Dialog {
  resize(width: number, height: number): void;
}

interface DialogConstructor {
    new (): Dialog;
}

export declare const Dialog: DialogConstructor;