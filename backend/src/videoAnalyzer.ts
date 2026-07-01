import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

// If ffmpeg/ffprobe are not visible to the node process via PATH,
// set explicit paths here. These are common install locations on this system.
const possibleFfmpeg = 'C:\\Program Files\\Topaz Labs LLC\\Topaz Video AI\\ffmpeg.exe';
const possibleFfprobe = 'C:\\Program Files\\Topaz Labs LLC\\Topaz Video AI\\ffprobe.exe';
try {
  if (fs.existsSync(possibleFfmpeg)) ffmpeg.setFfmpegPath(possibleFfmpeg);
  if (fs.existsSync(possibleFfprobe)) ffmpeg.setFfprobePath(possibleFfprobe);
} catch (e) {
  // ignore; fluent-ffmpeg will fallback to searching PATH
}

type FFProbeStream = {
  codec_type?: string;
  width?: number;
  height?: number;
  codec_name?: string;
  avg_frame_rate?: string;
  color_space?: string;
  profile?: string;
};

type FFProbeFormat = {
  format_name?: string;
  bit_rate?: string;
  duration?: string;
};

type FFProbeData = {
  streams?: FFProbeStream[];
  format?: FFProbeFormat;
};

export interface VideoAnalysisResult {
  format: string;
  codec: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  duration: number;
  colorSpace: string | null;
  profile: string | null;
  issues: string[];
  recommended: {
    resolution: string;
    fps: number;
    codec: string;
    bitrate: number;
    colorSpace: string;
  };
}

const parseFps = (frameRate?: string): number => {
  if (!frameRate) {
    return 0;
  }

  if (frameRate.includes('/')) {
    const [num, den] = frameRate.split('/').map(Number);
    return den !== 0 ? num / den : 0;
  }

  return Number(frameRate);
};

const recommendResolution = (width: number, height: number) => {
  if (width >= 1920 || height >= 1920) {
    return '1080p (максимум 1080x1920)';
  }
  return `${width}x${height}`;
};

const recommendFps = (fps: number) => {
  if (fps === 0) {
    return 30;
  }
  if (fps > 60) {
    return 60;
  }
  return fps;
};

const recommendBitrate = (width: number, height: number) => {
  const maxSide = Math.max(width, height);
  if (maxSide >= 2160) {
    return 40000000;
  }
  if (maxSide >= 1440) {
    return 25000000;
  }
  return 12000000;
};

const getBestVideoEncoder = (encoders: Record<string, any>) => {
  const preferred = ['libx264', 'h264_nvenc', 'h264_qsv', 'h264_amf', 'h264_mf', 'mpeg4'];
  for (const name of preferred) {
    if (encoders[name]) {
      return name;
    }
  }
  return 'mpeg4';
};

const buildIssues = (stream: FFProbeStream, width: number, height: number, bitrate: number, fps: number) => {
  const issues: string[] = [];

  if (stream.codec_name && !['h264', 'hevc', 'h265'].includes(stream.codec_name)) {
    issues.push(`Кодек ${stream.codec_name} может быть рекодирован в H.264/H.265`);
  }

  if (bitrate > 0 && bitrate < recommendBitrate(width, height)) {
    issues.push('Низкий битрейт — возможна сильная компрессия');
  }

  if (width > 1080 || height > 1920) {
    issues.push('Видео превышает рекомендованное разрешение для TikTok');
  }

  if (fps > 60) {
    issues.push('Частота кадров выше 60 fps, TikTok может понизить FPS');
  }

  if (stream.color_space && stream.color_space !== 'bt709') {
    issues.push('Цветовое пространство не BT.709 — возможны проблемы при трансляции');
  }

  return issues;
};

const buildOptimizationOptions = (encoder: string, bitrateKbps: number) => {
  const options: string[] = [
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-vf', 'scale=w=1080:h=1920:force_original_aspect_ratio=decrease',
    '-r', '60',
    '-b:v', `${bitrateKbps}k`,
    '-maxrate', `${Math.ceil(bitrateKbps * 1.2)}k`,
    '-bufsize', `${Math.ceil(bitrateKbps * 2)}k`,
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000'
  ];

  const supportsProfile = /^(libx264|h264|hevc|h265)/.test(encoder);
  if (encoder !== 'mpeg4') {
    options.unshift('-preset', 'slow');
  }

  if (supportsProfile) {
    options.push('-profile:v', 'high', '-level', '4.2');
  }

  return options;
};

export function analyzeVideo(filePath: string): Promise<VideoAnalysisResult> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: Error | null, metadata: any) => {
      if (err) {
        return reject(err);
      }

      const probeData = metadata as FFProbeData;
      const format = probeData.format?.format_name || 'unknown';
      const stream = probeData.streams?.find((s: FFProbeStream) => s.codec_type === 'video');
      if (!stream) {
        return reject(new Error('Video stream not found'));
      }

      const width = stream.width || 0;
      const height = stream.height || 0;
      const codec = stream.codec_name || 'unknown';
      const bitrate = Number(probeData.format?.bit_rate || 0);
      const duration = Number(probeData.format?.duration || 0);
      const fps = parseFps(stream.avg_frame_rate);
      const colorSpace = stream.color_space || null;
      const profile = stream.profile || null;

      const recommendedFpsValue = recommendFps(fps);
      const recommendedBitrate = recommendBitrate(width, height);

      resolve({
        format,
        codec,
        width,
        height,
        fps,
        bitrate,
        duration,
        colorSpace,
        profile,
        issues: buildIssues(stream, width, height, bitrate, fps),
        recommended: {
          resolution: recommendResolution(width, height),
          fps: recommendedFpsValue,
          codec: 'h264',
          bitrate: recommendedBitrate,
          colorSpace: 'bt709'
        }
      });
    });
  });
}

export function optimizeVideo(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpDir = path.dirname(filePath);
    const outputName = `brax-optimized-${Date.now()}.mp4`;
    const outputPath = path.join(tmpDir, outputName);

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const buildReencodeOptions = (encoder: string) => {
      const options: string[] = [
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-c:a', 'aac',
        '-b:a', '320k',
        '-ar', '48000'
      ];

      if (encoder !== 'mpeg4') {
        options.unshift('-preset', 'slow', '-crf', '18');
      } else {
        options.push('-q:v', '2');
      }

      if (/^(libx264|h264|hevc|h265)/.test(encoder)) {
        options.push('-profile:v', 'high', '-level', '4.2');
      }

      return options;
    };

    ffmpeg.getAvailableEncoders((encoderErr: Error | null, encoders: Record<string, any>) => {
      if (encoderErr) {
        return reject(encoderErr);
      }

      const selectedEncoder = getBestVideoEncoder(encoders);

      ffmpeg.ffprobe(filePath, (err: Error | null, metadata: any) => {
        if (err) {
          return reject(err);
        }

        const probeData = metadata as FFProbeData;
        const videoStream = probeData.streams?.find((s: FFProbeStream) => s.codec_type === 'video');
        const audioStream = probeData.streams?.find((s: FFProbeStream) => s.codec_type === 'audio');
        if (!videoStream) {
          return reject(new Error('Video stream not found for optimization'));
        }

        const formatName = probeData.format?.format_name || '';
        const videoCodec = videoStream.codec_name || '';
        const audioCodec = audioStream?.codec_name || '';
        const canStreamCopy = formatName.includes('mp4') && ['h264', 'h265', 'hevc'].includes(videoCodec) && (!audioStream || ['aac', 'mp3', 'mp2', 'pcm_s16le', 'pcm_s24le', 'pcm_f32le'].includes(audioCodec));

        const command = ffmpeg(filePath).format('mp4').outputOptions(['-movflags', '+faststart']);

        if (canStreamCopy) {
          command.videoCodec('copy');
          if (audioStream && ['aac', 'mp3', 'mp2', 'pcm_s16le', 'pcm_s24le', 'pcm_f32le'].includes(audioCodec)) {
            command.audioCodec('copy');
          } else {
            command.audioCodec('aac').outputOptions(['-b:a', '320k', '-ar', '48000']);
          }

          return command
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err))
            .save(outputPath);
        }

        command
          .videoCodec(selectedEncoder)
          .audioCodec('aac')
          .outputOptions(buildReencodeOptions(selectedEncoder))
          .on('end', () => resolve(outputPath))
          .on('error', (err) => reject(err))
          .save(outputPath);
      });
    });
  });
}
