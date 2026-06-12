export {};

declare global {
    interface Window {
        __LVMessengerReceive: (type: MessageType, data: any, source: string) => void;
		 interface Window {
        MSInputMethodContext?: unknown;
        documentMode?: number;
    }
    }

	interface HTMLElementEventMap {
		webkitTransitionEnd: TransitionEvent;
		webkitAnimationEnd: AnimationEvent;
		webkitAnimationIteration: AnimationEvent;
		webkitAnimationStart: AnimationEvent;
	}
}