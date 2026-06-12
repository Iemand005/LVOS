export {};

declare global {
    interface Window {
        __LVMessengerReceive: (message: string) => void;
    }
}