
interface Array<T> {
  forEach<U>(callbackfn: (this: U, value: T, index: number, array: T[]) => void, thisArg?: U): void;
}

interface Application {
  title: string;
  id: string;
  src: string;
  fixed?: boolean,
  scroll?: boolean, 
  hidden?: boolean, 
  camera?: boolean, 
  microphone?: boolean, 
  moveEvents?: boolean,
  classes?: string[]
}

interface DialogState {
  title: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  open: boolean;
}

interface Position {
  x: number;
  y: number;
}