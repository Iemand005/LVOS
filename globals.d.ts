
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

declare class Dialog {
  resize(width: number, height: number): void;
}