class Pcm16Processor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pending = [];
    this.pendingLength = 0;
    this.inputFramesPerChunk = Math.max(1, Math.round(sampleRate * 0.05));
    this.outputFramesPerChunk = 800;
  }

  flushChunk() {
    const input = new Float32Array(this.inputFramesPerChunk);
    let offset = 0;

    while (offset < input.length && this.pending.length > 0) {
      const current = this.pending[0];
      const copyLength = Math.min(current.length, input.length - offset);
      input.set(current.subarray(0, copyLength), offset);
      offset += copyLength;

      if (copyLength === current.length) {
        this.pending.shift();
      } else {
        this.pending[0] = current.subarray(copyLength);
      }
      this.pendingLength -= copyLength;
    }

    const output = new Int16Array(this.outputFramesPerChunk);
    const ratio = input.length / output.length;
    for (let index = 0; index < output.length; index += 1) {
      const start = Math.floor(index * ratio);
      const end = Math.max(start + 1, Math.floor((index + 1) * ratio));
      let sum = 0;
      for (let sourceIndex = start; sourceIndex < end; sourceIndex += 1) {
        sum += input[sourceIndex] || 0;
      }
      const sample = Math.max(-1, Math.min(1, sum / (end - start)));
      output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    this.port.postMessage(output.buffer, [output.buffer]);
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) {
      return true;
    }

    const copy = new Float32Array(input.length);
    copy.set(input);
    this.pending.push(copy);
    this.pendingLength += copy.length;

    while (this.pendingLength >= this.inputFramesPerChunk) {
      this.flushChunk();
    }

    return true;
  }
}

registerProcessor("pcm16-processor", Pcm16Processor);
