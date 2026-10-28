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

interface CustomElementsByIs {
    time: {
        "odometer-time": OdometerTime;
        "odometer-display": OdometerDisplay;
    };
	span: {
		"odometer-track": OdometerDigit;
	}
}


type CustomElementsByIds = typeof customs;

type CustomElementNames = keyof CustomElementsByIds;
type CustomTag = CustomElementsByIds[CustomElementNames]["extends"];
type ClassOf<N extends CustomElementNames> = CustomElementsByIds[N]["constructor"];
type CustomElementName<T extends CustomTag> = { [K in CustomElementNames]: CustomElementsByIds[K]["extends"] extends T ? K : never }[CustomElementNames];

declare global {

	type CustomElementMap = {[name: string]: { constructor: CustomElementConstructor, extends: keyof HTMLElementTagNameMap }};

	
	interface Window {
		MSInputMethodContext: unknown | undefined;
		documentMode:  | undefined;

		documentPictureInPicture: DocumentPictureInPicture | undefined;

		inspect?: (value: any) => void;

		GearsFactory?: unknown;


		appManager?: AppManager;
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

		createElement<K extends CustomTag, I extends CustomElementName<K>>(tagName: K, options: { is: I }): HTMLElementTagNameMap[K] | InstanceType<ClassOf<I>>;
	}

	interface Element {
		setAttribute(qualifiedName: "is", value: CustomElementNames): void;
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
		// ontransitionend?: () => void;
		/** rAF id of the FLIP that is currently playing its frame on this element, if any. */
		_flipFrame?: number;
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

	interface CSSStyleDeclaration {
		inset?: string;
	}

	interface CSSStyleProperties {
		msTransform?: string;
	}

	interface ChildNode {
		remove?(): void;
	}
}

hi =
 https://marketplace.visualstudio.com/_apis/public/gallery/publishers/
https://marketplace.visualstudio.com/_apis/public/gallery/publishers/ms-python/vsextensions/python/2024.17.2024100401/vspackage?targetPlatform=win32-x64
https://marketplace.visualstudio.com/_apis/public/gallery/publishers/VisualStudioExptTeam/vsextensions/vscodeintellicode/!.3.2/vspackage?targetPlatform=win32-x64
VisualStudioExptTeam.vscodeintellicode\
history
hi				1``1	`1		`1q	`1q	`1	1q	`1	1	1`q	1q`q	`1q	`1q	`1q	1`1q	w`
hi