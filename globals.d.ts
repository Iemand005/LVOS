
interface Array<T> {
  forEach<U>(callbackfn: (this: U, value: T, index: number, array: T[]) => void, thisArg?: U): void;
}

// /**
//  * @typedef Application
//  * @prop {string} title
//  * @prop {string} id
//  * @prop {string} src
//  * @prop {boolean?} fixed
// *  @prop {boolean?} scroll
//  * @prop {boolean?} hidden
//  * @prop {boolean?} camera
//  * @prop {boolean?} microphone
//  * @prop {boolean?} moveEvents
//  * @prop {string[] | null} classes
//  */

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