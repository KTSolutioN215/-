package com.ktsolution.butsukari;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

public final class LanWebSocket {
    private static final int MAX = 1048576;
    private volatile boolean closed;
    private final DataInputStream in;
    private final DataOutputStream out;

    public LanWebSocket(DataInputStream dataInputStream, DataOutputStream dataOutputStream) {
        this.in = dataInputStream;
        this.out = dataOutputStream;
    }

    /* JADX WARN: Code restructure failed: missing block: B:105:0x0170, code lost:
    
        throw fail(1009);
     */
    /* JADX WARN: Code restructure failed: missing block: B:119:0x0175, code lost:
    
        throw fail(1002);
     */
    /* JADX WARN: Code restructure failed: missing block: B:63:0x0154, code lost:
    
        if (r4 != 2) goto L97;
     */
    /* JADX WARN: Code restructure failed: missing block: B:64:0x0156, code lost:
    
        r8 = 1003;
     */
    /* JADX WARN: Code restructure failed: missing block: B:66:0x015c, code lost:
    
        throw fail(r8);
     */
    /*
        Code decompiled incorrectly, please refer to instructions dump.
        To view partially-correct add '--show-bad-code' argument
    */
    public java.lang.String readText() throws java.io.IOException {
        /*
            Method dump skipped, instructions count: 374
            To view this dump add '--comments-level debug' option
        */
        throw new UnsupportedOperationException("Method not decompiled: com.ktsolution.butsukari.LanWebSocket.readText():java.lang.String");
    }

    public synchronized void writeFrame(int i, byte[] bArr) throws IOException {
        if (this.closed) {
            throw new EOFException("websocket closed");
        }
        if (bArr.length > MAX) {
            throw new IOException("size");
        }
        this.out.writeByte(i | 128);
        if (bArr.length < 126) {
            this.out.writeByte(bArr.length);
        } else if (bArr.length < 65536) {
            this.out.writeByte(126);
            this.out.writeShort(bArr.length);
        } else {
            this.out.writeByte(127);
            this.out.writeLong(bArr.length);
        }
        this.out.write(bArr);
        this.out.flush();
    }

    public void writeText(String str) throws IOException {
        writeFrame(1, str.getBytes(StandardCharsets.UTF_8));
    }

    private IOException fail(int i) {
        try {
            writeFrame(8, new byte[]{(byte) (i >> 8), (byte) i});
        } catch (IOException e) {
        }
        this.closed = true;
        return new IOException("websocket protocol " + i);
    }
}
