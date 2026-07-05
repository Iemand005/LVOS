export {};

declare global {
	interface Window {
		MSInputMethodContext: unknown | undefined;
		documentMode:  | undefined;

		windows: Dialog[]?;

		__LVMessengerReceive: (type: MessageType, data: any, source: string) => void;
		__LVMessenger: {
			accent: HTMLMetaElement | undefined;
		} | {} | undefined;

		documentPictureInPicture: DocumentPictureInPicture | undefined;
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