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
  pendingResolve?.();
  pendingResolve = null;
  if (!sharedAudio) return;
  sharedAudio.onended = null;
  sharedAudio.onerror = null;
  sharedAudio.pause();
  sharedAudio.currentTime = 0;
}

export async function playInterviewAudio(
  audioBase64: string,
  contentType: string
): Promise<void> {
  stopInterviewAudio();
  const audio = getAudioElement();
  const generation = ++playbackGeneration;
  audio.volume = 1;
  audio.src = `data:${contentType};base64,${audioBase64}`;
  await new Promise<void>((resolve, reject) => {
    pendingResolve = resolve;
    audio.onended = () => {
      if (generation !== playbackGeneration) return;
      pendingResolve = null;
      resolve();
    };
    audio.onerror = () => {
      if (generation !== playbackGeneration) return;
      pendingResolve = null;
      reject(new Error("Không thể phát câu hỏi"));
    };
    audio.play().catch((error) => {
      if (generation !== playbackGeneration) return;
      pendingResolve = null;
      reject(error);
    });
  });
}
