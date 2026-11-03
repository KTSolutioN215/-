package com.ktsolution.butsukari;

import android.content.Context;
import android.net.NetworkRequest;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import com.ktsolution.butsukari.LanDiscovery;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.concurrent.Executor;
import org.json.JSONArray;
import org.json.JSONObject;

public final class LanDiscovery {
    private static final String TYPE = "_bumpyusha._tcp.";
    private NsdManager.DiscoveryListener discovery;
    private int epoch;
    private final Listener listener;
    private final WifiManager.MulticastLock multicast;
    private final NsdManager nsd;
    private NsdManager.RegistrationListener registration;
    private boolean resolving;
    private int token;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Executor main = new Executor() { // from class: com.ktsolution.butsukari.LanDiscovery$$ExternalSyntheticLambda0
        @Override // java.util.concurrent.Executor
        public final void execute(Runnable runnable) {
            LanDiscovery.this.m0lambda$0$comktsolutionbutsukariLanDiscovery(runnable);
        }
    };
    private final LinkedHashMap<String, NsdServiceInfo> rooms = new LinkedHashMap<>();
    private final ArrayDeque<NsdServiceInfo> queue = new ArrayDeque<>();
    private final HashSet<String> present = new HashSet<>();

    public interface Listener {
        void update(int i, String str, String str2);
    }

    /* renamed from: lambda$0$com-ktsolution-butsukari-LanDiscovery, reason: not valid java name */
    /* synthetic */ void m0lambda$0$comktsolutionbutsukariLanDiscovery(Runnable runnable) {
        this.handler.post(runnable);
    }

    public LanDiscovery(Context context, Listener listener) {
        this.listener = listener;
        this.nsd = (NsdManager) context.getSystemService("servicediscovery");
        WifiManager wifiManager = (WifiManager) context.getApplicationContext().getSystemService("wifi");
        this.multicast = wifiManager == null ? null : wifiManager.createMulticastLock("yusha-room-discovery");
        if (this.multicast != null) {
            this.multicast.setReferenceCounted(false);
        }
    }

    private void lock() {
        try {
            if (this.multicast == null || this.multicast.isHeld()) {
                return;
            }
            this.multicast.acquire();
        } catch (RuntimeException e) {
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void release() {
        try {
            if (this.discovery == null && this.registration == null && this.multicast != null && this.multicast.isHeld()) {
                this.multicast.release();
            }
        } catch (RuntimeException e) {
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public String key(NsdServiceInfo nsdServiceInfo) {
        return nsdServiceInfo.getServiceName();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public String address(NsdServiceInfo nsdServiceInfo) {
        if (nsdServiceInfo.getPort() < 1 || nsdServiceInfo.getPort() > 65535) {
            return null;
        }
        if (Build.VERSION.SDK_INT >= 34) {
            for (InetAddress inetAddress : nsdServiceInfo.getHostAddresses()) {
                if ((inetAddress instanceof Inet4Address) && inetAddress.isSiteLocalAddress()) {
                    return String.valueOf(inetAddress.getHostAddress()) + ":" + nsdServiceInfo.getPort();
                }
            }
        }
        InetAddress host = nsdServiceInfo.getHost();
        if ((host instanceof Inet4Address) && host.isSiteLocalAddress()) {
            return String.valueOf(host.getHostAddress()) + ":" + nsdServiceInfo.getPort();
        }
        return null;
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void emit(String str) {
        JSONArray jSONArray = new JSONArray();
        for (NsdServiceInfo nsdServiceInfo : this.rooms.values()) {
            try {
                String address = address(nsdServiceInfo);
                if (address != null) {
                    JSONObject jSONObject = new JSONObject();
                    jSONObject.put("id", key(nsdServiceInfo));
                    jSONObject.put("name", nsdServiceInfo.getServiceName());
                    jSONObject.put("address", address);
                    jSONArray.put(jSONObject);
                }
            } catch (Exception e) {
            }
        }
        this.listener.update(this.token, str, jSONArray.toString());
    }

    public void advertise(int i) {
        stopAdvertising();
        if (this.nsd == null || i < 1) {
            return;
        }
        lock();
        NsdServiceInfo nsdServiceInfo = new NsdServiceInfo();
        nsdServiceInfo.setServiceName("ぶつかり勇者 " + i);
        nsdServiceInfo.setServiceType(TYPE);
        nsdServiceInfo.setPort(i);
        nsdServiceInfo.setAttribute("version", "lan-1");
        AnonymousClass1 anonymousClass1 = new AnonymousClass1();
        this.registration = anonymousClass1;
        try {
            this.nsd.registerService(nsdServiceInfo, 1, anonymousClass1);
        } catch (RuntimeException e) {
            this.registration = null;
            release();
        }
    }

    /* renamed from: com.ktsolution.butsukari.LanDiscovery$1, reason: invalid class name */
    class AnonymousClass1 implements NsdManager.RegistrationListener {
        AnonymousClass1() {
        }

        /* renamed from: lambda$0$com-ktsolution-butsukari-LanDiscovery$1, reason: not valid java name */
        /* synthetic */ void m1lambda$0$comktsolutionbutsukariLanDiscovery$1() {
            if (LanDiscovery.this.registration == this) {
                LanDiscovery.this.registration = null;
                LanDiscovery.this.release();
            }
        }

        @Override // android.net.nsd.NsdManager.RegistrationListener
        public void onRegistrationFailed(NsdServiceInfo nsdServiceInfo, int i) {
            LanDiscovery.this.main.execute(new Runnable() { // from class: com.ktsolution.butsukari.LanDiscovery$1$$ExternalSyntheticLambda0
                @Override // java.lang.Runnable
                public final void run() {
                    LanDiscovery.AnonymousClass1.this.m1lambda$0$comktsolutionbutsukariLanDiscovery$1();
                }
            });
        }

        /* renamed from: lambda$1$com-ktsolution-butsukari-LanDiscovery$1, reason: not valid java name */
        /* synthetic */ void m2lambda$1$comktsolutionbutsukariLanDiscovery$1() {
            if (LanDiscovery.this.registration != this) {
                try {
                    LanDiscovery.this.nsd.unregisterService(this);
                } catch (RuntimeException e) {
                }
            }
        }

        @Override // android.net.nsd.NsdManager.RegistrationListener
        public void onServiceRegistered(NsdServiceInfo nsdServiceInfo) {
            LanDiscovery.this.main.execute(new Runnable() { // from class: com.ktsolution.butsukari.LanDiscovery$1$$ExternalSyntheticLambda1
                @Override // java.lang.Runnable
                public final void run() {
                    LanDiscovery.AnonymousClass1.this.m2lambda$1$comktsolutionbutsukariLanDiscovery$1();
                }
            });
        }

        @Override // android.net.nsd.NsdManager.RegistrationListener
        public void onServiceUnregistered(NsdServiceInfo nsdServiceInfo) {
        }

        @Override // android.net.nsd.NsdManager.RegistrationListener
        public void onUnregistrationFailed(NsdServiceInfo nsdServiceInfo, int i) {
        }
    }

    public void stopAdvertising() {
        NsdManager.RegistrationListener registrationListener = this.registration;
        this.registration = null;
        if (registrationListener != null) {
            try {
                this.nsd.unregisterService(registrationListener);
            } catch (RuntimeException e) {
            }
        }
        release();
    }

    /* renamed from: com.ktsolution.butsukari.LanDiscovery$2, reason: invalid class name */
    class AnonymousClass2 implements NsdManager.DiscoveryListener {
        private final /* synthetic */ int val$requestedToken;
        private final /* synthetic */ int val$run;

        AnonymousClass2(int i, int i2) {
            this.val$run = i;
            this.val$requestedToken = i2;
        }

        /* renamed from: lambda$0$com-ktsolution-butsukari-LanDiscovery$2, reason: not valid java name */
        /* synthetic */ void m3lambda$0$comktsolutionbutsukariLanDiscovery$2(int i) {
            if (LanDiscovery.this.epoch == i && LanDiscovery.this.discovery == this) {
                LanDiscovery.this.emit("searching");
            }
        }

        @Override // android.net.nsd.NsdManager.DiscoveryListener
        public void onDiscoveryStarted(String str) {
            Executor executor = LanDiscovery.this.main;
            final int i = this.val$run;
            executor.execute(new Runnable() { // from class: com.ktsolution.butsukari.LanDiscovery$2$$ExternalSyntheticLambda3
                @Override // java.lang.Runnable
                public final void run() {
                    LanDiscovery.AnonymousClass2.this.m3lambda$0$comktsolutionbutsukariLanDiscovery$2(i);
                }
            });
        }

        @Override // android.net.nsd.NsdManager.DiscoveryListener
        public void onServiceFound(final NsdServiceInfo nsdServiceInfo) {
            Executor executor = LanDiscovery.this.main;
            final int i = this.val$run;
            executor.execute(new Runnable() { // from class: com.ktsolution.butsukari.LanDiscovery$2$$ExternalSyntheticLambda1
                @Override // java.lang.Runnable
                public final void run() {
                    LanDiscovery.AnonymousClass2.this.m4lambda$1$comktsolutionbutsukariLanDiscovery$2(i, nsdServiceInfo);
                }
            });
        }

        /* renamed from: lambda$1$com-ktsolution-butsukari-LanDiscovery$2, reason: not valid java name */
        /* synthetic */ void m4lambda$1$comktsolutionbutsukariLanDiscovery$2(int i, NsdServiceInfo nsdServiceInfo) {
            if (LanDiscovery.this.epoch == i && LanDiscovery.this.discovery == this) {
                if ((LanDiscovery.TYPE.equals(nsdServiceInfo.getServiceType()) || LanDiscovery.TYPE.substring(0, LanDiscovery.TYPE.length() - 1).equals(nsdServiceInfo.getServiceType())) && LanDiscovery.this.present.add(LanDiscovery.this.key(nsdServiceInfo))) {
                    LanDiscovery.this.queue.add(nsdServiceInfo);
                    LanDiscovery.this.resolveNext(i);
                }
            }
        }

        /* renamed from: lambda$2$com-ktsolution-butsukari-LanDiscovery$2, reason: not valid java name */
        /* synthetic */ void m5lambda$2$comktsolutionbutsukariLanDiscovery$2(int i, NsdServiceInfo nsdServiceInfo) {
            if (LanDiscovery.this.epoch == i && LanDiscovery.this.discovery == this) {
                LanDiscovery.this.present.remove(LanDiscovery.this.key(nsdServiceInfo));
                LanDiscovery.this.rooms.remove(LanDiscovery.this.key(nsdServiceInfo));
                LanDiscovery.this.emit("searching");
            }
        }

        @Override // android.net.nsd.NsdManager.DiscoveryListener
        public void onServiceLost(final NsdServiceInfo nsdServiceInfo) {
            Executor executor = LanDiscovery.this.main;
            final int i = this.val$run;
            executor.execute(new Runnable() { // from class: com.ktsolution.butsukari.LanDiscovery$2$$ExternalSyntheticLambda0
                @Override // java.lang.Runnable
                public final void run() {
                    LanDiscovery.AnonymousClass2.this.m5lambda$2$comktsolutionbutsukariLanDiscovery$2(i, nsdServiceInfo);
                }
            });
        }

        @Override // android.net.nsd.NsdManager.DiscoveryListener
        public void onDiscoveryStopped(String str) {
        }

        /* renamed from: lambda$3$com-ktsolution-butsukari-LanDiscovery$2, reason: not valid java name */
        /* synthetic */ void m6lambda$3$comktsolutionbutsukariLanDiscovery$2(int i, int i2) {
            if (LanDiscovery.this.epoch == i && LanDiscovery.this.discovery == this) {
                LanDiscovery.this.stop();
                LanDiscovery.this.token = i2;
                LanDiscovery.this.emit("error");
            }
        }

        @Override // android.net.nsd.NsdManager.DiscoveryListener
        public void onStartDiscoveryFailed(String str, int i) {
            Executor executor = LanDiscovery.this.main;
            final int i2 = this.val$run;
            final int i3 = this.val$requestedToken;
            executor.execute(new Runnable() { // from class: com.ktsolution.butsukari.LanDiscovery$2$$ExternalSyntheticLambda2
                @Override // java.lang.Runnable
                public final void run() {
                    LanDiscovery.AnonymousClass2.this.m6lambda$3$comktsolutionbutsukariLanDiscovery$2(i2, i3);
                }
            });
        }

        @Override // android.net.nsd.NsdManager.DiscoveryListener
        public void onStopDiscoveryFailed(String str, int i) {
        }
    }

    public void start(int i) {
        stop();
        this.token = i;
        int i2 = this.epoch + 1;
        this.epoch = i2;
        if (this.nsd == null) {
            emit("error");
            return;
        }
        lock();
        AnonymousClass2 anonymousClass2 = new AnonymousClass2(i2, i);
        this.discovery = anonymousClass2;
        emit("searching");
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                this.nsd.discoverServices(TYPE, 1, new NetworkRequest.Builder().addTransportType(1).build(), this.main, anonymousClass2);
            } else {
                this.nsd.discoverServices(TYPE, 1, anonymousClass2);
            }
        } catch (RuntimeException e) {
            stop();
            this.token = i;
            emit("error");
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void resolveNext(int i) {
        NsdServiceInfo poll;
        if (this.epoch != i || this.discovery == null || this.resolving || (poll = this.queue.poll()) == null) {
            return;
        }
        if (!this.present.contains(key(poll))) {
            resolveNext(i);
            return;
        }
        this.resolving = true;
        try {
            this.nsd.resolveService(poll, new AnonymousClass3(i, poll));
        } catch (RuntimeException e) {
            this.resolving = false;
            resolveNext(i);
        }
    }

    /* renamed from: com.ktsolution.butsukari.LanDiscovery$3, reason: invalid class name */
    class AnonymousClass3 implements NsdManager.ResolveListener {
        private final /* synthetic */ int val$run;
        private final /* synthetic */ NsdServiceInfo val$service;

        AnonymousClass3(int i, NsdServiceInfo nsdServiceInfo) {
            this.val$run = i;
            this.val$service = nsdServiceInfo;
        }

        /* renamed from: lambda$0$com-ktsolution-butsukari-LanDiscovery$3, reason: not valid java name */
        /* synthetic */ void m7lambda$0$comktsolutionbutsukariLanDiscovery$3(int i) {
            if (LanDiscovery.this.epoch == i) {
                LanDiscovery.this.resolving = false;
                LanDiscovery.this.resolveNext(i);
            }
        }

        @Override // android.net.nsd.NsdManager.ResolveListener
        public void onResolveFailed(NsdServiceInfo nsdServiceInfo, int i) {
            Executor executor = LanDiscovery.this.main;
            final int i2 = this.val$run;
            executor.execute(new Runnable() { // from class: com.ktsolution.butsukari.LanDiscovery$3$$ExternalSyntheticLambda1
                @Override // java.lang.Runnable
                public final void run() {
                    LanDiscovery.AnonymousClass3.this.m7lambda$0$comktsolutionbutsukariLanDiscovery$3(i2);
                }
            });
        }

        @Override // android.net.nsd.NsdManager.ResolveListener
        public void onServiceResolved(final NsdServiceInfo nsdServiceInfo) {
            Executor executor = LanDiscovery.this.main;
            final int i = this.val$run;
            final NsdServiceInfo nsdServiceInfo2 = this.val$service;
            executor.execute(new Runnable() { // from class: com.ktsolution.butsukari.LanDiscovery$3$$ExternalSyntheticLambda0
                @Override // java.lang.Runnable
                public final void run() {
                    LanDiscovery.AnonymousClass3.this.m8lambda$1$comktsolutionbutsukariLanDiscovery$3(i, nsdServiceInfo2, nsdServiceInfo);
                }
            });
        }

        /* renamed from: lambda$1$com-ktsolution-butsukari-LanDiscovery$3, reason: not valid java name */
        /* synthetic */ void m8lambda$1$comktsolutionbutsukariLanDiscovery$3(int i, NsdServiceInfo nsdServiceInfo, NsdServiceInfo nsdServiceInfo2) {
            if (LanDiscovery.this.epoch != i) {
                return;
            }
            LanDiscovery.this.resolving = false;
            if (LanDiscovery.this.present.contains(LanDiscovery.this.key(nsdServiceInfo)) && LanDiscovery.this.address(nsdServiceInfo2) != null) {
                LanDiscovery.this.rooms.put(LanDiscovery.this.key(nsdServiceInfo), nsdServiceInfo2);
                LanDiscovery.this.emit("searching");
            }
            LanDiscovery.this.resolveNext(i);
        }
    }

    public void stop() {
        this.epoch++;
        NsdManager.DiscoveryListener discoveryListener = this.discovery;
        this.discovery = null;
        this.queue.clear();
        this.present.clear();
        this.rooms.clear();
        this.resolving = false;
        if (discoveryListener != null) {
            try {
                this.nsd.stopServiceDiscovery(discoveryListener);
            } catch (RuntimeException e) {
            }
        }
        release();
    }

    public void close() {
        stop();
        stopAdvertising();
    }
}
