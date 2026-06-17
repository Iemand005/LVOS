export {};

declare global {
    interface Graphics3D {
        loadShader(type: number, source: string): WebGLShader | null;
    }

    var Graphics3D: {
        new (): Graphics3D;
        prototype: Graphics3D;
    };
}