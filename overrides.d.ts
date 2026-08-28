export {};

interface DocumentPictureInPictureOptions {
	width?: number;
	height?: number;
	disallowReturnToOpener?: boolean;
	preferInitialWindowPlacement?: boolean;
}

interface DocumentPictureInPictureEvent extends Event {
	window: Window;
}

interface DocumentPictureInPicture extends EventTarget {
	window: Window | null;
	requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
	onenter: ((this: DocumentPictureInPicture, ev: DocumentPictureInPictureEvent) => any) | null;
	addEventListener(
		type: "enter",
		listener: (this: DocumentPictureInPicture, ev: DocumentPictureInPictureEvent) => any,
		options?: boolean | AddEventListenerOptions
	): void;
}

declare global {
	interface Window {
		MSInputMethodContext: unknown | undefined;
		documentMode:  | undefined;
		
		documentPictureInPicture: DocumentPictureInPicture | undefined;

		inspect?: (value: any) => void;

		GearsFactory?: unknown;


		appRegistry?: AppRegistry;
		windowManager?: WindowManager;
		windows?: Dialog[];

		__LVMessengerReceive?: (type: MessageType, data: any, source?: string) => void;
		__LVMessenger?: {
			accent?: HTMLMetaElement;
		};

		desktopManager?: DesktopManager;

		metaThemeColor?: HTMLMetaElement;

	}

	interface DocumentPictureInPicture extends EventTarget {
		readonly window: Window | null;
		requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
		onenter: ((this: DocumentPictureInPicture, ev: Event) => any) | null;
	}

	interface DocumentPictureInPictureOptions {
		width?: number;
		height?: number;
		disallowReturnToOpener?: boolean;
		preferInitialWindowPlacement?: boolean;
	}

	interface Document {
		documentMode?: number;
	}

	interface Navigator {
		getUserMedia?(
			constraints: MediaStreamConstraints,
			successCallback: (stream: MediaStream) => void,
			errorCallback: (error: Error) => void
		): void;
		webkitGetUserMedia?: Navigator['getUserMedia'];
		mozGetUserMedia?: Navigator['getUserMedia'];
	}

	interface HTMLElement {
		msRequestFullscreen?: () => Promise<void> | void;
	}

	interface HTMLElementEventMap {
		webkitTransitionEnd: TransitionEvent;
		webkitAnimationEnd: AnimationEvent;
		webkitAnimationIteration: AnimationEvent;
		webkitAnimationStart: AnimationEvent;
	}

	interface ActiveXObject {
		[key: string]: any;
	}

	interface ActiveXObjectConstructor {
		new (progId: string): ActiveXObject;
	}

	interface Window {
		ActiveXObject?: ActiveXObjectConstructor;
	}

	var ActiveXObject: ActiveXObjectConstructor | undefined;

	interface GraphicsBase {
		canvas: HTMLCanvasElement;
	}

	interface Graphics2D extends GraphicsBase {
		ctx: CanvasRenderingContext2D;
		resize();
	}
}