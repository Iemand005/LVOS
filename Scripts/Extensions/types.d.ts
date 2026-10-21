type DialogEvent = { dialog: Dialog };

/** The hooks the window manager calls on the extensions it knows. */
type ExtensionHook = "onWindowLaunch" | "onWindowMove" | "onEnable" | "onDisable";

/**
 * An extension of the window manager.
 *
 * Every hook is optional: the window manager calls the ones an extension provides
 * and skips the ones it does not, so an extension only has to implement what it
 * actually needs.
 */
interface Extension {
	/** Identifies the extension. Registering an extension with the same id replaces the old one. */
	id?: string;
	/** Human readable name of the extension. */
	name?: string;
	/** Whether the extension is switched on. Extensions are switched on when they are registered. */
	enabled?: boolean;
	/** FLags defined by the extension */
	flags: PropertyDescriptorMap & ThisType<any>;
	/** Called when a window is launched. */
	onWindowLaunch?(dialog: Dialog): void;
	/** Called when a window is moved. */
	onWindowMove?(dialog: Dialog): void;
	/** Called when the extension is switched on. */
	onEnable?(): void;
	/** Called when the extension is switched off. */
	onDisable?(): void;
}
