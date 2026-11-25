
interface Array<T> {
	forEach<U>(callbackfn: (this: U, value: T, index: number, array: T[]) => void, thisArg?: U): void;
}

type PermissionMap = "camera" | "microphone" | "fullscreen";

interface Application {
	[key: string]: unknown;
	id: string;
	title?: string;
	src?: string;
	resizable?: boolean;
	fixed?: boolean;
	scroll?: boolean;
	hidden?: boolean;
	permissions?: PermissionMap[];
	moveEvents?: boolean;
	classes?: string[];
	minWidth?: number;
	minHeight?: number;
	audioVisualizer?: boolean;
	screensaver?: boolean;
	wallpaper?: boolean;
	iconUrl?: string;
	accentColor?: string;
	distSrc?: string;
	altUrls?: string[];
	borderless?: boolean;
	launch?: boolean;
	exists?: boolean;
	/** When true, opening the app spawns an extra window instance instead of reusing the open one. */
	multiple?: boolean;
	/** Internal: spawned windows with this flag do not add an app button to the wallpaper. */
	_skipOpenButton?: boolean;
	fileTypes?: string[];
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

interface DialogDropState {
	state: DialogState;
	app: Application;
	/** Pointer position relative to the window centre when the drag started, in pixels. */
	offset?: Coord;
}

interface Coord {
	x: number;
	y: number;
}

interface Bounds {
	top: number;
	left: number;
	right: number;
	bottom: number;
}

type Side = "left" | "right" | "top" | "bottom";

type DesktopState = {[key: string]: DialogState};
type DialogMap = {[id: string]: Dialog};
type DragFunction = (dialog: Dialog, offset: ClickOffset, difference: Coord) => void;
type WindowCallback<T=WindowManager> = (this: T, dialog: Dialog, id: string) => undefined | boolean;


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
	resize() : any;
}
}

type MessageType = "dialog-state" | "open" | "window-size" | "window-move" | "window-open" | "window-close" | "window-maximize" | "windowMove" | "mouseUp" | "launchOverlay" | "prepareToLaunchOverlay" | "readyToLaunchOverlay" | "identify" | "identity" | "pip" | "visualizers" | "theme" | "os" | "register-file-handler" | "mount-directory" | "get-mounted-directory";

interface Window {
	showDirectoryPicker?: (options?: { id?: string; mode?: "read" | "readwrite"; startIn?: string }) => Promise<FileSystemDirectoryHandle>;
}

interface WindowProperties {
	scrollbars: boolean;
	resizable: boolean;
	status: boolean;
	location: boolean;
	toolbar: boolean;
	menubar: boolean;
	width: number;
	height: number;
	left: number;
	top: number;
}

interface Identity {
	name: string;
}

interface LVMessage {
	type: MessageType;
	data: unknown;
	id: string;
}

interface WindowManager {
    _windows: DialogMap;
	windows: DialogMap;
	installedApps: Application[];
	extensions: Extension[];
}

interface Dialog {
	x: number;
	y: number;
	z: number;

	width: number;
	height: number;

	minWidth: number;
	minHeight: number;
	maxWidth: number;
	maxHeight: number;

	top: number;
	left: number;
	right: number;
	bottom: number;

	aspectRatio: number;

	useTransform: boolean;
	useScale: boolean;

	maximized: boolean;
	killable: boolean;
	isOpen: boolean;

	// The box a tiled window is drawn at, in window-area coordinates, recorded so a
	// drag out of the group can remap the grab point without measuring the element.
	_snapFrame?: { x: number; y: number; width: number; height: number };
	_mountedDirectory?: FileSystemDirectoryHandle | null;

	href: string;

	body: HTMLElement | null;
	content: HTMLElement | null;
	frame: HTMLIFrameElement | null;
	titleBar: HTMLElement | null;

	position: Vector;

	windowTarget: WindowElement?;
}


declare function ClickOffset(): {
	new (): ClickOffset;

	windowBounds: Bounds;
}
declare function WindowManager(): {
	new (): WindowManager;

	windowBounds: Bounds;
}
declare function DesktopManager(): {
	new (): DesktopManager;

	windowBounds: Bounds;
}
declare function Dialog(): void;
interface WindowTile {
	// Absent on a gap tile, which only reserves space in the group.
	id?: string;
	width?: number; // Share of the group along this axis, 0 to 1.
	height?: number;
	gap?: boolean;
	direction?: 'horizontal' | 'vertical';
	group?: boolean;
}

interface WindowGroup {
	direction?: 'horizontal' | 'vertical';
	items?: (WindowTile | WindowGroup)[];
	// The group's members in layout order, gap tiles included.
	windows: WindowTile[];
	// The element that reserves a gap tile's share of this group's snap row.
	spacer?: HTMLElement | null;
}

type ResizeDirection = "bottom-right"|"bottom-left"|"top-right"|"top-left"|"bottom"|"right"|"top"|"left";

interface Transform {
	x?: number;
	y?: number;
	skewX?: number;
	skewY?: number;
	scaleX?: number;
	scaleY?: number;
	rotate?: number;
	rotateX?: number;
	rotateY?: number;
	rotateZ?: number;
}

type TransitionEndCallback = ((name:string)=>boolean) | string;

type CustomElementList = [string, CustomElementConstructor, keyof HTMLElementTagNameMap][];

type DigitGetter = (value: number, pos: number) => number;

type DragHandler = (ev: PointerEvent | MouseEvent) => void;

interface WindowOpenProperties {
	scrollbars?: boolean;
	resizable?: boolean;
	status?: boolean;
	location?: boolean;
	toolbar?: boolean;
	menubar?: boolean;
	width?: number;
	height?: number;
	left?: number;
	top?: number;
}

type AnimationState = { timer: number, frame: number, handler: ((this: HTMLElement, ev: TransitionEvent) => any) | null, active: boolean, flip: boolean, cancel: ()=>void };

type Flags = Record<string, boolean>;

interface VulpOS {
	windowManager: WindowManager;
	desktopManager: DesktopManager;
	flags: Flags;
}