export {};

declare global {
    interface Window {
        __LVMessengerReceive: (message: MessageType) => void;
    }
}