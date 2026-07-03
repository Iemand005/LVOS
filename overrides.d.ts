export {};

declare global {
    interface Window {
		MSInputMethodContext?: unknown;
        documentMode?: number;

		__LVMessengerReceive: (type: MessageType, data: any, source: string) => void;
		__LVMessenger: {
			accent: HTMLMetaElement?;
		};
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