export {};

declare global {
    interface Window {
		MSInputMethodContext?: unknown;
        documentMode?: number;

		__LVMessengerReceive: (type: MessageType, data: any, source: string) => void;
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
}