class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input.length > 0) {
      const channelData = input[0]; // Float32Array

      // Convert Float32 → Int16
      const int16Buffer = new Int16Array(channelData.length);

      for (let i = 0; i < channelData.length; i++) {
        int16Buffer[i] = Math.max(-1, Math.min(1, channelData[i])) * 32767;
      }

      // 🚀 Send buffer to main thread
      this.port.postMessage(int16Buffer.buffer);
    }

    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);