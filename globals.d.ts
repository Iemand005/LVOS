
interface Array<T> {
  forEach<U>(callbackfn: (this: U, value: T, index: number, array: T[]) => void, thisArg?: U): void;
}

interface Application {
  title: string;
  id: string;
  src: string;
  fixed?: boolean;
  scroll?: boolean;
  hidden?: boolean;
  camera?: boolean;
  microphone?: boolean;
  moveEvents?: boolean;
  classes?: string[];
  minWidth?: number;
  minHeight?: number;
  audioVisualizer?: boolean;
  screensaver?: boolean;
}

interface DialogState {
  title: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  open: boolean;
  maximized: boolean;
}

interface Position {
  x: number;
  y: number;
}

type DesktopState = {[key: string]: DialogState};
type DialogMap = {[id: string]: Dialog};
type DragFunction = (dialog: Dialog, offset: ClickOffset, difference: Position) => void;
type WindowCallback = (dialog: Dialog, id: string) => void


declare global {
  interface HTMLElementEventMap {
    webkitTransitionEnd: TransitionEvent;
    webkitAnimationEnd: AnimationEvent;
    webkitAnimationIteration: AnimationEvent;
    webkitAnimationStart: AnimationEvent;
  }

  interface GraphicsBase {
    canvas: HTMLCanvasElement;
  }

  interface Graphics2D extends GraphicsBase {
    ctx: CanvasRenderingContext2D;
    resize();
  }
}

type Cursor = "alias" | "all-scroll" | "auto" | "cell" | "context-menu" | "col-resize" | "copy" | "crosshair" | "default" | "e-resize" | "ew-resize" | "grab" | "grabbing" | "help" | "move" | "n-resize" | "ne-resize" | "nesw-resize" | "ns-resize" | "nw-resize" | "nwse-resize" | "no-drop" | "none" | "not-allowed" | "pointer" | "progress" | "row-resize" | "s-resize" | "se-resize" | "sw-resize" | "text" | "vertical-text" | "w-resize" | "wait" | "zoom-in" | "zoom-out" | "initial";