export {};

declare global {
    interface Window {
		MSInputMethodContext?: unknown;
        documentMode?: number;

		__LVMessengerReceive: (type: MessageType, data: any, source: string) => void;
		__LVMessenger: { accent: HTMLElement; };
    }

	interface Document {
        documentMode?: number;
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