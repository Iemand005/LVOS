interface Graphics3D {
    loadShader(type: number, source: string): WebGLShader | null;
}

declare var Graphics3D: {
    prototype: Graphics3D;
    new(): Graphics3D;
};