package com.ktsolution.butsukari;

import com.ktsolution.butsukari.LanTransport;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
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
import java.util.Enumeration;
import java.util.Iterator;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public final class LanTransport implements Closeable {
    private static final int MAGIC = 1113147441;
    private static final int MAX = 1048576;
    private volatile boolean closed;
    private volatile int generation;
    private final Listener listener;
    private String pin;
    private volatile ServerSocket server;
    private final ConcurrentHashMap<String, Peer> peers = new ConcurrentHashMap<>();
    private final AtomicInteger next = new AtomicInteger(1);
    private final Semaphore authenticating = new Semaphore(3);

    public interface Listener {
        void event(String str, String str2, String str3);
    }

    public LanTransport(Listener listener) {
        this.listener = listener;
    }

    public int localPort() {
        ServerSocket serverSocket = this.server;
        if (serverSocket == null) {
            return 0;
        }
        return serverSocket.getLocalPort();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void emit(String str, String str2, String str3) {
        this.listener.event(str, str2, str3);
    }

    public synchronized void host(String str) throws IOException {
        close();
        this.closed = false;
        final int i = this.generation + 1;
        this.generation = i;
        this.pin = str;
        if (!str.matches("[0-9]{6}")) {
            throw new IOException("code");
        }
        this.server = new ServerSocket(0);
        this.server.setReuseAddress(true);
        StringBuilder sb = new StringBuilder();
        Enumeration<NetworkInterface> networkInterfaces = NetworkInterface.getNetworkInterfaces();
        while (networkInterfaces.hasMoreElements()) {
            NetworkInterface nextElement = networkInterfaces.nextElement();
            if (nextElement.isUp() && !nextElement.isLoopback()) {
                Enumeration<InetAddress> inetAddresses = nextElement.getInetAddresses();
                while (inetAddresses.hasMoreElements()) {
                    InetAddress nextElement2 = inetAddresses.nextElement();
                    if ((nextElement2 instanceof Inet4Address) && nextElement2.isSiteLocalAddress()) {
                        if (sb.length() > 0) {
                            sb.append(", ");
                        }
                        sb.append(nextElement2.getHostAddress()).append(":").append(this.server.getLocalPort());
                    }
                }
            }
        }
        emit("hosted", "0", sb.length() > 0 ? sb.toString() : "Wi-Fiの接続を確認してください");
        final ServerSocket serverSocket = this.server;
        new Thread(new Runnable() { // from class: com.ktsolution.butsukari.LanTransport$$ExternalSyntheticLambda0
            @Override // java.lang.Runnable
            public final void run() {
                LanTransport.this.m9lambda$0$comktsolutionbutsukariLanTransport(i, serverSocket);
            }
        }, "lan-accept").start();
    }

    /* renamed from: lambda$0$com-ktsolution-butsukari-LanTransport, reason: not valid java name */
    /* synthetic */ void m9lambda$0$comktsolutionbutsukariLanTransport(final int i, ServerSocket serverSocket) {
        while (!this.closed && this.generation == i) {
            try {
                final Socket accept = serverSocket.accept();
                accept.setSoTimeout(8000);
                InetAddress inetAddress = accept.getInetAddress();
                if ((inetAddress.isSiteLocalAddress() || inetAddress.isLinkLocalAddress() || inetAddress.isLoopbackAddress()) && this.peers.size() < 3 && this.authenticating.tryAcquire()) {
                    new Thread(new Runnable() { // from class: com.ktsolution.butsukari.LanTransport$$ExternalSyntheticLambda2
                        @Override // java.lang.Runnable
                        public final void run() {
                            LanTransport.this.m10lambda$1$comktsolutionbutsukariLanTransport(accept, i);
                        }
                    }, "lan-auth").start();
                }
                accept.close();
            } catch (IOException e) {
                if (this.closed || this.generation != i) {
                    return;
                }
                emit("error", "0", "部屋の接続が終了しました");
                return;
            }
        }
    }

    /* renamed from: lambda$1$com-ktsolution-butsukari-LanTransport, reason: not valid java name */
    /* synthetic */ void m10lambda$1$comktsolutionbutsukariLanTransport(Socket socket, int i) {
        try {
            accept(socket, i);
        } finally {
            this.authenticating.release();
        }
    }

    private void accept(Socket socket, int i) {
        try {
            DataInputStream dataInputStream = new DataInputStream(new BufferedInputStream(socket.getInputStream()));
            if (dataInputStream.readInt() == MAGIC && this.pin.equals(dataInputStream.readUTF()) && !this.closed && this.generation == i && this.peers.size() < 3) {
                synchronized (this) {
                    if (!this.closed && this.generation == i && this.peers.size() < 3) {
                        String valueOf = String.valueOf(this.next.getAndIncrement());
                        DataOutputStream dataOutputStream = new DataOutputStream(new BufferedOutputStream(socket.getOutputStream()));
                        dataOutputStream.writeInt(MAGIC);
                        dataOutputStream.writeUTF(valueOf);
                        dataOutputStream.flush();
                        Peer peer = new Peer(valueOf, socket, dataInputStream, dataOutputStream, i);
                        this.peers.put(valueOf, peer);
                        emit("peer", valueOf, "");
                        peer.start();
                        return;
                    }
                    socket.close();
                    return;
                }
            }
            socket.close();
        } catch (IOException e) {
            try {
                socket.close();
            } catch (IOException e2) {
            }
        }
    }

    public synchronized void join(final String str, final int i, final String str2) {
        close();
        this.closed = false;
        final int i2 = this.generation + 1;
        this.generation = i2;
        new Thread(new Runnable() { // from class: com.ktsolution.butsukari.LanTransport$$ExternalSyntheticLambda1
            @Override // java.lang.Runnable
            public final void run() {
                LanTransport.this.m11lambda$2$comktsolutionbutsukariLanTransport(str, i, str2, i2);
            }
        }, "lan-connect").start();
    }

    /* renamed from: lambda$2$com-ktsolution-butsukari-LanTransport, reason: not valid java name */
    /* synthetic */ void m11lambda$2$comktsolutionbutsukariLanTransport(String str, int i, String str2, int i2) {
        Socket socket = new Socket();
        try {
            InetAddress byName = InetAddress.getByName(str);
            if ((!byName.isSiteLocalAddress() && !byName.isLinkLocalAddress() && !byName.isLoopbackAddress()) || i < 1 || i > 65535 || !str2.matches("[0-9]{6}")) {
                throw new IOException("address");
            }
            socket.connect(new InetSocketAddress(byName, i), 8000);
            socket.setSoTimeout(8000);
            DataOutputStream dataOutputStream = new DataOutputStream(new BufferedOutputStream(socket.getOutputStream()));
            DataInputStream dataInputStream = new DataInputStream(new BufferedInputStream(socket.getInputStream()));
            dataOutputStream.writeInt(MAGIC);
            dataOutputStream.writeUTF(str2);
            dataOutputStream.flush();
            if (dataInputStream.readInt() != MAGIC) {
                throw new IOException("protocol");
            }
            String readUTF = dataInputStream.readUTF();
            synchronized (this) {
                if (!this.closed && this.generation == i2) {
                    Peer peer = new Peer("0", socket, dataInputStream, dataOutputStream, i2);
                    this.peers.put("0", peer);
                    emit("connected", readUTF, "");
                    peer.start();
                    return;
                }
                socket.close();
            }
        } catch (IOException e) {
            try {
                socket.close();
            } catch (IOException e2) {
            }
            if (this.generation != i2 || this.closed) {
                return;
            }
            emit("error", "0", "接続できません。Wi-Fi・接続先・合言葉を確認してください");
        }
    }

    public void send(String str, String str2) {
        Peer peer;
        if (str2 == null) {
            return;
        }
        byte[] bytes = str2.getBytes(StandardCharsets.UTF_8);
        if (bytes.length <= MAX && (peer = this.peers.get(str)) != null && !peer.queue.offer(bytes)) {
            peer.close();
        }
    }

    public void disconnect(String str) {
        Peer peer = this.peers.get(str);
        if (peer != null) {
            peer.close();
        }
    }

    @Override // java.io.Closeable, java.lang.AutoCloseable
    public synchronized void close() {
        this.closed = true;
        this.generation++;
        if (this.server != null) {
            try {
                this.server.close();
            } catch (IOException e) {
            }
        }
        this.server = null;
        Iterator<Peer> it = this.peers.values().iterator();
        while (it.hasNext()) {
            it.next().close();
        }
        this.peers.clear();
    }

    /* JADX INFO: Access modifiers changed from: private */
    final class Peer {
        volatile boolean done;
        final int gen;
        final String id;
        final DataInputStream in;
        final DataOutputStream out;
        final ArrayBlockingQueue<byte[]> queue = new ArrayBlockingQueue<>(16);
        final Socket socket;

        Peer(String str, Socket socket, DataInputStream dataInputStream, DataOutputStream dataOutputStream, int i) throws IOException {
            this.id = str;
            this.socket = socket;
            this.in = dataInputStream;
            this.out = dataOutputStream;
            this.gen = i;
            socket.setTcpNoDelay(true);
            socket.setSoTimeout(15000);
        }

        /* renamed from: lambda$0$com-ktsolution-butsukari-LanTransport$Peer, reason: not valid java name */
        /* synthetic */ void m12lambda$0$comktsolutionbutsukariLanTransport$Peer() {
            while (!this.done && LanTransport.this.generation == this.gen) {
                try {
                    int readInt = this.in.readInt();
                    if (readInt < 1 || readInt > LanTransport.MAX) {
                        throw new IOException("size");
                    }
                    byte[] bArr = new byte[readInt];
                    this.in.readFully(bArr);
                    LanTransport.this.emit("message", this.id, new String(bArr, StandardCharsets.UTF_8));
                } catch (IOException e) {
                } catch (Throwable th) {
                    close();
                    throw th;
                }
            }
            close();
        }

        void start() {
            new Thread(new Runnable() { // from class: com.ktsolution.butsukari.LanTransport$Peer$$ExternalSyntheticLambda0
                @Override // java.lang.Runnable
                public final void run() {
                    LanTransport.Peer.this.m12lambda$0$comktsolutionbutsukariLanTransport$Peer();
                }
            }, "lan-read-" + this.id).start();
            new Thread(new Runnable() { // from class: com.ktsolution.butsukari.LanTransport$Peer$$ExternalSyntheticLambda1
                @Override // java.lang.Runnable
                public final void run() {
                    LanTransport.Peer.this.m13lambda$1$comktsolutionbutsukariLanTransport$Peer();
                }
            }, "lan-write-" + this.id).start();
        }

        /* renamed from: lambda$1$com-ktsolution-butsukari-LanTransport$Peer, reason: not valid java name */
        /* synthetic */ void m13lambda$1$comktsolutionbutsukariLanTransport$Peer() {
            while (!this.done && LanTransport.this.generation == this.gen) {
                try {
                    byte[] poll = this.queue.poll(1L, TimeUnit.SECONDS);
                    if (poll != null) {
                        this.out.writeInt(poll.length);
                        this.out.write(poll);
                        this.out.flush();
                    }
                } catch (Exception e) {
                } catch (Throwable th) {
                    close();
                    throw th;
                }
            }
            close();
        }

        synchronized void close() {
            if (!this.done) {
                this.done = true;
                LanTransport.this.peers.remove(this.id, this);
                try {
                    this.socket.close();
                } catch (IOException e) {
                }
                if (!LanTransport.this.closed && LanTransport.this.generation == this.gen) {
                    LanTransport.this.emit("disconnected", this.id, "");
                }
            }
        }
    }
}
