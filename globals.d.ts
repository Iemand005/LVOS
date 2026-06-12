
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


declare global {
  interface HTMLElementEventMap {
    webkitTransitionEnd: TransitionEvent;
    webkitAnimationEnd: AnimationEvent;
    webkitAnimationIteration: AnimationEvent;
    webkitAnimationStart: AnimationEvent;
  }
}