import { type ClipboardEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowUpRight,
  Check,
  Clipboard,
  Clock3,
  CloudOff,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MoreHorizontal,
  MonitorUp,
  MousePointer2,
  RefreshCw,
  Send,
  Share2,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  Wifi,
  X,
} from 'lucide-react';
import {
  getGetClipboardRoomQueryKey,
  useAddClipboardItem,
  useClearClipboardItems,
  useCreateClipboardRoom,
  useGetClipboardRoom,
  useJoinClipboardRoom,
} from '@workspace/api-client-react';
import QRCode from 'qrcode';
import type { ClipboardItem as ApiClipboardItem, ClipboardRoom } from '@workspace/api-client-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

const STORAGE_KEY = 'clipboard-bridge-room';
const ROLE_STORAGE_KEY = 'clipboard-bridge-role';
type SystemRole = 'master' | 'slave';

function getErrorMessage(error: unknown) {
  if (!error) return '';
  const maybe = error as { response?: { data?: { error?: string } }; message?: string };
  return maybe.response?.data?.error || maybe.message || 'Something went wrong. Try again.';
}

function formatRemaining(expiresAt: string) {
  const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(date));
}

function Logo({ onClick }: { onClick?: () => void }) {
  const content = (
    <>
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))] shadow-[0_5px_0_hsl(220_27%_18%/.12)]">
        <Link2 className="h-[18px] w-[18px] stroke-[2.5]" />
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border-2 border-[hsl(var(--sidebar))] bg-[hsl(var(--secondary))]" />
      </div>
      <div>
        <p className="font-sans text-[15px] font-extrabold tracking-[-.03em]">Clipboard Bridge</p>
        <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[hsl(var(--sidebar-foreground)/.55)]">private handoff</p>
      </div>
    </>
  );
  if (!onClick) return <div className="flex items-center gap-3" data-testid="brand-clipboard-bridge">{content}</div>;
  return <button type="button" onClick={onClick} className="focus-ring flex items-center gap-3 border-0 bg-transparent p-0 text-left" aria-label="Return to Clipboard Bridge home" data-testid="button-home-logo">{content}</button>;
}

function QrMark({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 140,
      color: { dark: '#202637', light: '#fbfaf5' },
    }).then(() => {
      canvasRef.current?.style.setProperty('width', '100%', 'important');
      canvasRef.current?.style.setProperty('height', 'auto', 'important');
      canvasRef.current?.style.setProperty('max-width', '100%', 'important');
    });
  }, [value]);
  return (
    <div className="grid min-w-0 max-w-full overflow-hidden aspect-square w-full place-items-center rounded-lg bg-[hsl(var(--card))] p-2" role="img" aria-label="QR join code" data-testid="qr-join-code">
      <canvas ref={canvasRef} className="block !h-auto !w-full max-w-full rounded-[3px]" />
    </div>
  );
}

function SetupPanel({ onRoom, initialOtp = '' }: { onRoom: (room: ClipboardRoom, role: SystemRole) => void; initialOtp?: string }) {
  const [otp, setOtp] = useState(initialOtp);
  const [error, setError] = useState('');
  const createRoom = useCreateClipboardRoom();
  const joinRoom = useJoinClipboardRoom();
  const busy = createRoom.isPending || joinRoom.isPending;

  const create = () => {
    setError('');
    createRoom.mutate(undefined, {
      onSuccess: (room) => onRoom(room, 'master'),
      onError: (nextError) => setError(getErrorMessage(nextError)),
    });
  };
  const join = (event: FormEvent) => {
    event.preventDefault();
    if (otp.length !== 6) {
      setError('Enter the six-digit bridge code.');
      return;
    }
    setError('');
    joinRoom.mutate({ data: { otp } }, {
      onSuccess: (room) => onRoom(room, 'slave'),
      onError: (nextError) => setError(getErrorMessage(nextError)),
    });
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[hsl(var(--background))]">
      <div className="bridge-grid pointer-events-none absolute inset-0 opacity-70" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Logo />
        <div className="hidden items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] px-3 py-2 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] sm:flex">
          <LockKeyhole className="h-3.5 w-3.5 text-[hsl(var(--secondary-foreground))]" />
          no account · temporary by design
        </div>
      </header>
      <main className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-24 lg:pt-20">
         <section className="min-w-0 max-w-xl animate-rise-in">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--secondary-foreground))]" />
            ready when you are
          </div>
          <h1 className="max-w-2xl text-[clamp(3.2rem,8vw,6.5rem)] font-extrabold leading-[.91] tracking-[-.08em] text-[hsl(var(--foreground))]">
            Move it.<br /><span className="text-[hsl(var(--accent-foreground))]">Bridge it.</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">
            A private-feeling handoff between your screens. Make a room, scan or type the code, and keep moving.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[hsl(var(--secondary-foreground))]" /> encrypted in transit</span>
            <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[hsl(var(--accent-foreground))]" /> rooms expire automatically</span>
          </div>
        </section>
         <section className="min-w-0 w-full animate-rise-in-delay-1 rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.82)] p-2 shadow-[0_18px_50px_hsl(220_27%_18%/.08)] backdrop-blur-sm">
          <div className="rounded-[22px] border border-[hsl(var(--border)/.7)] bg-[hsl(var(--background)/.75)] p-6 sm:p-8">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">start a bridge</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-.04em]">What are we moving?</h2>
              </div>
              <div className="rounded-xl bg-[hsl(var(--secondary))] p-2.5 text-[hsl(var(--secondary-foreground))]"><MonitorUp className="h-5 w-5" /></div>
            </div>
            <button type="button" onClick={create} disabled={busy} className="focus-ring group flex w-full items-center justify-between rounded-2xl bg-[hsl(var(--primary))] px-5 py-4 text-left text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70" data-testid="button-create-room">
              <span><span className="block text-sm font-bold">{createRoom.isPending ? 'Opening a room…' : 'Create a temporary room'}</span><span className="mt-1 block text-xs text-[hsl(var(--primary-foreground)/.62)]">Get a code to share with your other device</span></span>
              {createRoom.isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
            </button>
            <div className="my-7 flex items-center gap-3"><div className="h-px flex-1 bg-[hsl(var(--border))]" /><span className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">or join one</span><div className="h-px flex-1 bg-[hsl(var(--border))]" /></div>
            <form onSubmit={join} className="space-y-3">
              <label htmlFor="room-otp" className="text-xs font-bold text-[hsl(var(--foreground))]">Six-digit bridge code</label>
              <div className="flex gap-2">
                <input id="room-otp" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000 000" className="focus-ring min-w-0 flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 py-3 font-mono text-lg tracking-[.2em] outline-none placeholder:text-[hsl(var(--muted-foreground)/.45)]" data-testid="input-room-otp" />
                <button type="submit" disabled={busy || otp.length !== 6} className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-sm font-bold transition-colors hover:bg-[hsl(var(--secondary))] disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-join-room">{joinRoom.isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : 'Join'}</button>
              </div>
            </form>
            {(error || createRoom.isError || joinRoom.isError) && <div className="mt-5 flex items-start gap-2 rounded-xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.07)] p-3 text-xs leading-5 text-[hsl(var(--destructive))]" role="alert" data-testid="status-room-error"><CloudOff className="mt-0.5 h-4 w-4 shrink-0" />{error || getErrorMessage(createRoom.error || joinRoom.error)}</div>}
          </div>
        </section>
      </main>
       <footer className="relative mx-auto flex max-w-7xl items-center justify-between px-6 pb-7 font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))] lg:px-10"><span>clipboard bridge / 01</span><span className="hidden sm:block">text + image + docs · no accounts</span></footer>
    </div>
  );
}

function RoomHeader({ room, onLeave, remaining, role }: { room: ClipboardRoom; onLeave: () => void; remaining: string; role: SystemRole }) {
  const [copied, setCopied] = useState('');
  const shareUrl = `${window.location.origin}/?join=${room.otp}`;
  const copy = async (value: string, label: string) => {
    await navigator.clipboard?.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1800);
  };
  return (
    <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] px-5 py-4 backdrop-blur-md sm:px-8">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4"><Logo onClick={onLeave} /><div className="hidden h-7 w-px bg-[hsl(var(--border))] sm:block" /><div className="hidden items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] sm:flex"><span className="h-2 w-2 rounded-full bg-[hsl(var(--secondary-foreground))]" /> bridge live</div><span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[.12em] text-[hsl(var(--secondary-foreground))]" data-testid="text-system-role">{role}</span></div>
         <div className="flex items-center gap-2">
           <div className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] px-2.5 py-1.5 font-mono text-[9px] text-[hsl(var(--muted-foreground))] sm:gap-2 sm:px-3 sm:py-2 sm:text-[10px]"><Clock3 className="h-3.5 w-3.5 shrink-0" /><span className="hidden sm:inline">expires in</span><span className="text-[hsl(var(--foreground))]" data-testid="text-room-countdown">{remaining}</span></div>
          <button type="button" onClick={onLeave} className="focus-ring rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]" aria-label="Leave room" data-testid="button-leave-room"><X className="h-4 w-4" /></button>
        </div>
      </div>
      {copied && <div className="mx-auto mt-3 max-w-[1440px] text-right font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--secondary-foreground))]" role="status" data-testid="status-copy-feedback"><Check className="mr-1 inline h-3.5 w-3.5" />{copied} copied</div>}
      <div className="sr-only">{shareUrl}</div>
    </header>
  );
}

function ShareCard({ room }: { room: ClipboardRoom }) {
  const [copied, setCopied] = useState('');
  const shareUrl = `${window.location.origin}/?join=${room.otp}`;
  const copy = async (value: string, label: string) => {
    await navigator.clipboard?.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 2000);
  };
  return (
     <section className="rounded-2xl bg-[hsl(var(--primary))] p-4 text-[hsl(var(--primary-foreground))] shadow-[0_14px_30px_hsl(220_27%_18%/.12)] sm:p-5" data-testid="card-share-room">
      <div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary-foreground)/.55)]">invite another screen</p><h2 className="mt-2 text-lg font-bold tracking-[-.035em]">Scan or type this code</h2></div><Share2 className="h-5 w-5 text-[hsl(var(--accent))]" /></div>
        <div className="mt-5 grid min-w-0 grid-cols-1 items-center gap-4 sm:grid-cols-[96px_minmax(0,1fr)]">
          <div className="hidden min-w-0 w-[96px] shrink-0 overflow-hidden rounded-xl bg-[hsl(var(--card))] p-1.5 sm:block"><QrMark value={shareUrl} /></div>
          <div className="min-w-0 overflow-hidden text-right">
            <p className="whitespace-nowrap font-mono text-2xl font-medium tracking-[.1em] text-[hsl(var(--accent))] sm:text-3xl sm:tracking-[.16em]" data-testid="text-room-otp">{room.otp}</p>
            <button type="button" onClick={() => copy(room.otp, 'code')} className="focus-ring mt-2 ml-auto flex items-center justify-end gap-1.5 font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--primary-foreground)/.65)] hover:text-[hsl(var(--accent))]" data-testid="button-copy-otp">{copied === 'code' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied === 'code' ? 'Code copied' : 'Copy code'}</button>
            <p className="mt-2 ml-auto max-w-[170px] text-xs leading-5 text-[hsl(var(--primary-foreground)/.58)]">This bridge disappears when its timer runs out.</p>
         </div>
       </div>
      <button type="button" onClick={() => copy(shareUrl, 'link')} className="focus-ring mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--accent))] py-3 text-xs font-extrabold text-[hsl(var(--accent-foreground))] transition-transform hover:-translate-y-0.5" data-testid="button-copy-share-link">{copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied === 'link' ? 'Link copied' : 'Copy join link'}</button>
    </section>
  );
}

function CaptureCard({ roomId }: { roomId: string }) {
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const addItem = useAddClipboardItem();
  const pasteText = async () => {
    try {
      const clipboardText = await navigator.clipboard?.readText();
      if (clipboardText) {
        setText(clipboardText);
        setNotice('Pasted from clipboard');
        window.setTimeout(() => setNotice(''), 1800);
      }
    } catch {
      setNotice('Clipboard access was not allowed');
      window.setTimeout(() => setNotice(''), 2200);
    }
  };
  const sendText = () => {
    if (!text.trim()) return;
    addItem.mutate({ roomId, data: { kind: 'text', content: text.trim(), name: name.trim() || undefined } }, { onSuccess: (item) => { queryClient.setQueryData(getGetClipboardRoomQueryKey(roomId), (old: ClipboardRoom | undefined) => old ? { ...old, items: [...old.items, item] } : old); setText(''); setName(''); setNotice('Text sent across'); window.setTimeout(() => setNotice(''), 1800); }, onError: (error) => { setNotice(getErrorMessage(error)); window.setTimeout(() => setNotice(''), 2600); } });
  };
  const readFile = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isDocument = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.text', 'text/plain', 'text/markdown', 'text/csv'].includes(file.type) || /\.(pdf|docx?|odt|txt|md|csv)$/i.test(file.name);
    if (!isImage && !isDocument) {
      setNotice('Choose an image or document file');
      window.setTimeout(() => setNotice(''), 2200);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      addItem.mutate({ roomId, data: { kind: isImage ? 'image' : 'document', content: String(reader.result), name: file.name } }, { onSuccess: (item) => { queryClient.setQueryData(getGetClipboardRoomQueryKey(roomId), (old: ClipboardRoom | undefined) => old ? { ...old, items: [...old.items, item] } : old); setNotice(isImage ? 'Image sent across' : 'Document sent across'); window.setTimeout(() => setNotice(''), 1800); }, onError: (error) => { setNotice(getErrorMessage(error)); window.setTimeout(() => setNotice(''), 2600); } });
    };
    reader.readAsDataURL(file);
  };
  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const file = Array.from(event.clipboardData.files).find((candidate) => candidate.type.startsWith('image/') || candidate.type === 'application/pdf' || candidate.type.includes('word'));
    if (file) { event.preventDefault(); readFile(file); }
  };
  return (
    <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6" data-testid="card-capture">
      <div className="flex items-center justify-between gap-4"><div><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"><Send className="h-3.5 w-3.5" /></span><h2 className="font-bold tracking-[-.025em]">Send something</h2></div><p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Capture here, it lands everywhere else.</p></div>{notice && <span className="font-mono text-[10px] uppercase tracking-[.1em] text-[hsl(var(--secondary-foreground))]" role="status" data-testid="status-send-feedback"><Check className="mr-1 inline h-3.5 w-3.5" />{notice}</span>}</div>
      <textarea value={text} onChange={(event) => setText(event.target.value)} onPaste={onPaste} placeholder="Paste or type text here…" rows={4} className="focus-ring mt-5 w-full resize-none rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-4 text-sm leading-6 outline-none placeholder:text-[hsl(var(--muted-foreground)/.6)]" data-testid="textarea-capture-text" />
       <div className="mt-3 flex flex-wrap items-center gap-2"><input value={name} onChange={(event) => setName(event.target.value.slice(0, 200))} placeholder="Optional label" className="focus-ring min-w-[130px] flex-1 rounded-lg border border-transparent bg-[hsl(var(--muted)/.7)] px-3 py-2 text-xs outline-none placeholder:text-[hsl(var(--muted-foreground))]" data-testid="input-item-name" /><button type="button" onClick={pasteText} className="focus-ring flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold hover:bg-[hsl(var(--secondary))]" data-testid="button-paste-clipboard"><Clipboard className="h-3.5 w-3.5" /> Paste</button><button type="button" onClick={() => fileRef.current?.click()} className="focus-ring flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold hover:bg-[hsl(var(--secondary))]" data-testid="button-upload-file"><Upload className="h-3.5 w-3.5" /> File</button><input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.odt,.txt,.md,.csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFile(file); event.target.value = ''; }} data-testid="input-file" /><button type="button" onClick={sendText} disabled={!text.trim() || addItem.isPending} className="focus-ring flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-send-text">{addItem.isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />} Send</button></div>
    </section>
  );
}

function ItemCard({ item }: { item: ApiClipboardItem }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (item.kind === 'text') {
      await navigator.clipboard?.writeText(item.content);
    } else if (item.kind === 'image' && navigator.clipboard?.write && item.content.startsWith('data:')) {
      const response = await fetch(item.content);
      const blob = await response.blob();
      await navigator.clipboard.write([new window.ClipboardItem({ [blob.type]: blob })]);
    } else {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const download = () => {
    const anchor = document.createElement('a');
    anchor.href = item.content;
    anchor.download = item.name || `bridge-image-${item.id}.png`;
    anchor.click();
  };
  return (
    <article className="group rounded-xl border border-[hsl(var(--border)/.8)] bg-[hsl(var(--background)/.45)] p-4 transition-colors hover:border-[hsl(var(--accent)/.6)]" data-testid={`card-item-${item.id}`}>
       <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.kind === 'image' ? 'bg-[hsl(var(--accent)/.22)] text-[hsl(var(--accent-foreground))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]'}`}>{item.kind === 'image' ? <ImageIcon className="h-4 w-4" /> : item.kind === 'document' ? <FileText className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</span><div className="min-w-0"><p className="truncate text-xs font-bold" data-testid={`text-item-name-${item.id}`}>{item.name || (item.kind === 'image' ? 'Pasted image' : item.kind === 'document' ? 'Shared document' : 'Untitled text')}</p><p className="font-mono text-[10px] uppercase tracking-[.08em] text-[hsl(var(--muted-foreground))]">{item.kind} · {formatTime(item.createdAt)}</p></div></div><div className="flex shrink-0 items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">{item.kind === 'text' && <button type="button" onClick={copy} className="focus-ring rounded-lg p-2 hover:bg-[hsl(var(--secondary))]" aria-label={`Copy ${item.name || item.kind}`} data-testid={`button-copy-item-${item.id}`}>{copied ? <Check className="h-4 w-4 text-[hsl(var(--secondary-foreground))]" /> : <Copy className="h-4 w-4" />}</button>}{(item.kind === 'image' || item.kind === 'document') && <button type="button" onClick={download} className="focus-ring rounded-lg p-2 hover:bg-[hsl(var(--secondary))]" aria-label={`Download ${item.kind}`} data-testid={`button-download-item-${item.id}`}><Download className="h-4 w-4" /></button>}<button type="button" className="rounded-lg p-2 text-[hsl(var(--muted-foreground))]" aria-label="More item options" data-testid={`button-more-item-${item.id}`}><MoreHorizontal className="h-4 w-4" /></button></div></div>
       {item.kind === 'image' ? <img src={item.content} alt={item.name || 'Shared image'} className="mt-4 max-h-64 w-full rounded-lg border border-[hsl(var(--border))] object-contain" data-testid={`img-item-${item.id}`} /> : item.kind === 'document' ? <div className="mt-4 flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-4"><FileText className="h-5 w-5 text-[hsl(var(--secondary-foreground))]" /><div><p className="text-sm font-bold">Document ready</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Download to open this file on your device.</p></div></div> : <p className="mt-4 max-h-24 overflow-hidden whitespace-pre-wrap break-words text-sm leading-6 text-[hsl(var(--foreground)/.82)]" data-testid={`text-item-content-${item.id}`}>{item.content}</p>}
    </article>
  );
}

function EmptyItems() {
  return <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.4)] px-6 text-center" data-testid="empty-items-state"><div className="relative mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.65)] text-[hsl(var(--secondary-foreground))]"><MousePointer2 className="h-6 w-6" /><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]" /></div><h3 className="font-bold tracking-[-.02em]">The bridge is clear</h3><p className="mt-2 max-w-xs text-xs leading-5 text-[hsl(var(--muted-foreground))]">Anything you send will appear here, ready for the next screen.</p></div>;
}

function LoadingItems() {
  return <div className="space-y-3" data-testid="loading-items-state">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-[hsl(var(--muted)/.7)]" />)}</div>;
}

function Dashboard({ initialRoom, onLeave, role }: { initialRoom: ClipboardRoom; onLeave: () => void; role: SystemRole }) {
  const [remaining, setRemaining] = useState(formatRemaining(initialRoom.expiresAt));
  const roomId = initialRoom.roomId;
  const roomQuery = useGetClipboardRoom(roomId, { query: { queryKey: getGetClipboardRoomQueryKey(roomId), refetchInterval: 5000 } });
  const clearItems = useClearClipboardItems();
  const room = roomQuery.data || initialRoom;
  const expired = new Date(room.expiresAt).getTime() <= Date.now();
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(formatRemaining(room.expiresAt)), 1000);
    return () => window.clearInterval(timer);
  }, [room.expiresAt]);
  useEffect(() => {
    queryClient.setQueryData(getGetClipboardRoomQueryKey(roomId), initialRoom);
  }, [initialRoom, roomId]);
  const items = [...(room.items || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const clear = () => {
    if (!items.length || clearItems.isPending) return;
    clearItems.mutate({ roomId }, { onSuccess: () => queryClient.setQueryData(getGetClipboardRoomQueryKey(roomId), (old: ClipboardRoom | undefined) => old ? { ...old, items: [] } : old) });
  };
  return (
    <div className="noise min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <RoomHeader room={room} onLeave={onLeave} remaining={remaining} role={role} />
      <main className="mx-auto grid max-w-[1440px] gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-8 lg:py-10">
        <div className="min-w-0">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">your shared shelf</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.06em] sm:text-4xl">Ready when you are.</h1></div><div className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] px-3 py-2 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]"><Wifi className="h-3.5 w-3.5 text-[hsl(var(--secondary-foreground))]" /> syncing every few seconds</div></div>
          {expired && <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-4 text-sm" role="alert" data-testid="status-room-expired"><span className="flex items-center gap-2 text-[hsl(var(--destructive))]"><Clock3 className="h-4 w-4" /> This bridge has expired. Create a new one to continue.</span><button type="button" onClick={onLeave} className="font-bold underline underline-offset-2" data-testid="button-create-new-room">New room</button></div>}
          <CaptureCard roomId={roomId} />
          <div className="mt-10 flex items-center justify-between"><div><h2 className="text-lg font-bold tracking-[-.03em]">Recent handoffs <span className="ml-1 font-mono text-xs font-normal text-[hsl(var(--muted-foreground))]">{items.length}</span></h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Latest first · visible to everyone in this room</p></div><button type="button" onClick={clear} disabled={!items.length || clearItems.isPending} className="focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--destructive))] disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-clear-items">{clearItems.isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Clear all</button></div>
          <div className="mt-4 space-y-3">{roomQuery.isLoading ? <LoadingItems /> : roomQuery.isError ? <div className="flex items-center justify-between rounded-2xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--card))] p-5 text-sm" data-testid="status-room-fetch-error"><span className="flex items-center gap-2"><CloudOff className="h-4 w-4 text-[hsl(var(--destructive))]" /> Could not refresh this room.</span><button type="button" onClick={() => roomQuery.refetch()} className="flex items-center gap-2 font-bold text-[hsl(var(--primary))]" data-testid="button-retry-room"><RefreshCw className="h-3.5 w-3.5" /> Retry</button></div> : items.length ? items.map((item) => <ItemCard item={item} key={item.id} />) : <EmptyItems />}</div>
        </div>
          <aside className="order-first lg:order-none lg:pt-[74px]"><ShareCard room={room} /></aside>
      </main>
    </div>
  );
}

function Home() {
  const [room, setRoom] = useState<ClipboardRoom | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) as ClipboardRoom : null;
    } catch { return null; }
  });
  const [role, setRole] = useState<SystemRole>(() => sessionStorage.getItem(ROLE_STORAGE_KEY) === 'slave' ? 'slave' : 'master');
  const [, setLocation] = useLocation();
  const initialOtp = new URLSearchParams(window.location.search).get('join')?.match(/^\d{6}$/)?.[0] || '';
  const onRoom = (nextRoom: ClipboardRoom, nextRole: SystemRole) => {
    setRoom(nextRoom);
    setRole(nextRole);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextRoom));
    sessionStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    setLocation('/');
  };
  const leave = () => {
    setRoom(null);
    setRole('master');
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(ROLE_STORAGE_KEY);
  };
  return room ? <Dashboard initialRoom={room} onLeave={leave} role={role} /> : <SetupPanel initialOtp={initialOtp} onRoom={onRoom} />;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: import('react').ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
