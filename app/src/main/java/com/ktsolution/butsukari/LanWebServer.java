package com.ktsolution.butsukari;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Base64;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import java.util.StringJoiner;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;

public final class LanWebServer implements Closeable {
    public static final int PORT = 39762;
    private final Assets assets;
    private volatile int generation;
    private ServerSocket server;
    private final LanTransport transport;
    private final Semaphore workers = new Semaphore(32);
    private final Set<Socket> pending = ConcurrentHashMap.newKeySet();

    public interface Assets {
        byte[] read(String str) throws IOException;
    }

    public LanWebServer(LanTransport lanTransport, Assets assets) {
        this.transport = lanTransport;
        this.assets = assets;
    }

    public synchronized void start(int i) throws IOException {
        if (this.server == null || this.server.isClosed()) {
            final ServerSocket serverSocket = new ServerSocket();
            serverSocket.setReuseAddress(true);
            serverSocket.bind(new InetSocketAddress(i));
            this.server = serverSocket;
            final int i2 = this.generation + 1;
            this.generation = i2;
            new Thread(new Runnable() { // from class: com.ktsolution.butsukari.LanWebServer$$ExternalSyntheticLambda1
                @Override // java.lang.Runnable
                public final void run() {
                    LanWebServer.this.m14lambda$0$comktsolutionbutsukariLanWebServer(i2, serverSocket);
                }
            }, "lan-http").start();
        }
    }

    /* renamed from: lambda$0$com-ktsolution-butsukari-LanWebServer, reason: not valid java name */
    /* synthetic */ void m14lambda$0$comktsolutionbutsukariLanWebServer(final int i, ServerSocket serverSocket) {
        while (i == this.generation) {
            try {
                final Socket accept = serverSocket.accept();
                InetAddress inetAddress = accept.getInetAddress();
                if ((inetAddress.isSiteLocalAddress() || inetAddress.isLinkLocalAddress() || inetAddress.isLoopbackAddress()) && this.workers.tryAcquire()) {
                    accept.setSoTimeout(8000);
                    this.pending.add(accept);
                    new Thread(new Runnable() { // from class: com.ktsolution.butsukari.LanWebServer$$ExternalSyntheticLambda0
                        @Override // java.lang.Runnable
                        public final void run() {
                            LanWebServer.this.m15lambda$1$comktsolutionbutsukariLanWebServer(accept, i);
                        }
                    }, "lan-http-request").start();
                } else {
                    accept.close();
                }
            } catch (IOException e) {
                return;
            }
        }
    }

    /* renamed from: lambda$1$com-ktsolution-butsukari-LanWebServer, reason: not valid java name */
    /* synthetic */ void m15lambda$1$comktsolutionbutsukariLanWebServer(Socket socket, int i) {
        try {
            boolean handle = handle(socket, i);
            this.pending.remove(socket);
            if (!handle) {
                try {
                    socket.close();
                } catch (IOException e) {
                }
            }
        } catch (Exception e2) {
            this.pending.remove(socket);
            try {
                socket.close();
            } catch (IOException e3) {
            }
        } catch (Throwable th) {
            this.pending.remove(socket);
            try {
                socket.close();
            } catch (IOException e4) {
            }
            this.workers.release();
            throw th;
        }
        this.workers.release();
    }

    public synchronized int port() {
        return this.server == null ? 0 : this.server.getLocalPort();
    }

    public static String addresses(int i) {
        StringJoiner stringJoiner = new StringJoiner(", ");
        try {
            Enumeration<NetworkInterface> networkInterfaces = NetworkInterface.getNetworkInterfaces();
            while (networkInterfaces.hasMoreElements()) {
                NetworkInterface nextElement = networkInterfaces.nextElement();
                if (nextElement.isUp() && !nextElement.isLoopback()) {
                    Enumeration<InetAddress> inetAddresses = nextElement.getInetAddresses();
                    while (inetAddresses.hasMoreElements()) {
                        InetAddress nextElement2 = inetAddresses.nextElement();
                        if ((nextElement2 instanceof Inet4Address) && nextElement2.isSiteLocalAddress()) {
                            stringJoiner.add("http://" + nextElement2.getHostAddress() + ":" + i + "/");
                        }
                    }
                }
            }
        } catch (IOException e) {
        }
        return stringJoiner.toString();
    }

    private boolean handle(Socket socket, int i) throws Exception {
        DataInputStream dataInputStream = new DataInputStream(new BufferedInputStream(socket.getInputStream()));
        DataOutputStream dataOutputStream = new DataOutputStream(new BufferedOutputStream(socket.getOutputStream()));
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        int i2 = 0;
        while (byteArrayOutputStream.size() < 16384) {
            int read = dataInputStream.read();
            if (read < 0) {
                return false;
            }
            byteArrayOutputStream.write(read);
            i2 = (i2 << 8) | read;
            if (i2 == 218762506) {
                break;
            }
        }
        if (i2 != 218762506) {
            reply(dataOutputStream, 431, "text/plain", new byte[0]);
            return false;
        }
        String[] split = new String(byteArrayOutputStream.toByteArray(), StandardCharsets.US_ASCII).split("\r\n");
        String[] split2 = split[0].split(" ");
        if (split2.length != 3 || !split2[0].equals("GET")) {
            reply(dataOutputStream, 405, "text/plain", new byte[0]);
            return false;
        }
        HashMap hashMap = new HashMap();
        for (int i3 = 1; i3 < split.length; i3++) {
            int indexOf = split[i3].indexOf(58);
            if (indexOf > 0) {
                String lowerCase = split[i3].substring(0, indexOf).trim().toLowerCase(Locale.ROOT);
                if (hashMap.containsKey(lowerCase)) {
                    throw new IOException("duplicate header");
                }
                hashMap.put(lowerCase, split[i3].substring(indexOf + 1).trim());
            }
        }
        String str = (String) hashMap.get("host");
        if (str == null || !str.matches("[a-zA-Z0-9.\\[\\]:%-]{1,200}")) {
            throw new IOException("host");
        }
        String substring = str.startsWith("[") ? str.substring(1, str.indexOf(93)) : str.split(":")[0];
        if (!substring.matches("[0-9.]+") && !substring.contains(":")) {
            reply(dataOutputStream, 403, "text/plain", new byte[0]);
            return false;
        }
        InetAddress byName = InetAddress.getByName(substring);
        if (!byName.isSiteLocalAddress() && !byName.isLinkLocalAddress() && !byName.isLoopbackAddress()) {
            reply(dataOutputStream, 403, "text/plain", new byte[0]);
            return false;
        }
        if (i != this.generation || !split2[1].startsWith("/")) {
            return false;
        }
        String str2 = split2[1].split("\\?", 2)[0];
        if (str2.equals("/coop")) {
            if (!"websocket".equalsIgnoreCase((String) hashMap.get("upgrade")) || !Arrays.asList(((String) hashMap.getOrDefault("connection", "")).toLowerCase(Locale.ROOT).split("\\s*,\\s*")).contains("upgrade") || !"13".equals(hashMap.get("sec-websocket-version")) || !("http://" + str).equals(hashMap.get("origin"))) {
                reply(dataOutputStream, 403, "text/plain", new byte[0]);
                return false;
            }
            String str3 = (String) hashMap.get("sec-websocket-key");
            if (str3 == null || Base64.getDecoder().decode(str3).length != 16) {
                reply(dataOutputStream, 400, "text/plain", new byte[0]);
                return false;
            }
            dataOutputStream.write(("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + Base64.getEncoder().encodeToString(MessageDigest.getInstance("SHA-1").digest((String.valueOf(str3) + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").getBytes(StandardCharsets.US_ASCII))) + "\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
            dataOutputStream.flush();
            return this.transport.acceptWeb(socket, dataInputStream, dataOutputStream);
        }
        if (str2.equals("/room")) {
            reply(dataOutputStream, 200, "application/json; charset=utf-8", ("{\"open\":" + this.transport.isHosting() + ",\"name\":\"ぶつかり勇者\",\"version\":\"lan-1\"}").getBytes(StandardCharsets.UTF_8));
            return false;
        }
        String substring2 = str2.equals("/") ? "lan-relay.html" : str2.substring(1);
        if (!substring2.equals("lan-relay.html") && !substring2.equals("lan-relay.js")) {
            reply(dataOutputStream, 404, "text/plain", new byte[0]);
            return false;
        }
        try {
            reply(dataOutputStream, 200, substring2.endsWith(".js") ? "application/javascript; charset=utf-8" : "text/html; charset=utf-8", this.assets.read(substring2));
        } catch (IOException e) {
            reply(dataOutputStream, 404, "text/plain", new byte[0]);
        }
        return false;
    }

    private void reply(DataOutputStream dataOutputStream, int i, String str, byte[] bArr) throws IOException {
        dataOutputStream.write(("HTTP/1.1 " + i + " " + (i == 200 ? "OK" : i == 404 ? "Not Found" : i == 403 ? "Forbidden" : "Bad Request") + "\r\nContent-Type: " + str + "\r\nContent-Length: " + bArr.length + "\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nX-Frame-Options: DENY\r\nReferrer-Policy: no-referrer\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
        dataOutputStream.write(bArr);
        dataOutputStream.flush();
    }

    @Override // java.io.Closeable, java.lang.AutoCloseable
    public synchronized void close() {
        this.generation++;
        if (this.server != null) {
            try {
                this.server.close();
            } catch (IOException e) {
            }
        }
        this.server = null;
        Iterator<Socket> it = this.pending.iterator();
        while (it.hasNext()) {
            try {
                it.next().close();
            } catch (IOException e2) {
            }
        }
        this.pending.clear();
    }
}
