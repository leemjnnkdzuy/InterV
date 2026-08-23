let sharedAudio: HTMLAudioElement | null = null;
let silentAudioUrl = "";
let pendingResolve: (() => void) | null = null;
let playbackGeneration = 0;

function getAudioElement(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

function getSilentAudioUrl(): string {
  if (silentAudioUrl) return silentAudioUrl;
  const sampleCount = 320;
  const wav = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(wav);
  const write = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16_000, true);
  view.setUint32(28, 32_000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, sampleCount * 2, true);
  silentAudioUrl = URL.createObjectURL(
    new Blob([wav], { type: "audio/wav" })
  );
  return silentAudioUrl;
}

export function unlockInterviewAudio(): void {
  const audio = getAudioElement();
  const generation = ++playbackGeneration;
  audio.src = getSilentAudioUrl();
  audio.volume = 0.01;
  void audio
    .play()
    .then(() => {
      if (generation !== playbackGeneration) return;
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
    })
    .catch(() => undefined);
}

export function stopInterviewAudio(): void {
  playbackGeneration += 1;
  if (pendingResolve) {
    const resolve = pendingResolve;
    pendingResolve = null;
    resolve();
  }
  if (!sharedAudio) return;
  sharedAudio.onended = null;
  sharedAudio.onerror = null;
  sharedAudio.ontimeupdate = null;
  sharedAudio.onloadedmetadata = null;
  try {
    sharedAudio.pause();
    sharedAudio.currentTime = 0;
  } catch {
    // ignore
  }
}

export async function playInterviewAudio(
  audioBase64: string,
  contentType: string,
  onStarted?: () => void
): Promise<void> {
  stopInterviewAudio();
  const audio = getAudioElement();
  const generation = ++playbackGeneration;
  audio.volume = 1;
  audio.src = `data:${contentType};base64,${audioBase64}`;

  await new Promise<void>((resolve, reject) => {
    let finished = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
      if (fallbackTimer !== null) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    };

    const finish = () => {
      if (finished || generation !== playbackGeneration) return;
      finished = true;
      cleanup();
      pendingResolve = null;
      resolve();
    };

    pendingResolve = finish;

    audio.onended = () => {
      finish();
    };

    audio.ontimeupdate = () => {
      if (
        audio.duration > 0 &&
        Number.isFinite(audio.duration) &&
        audio.currentTime >= audio.duration - 0.08
      ) {
        finish();
      }
    };

    audio.onloadedmetadata = () => {
      if (generation !== playbackGeneration) return;
      if (audio.duration > 0 && Number.isFinite(audio.duration)) {
        fallbackTimer = setTimeout(
          finish,
          Math.round((audio.duration + 0.6) * 1000)
        );
      }
    };

    audio.onerror = () => {
      if (finished || generation !== playbackGeneration) return;
      finished = true;
      cleanup();
      pendingResolve = null;
      reject(new Error("Không thể phát câu hỏi"));
    };

    // Absolute safety timeout based on payload size
    const estimatedSec = Math.max(
      3,
      Math.min(60, Math.round((audioBase64.length * 0.75) / 4000))
    );
    fallbackTimer = setTimeout(finish, estimatedSec * 1000);

    audio
      .play()
      .then(() => {
        if (generation !== playbackGeneration) return;
        onStarted?.();
      })
      .catch((error) => {
        if (finished || generation !== playbackGeneration) return;
        finished = true;
        cleanup();
        pendingResolve = null;
        reject(error);
      });
  });
}
